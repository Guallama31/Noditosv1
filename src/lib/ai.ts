import type { MindNode } from "../types";

export type AiProvider =
  | "gemini"
  | "openai"
  | "anthropic"
  | "groq"
  | "mistral"
  | "openrouter"
  | "deepseek"
  | "xai"
  | "together"
  | "perplexity"
  | "fireworks"
  | "cerebras"
  | "ollama";

export interface AiConfig {
  provider: AiProvider;
  /** Compatibilidad con configuraciones viejas: clave activa del proveedor seleccionado. */
  apiKey: string;
  /** Claves separadas por proveedor, para poder cambiar sin sobrescribir la anterior. */
  apiKeys: Partial<Record<AiProvider, string>>;
  /** Si es false, las claves solo viven en sessionStorage hasta cerrar la pestaña. */
  saveApiKey: boolean;
  /** Campos heredados: se mantienen para migrar usuarios existentes. */
  geminiModel: string;
  openaiModel: string;
  groqModel: string;
  ollamaUrl: string;
  ollamaModel: string;
  /** Modelo elegido por proveedor (incluye proveedores nuevos). */
  modelByProvider: Partial<Record<AiProvider, string>>;
}

export interface ProviderDef {
  id: AiProvider;
  name: string;
  tagline: string;
  keyUrl?: string;
  keyPlaceholder?: string;
  needsKey: boolean;
  local?: boolean;
}

export const PROVIDERS: ProviderDef[] = [
  { id: "gemini", name: "Gemini", tagline: "Google · rápido y multimodal", keyUrl: "https://aistudio.google.com/apikey", keyPlaceholder: "AIza…", needsKey: true },
  { id: "openai", name: "OpenAI", tagline: "GPT · pago por uso", keyUrl: "https://platform.openai.com/api-keys", keyPlaceholder: "sk-…", needsKey: true },
  { id: "anthropic", name: "Anthropic", tagline: "Claude · escritura y análisis", keyUrl: "https://console.anthropic.com/settings/keys", keyPlaceholder: "sk-ant-…", needsKey: true },
  { id: "groq", name: "Groq", tagline: "Llama/Qwen · muy rápido", keyUrl: "https://console.groq.com/keys", keyPlaceholder: "gsk_…", needsKey: true },
  { id: "mistral", name: "Mistral", tagline: "Modelos europeos · API propia", keyUrl: "https://console.mistral.ai/api-keys", keyPlaceholder: "…", needsKey: true },
  { id: "openrouter", name: "OpenRouter", tagline: "Decenas de modelos en una API", keyUrl: "https://openrouter.ai/settings/keys", keyPlaceholder: "sk-or-…", needsKey: true },
  { id: "deepseek", name: "DeepSeek", tagline: "Razonamiento y código", keyUrl: "https://platform.deepseek.com/api_keys", keyPlaceholder: "sk-…", needsKey: true },
  { id: "xai", name: "xAI", tagline: "Grok · API compatible", keyUrl: "https://console.x.ai/team/api-keys", keyPlaceholder: "xai-…", needsKey: true },
  { id: "together", name: "Together AI", tagline: "Open models · servidor rápido", keyUrl: "https://api.together.xyz/settings/api-keys", keyPlaceholder: "…", needsKey: true },
  { id: "perplexity", name: "Perplexity", tagline: "Sonar · respuestas con búsqueda", keyUrl: "https://www.perplexity.ai/settings/api", keyPlaceholder: "pplx-…", needsKey: true },
  { id: "fireworks", name: "Fireworks", tagline: "Open models optimizados", keyUrl: "https://fireworks.ai/account/api-keys", keyPlaceholder: "fw_…", needsKey: true },
  { id: "cerebras", name: "Cerebras", tagline: "Llama veloz · inferencia rápida", keyUrl: "https://cloud.cerebras.ai/platform/", keyPlaceholder: "csk-…", needsKey: true },
  { id: "ollama", name: "Ollama", tagline: "Modelos locales · 100% privado", needsKey: false, local: true },
];

export const OLLAMA_DEFAULT_URL = "http://localhost:11434";

