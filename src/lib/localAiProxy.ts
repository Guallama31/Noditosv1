const TOKEN_PLACEHOLDER = "__NODITOS_STOP_TOKEN__";

function localToken(): string | null {
  if (typeof document === "undefined") return null;
  const value = document.querySelector('meta[name="noditos-stop-token"]')?.getAttribute("content") ?? "";
  return value && value !== TOKEN_PLACEHOLDER ? value : null;
}

function proxyHeaders(json = false): HeadersInit {
  const token = localToken();
  if (!token) {
    throw new Error("El proxy local de IA sólo está disponible al abrir Noditos desde su ejecutable o servidor local.");
  }
  return {
    "X-Noditos-Token": token,
    ...(json ? { "Content-Type": "application/json" } : {}),
  };
}

async function proxyJson<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: { ...proxyHeaders(Boolean(init.body)), ...(init.headers ?? {}) },
  });
  const data = await response.json().catch(() => ({})) as { error?: string };
  if (!response.ok) throw new Error(data.error || `El proxy local respondió con error ${response.status}.`);
  return data as T;
}

export function hasLocalAiProxy(): boolean {
  return Boolean(localToken());
}

export async function configureLocalGemini(apiKey: string): Promise<void> {
  await proxyJson("/__noditos/ai/config/gemini", {
    method: "PUT",
    body: JSON.stringify({ apiKey }),
  });
}

export async function clearLocalGemini(): Promise<void> {
  await proxyJson("/__noditos/ai/config/gemini", { method: "DELETE" });
}

export async function localGeminiStatus(): Promise<boolean> {
  const data = await proxyJson<{ providers?: { gemini?: boolean } }>("/__noditos/ai/status");
  return Boolean(data.providers?.gemini);
}

export async function fetchLocalGeminiModels(): Promise<Array<{ id: string; label: string }>> {
  const data = await proxyJson<{ models?: Array<{ id: string; label: string }> }>("/__noditos/ai/models/gemini");
  return Array.isArray(data.models) ? data.models : [];
}

export async function askLocalGemini(input: {
  model: string;
  system: string;
  user: string;
  maxTokens: number;
}): Promise<{ text: string; finishReason?: string }> {
  return proxyJson("/__noditos/ai/chat/gemini", {
    method: "POST",
    body: JSON.stringify(input),
  });
}
