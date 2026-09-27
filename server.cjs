#!/usr/bin/env node
/**
 * NODITOS - servidor local autónomo (sin dependencias).
 *
 *   - Doble clic en Noditos.exe → la ventana se cierra sola en ~1 segundo y el
 *     servidor sigue corriendo en SEGUNDO PLANO (sin consola visible).
 *   - Abre el navegador automáticamente en http://127.0.0.1:4173
 *     (busca otro puerto libre si ese está ocupado).
 *   - Botón "Detener" dentro de la app → POST /__noditos/stop apaga el servidor.
 *   - Todo queda registrado en "Noditos-servidor.log", junto al .exe.
 *   - Noditos.exe --foreground  → modo clásico, con la consola visible.
 */
"use strict";

const http = require("http");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const os = require("os");

const args = process.argv.slice(2);
const FOREGROUND = args.includes("--foreground");
const DETACHED_FLAG = "NODITOS_DETACHED";
const HOST = "127.0.0.1";
const TOKEN = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
const TOKEN_PLACEHOLDER = "__NODITOS_STOP_TOKEN__";
const MAX_API_BODY = 256 * 1024;
const MAX_AI_INPUT = 250_000;
const MAX_UPSTREAM_RESPONSE = 4 * 1024 * 1024;
const AI_TIMEOUT_MS = 45_000;
const aiSecrets = { gemini: "" };

function portArg() {
  const a = args.find((x) => x.startsWith("--port="));
  return a ? parseInt(a.split("=")[1], 10) : null;
}

const isPkg = typeof process.pkg !== "undefined";

/* ---------- SEA (ejecutable de un solo archivo, Node.js oficial) ----------
 * Cuando Noditos corre como ejecutable único (build-exe.sh / build-exe.bat con
 * Node SEA), los archivos de dist/ y build-info.json viajan incrustados dentro
 * del propio .exe como "assets" y se leen con la API node:sea.
 * Ejecutando con Node normal (desarrollo) o con pkg, se comportan igual que
 * siempre: dist/ se lee del disco. */
let SEA = null;
try {
  const sea = require("node:sea");
  if (typeof sea.isSea === "function" && sea.isSea()) {
    // OJO: según la versión de Node, getRawAsset devuelve Buffer o ArrayBuffer.
    // Se normaliza SIEMPRE a Buffer (copia defensiva) para que el resto del
    // servidor pueda usarlo como tal.
    SEA = {
      keys: new Set(sea.getAssetKeys()),
      get(key) {
        const raw = sea.getRawAsset(key);
        if (Buffer.isBuffer(raw) || raw instanceof Uint8Array || raw instanceof ArrayBuffer) {
          return Buffer.from(raw);
        }
        return null;
      },
    };
  }
} catch {
  /* Node sin node:sea o ejecución normal */
}

/* ---------- información de versión / build ---------- */
let BUILD = { version: "dev", builtAt: "", commit: "" };
try {
  const raw = SEA
    ? SEA.get("build-info.json").toString("utf8")
    : fs.readFileSync(path.join(__dirname, "build-info.json"), "utf8");
  BUILD = Object.assign(BUILD, JSON.parse(raw));
} catch {
  /* sin build-info.json (desarrollo) */
}
const BUILD_TAG =
  "v" + BUILD.version + (BUILD.builtAt ? ` (build ${BUILD.builtAt}${BUILD.commit ? ", " + BUILD.commit : ""})` : "");

/* ---------- ubicación de la carpeta dist/ ---------- */
function distCandidates() {
  const cands = [];
  if (isPkg) cands.push(path.join(path.dirname(process.execPath), "dist"));
  cands.push(path.join(process.cwd(), "dist"));
  if (isPkg) cands.push(path.join(__dirname, "dist"));
  return cands;
}
const DIST_ROOT = SEA ? null : (() => {
  const found = distCandidates().find((d) => fs.existsSync(path.join(d, "index.html")));
  return found ? path.resolve(found) : null;
})();

