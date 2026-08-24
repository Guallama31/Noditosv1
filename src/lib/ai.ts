import type { MindNode } from "../types";

export type AiProvider = "gemini" | "openai" | "groq" | "ollama";

export interface AiConfig {
  provider: AiProvider;
  apiKey: string;
  geminiModel: string;
  openaiModel: string;
  groqModel: string;
  ollamaUrl: string;
  ollamaModel: string;
}

export interface ProviderDef {
  id: AiProvider;
  name: string;
  tagline: string;
  keyUrl?: string;
  needsKey: boolean;
  local?: boolean;
}

export const PROVIDERS: ProviderDef[] = [
  { id: "gemini", name: "Gemini", tagline: "Google · capa gratuita generosa", keyUrl: "https://aistudio.google.com/apikey", needsKey: true },
  { id: "openai", name: "OpenAI", tagline: "GPT · pago por uso", keyUrl: "https://platform.openai.com/api-keys", needsKey: true },
  { id: "groq", name: "Groq", tagline: "Llama/Mixtral · rapidísimo, capa gratuita", keyUrl: "https://console.groq.com/keys", needsKey: true },
  { id: "ollama", name: "Ollama", tagline: "Modelos locales · 100% privado", needsKey: false, local: true },
];

export const OLLAMA_DEFAULT_URL = "http://localhost:11434";

export const DEFAULT_MODELS: Record<AiProvider, string> = {
  gemini: "gemini-2.5-flash",
  openai: "gpt-4o-mini",
  groq: "llama-3.3-70b-versatile",
  ollama: "llama3.2",
};

export function defaultAiConfig(): AiConfig {
  return {
    provider: "gemini",
    apiKey: "",
    geminiModel: DEFAULT_MODELS.gemini,
    openaiModel: DEFAULT_MODELS.openai,
    groqModel: DEFAULT_MODELS.groq,
    ollamaUrl: OLLAMA_DEFAULT_URL,
    ollamaModel: DEFAULT_MODELS.ollama,
  };
}

const AI_KEY = "noditos.ai.v1";

export function loadAiConfig(): AiConfig {
  try {
    const raw = localStorage.getItem(AI_KEY);
    if (raw) return { ...defaultAiConfig(), ...(JSON.parse(raw) as Partial<AiConfig>) };
  } catch {
    /* sin config */
  }
  return defaultAiConfig();
}

export function saveAiConfig(cfg: AiConfig) {
  try {
    localStorage.setItem(AI_KEY, JSON.stringify(cfg));
  } catch {
    /* almacenamiento no disponible */
  }
}

export function isAiConfigured(cfg: AiConfig): boolean {
  if (cfg.provider === "ollama") return cfg.ollamaUrl.trim().length > 0;
  return cfg.apiKey.trim().length > 0;
}

export function activeModelId(cfg: AiConfig): string {
  switch (cfg.provider) {
    case "gemini": return cfg.geminiModel;
    case "openai": return cfg.openaiModel;
    case "groq": return cfg.groqModel;
    case "ollama": return cfg.ollamaModel;
  }
}

/* ---------------- consulta en vivo de modelos ---------------- */

export interface FetchedModel {
  id: string;
  label: string;
  free: boolean;
  note?: string;
}

function prettify(id: string): string {
  return id
    .replace(/^(models\/|openai\/|meta-llama\/|qwen\/)/, "")
    .split(/[-_:]/)
    .filter(Boolean)
    .map((p) => (p.length <= 3 ? p.toUpperCase() : p.charAt(0).toUpperCase() + p.slice(1)))
    .join(" ");
}

function formatSize(bytes?: number): string | undefined {
  if (!bytes || bytes <= 0) return undefined;
  const gb = bytes / 1024 ** 3;
  return gb >= 1 ? `${gb.toFixed(1).replace(".", ",")} GB` : `${Math.round(bytes / 1024 ** 2)} MB`;
}