export const DEFAULT_MODELS: Record<AiProvider, string> = {
  gemini: "gemini-2.5-flash",
  openai: "gpt-4o-mini",
  anthropic: "claude-3-5-haiku-latest",
  groq: "llama-3.3-70b-versatile",
  mistral: "mistral-small-latest",
  openrouter: "openai/gpt-4o-mini",
  deepseek: "deepseek-chat",
  xai: "grok-2-latest",
  together: "meta-llama/Llama-3.3-70B-Instruct-Turbo",
  perplexity: "sonar-pro",
  fireworks: "accounts/fireworks/models/llama-v3p3-70b-instruct",
  cerebras: "llama-3.3-70b",
  ollama: "llama3.2",
};

const PROVIDER_IDS = new Set<AiProvider>(PROVIDERS.map((p) => p.id));

type LegacyModelKey = "geminiModel" | "openaiModel" | "groqModel" | "ollamaModel";

function isAiProvider(value: unknown): value is AiProvider {
  return typeof value === "string" && PROVIDER_IDS.has(value as AiProvider);
}

function legacyModelKeyFor(provider: AiProvider): LegacyModelKey | null {
  switch (provider) {
    case "gemini": return "geminiModel";
    case "openai": return "openaiModel";
    case "groq": return "groqModel";
    case "ollama": return "ollamaModel";
    default: return null;
  }
}

function readSessionKeys(): Partial<Record<AiProvider, string>> {
  try {
    const raw = sessionStorage.getItem(AI_SESSION_KEYS);
    const parsed = raw ? (JSON.parse(raw) as Partial<Record<AiProvider, string>>) : {};
    return Object.fromEntries(
      Object.entries(parsed).filter(([provider, key]) => isAiProvider(provider) && typeof key === "string"),
    ) as Partial<Record<AiProvider, string>>;
  } catch {
    return {};
  }
}

function normalizeConfig(input?: Partial<AiConfig>): AiConfig {
  const defaults = defaultAiConfig();
  const savedProvider = isAiProvider(input?.provider) ? input.provider : defaults.provider;
  const modelByProvider: Partial<Record<AiProvider, string>> = {
    ...DEFAULT_MODELS,
    ...(input?.modelByProvider ?? {}),
  };
  if (input?.geminiModel) modelByProvider.gemini = input.geminiModel;
  if (input?.openaiModel) modelByProvider.openai = input.openaiModel;
  if (input?.groqModel) modelByProvider.groq = input.groqModel;
  if (input?.ollamaModel) modelByProvider.ollama = input.ollamaModel;

  const apiKeys: Partial<Record<AiProvider, string>> = { ...(input?.apiKeys ?? {}) };
  if (typeof input?.apiKey === "string" && input.apiKey && !apiKeys[savedProvider]) {
    apiKeys[savedProvider] = input.apiKey;
  }

  const cfg: AiConfig = {
    ...defaults,
    ...input,
    provider: savedProvider,
    apiKey: "",
    apiKeys,
    modelByProvider,
    geminiModel: modelByProvider.gemini ?? DEFAULT_MODELS.gemini,
    openaiModel: modelByProvider.openai ?? DEFAULT_MODELS.openai,
    groqModel: modelByProvider.groq ?? DEFAULT_MODELS.groq,
    ollamaUrl: input?.ollamaUrl ?? defaults.ollamaUrl,
    ollamaModel: modelByProvider.ollama ?? DEFAULT_MODELS.ollama,
  };
  cfg.apiKey = providerApiKey(cfg, cfg.provider);
  return cfg;
}

export function defaultAiConfig(): AiConfig {
  return {
    provider: "gemini",
    apiKey: "",
    apiKeys: {},
    saveApiKey: true,
    geminiModel: DEFAULT_MODELS.gemini,
    openaiModel: DEFAULT_MODELS.openai,
    groqModel: DEFAULT_MODELS.groq,
    ollamaUrl: OLLAMA_DEFAULT_URL,
    ollamaModel: DEFAULT_MODELS.ollama,
    modelByProvider: { ...DEFAULT_MODELS },
  };
}

const AI_KEY = "noditos.ai.v1";
const AI_SESSION_KEY = "noditos.ai.sessionKey.v1";
const AI_SESSION_KEYS = "noditos.ai.sessionKeys.v1";