/* ---------- lectura de archivos de la app (disco o incrustados) ---------- */
/* Devuelve un Buffer con el contenido de dist/<relPath>, o null si no existe. */
function distBuffer(relPath) {
  if (SEA) {
    const key = "dist/" + relPath;
    return SEA.keys.has(key) ? SEA.get(key) : null;
  }
  const filePath = path.resolve(DIST_ROOT, relPath);
  if (filePath === DIST_ROOT || !filePath.startsWith(DIST_ROOT + path.sep)) return null;
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) return null;
  return fs.readFileSync(filePath);
}

const LOG_PATH = isPkg || SEA
  ? path.join(path.dirname(process.execPath), "Noditos-servidor.log")
  : path.join(process.cwd(), "Noditos-servidor.log");

function log(msg) {
  const line = `[${new Date().toLocaleTimeString("es-ES")}] ${msg}`;
  try {
    fs.appendFileSync(LOG_PATH, line + os.EOL);
  } catch {
    /* sin log */
  }
  console.log(line);
}

function failKeepOpen(title, detail) {
  try {
    if (process.stdout.isTTY || FOREGROUND) {
      process.stdout.write(`\n  ==============================================\n`);
      process.stdout.write(`  [ERROR] ${title}\n`);
      if (detail) process.stdout.write(`  ${detail}\n`);
      process.stdout.write(`  ==============================================\n\n`);
      process.stdout.write(`  Presiona ENTER para cerrar esta ventana...\n`);
      process.stdin.resume();
      process.stdin.on("data", () => process.exit(1));
      return;
    }
  } catch {
    /* no es TTY */
  }
  log(`ERROR: ${title} ${detail ?? ""}`);
  process.exit(1);
}

if (!SEA && !DIST_ROOT) {
  failKeepOpen(
    'No se encontró la carpeta "dist/" con la app compilada.',
    `Se buscó en:\n    - ${distCandidates().join("\n    - ")}\n\n  Si estás ejecutando con Node directamente, primero compila: npx vite build`
  );
  return;
}

/* ---------- consola UTF-8 (acentos en CMD) ---------- */
try {
  if (process.platform === "win32") require("child_process").spawnSync("chcp", ["65001"], { stdio: "ignore" });
} catch {
  /* opcional */
}

/* ---------- auto-detestado en segundo plano ---------- */
if (!FOREGROUND && process.platform === "win32" && !process.env[DETACHED_FLAG]) {
  // Bajo pkg, argv[1] apunta al script virtual del snapshot y hay que
  // repasarlo al relanzar. Bajo SEA el ejecutable ya corre su script
  // incrustado y argv[1] sobra: los argumentos del usuario van directos.
  const relaunchArgs = SEA
    ? [...args, "--foreground"]
    : [process.argv[1], ...args, "--foreground"];
  const child = spawn(process.execPath, relaunchArgs, {
    detached: true,
    stdio: "ignore",
    windowsHide: true,
    env: { ...process.env, [DETACHED_FLAG]: "1" },
  });
  child.unref();
  log(`Servidor relanzado en segundo plano (pid ${child.pid}). Esta ventana se cierra.`);
  process.exit(0);
}

/* ---------- utilidades ---------- */
const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".map": "application/json",
  ".txt": "text/plain; charset=utf-8",
};

function sendJson(res, code, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(code, { "Content-Type": "application/json; charset=utf-8", "Content-Length": Buffer.byteLength(body) });
  res.end(body);
}

function openBrowser(url) {
  const cmd =
    process.platform === "win32" ? "cmd" : process.platform === "darwin" ? "open" : "xdg-open";
  const cmdArgs = process.platform === "win32" ? ["/c", "start", "", url] : [url];
  try {
    const child = spawn(cmd, cmdArgs, { stdio: "ignore", detached: true });
    // El evento "error" es asíncrono: sin este manejador, un fallo al lanzar el
    // navegador (p. ej. "xdg-open" ausente) tumbaría todo el servidor.
    child.on("error", () => log(`No se pudo abrir el navegador automáticamente. Abrí ${url} a mano.`));
    child.unref();
  } catch {
    log(`No se pudo abrir el navegador automáticamente. Abrí ${url} a mano.`);
  }
}

function netListen(port, cb) {
  const srv = http.createServer();
  srv.once("error", (err) => cb(err));
  srv.listen(port, HOST, () => {
    srv.close(() => cb(null));
  });
}