function sortDesc(a: string, b: string): number {
  return b.localeCompare(a, undefined, { numeric: true });
}

/**
 * Consulta el endpoint oficial de cada proveedor y devuelve los modelos que
 * tu clave (o tu Ollama local) puede usar HOY, no un catálogo fijo.
 */
export async function fetchProviderModels(cfg: AiConfig): Promise<FetchedModel[]> {
  const key = cfg.apiKey.trim();

  if (cfg.provider === "gemini") {
    if (!key) throw new Error("Ingresá tu clave de Google AI Studio para consultar los modelos.");
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}`);
    if (!res.ok) throw new Error(httpError(res.status, await res.text()));
    const data = await res.json();
    const raw = (data.models ?? []) as Array<{ name: string; displayName?: string; supportedGenerationMethods?: string[] }>;
    const models = raw
      .filter((m) => (m.supportedGenerationMethods ?? []).includes("generateContent"))
      .map((m) => {
        const id = m.name.replace(/^models\//, "");
        const free = /flash|lite|gemma/i.test(id) && !/pro/i.test(id);
        return { id, label: m.displayName?.trim() || prettify(id), free, note: free ? "Capa gratuita con cuota diaria" : "Pago por uso" };
      })
      .sort((a, b) => sortDesc(a.id, b.id));
    if (models.length === 0) throw new Error("Google no devolvió modelos de texto para esta clave.");
    return models;
  }

  if (cfg.provider === "openai") {
    if (!key) throw new Error("Ingresá tu clave de OpenAI para consultar los modelos.");
    const res = await fetch("https://api.openai.com/v1/models", { headers: { Authorization: `Bearer ${key}` } });
    if (!res.ok) throw new Error(httpError(res.status, await res.text()));
    const data = await res.json();
    const models = ((data.data ?? []) as Array<{ id: string }>)
      .map((m) => m.id)
      .filter((id) => /^(gpt-|o\d|chatgpt-)/.test(id))
      .filter((id) => !/(audio|tts|whisper|dall-e|realtime|embed|search|transcribe|image)/.test(id))
      .sort(sortDesc)
      .map((id) => ({ id, label: prettify(id), free: false, note: "Pago por uso (se cobra por token)" }));
    if (models.length === 0) throw new Error("OpenAI no devolvió modelos conversacionales para esta clave.");
    return models;
  }

  if (cfg.provider === "groq") {
    if (!key) throw new Error("Ingresá tu clave de Groq para consultar los modelos.");
    const res = await fetch("https://api.groq.com/openai/v1/models", { headers: { Authorization: `Bearer ${key}` } });
    if (!res.ok) throw new Error(httpError(res.status, await res.text()));
    const data = await res.json();
    const models = ((data.data ?? []) as Array<{ id: string }>)
      .map((m) => m.id)
      .filter((id) => !/whisper|distill|playground/.test(id))
      .sort(sortDesc)
      .map((id) => ({ id, label: prettify(id), free: true, note: "Capa gratuita con límites de velocidad" }));
    if (models.length === 0) throw new Error("Groq no devolvió modelos para esta clave.");
    return models;
  }

  // Ollama: modelos instalados en la PC.
  const base = cfg.ollamaUrl.trim().replace(/\/+$/, "");
  if (!base) throw new Error("Ingresá la dirección del servidor Ollama.");
  const res = await fetch(`${base}/api/tags`).catch(() => {
    throw new Error(`No se pudo conectar con Ollama en ${base}. Verificá que esté corriendo (ollama serve).`);
  });
  if (!res.ok) throw new Error(httpError(res.status, await res.text()));
  const data = await res.json();
  const models = ((data.models ?? []) as Array<{ name: string; size?: number }>).map((m) => ({
    id: m.name,
    label: prettify(m.name.replace(/:latest$/, "")),
    free: true,
    note: `Gratis · corre en tu PC${formatSize(m.size) ? ` · ${formatSize(m.size)}` : ""}`,
  }));
  if (models.length === 0) throw new Error("Ollama está conectado pero no tiene modelos instalados. Corré, por ejemplo: ollama pull llama3.2");
  return models;
}

/* ---------------- llamadas a la IA ---------------- */

function httpError(status: number, body: string): string {
  let msg = "";
  try {
    const j = JSON.parse(body) as { error?: { message?: string } };
    msg = j.error?.message ?? "";
  } catch {
    msg = body.slice(0, 160);
  }
  if (status === 401 || status === 403) return "La clave fue rechazada (401/403). Revisala en la configuración.";
  if (status === 429) return "Límite de uso alcanzado (429). Esperá un momento o cambiá de modelo.";
  return `Error ${status} del proveedor${msg ? `: ${msg}` : ""}.`;
}

export async function askAi(cfg: AiConfig, system: string, user: string): Promise<string> {
  if (!isAiConfigured(cfg)) throw new Error("El Ayudante no está configurado. Abrí «Ayudante IA» en la biblioteca.");

  if (cfg.provider === "gemini") {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${cfg.geminiModel}:generateContent?key=${encodeURIComponent(cfg.apiKey.trim())}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: [{ role: "user", parts: [{ text: user }] }],
          generationConfig: { temperature: 0.7 },
        }),
      },
    );
    if (!res.ok) throw new Error(httpError(res.status, await res.text()));
    const data = await res.json();
    const text = data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("");
    if (!text) throw new Error("Gemini devolvió una respuesta vacía.");
    return text.trim();
  }

  if (cfg.provider === "openai" || cfg.provider === "groq") {
    const url = cfg.provider === "openai" ? "https://api.openai.com/v1/chat/completions" : "https://api.groq.com/openai/v1/chat/completions";
    const model = cfg.provider === "openai" ? cfg.openaiModel : cfg.groqModel;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${cfg.apiKey.trim()}` },
      body: JSON.stringify({
        model,
        temperature: 0.7,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });
    if (!res.ok) throw new Error(httpError(res.status, await res.text()));
    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content;
    if (!text) throw new Error("El proveedor devolvió una respuesta vacía.");
    return String(text).trim();
  }

  // Ollama local
  const base = cfg.ollamaUrl.trim().replace(/\/+$/, "");
  const res = await fetch(`${base}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: cfg.ollamaModel,
      stream: false,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  }).catch(() => {
    throw new Error(`No se pudo conectar con Ollama en ${base}. Verificá que esté corriendo.`);
  });
  if (!res.ok) throw new Error(httpError(res.status, await res.text()));
  const data = await res.json();
  const text = data?.message?.content;
  if (!text) throw new Error("Ollama devolvió una respuesta vacía.");
  return String(text).trim();
}

/* ---------------- contexto del mapa ---------------- */

export function mapToCompactText(root: MindNode, maxNodes = 150, withNotes = false): string {
  const lines: string[] = [];
  let count = 0;
  const walk = (node: MindNode, depth: number) => {
    if (count >= maxNodes) return;
    count++;
    const label = node.text.trim() || "(nodo vacío)";
    const indent = "  ".repeat(depth);
    lines.push(indent + "- " + label);
    if (withNotes && node.notes.trim()) {
      for (const nl of node.notes.trim().split("\n")) {
        if (nl.trim()) lines.push(indent + "    [nota] " + nl.trim());
      }
    }
    if (!node.collapsed) node.children.forEach((c) => walk(c, depth + 1));
  };
  walk(root, 0);
  if (count >= maxNodes) lines.push("  …(mapa recortado por tamaño)");
  return lines.join("\n");
}

/* ---------------- parseo de respuestas ---------------- */

/** Quita bloques de código markdown (```json ... ```) si los hay. */
function normalizeText(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\n/g, "\n")
    .replace(/\t/g, "\t")
    .replace(/\u003c/g, "<")
    .replace(/\u003e/g, ">")
    .replace(/`/g, "");
}

