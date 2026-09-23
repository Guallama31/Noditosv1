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

function portArg() {
  const a = args.find((x) => x.startsWith("--port="));
  return a ? parseInt(a.split("=")[1], 10) : null;
}

const isPkg = typeof process.pkg !== "undefined";

/* ---------- ubicación de la carpeta dist/ ---------- */
function distCandidates() {
  const cands = [];
  if (isPkg) cands.push(path.join(path.dirname(process.execPath), "dist"));
  cands.push(path.join(process.cwd(), "dist"));
  if (isPkg) cands.push(path.join(__dirname, "dist"));
  return cands;
}
const DIST = distCandidates().find((d) => fs.existsSync(path.join(d, "index.html")));
const DIST_ROOT = DIST ? path.resolve(DIST) : null;

const LOG_PATH = isPkg
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

if (!DIST) {
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
  const child = spawn(process.execPath, [process.argv[1], ...args, "--foreground"], {
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

/* ---------- servidor ---------- */
function startServer(port) {
  const server = http.createServer((req, res) => {
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

    if (pathname === "/__noditos/ping") {
      sendJson(res, 200, { app: "noditos", version: 1 });
      return;
    }
    if (pathname === "/__noditos/stop") {
      if (req.method !== "POST") {
        res.writeHead(405, { "Allow": "POST", "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify({ error: "método no permitido" }));
        return;
      }
      if (url.searchParams.get("token") !== TOKEN) {
        sendJson(res, 403, { error: "token inválido" });
        return;
      }
      sendJson(res, 200, { ok: true, bye: true });
      log("Detención solicitada desde la app. Saliendo…");
      setTimeout(() => process.exit(0), 250);
      return;
    }

    const relativeFile = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
    let filePath = path.resolve(DIST_ROOT, relativeFile);
    const insideDist = filePath === DIST_ROOT || filePath.startsWith(DIST_ROOT + path.sep);
    if (!insideDist || pathname.includes("\0")) {
      res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Prohibido");
      return;
    }
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      filePath = path.join(DIST_ROOT, "index.html"); // SPA fallback
    }

    try {
      if (filePath.endsWith("index.html")) {
        let html = fs.readFileSync(filePath, "utf8");
        html = html.replace(TOKEN_PLACEHOLDER, TOKEN);
        res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        res.end(html);
        return;
      }
      const ext = path.extname(filePath).toLowerCase();
      res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
      fs.createReadStream(filePath).pipe(res);
    } catch {
      res.writeHead(500);
      res.end("Error interno");
    }
  });

  server.listen(port, HOST, () => {
    const url = `http://${HOST}:${port}`;
    console.log("");
    console.log("  ==============================================");
    console.log("    NODITOS está en ejecución");
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

log("Iniciando Noditos…");
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