function findFreePort(start, cb) {
  netListen(start, (err) => {
    if (!err) return cb(start);
    if (start >= 4273) return cb(null);
    findFreePort(start + 1, cb);
  });
}

function requestOrigin(req, port) {
  return `http://${HOST}:${port}`;
}

function authorizeLocalApi(req, port) {
  const expectedOrigin = requestOrigin(req, port);
  const hostOk = req.headers.host === `${HOST}:${port}`;
  const originOk = req.headers.origin === expectedOrigin;
  const tokenOk = req.headers["x-noditos-token"] === TOKEN;
  return hostOk && originOk && tokenOk;
}

function readJsonBody(req, maxBytes = MAX_API_BODY) {
  return new Promise((resolve, reject) => {
    const contentType = String(req.headers["content-type"] || "").split(";", 1)[0].trim().toLowerCase();
    if (contentType !== "application/json") {
      reject(Object.assign(new Error("content-type inválido"), { statusCode: 415 }));
      return;
    }
    const declared = Number(req.headers["content-length"] || 0);
    if (Number.isFinite(declared) && declared > maxBytes) {
      reject(Object.assign(new Error("cuerpo demasiado grande"), { statusCode: 413 }));
      req.resume();
      return;
    }
    const chunks = [];
    let size = 0;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > maxBytes) {
        reject(Object.assign(new Error("cuerpo demasiado grande"), { statusCode: 413 }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}"));
      } catch {
        reject(Object.assign(new Error("JSON inválido"), { statusCode: 400 }));
      }
    });
    req.on("error", reject);
  });
}

async function readUpstreamJson(response) {
  const declared = Number(response.headers.get("content-length") || 0);
  if (Number.isFinite(declared) && declared > MAX_UPSTREAM_RESPONSE) {
    throw new Error("La respuesta del proveedor es demasiado grande.");
  }
  const text = await response.text();
  if (Buffer.byteLength(text) > MAX_UPSTREAM_RESPONSE) {
    throw new Error("La respuesta del proveedor es demasiado grande.");
  }
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("El proveedor devolvió una respuesta inválida.");
  }
  if (!response.ok) {
    const message = response.status === 401 || response.status === 403
      ? "La clave de Gemini fue rechazada."
      : response.status === 429
        ? "Gemini alcanzó su límite de uso."
        : `Gemini devolvió un error (${response.status}).`;
    throw Object.assign(new Error(message), { statusCode: 502, upstreamStatus: response.status });
  }
  return data;
}

async function geminiFetch(pathname, options = {}) {
  const key = aiSecrets.gemini;
  if (!key) throw Object.assign(new Error("Gemini no está configurado en esta sesión."), { statusCode: 409 });
  const separator = pathname.includes("?") ? "&" : "?";
  const response = await fetch(
    `https://generativelanguage.googleapis.com${pathname}${separator}key=${encodeURIComponent(key)}`,
    { ...options, signal: AbortSignal.timeout(AI_TIMEOUT_MS) },
  );
  return readUpstreamJson(response);
}