function stripFences(text: string): string {
  const clean = normalizeText(text);
  const fence = clean.match(/```[a-zA-Z]*\n?([\s\S]*?)```/);
  return fence ? fence[1] : clean;
}

function extractPlainListItems(text: string): string[] {
  const clean = normalizeText(stripFences(text));
  const lines = clean
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const items: string[] = [];
  for (const line of lines) {
    if (/^(?:[*•\-]\s*)?(?:input|output|constraint|requirement|goal|example|topic|question|answer|response|result|here is|the user|the model|i need|exactly|no extra|no markdown|only|without)\b/i.test(line)) continue;
    if (/^(ideas?|sugerencias?|opciones?)\s*:?$/i.test(line)) continue;
    const m = line.match(/^(?:[-*•▪◦]|\d+[.)])\s*(.+)$/)
      || line.match(/^(?:[A-Za-zÀ-ÿ0-9][^:]{0,40}?:\s*)?(.+)$/);
    if (!m) continue;
    const value = m[1]
      .replace(/^[-*•▪◦]\s*/, "")
      .replace(/^['"“”‘’]+|['"“”‘’]+$/g, "")
      .replace(/^[A-Za-zÀ-ÿ0-9][^:]{0,40}:\s*/, "")
      .trim();
    if (!value || /^(aquí|resultado|respuesta|lista|ideas?|puntos?|input|output|constraint|requirement|goal|example|topic|question|answer|here is)\b/i.test(value)) continue;
    items.push(value.replace(/\s+/g, " ").trim());
  }
  return items;
}

function extractQuestionPairs(text: string): QAItem[] {
  const cleaned = stripFences(text).replace(/```/g, "");
  const items: QAItem[] = [];
  const qaRegex = /(?:^|\n)\s*(?:[*•\-]\s*)?(?:\d+[.)]\s*)?(?:Q(?:uestion|uestions)?|P(?:regunta|reguntas)?)\s*[:\-]?\s*(.+?)(?:\n\s*(?:[*•\-]\s*)?(?:A(?:nswer|answers)?|R(?:espuesta|respuestas)?)\s*[:\-]?\s*(.+?))?(?=\n\s*(?:[*•\-]\s*)?(?:\d+[.)]\s*)?(?:Q(?:uestion|uestions)?|P(?:regunta|reguntas)?)\s*[:\-]?|$)/gis;
  const matches = [...cleaned.matchAll(qaRegex)];
  if (matches.length > 0) {
    for (const match of matches) {
      const q = (match[1] ?? "").replace(/^[-*•▪◦]\s*/, "").trim();
      const a = (match[2] ?? "").replace(/^[-*•▪◦]\s*/, "").trim();
      if (q) items.push({ q, a: a || "" });
    }
  }
  if (items.length > 0) return items;

  const lines = cleaned.split(/\r?\n/);
  let currentQ = "";
  let currentA = "";
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    if (/^(?:[*•\-]\s*)?(?:\d+[.)]\s*)?(?:Q(?:uestion|uestions)?|P(?:regunta|reguntas)?)\s*[:\-]?/i.test(line)) {
      if (currentQ && currentA) items.push({ q: currentQ, a: currentA });
      currentQ = line.replace(/^(?:[*•\-]\s*)?(?:\d+[.)]\s*)?(?:Q(?:uestion|uestions)?|P(?:regunta|reguntas)?)\s*[:\-]?\s*/i, "").trim();
      currentA = "";
      continue;
    }
    if (/^(?:[*•\-]\s*)?(?:A(?:nswer|answers)?|R(?:espuesta|respuestas)?)\s*[:\-]?/i.test(line)) {
      currentA = line.replace(/^(?:[*•\-]\s*)?(?:A(?:nswer|answers)?|R(?:espuesta|respuestas)?)\s*[:\-]?\s*/i, "").trim();
      continue;
    }
    if (currentQ && !currentA && (/^[-*•]\s*/.test(line) || /^\d+[.)]\s*/.test(line))) {
      currentA = line.replace(/^[-*•]\s*/, "").replace(/^\d+[.)]\s*/, "").trim();
    }
  }
  if (currentQ) items.push({ q: currentQ, a: currentA });
  return items;
}

/** Intenta reparar JSON común malformado (comas sobrantes) y parsearlo. */
function tryParseJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    // reparos habituales: comas antes de ] o } y saltos de línea literales dentro de strings
    const repaired = raw
      .replace(/,\s*([}\]])/g, "$1")
      .replace(/[\u0000-\u001f]+/g, " ");
    return JSON.parse(repaired);
  }
}

function extractArray(text: string): unknown[] {
  const clean = stripFences(text);
  const candidates = [
    ...new Set(
      Array.from(clean.matchAll(/\[[\s\S]*?\]/g)).map((m) => m[0]),
      Array.from(clean.matchAll(/\{[\s\S]*?\}/g)).map((m) => m[0]),
    ),
  ].filter((candidate) => candidate.length > 2 && (candidate.startsWith("[") || candidate.startsWith("{")));

  for (const candidate of candidates) {
    try {
      const parsed = tryParseJson(candidate);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // intenta con el siguiente candidato
    }
  }

  const start = clean.indexOf("[");
  const end = clean.lastIndexOf("]");
  if (start === -1 || end === -1 || end < start) {
    throw new Error("La respuesta no tiene el formato esperado (lista).");
  }

  try {
    const parsed = tryParseJson(clean.slice(start, end + 1));
    if (Array.isArray(parsed)) return parsed;
  } catch {
    // no es un JSON directo, pero seguimos con el fallback textual
  }

  throw new Error("La respuesta no tiene el formato esperado (lista).");
}

export function parseSuggestionList(text: string): string[] {
  try {
    const hint = extractArray(text)
      .map((x) => (typeof x === "string" ? x.trim() : ""))
      .filter((x) => x.length > 0);
    if (hint.length > 0) return hint;
  } catch {
    // sigue con líneas simples
  }

  const plain = extractPlainListItems(text);
  if (plain.length > 0) return plain;
  throw new Error("La respuesta no trae ideas para sugerir.");
}

export interface QAItem { q: string; a: string; }

export function parseQA(text: string): QAItem[] {
  try {
    const items = extractArray(text).map((x) => {
      const o = (x ?? {}) as Record<string, unknown>;
      const q = typeof o.q === "string" ? o.q : typeof o.pregunta === "string" ? o.pregunta : typeof o.question === "string" ? o.question : "";
      const a = typeof o.a === "string" ? o.a : typeof o.respuesta === "string" ? o.respuesta : typeof o.answer === "string" ? o.answer : "";
      return { q: q.trim(), a: a.trim() };
    });
    const valid = items.filter((i) => i.q.length > 0);
    if (valid.length > 0) return valid;
  } catch {
    // sigue con el formato Q/A textual
  }

  const fallback = extractQuestionPairs(text).map((item) => ({
    q: item.q.replace(/^["'“”‘’]+|["'“”‘’]+$/g, "").trim(),
    a: item.a.replace(/^["'“”‘’]+|["'“”‘’]+$/g, "").trim(),
  })).filter((item) => item.q.length > 0);

  if (fallback.length === 0) throw new Error("La respuesta no trae preguntas.");
  return fallback;
}

export function parseIndexList(text: string, count: number): number[] {
  try {
    const raw = extractArray(text).filter((x): x is number => typeof x === "number" && Number.isInteger(x));
    const seen = new Set<number>();
    const ordered: number[] = [];
    for (const i of raw) {
      if (i >= 0 && i < count && !seen.has(i)) {
        seen.add(i);
        ordered.push(i);
      }
    }
    for (let i = 0; i < count; i++) if (!seen.has(i)) ordered.push(i);
    if (ordered.length === count) return ordered;
  } catch {
    // sigue con números en texto
  }

  const numbers = [...text.matchAll(/\b\d+\b/g)].map((m) => Number(m[0])).filter((n) => Number.isInteger(n) && n >= 0 && n < count);
  const unique = [...new Set(numbers)];
  if (unique.length === count) return unique;
  if (unique.length > 0) return [...unique, ...Array.from({ length: count }, (_, i) => i).filter((i) => !unique.includes(i))];
  throw new Error("No se pudo interpretar el orden.");
}

export function parseIndexGroups(text: string, count: number): number[][] {
  try {
    const raw = extractArray(text);
    const groups: number[][] = [];
    for (const g of raw) {
      if (!Array.isArray(g)) continue;
      const ids = g.filter((x): x is number => typeof x === "number" && Number.isInteger(x) && x >= 0 && x < count);
      const unique = [...new Set(ids)];
      if (unique.length >= 2) groups.push(unique);
    }
    if (groups.length > 0) return groups;
  } catch {
    // sigue con grupos en texto
  }

  const groups: number[][] = [];
  const cleaned = stripFences(text).split(/\r?\n/);
  for (const line of cleaned) {
    const numbers = [...line.matchAll(/\b\d+\b/g)].map((m) => Number(m[0])).filter((n) => n >= 0 && n < count);
    const unique = [...new Set(numbers)];
    if (unique.length >= 2) groups.push(unique);
  }
  return groups;
}

export interface OutlineItem {
  level: number;
  text: string;
  /** Nota asociada al nodo (traducida junto con el resto). */
  notes?: string;
}

/**
 * Respaldo: interpreta la respuesta como un esquema de texto indentado
 * (guiones, asteriscos, numeración o sangría por espacios/tabs), que es el
 * formato que muchos modelos producen aunque se les pida JSON.
 */
function parseOutlineFromLines(text: string): OutlineItem[] {
  const items: OutlineItem[] = [];
  for (const rawLine of stripFences(text).split("\n")) {
    const trimmed = rawLine.trim();
    if (!trimmed) continue;
    const line = trimmed
      .replace(/^(?:[*•\-]\s*)?(?:input|output|constraint|requirement|goal|example|response|result|topic|here is|the user|summary|question|answer)\s*[:\-]?\s*/i, "")
      .trim();
    if (!line) continue;
    const indentMatch = rawLine.match(/^[\t ]*/);
    const indentChars = indentMatch ? indentMatch[0] : "";
    const indent = indentChars.replace(/\t/g, "  ").length / 2;
    const cleaned = line
      .replace(/^(?:[-*•▪◦]|\d+[.)])\s+/, "")
      .replace(/^\*\*(.+?)\*\*:??\s*$/, "$1")
      .trim();
    if (!cleaned) continue;
    items.push({ level: Math.max(0, Math.round(indent)), text: cleaned });
  }
  return items;
}

export function parseOutline(text: string): OutlineItem[] {
  let items: OutlineItem[];
  try {
    items = extractArray(text).map((x) => {
      const o = (x ?? {}) as Record<string, unknown>;
      const level = typeof o.level === "number" ? Math.max(0, o.level) : 0;
      const t = typeof o.text === "string" ? o.text.trim() : "";
      const rawNotes =
        typeof o.notes === "string"
          ? o.notes
          : typeof o.note === "string"
            ? o.note
            : typeof o.nota === "string"
              ? o.nota
              : "";
      return { level, text: t, notes: rawNotes.trim() || undefined };
    });
  } catch {
    // el modelo no devolvió JSON válido: intento el formato de líneas
    items = parseOutlineFromLines(text);
  }
  const valid = items.filter((i) => i.text.length > 0);
  if (valid.length === 0) throw new Error("La respuesta no trae líneas de texto.");
  const min = Math.min(...valid.map((i) => i.level));
  return valid.map((i) => ({ ...i, level: i.level - min }));
}