export function providerApiKey(cfg: AiConfig, provider: AiProvider = cfg.provider): string {
  if (provider === "ollama") return "";
  if (cfg.apiKeys && Object.prototype.hasOwnProperty.call(cfg.apiKeys, provider)) {
    return (cfg.apiKeys[provider] ?? "").trim();
  }
  // Fallback solo para configuraciones heredadas que todavía no tienen apiKeys.
  return provider === cfg.provider && Object.keys(cfg.apiKeys ?? {}).length === 0 ? cfg.apiKey.trim() : "";
}

export function withProviderApiKey(cfg: AiConfig, key: string, provider: AiProvider = cfg.provider): AiConfig {
  const next = normalizeConfig({
    ...cfg,
    apiKey: provider === cfg.provider ? key : cfg.apiKey,
    apiKeys: { ...(cfg.apiKeys ?? {}), [provider]: key },
  });
  next.apiKey = providerApiKey(next, next.provider);
  return next;
}

export function activeModelId(cfg: AiConfig, provider: AiProvider = cfg.provider): string {
  const fromMap = cfg.modelByProvider?.[provider]?.trim();
  if (fromMap) return fromMap;
  const legacyKey = legacyModelKeyFor(provider);
  if (legacyKey && cfg[legacyKey]?.trim()) return cfg[legacyKey].trim();
  return DEFAULT_MODELS[provider];
}

export function withActiveModel(cfg: AiConfig, model: string, provider: AiProvider = cfg.provider): AiConfig {
  const legacyKey = legacyModelKeyFor(provider);
  const next: AiConfig = {
    ...cfg,
    modelByProvider: { ...(cfg.modelByProvider ?? {}), [provider]: model },
  };
  if (legacyKey) next[legacyKey] = model;
  return normalizeConfig(next);
}

export function loadAiConfig(): AiConfig {
  try {
    const raw = localStorage.getItem(AI_KEY);
    const saved = raw ? (JSON.parse(raw) as Partial<AiConfig>) : {};
    const cfg = normalizeConfig(saved);
    if (!cfg.saveApiKey) {
      const sessionKeys = readSessionKeys();
      const legacySessionKey = sessionStorage.getItem(AI_SESSION_KEY) ?? "";
      cfg.apiKeys = { ...cfg.apiKeys, ...sessionKeys };
      if (legacySessionKey && !cfg.apiKeys[cfg.provider]) cfg.apiKeys[cfg.provider] = legacySessionKey;
      cfg.apiKey = providerApiKey(cfg, cfg.provider);
    }
    return cfg;
  } catch {
    /* sin config */
  }
  return defaultAiConfig();
}

export function saveAiConfig(cfg: AiConfig) {
  try {
    const normalized = normalizeConfig(cfg);
    if (normalized.saveApiKey) {
      localStorage.setItem(AI_KEY, JSON.stringify(normalized));
      sessionStorage.removeItem(AI_SESSION_KEY);
      sessionStorage.removeItem(AI_SESSION_KEYS);
      return;
    }

    const persistable: AiConfig = { ...normalized, apiKey: "", apiKeys: {} };
    localStorage.setItem(AI_KEY, JSON.stringify(persistable));
    sessionStorage.setItem(AI_SESSION_KEYS, JSON.stringify(normalized.apiKeys ?? {}));
    sessionStorage.setItem(AI_SESSION_KEY, providerApiKey(normalized));
  } catch {
    /* almacenamiento no disponible */
  }
}