async function handleAiApi(req, res, pathname, port) {
  if (!authorizeLocalApi(req, port)) {
    sendJson(res, 403, { error: "solicitud local no autorizada" });
    return;
  }

  try {
    if (pathname === "/__noditos/ai/status" && req.method === "GET") {
      sendJson(res, 200, { providers: { gemini: Boolean(aiSecrets.gemini) } });
      return;
    }
    if (pathname === "/__noditos/ai/config/gemini" && req.method === "PUT") {
      const body = await readJsonBody(req, 32 * 1024);
      const key = typeof body.apiKey === "string" ? body.apiKey.trim() : "";
      if (key.length < 10 || key.length > 4096) {
        sendJson(res, 400, { error: "clave de Gemini inválida" });
        return;
      }
      aiSecrets.gemini = key;
      sendJson(res, 200, { ok: true, provider: "gemini", configured: true });
      return;
    }
    if (pathname === "/__noditos/ai/config/gemini" && req.method === "DELETE") {
      aiSecrets.gemini = "";
      sendJson(res, 200, { ok: true, provider: "gemini", configured: false });
      return;
    }
    if (pathname === "/__noditos/ai/models/gemini" && req.method === "GET") {
      const data = await geminiFetch("/v1beta/models");
      const models = (Array.isArray(data.models) ? data.models : [])
        .filter((model) => Array.isArray(model.supportedGenerationMethods) && model.supportedGenerationMethods.includes("generateContent"))
        .map((model) => ({ id: String(model.name || "").replace(/^models\//, ""), label: String(model.displayName || model.name || "") }))
        .filter((model) => model.id);
      sendJson(res, 200, { models });
      return;
    }
    if (pathname === "/__noditos/ai/chat/gemini" && req.method === "POST") {
      const body = await readJsonBody(req);
      const model = typeof body.model === "string" ? body.model.trim().replace(/^models\//, "") : "";
      const system = typeof body.system === "string" ? body.system : "";
      const user = typeof body.user === "string" ? body.user : "";
      const maxTokens = Math.max(1, Math.min(4096, Number(body.maxTokens) || 1600));
      if (!/^[a-zA-Z0-9._:-]+$/.test(model) || !user.trim()) {
        sendJson(res, 400, { error: "modelo o mensaje inválido" });
        return;
      }
      if (system.length + user.length > MAX_AI_INPUT) {
        sendJson(res, 413, { error: "el contexto de IA es demasiado grande" });
        return;
      }
      const data = await geminiFetch(`/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: [{ role: "user", parts: [{ text: user }] }],
          generationConfig: { temperature: 0.35, maxOutputTokens: maxTokens },
        }),
      });
      const candidate = data && data.candidates && data.candidates[0];
      const text = candidate && candidate.content && Array.isArray(candidate.content.parts)
        ? candidate.content.parts.map((part) => typeof part.text === "string" ? part.text : "").join("").trim()
        : "";
      if (!text) throw Object.assign(new Error("Gemini devolvió una respuesta vacía."), { statusCode: 502 });
      sendJson(res, 200, { text, finishReason: candidate.finishReason || "" });
      return;
    }

    res.writeHead(405, { "Allow": "GET, PUT, POST, DELETE", "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ error: "método o endpoint no permitido" }));
  } catch (error) {
    const status = Number(error && error.statusCode) || (error && error.name === "TimeoutError" ? 504 : 502);
    const safeMessage = status >= 500 ? "No se pudo completar la solicitud al proveedor de IA." : String(error.message || "solicitud inválida");
    log(`IA Gemini: solicitud fallida (${status}${error && error.upstreamStatus ? `, upstream ${error.upstreamStatus}` : ""}).`);
    if (!res.headersSent) sendJson(res, status, { error: safeMessage });
  }
}

/* ---------- servidor ---------- */
function startServer(port) {
  const server = http.createServer(async (req, res) => {
    const expectedHost = `${HOST}:${port}`;
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=()");
    res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
    res.setHeader(
      "Content-Security-Policy",
      "default-src 'self'; base-uri 'none'; object-src 'none'; frame-ancestors 'none'; " +
      "script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; " +
      "img-src 'self' data: blob: https:; " +
      "connect-src 'self' http://localhost:11434 http://127.0.0.1:11434 " +
      "https://api.openai.com https://api.anthropic.com https://api.groq.com https://api.mistral.ai " +
      "https://openrouter.ai https://api.deepseek.com https://api.x.ai https://api.together.xyz " +
      "https://api.perplexity.ai https://api.fireworks.ai https://api.cerebras.ai;",
    );
    if (req.headers.host !== expectedHost) {
      res.writeHead(421, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ error: "host no permitido" }));
      return;
    }
    const url = new URL(req.url, `http://${HOST}:${port}`);
    let pathname;
    try {
      pathname = decodeURIComponent(url.pathname);
    } catch {
      res.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("URL inválida");
      return;
    }
    log(`${req.method} ${pathname}`);

    if (pathname.startsWith("/__noditos/ai/")) {
      await handleAiApi(req, res, pathname, port);
      return;
    }

    if (pathname === "/__noditos/ping") {
      sendJson(res, 200, { app: "noditos", version: 1, build: BUILD_TAG });
      return;
    }
    if (pathname === "/__noditos/stop") {
      if (req.method !== "POST") {
        res.writeHead(405, { "Allow": "POST", "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ error: "método no permitido" }));
        return;
      }
      if (!authorizeLocalApi(req, port)) {
        sendJson(res, 403, { error: "solicitud local no autorizada" });
        return;
      }
      sendJson(res, 200, { ok: true, bye: true });
      log("Detención solicitada desde la app. Saliendo…");
      setTimeout(() => process.exit(0), 250);
      return;
    }

    const relativeFile = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
    if (pathname.includes("\0") || relativeFile.split("/").includes("..")) {
      res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Prohibido");
      return;
    }

    try {
      let servePath = relativeFile;
      let buf = distBuffer(servePath);
      if (!buf && servePath !== "index.html") {
        servePath = "index.html"; // SPA fallback
        buf = distBuffer(servePath);
      }
      if (!buf) {
        res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("No encontrado");
        return;
      }
      if (servePath === "index.html") {
        const html = buf.toString("utf8").replace(TOKEN_PLACEHOLDER, TOKEN);
        res.setHeader("Cache-Control", "no-store");
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(html);
        return;
      }
      const ext = path.extname(servePath).toLowerCase();
      res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
      res.end(buf);
    } catch {
      // Nunca intentar escribir headers dos veces: un fallo tardío en el
      // envío no debe tirar abajo el servidor con ERR_HTTP_HEADERS_SENT.
      if (!res.headersSent) {
        res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("Error interno");
      } else {
        res.end();
      }
    }
  });

  server.listen(port, HOST, () => {
    const url = `http://${HOST}:${port}`;
    console.log("");
    console.log("  ==============================================");
    console.log("    NODITOS está en ejecución");
    console.log(`    Versión:    Noditos ${BUILD_TAG}`);
    console.log("  ==============================================");
    console.log(`    App:        ${url}`);
    console.log(`    Registro:   ${LOG_PATH}`);
    console.log("    Detener:    botón «Detener» dentro de la app");
    if (FOREGROUND) console.log("                  o Ctrl+C / cerrar esta ventana");
    console.log("  ==============================================");
    console.log("");
    openBrowser(url);
  });

  server.on("error", (err) => {
    failKeepOpen(`No se pudo iniciar en el puerto ${port}.`, String(err && err.message));
  });
}

/* Si ya hay un Noditos corriendo, no duplicar: solo abrir otra pestaña. */
function checkRunning(port, cb) {
  const req = http.get(
    { host: HOST, port, path: "/__noditos/ping", timeout: 400 },
    (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => {
        try {
          const j = JSON.parse(data);
          cb(j && j.app === "noditos");
        } catch {
          cb(false);
        }
      });
    }
  );
  req.on("error", () => cb(false));
  req.on("timeout", () => {
    req.destroy();
    cb(false);
  });
}

function tryRunning(ports, done) {
  if (ports.length === 0) return done(false);
  checkRunning(ports[0], (ok) => {
    if (ok) {
      const url = `http://${HOST}:${ports[0]}`;
      log("Noditos ya está en ejecución; abriendo otra pestaña.");
      openBrowser(url);
      if (FOREGROUND || process.stdout.isTTY) {
        console.log(`  NODITOS ya está en ejecución en ${url} — abrí esa pestaña.`);
        console.log("  Presiona ENTER para cerrar esta ventana...");
        process.stdin.resume();
        process.stdin.on("data", () => process.exit(0));
      } else {
        setTimeout(() => process.exit(0), 300);
      }
      return done(true);
    }
    tryRunning(ports.slice(1), done);
  });
}

log(`Iniciando Noditos ${BUILD_TAG}…`);
const requested = portArg();
if (requested) {
  startServer(requested);
} else {
  tryRunning([4173, 4174, 4175, 4176, 4177, 4178], (found) => {
    if (found) return;
    findFreePort(4173, (port) => {
      if (!port) return failKeepOpen("No hay puertos libres entre 4173 y 4273.");
      if (port !== 4173) log(`Puerto 4173 ocupado; usando ${port}.`);
      startServer(port);
    });
  });
}