export function isAiConfigured(cfg: AiConfig): boolean {
  if (cfg.provider === "ollama") return cfg.ollamaUrl.trim().length > 0;
  return providerApiKey(cfg).length > 0;
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

interface OpenAiCompatDef {
  baseUrl: string;
  freeModels?: boolean;
  note: string;
  filter?: (id: string) => boolean;
}

const TEXT_MODEL_EXCLUDE_RE = /(audio|tts|whisper|dall-e|realtime|embed|embedding|moderation|image|vision-preview|rerank|transcribe|speech)/i;

const OPENAI_COMPAT: Partial<Record<AiProvider, OpenAiCompatDef>> = {
  openai: {
    baseUrl: "https://api.openai.com/v1",
    note: "Pago por uso (se cobra por token)",
    filter: (id) => /^(gpt-|o\d|chatgpt-)/.test(id) && !TEXT_MODEL_EXCLUDE_RE.test(id),
  },
  groq: {
    baseUrl: "https://api.groq.com/openai/v1",
    freeModels: true,
    note: "Capa gratuita con límites de velocidad",
    filter: (id) => !/whisper|playground/i.test(id),
  },
  mistral: {
    baseUrl: "https://api.mistral.ai/v1",
    note: "Según tu plan de Mistral",
  },
  openrouter: {
    baseUrl: "https://openrouter.ai/api/v1",
    note: "Precio según el modelo en OpenRouter",
    filter: (id) => !TEXT_MODEL_EXCLUDE_RE.test(id),
  },
  deepseek: {
    baseUrl: "https://api.deepseek.com/v1",
    note: "Según tu plan de DeepSeek",
  },
  xai: {
    baseUrl: "https://api.x.ai/v1",
    note: "Según tu plan de xAI",
  },
  together: {
    baseUrl: "https://api.together.xyz/v1",
    note: "Según tu plan de Together AI",
    filter: (id) => !TEXT_MODEL_EXCLUDE_RE.test(id) && !/embedding|rerank/i.test(id),
  },
  perplexity: {
    baseUrl: "https://api.perplexity.ai",
    note: "Según tu plan de Perplexity",
    filter: (id) => /sonar|llama|mistral|mixtral|online/i.test(id) && !TEXT_MODEL_EXCLUDE_RE.test(id),
  },
  fireworks: {
    baseUrl: "https://api.fireworks.ai/inference/v1",
    note: "Según tu plan de Fireworks",
    filter: (id) => !TEXT_MODEL_EXCLUDE_RE.test(id),
  },
  cerebras: {
    baseUrl: "https://api.cerebras.ai/v1",
    note: "Según tu plan de Cerebras",
    filter: (id) => !TEXT_MODEL_EXCLUDE_RE.test(id),
  },
};

function providerDisplayName(provider: AiProvider): string {
  return PROVIDERS.find((p) => p.id === provider)?.name ?? provider;
}

function authHeaders(provider: AiProvider, key: string): HeadersInit {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };
  if (provider === "openrouter") {
    headers["HTTP-Referer"] = "https://noditos.local";
    headers["X-Title"] = "Noditos";
  }
  return headers;
}

function asModelIds(data: unknown): string[] {
  const root = (data ?? {}) as Record<string, unknown>;
  const raw = Array.isArray(root.data)
    ? root.data
    : Array.isArray(root.models)
      ? root.models
      : Array.isArray(data)
        ? data
        : [];
  return raw
    .map((entry) => {
      if (typeof entry === "string") return entry;
      const o = (entry ?? {}) as Record<string, unknown>;
      return typeof o.id === "string" ? o.id : typeof o.name === "string" ? o.name : "";
    })
    .filter((id): id is string => id.trim().length > 0);
}

function modelNote(provider: AiProvider, id: string, def: OpenAiCompatDef): string {
  if (provider === "openrouter" && /:free$/i.test(id)) return "Gratis en OpenRouter (con límites)";
  return def.note;
}

function isFreeModel(provider: AiProvider, id: string, def?: OpenAiCompatDef): boolean {
  if (provider === "openrouter") return /:free$/i.test(id);
  return Boolean(def?.freeModels);
}

/**
 * Consulta el endpoint oficial de cada proveedor y devuelve los modelos que
 * tu clave (o tu Ollama local) puede usar HOY, no un catálogo fijo.
 */
export async function fetchProviderModels(cfg: AiConfig): Promise<FetchedModel[]> {
  const key = providerApiKey(cfg);

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

  if (cfg.provider === "anthropic") {
    if (!key) throw new Error("Ingresá tu clave de Anthropic para consultar los modelos.");
    const res = await fetch("https://api.anthropic.com/v1/models", {
      headers: {
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
    });
    if (!res.ok) throw new Error(httpError(res.status, await res.text()));
    const data = await res.json();
    const models = ((data.data ?? []) as Array<{ id: string; display_name?: string }>)
      .map((m) => ({ id: m.id, label: m.display_name?.trim() || prettify(m.id), free: false, note: "Según tu plan de Anthropic" }))
      .filter((m) => m.id && !TEXT_MODEL_EXCLUDE_RE.test(m.id))
      .sort((a, b) => sortDesc(a.id, b.id));
    if (models.length === 0) throw new Error("Anthropic no devolvió modelos para esta clave.");
    return models;
  }

  const compat = OPENAI_COMPAT[cfg.provider];
  if (compat) {
    const name = providerDisplayName(cfg.provider);
    if (!key) throw new Error(`Ingresá tu clave de ${name} para consultar los modelos.`);
    const res = await fetch(`${compat.baseUrl}/models`, { headers: authHeaders(cfg.provider, key) });
    if (!res.ok) throw new Error(httpError(res.status, await res.text()));
    const data = await res.json();
    const models = asModelIds(data)
      .filter((id) => (compat.filter ? compat.filter(id) : !TEXT_MODEL_EXCLUDE_RE.test(id)))
      .sort(sortDesc)
      .slice(0, 250)
      .map((id) => ({
        id,
        label: prettify(id),
        free: isFreeModel(cfg.provider, id, compat),
        note: modelNote(cfg.provider, id, compat),
      }));
    if (models.length === 0) throw new Error(`${name} no devolvió modelos de texto para esta clave.`);
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
    const j = JSON.parse(body) as { error?: { message?: string; type?: string }; message?: string; detail?: string };
    msg = j.error?.message ?? j.message ?? j.detail ?? "";
  } catch {
    msg = body.slice(0, 240);
  }
  if (status === 401 || status === 403) return "La clave fue rechazada (401/403). Revisala en la configuración.";
  if (status === 429) return "Límite de uso alcanzado (429). Esperá un momento o cambiá de modelo.";
  return `Error ${status} del proveedor${msg ? `: ${msg}` : ""}.`;
}

function assertNotTruncated(provider: string, reason?: string) {
  if (/^(length|max_tokens|MAX_TOKENS)$/i.test(reason ?? "")) {
    throw new Error(`${provider} cortó la respuesta por límite de tokens. Probá de nuevo o elegí un modelo con más salida.`);
  }
}

export async function askAi(cfg: AiConfig, system: string, user: string): Promise<string> {
  if (!isAiConfigured(cfg)) throw new Error("El Ayudante no está configurado. Abrí «Ayudante IA» en la biblioteca.");

  const key = providerApiKey(cfg);
  const model = activeModelId(cfg);
  const maxTokens = 1600;

  if (cfg.provider === "gemini") {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model.replace(/^models\//, ""))}:generateContent?key=${encodeURIComponent(key)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: [{ role: "user", parts: [{ text: user }] }],
          generationConfig: { temperature: 0.35, maxOutputTokens: maxTokens },
        }),
      },
    );
    if (!res.ok) throw new Error(httpError(res.status, await res.text()));
    const data = await res.json();
    const candidate = data?.candidates?.[0];
    assertNotTruncated("Gemini", candidate?.finishReason);
    const text = candidate?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("");
    if (!text) throw new Error("Gemini devolvió una respuesta vacía.");
    return text.trim();
  }

  if (cfg.provider === "anthropic") {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        temperature: 0.35,
        system,
        messages: [{ role: "user", content: user }],
      }),
    });
    if (!res.ok) throw new Error(httpError(res.status, await res.text()));
    const data = await res.json();
    assertNotTruncated("Anthropic", data?.stop_reason);
    const text = (data?.content ?? [])
      .map((part: { type?: string; text?: string }) => (part?.type === "text" ? part.text ?? "" : ""))
      .join("");
    if (!text) throw new Error("Anthropic devolvió una respuesta vacía.");
    return String(text).trim();
  }

  const compat = OPENAI_COMPAT[cfg.provider];
  if (compat) {
    const res = await fetch(`${compat.baseUrl}/chat/completions`, {
      method: "POST",
      headers: authHeaders(cfg.provider, key),
      body: JSON.stringify({
        model,
        temperature: 0.35,
        max_tokens: maxTokens,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });
    if (!res.ok) throw new Error(httpError(res.status, await res.text()));
    const data = await res.json();
    const choice = data?.choices?.[0];
    assertNotTruncated(providerDisplayName(cfg.provider), choice?.finish_reason);
    const text = choice?.message?.content ?? choice?.text;
    if (!text) throw new Error("El proveedor devolvió una respuesta vacía.");
    return String(text).trim();
  }

  // Ollama local
  const base = cfg.ollamaUrl.trim().replace(/\/+$/, "");
  const res = await fetch(`${base}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      stream: false,
      options: { temperature: 0.35, num_predict: maxTokens },
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
  return String(text ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/\u003c/g, "<")
    .replace(/\u003e/g, ">");
}

function stripFences(text: string): string {
  const clean = normalizeText(text).trim();
  const fence = clean.match(/^```(?:json|javascript|ts|typescript)?\s*\n?([\s\S]*?)\n?```$/i)
    ?? clean.match(/```(?:json|javascript|ts|typescript)?\s*\n?([\s\S]*?)\n?```/i);
  const unfenced = fence ? fence[1] : clean;
  return unfenced.replace(/^\s*json\s*\n/i, "").replace(/`/g, "").trim();
}

function isJsonish(text: string): boolean {
  return /^[\[{]/.test(stripFences(text).trim());
}

function extractPlainListItems(text: string): string[] {
  const clean = stripFences(text);
  // Si parecía JSON y no se pudo parsear, no mostramos el JSON roto como un punto.
  // Esto fuerza un reintento y evita resultados como: ["punto 1", "punto incompleto…
  if (isJsonish(clean)) return [];

  const lines = clean
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const items: string[] = [];
  for (const line of lines) {
    if (/^[\[{]/.test(line)) continue;
    if (/^(?:[*•\-]\s*)?(?:input|output|constraint|requirement|goal|example|topic|question|answer|response|result|here is|the user|the model|i need|exactly|no extra|no markdown|only|without)\b/i.test(line)) continue;
    if (/^(ideas?|sugerencias?|opciones?|puntos?|críticas?|criticas?)\s*:?$/i.test(line)) continue;
    const m = line.match(/^(?:[-*•▪◦]|\d+[.)])\s*(.+)$/)
      || line.match(/^(?:[A-Za-zÀ-ÿ0-9][^:]{0,40}?:\s*)?(.+)$/);
    if (!m) continue;
    const value = m[1]
      .replace(/^[-*•▪◦]\s*/, "")
      .replace(/^['"“”‘’]+|['"“”‘’]+$/g, "")
      .replace(/^[A-Za-zÀ-ÿ0-9][^:]{0,40}:\s*/, "")
      .trim();
    if (!value || /^(aquí|resultado|respuesta|input|output|constraint|requirement|goal|example|topic|question|answer|here is)\b/i.test(value)) continue;
    items.push(value.replace(/\s+/g, " ").trim());
  }
  return items;
}

function extractQuestionPairs(text: string): QAItem[] {
  const cleaned = stripFences(text);
  const items: QAItem[] = [];
  const qLabel = String.raw`(?:Q(?:uestion|uestions)?|P(?:regunta|reguntas)?)`;
  const aLabel = String.raw`(?:A(?:nswer|answers)?|R(?:espuesta|respuestas)?)`;
  const qPrefix = String.raw`(?:[*•\-]\s*)?(?:\d+[.)]\s*)?${qLabel}\s*(?:\d+)?\s*[:\-.)]?\s*`;
  const aPrefix = String.raw`(?:[*•\-]\s*)?${aLabel}\s*(?:\d+)?\s*[:\-.)]?\s*`;
  const qaRegex = new RegExp(
    String.raw`(?:^|\n)\s*${qPrefix}(.+?)(?:\n\s*${aPrefix}(.+?))?(?=\n\s*${qPrefix}|$)`,
    "gis",
  );
  const matches = [...cleaned.matchAll(qaRegex)];
  if (matches.length > 0) {
    for (const match of matches) {
      let q = (match[1] ?? "").replace(/^[-*•▪◦]\s*/, "").trim();
      let a = (match[2] ?? "").replace(/^[-*•▪◦]\s*/, "").trim();
      if (!a) {
        const inline = q.match(new RegExp(String.raw`^(.+?)\s+${aLabel}\s*(?:\d+)?\s*[:\-.)]?\s*(.+)$`, "i"));
        if (inline) {
          q = inline[1].trim();
          a = inline[2].trim();
        }
      }
      if (q) items.push({ q, a: a || "" });
    }
  }
  if (items.length > 0) return items;

  const labelized = cleaned
    .replace(new RegExp(String.raw`\s+(${qLabel}\s*\d*\s*[:\-.)])`, "gi"), "\n$1")
    .replace(new RegExp(String.raw`\s+(${aLabel}\s*\d*\s*[:\-.)])`, "gi"), "\n$1");

  const lines = labelized.split(/\r?\n/);
  let currentQ = "";
  let currentA = "";
  const pushCurrent = () => {
    if (currentQ) items.push({ q: currentQ.trim(), a: currentA.trim() });
    currentQ = "";
    currentA = "";
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    const qMatch = line.match(new RegExp(String.raw`^${qPrefix}(.+)$`, "i"));
    if (qMatch) {
      if (currentQ) pushCurrent();
      currentQ = qMatch[1].trim();
      continue;
    }
    const aMatch = line.match(new RegExp(String.raw`^${aPrefix}(.+)$`, "i"));
    if (aMatch) {
      currentA = currentA ? `${currentA} ${aMatch[1].trim()}` : aMatch[1].trim();
      continue;
    }

    const inlineAnswer = line.match(new RegExp(String.raw`^(.+?)(?:\s+[—–-]\s+|\s+)${aLabel}\s*(?:\d+)?\s*[:\-.)]?\s*(.+)$`, "i"));
    if (inlineAnswer) {
      if (currentQ) pushCurrent();
      currentQ = inlineAnswer[1].replace(/^\d+[.)]\s*/, "").trim();
      currentA = inlineAnswer[2].trim();
      continue;
    }

    if (/^\d+[.)]\s+/.test(line) || /\?$/.test(line)) {
      if (currentQ) pushCurrent();
      currentQ = line.replace(/^\d+[.)]\s+/, "").trim();
      continue;
    }

    if (currentQ) currentA = currentA ? `${currentA} ${line}` : line;
  }
  if (currentQ) pushCurrent();
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

function arrayFromParsed(parsed: unknown): unknown[] | null {
  if (Array.isArray(parsed)) return parsed;
  if (!parsed || typeof parsed !== "object") return null;
  const record = parsed as Record<string, unknown>;
  const preferredKeys = ["items", "ideas", "suggestions", "sugerencias", "points", "puntos", "questions", "preguntas", "results", "resultado", "data"];
  for (const key of preferredKeys) {
    if (Array.isArray(record[key])) return record[key] as unknown[];
  }
  for (const value of Object.values(record)) {
    if (Array.isArray(value)) return value;
  }
  return null;
}

function balancedJsonSnippets(text: string, open: "[" | "{", close: "]" | "}"): string[] {
  const snippets: string[] = [];
  for (let i = 0; i < text.length; i++) {
    if (text[i] !== open) continue;
    let depth = 0;
    let inString = false;
    let escaped = false;
    for (let j = i; j < text.length; j++) {
      const ch = text[j];
      if (inString) {
        if (escaped) escaped = false;
        else if (ch === "\\") escaped = true;
        else if (ch === '"') inString = false;
        continue;
      }
      if (ch === '"') {
        inString = true;
        continue;
      }
      if (ch === open) depth++;
      else if (ch === close) {
        depth--;
        if (depth === 0) {
          snippets.push(text.slice(i, j + 1));
          break;
        }
      }
    }
  }
  return snippets;
}

function uniqueByContent(values: string[]): string[] {
  return [...new Set(values.map((v) => v.trim()).filter(Boolean))];
}

function extractArray(text: string): unknown[] {
  const clean = stripFences(text);
  const candidates = uniqueByContent([
    clean,
    ...balancedJsonSnippets(clean, "[", "]").sort((a, b) => b.length - a.length),
    ...balancedJsonSnippets(clean, "{", "}").sort((a, b) => b.length - a.length),
  ]).filter((candidate) => candidate.length > 2 && /^[\[{]/.test(candidate));

  for (const candidate of candidates) {
    try {
      const parsed = tryParseJson(candidate);
      const array = arrayFromParsed(parsed);
      if (array) return array;
    } catch {
      // intenta con el siguiente candidato
    }
  }

  const start = clean.indexOf("[");
  const end = clean.lastIndexOf("]");
  if (start !== -1 && end !== -1 && end > start) {
    try {
      const parsed = tryParseJson(clean.slice(start, end + 1));
      const array = arrayFromParsed(parsed);
      if (array) return array;
    } catch {
      // no es un JSON directo, pero seguimos con el error claro
    }
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
