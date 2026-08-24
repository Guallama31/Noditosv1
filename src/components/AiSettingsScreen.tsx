import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  Bot,
  Check,
  KeyRound,
  Loader2,
  RefreshCw,
  Server,
  Wand2,
} from "lucide-react";
import {
  askAi,
  defaultAiConfig,
  fetchProviderModels,
  isAiConfigured,
  loadAiConfig,
  PROVIDERS,
  saveAiConfig,
  type AiConfig,
  type AiProvider,
  type FetchedModel,
} from "../lib/ai";

type FetchState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "done"; models: FetchedModel[] };

export function AiSettingsScreen({ onBack }: { onBack: () => void }) {
  const [cfg, setCfg] = useState<AiConfig>(loadAiConfig);
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<"ok" | "fail" | null>(null);
  const [models, setModels] = useState<FetchState>({ status: "idle" });
  const provider = PROVIDERS.find((p) => p.id === cfg.provider)!;

  const configured = isAiConfigured(cfg);
  const currentModelId =
    cfg.provider === "gemini"
      ? cfg.geminiModel
      : cfg.provider === "openai"
        ? cfg.openaiModel
        : cfg.provider === "groq"
          ? cfg.groqModel
          : cfg.ollamaModel;

  const refreshModels = useCallback(async () => {
    setModels({ status: "loading" });
    try {
      const list = await fetchProviderModels(cfg);
      setModels({ status: "done", models: list });
      // Si el modelo actual ya no existe en la lista, elegimos el primero.
      if (list.length > 0 && !list.some((m) => m.id === currentModelId)) {
        setCfg((c) => ({ ...c, [modelKeyFor(c.provider)]: list[0].id }) as AiConfig);
      }
    } catch (err) {
      setModels({ status: "error", message: err instanceof Error ? err.message : "No se pudieron consultar los modelos." });
    }
  }, [cfg, currentModelId]);

  // Consultar modelos al entrar y al cambiar proveedor.
  useEffect(() => {
    setModels({ status: "idle" });
    setTestResult(null);
    const t = window.setTimeout(() => void refreshModels(), 350);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cfg.provider]);

  const pickModel = (id: string) => {
    setCfg((c) => ({ ...c, [modelKeyFor(c.provider)]: id }) as AiConfig);
  };

  const testConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      await askAi(cfg, "Sos una prueba de conexión. Respondé únicamente: OK", "Decí OK");
      setTestResult("ok");
    } catch {
      setTestResult("fail");
    } finally {
      setTesting(false);
    }
  };

  const save = () => {
    saveAiConfig(cfg);
    onBack();
  };

  const inputCls =
    "w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-[13px] text-ink-800 transition placeholder:text-ink-300 focus:border-brand/60 focus:ring-2 focus:ring-brand/20";

  return (
    <div className="canvas-dots relative flex-1 overflow-y-auto">
      <div className="wash wash-a" style={{ width: 520, height: 520, left: "-8%", top: "-12%", background: "rgba(105,99,77,0.14)" }} />
      <div className="wash wash-b" style={{ width: 560, height: 560, right: "-10%", bottom: "-16%", background: "rgba(181,74,51,0.10)" }} />

      <div className="relative mx-auto max-w-2xl px-6 pb-16 pt-8">
        <button
          onClick={onBack}
          className="card-in flex items-center gap-1.5 rounded-lg border border-ink-200 bg-white px-3 py-1.5 text-[12.5px] font-bold text-ink-500 shadow-sm transition hover:text-ink-800"
        >
          <ArrowLeft size={14} />
          Volver a la biblioteca
        </button>

        <header className="card-in mt-6 flex items-center gap-3.5" style={{ animationDelay: "40ms" }}>
          <span className="grid h-12 w-12 place-items-center rounded-xl bg-ink-900 text-brand shadow-lg">
            <Bot size={24} />
          </span>
          <div>
            <h1 className="font-display text-[26px] font-bold tracking-tight text-ink-900">Ayudante IA</h1>
            <p className="text-[13px] font-medium text-ink-500">Conectá un proveedor para activar el asistente.</p>
          </div>
        </header>

        <p className="card-in mt-5 rounded-xl border border-ink-200 bg-white/80 p-4 text-[13.5px] leading-relaxed text-ink-600 shadow-sm" style={{ animationDelay: "80ms" }}>
          El Ayudante es opcional: Noditos funciona igual sin el asistente. Cuando lo configures, en
          tus mapas aparecerá una burbuja «Ayudante» con un chat que sugiere subnodos, mejora textos
          y estructura lo que pegues. Elegí un proveedor:
        </p>

        {/* proveedores */}
        <div className="card-in mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4" style={{ animationDelay: "120ms" }}>
          {PROVIDERS.map((p) => {
            const active = cfg.provider === p.id;
            return (
              <button
                key={p.id}
                onClick={() => setCfg((c) => ({ ...c, provider: p.id as AiProvider }))}
                className={`rounded-xl border-2 p-3 text-left transition active:translate-y-px ${
                  active
                    ? "border-brand bg-white shadow-md"
                    : "border-ink-200 bg-white/70 hover:border-ink-300 hover:bg-white"
                }`}
              >
                <span className="flex items-center justify-between">
                  <span className={`font-display text-[14px] font-bold ${active ? "text-brand" : "text-ink-800"}`}>
                    {p.name}
                  </span>
                  {active && <Check size={15} className="text-brand" />}
                </span>
                <span className="mt-1 block text-[10.5px] font-medium leading-snug text-ink-400">{p.tagline}</span>
              </button>
            );
          })}
        </div>

        {/* configuración del proveedor */}
        <div className="card-in mt-4 rounded-xl border border-ink-200 bg-white p-5 shadow-sm" style={{ animationDelay: "160ms" }}>
          {provider.needsKey ? (
            <>
              <label className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-ink-400">
                <KeyRound size={13} />
                Clave de API de {provider.name}
              </label>
              <div className="mt-2 flex gap-2">
                <input
                  type={showKey ? "text" : "password"}
                  value={cfg.apiKey}
                  onChange={(e) => setCfg((c) => ({ ...c, apiKey: e.target.value }))}
                  placeholder={provider.id === "gemini" ? "AIza…" : "sk-…"}
                  className={inputCls}
                  autoComplete="off"
                  spellCheck={false}
                />
                <button
                  onClick={() => setShowKey((v) => !v)}
                  className="shrink-0 rounded-lg border border-ink-200 bg-ink-50 px-3 text-[11.5px] font-bold text-ink-500 transition hover:bg-ink-100"
                >
                  {showKey ? "Ocultar" : "Mostrar"}
                </button>
              </div>
              {provider.keyUrl && (
                <a
                  href={provider.keyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-block text-[12px] font-semibold text-brand underline decoration-dotted underline-offset-2 hover:text-[#8c3220]"
                >
                  Conseguir una clave gratis en {provider.name} →
                </a>
              )}
            </>
          ) : (
            <>
              <label className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-ink-400">
                <Server size={13} />
                Dirección del servidor Ollama
              </label>
              <input
                type="text"
                value={cfg.ollamaUrl}
                onChange={(e) => setCfg((c) => ({ ...c, ollamaUrl: e.target.value }))}
                placeholder="http://localhost:11434"
                className={`${inputCls} mt-2`}
                spellCheck={false}
              />
              <p className="mt-2 text-[12px] leading-relaxed text-ink-400">
                Todo corre en tu PC, sin internet. Instalá Ollama desde{" "}
                <a href="https://ollama.com" target="_blank" rel="noopener noreferrer" className="font-semibold text-brand underline decoration-dotted underline-offset-2">
                  ollama.com
                </a>{" "}
                y descargá un modelo (por ejemplo <code className="rounded bg-ink-100 px-1 font-mono text-[11px]">ollama pull llama3.2</code>).
              </p>
            </>
          )}

          {/* modelos en vivo */}
          <div className="mt-5">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink-400">
                Modelos disponibles <span className="normal-case tracking-normal">(consultados en vivo)</span>
              </p>
              <button
                onClick={() => void refreshModels()}
                disabled={models.status === "loading"}
                className="flex items-center gap-1.5 rounded-md border border-ink-200 bg-ink-50 px-2 py-1 text-[11px] font-bold text-ink-500 transition hover:bg-ink-100 disabled:opacity-50"
              >
                <RefreshCw size={11} className={models.status === "loading" ? "animate-spin" : ""} />
                Actualizar
              </button>
            </div>

            {models.status === "loading" && (
              <p className="mt-3 flex items-center gap-2 text-[12.5px] font-medium text-ink-500">
                <Loader2 size={14} className="animate-spin text-brand" />
                Consultando los modelos de {provider.name}…
              </p>
            )}
            {models.status === "error" && (
              <p className="mt-3 rounded-lg border border-danger/30 bg-danger/8 px-3 py-2.5 text-[12.5px] font-medium leading-snug text-[#c04545]">
                {models.message}
              </p>
            )}
            {models.status === "done" && (
              <>
                <p className="mt-2 text-[11.5px] font-semibold text-ink-400">
                  Actual: <span className="font-mono text-ink-700">{currentModelId}</span>
                </p>
                <div className="mt-2 max-h-56 space-y-1.5 overflow-y-auto pr-1">
                  {models.models.map((m) => {
                    const active = m.id === currentModelId;
                    return (
                      <button
                        key={m.id}
                        onClick={() => pickModel(m.id)}
                        className={`flex w-full items-center gap-2.5 rounded-lg border px-3 py-2 text-left transition ${
                          active
                            ? "border-brand bg-brand/8 shadow-sm"
                            : "border-ink-200 bg-white hover:border-ink-300 hover:bg-ink-50"
                        }`}
                      >
                        <span className="min-w-0 flex-1">
                          <span className={`block truncate font-mono text-[12.5px] font-bold ${active ? "text-brand" : "text-ink-800"}`}>
                            {m.id}
                          </span>
                          <span className="block truncate text-[11px] text-ink-400">
                            {m.label !== m.id ? `${m.label}${m.note ? ` · ${m.note}` : ""}` : m.note}
                          </span>
                        </span>
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-[9.5px] font-bold uppercase tracking-wide ${
                            m.free ? "bg-ok/15 text-ok" : "bg-[#c08a2e]/15 text-[#9a6a15]"
                          }`}
                        >
                          {m.free ? "Gratis" : "De pago"}
                        </span>
                        {active && <Check size={14} className="shrink-0 text-brand" />}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
            {models.status === "idle" && (
              <p className="mt-3 text-[12px] text-ink-400">Escribí tu clave y los modelos aparecerán acá.</p>
            )}
          </div>

          {/* probar + guardar */}
          <div className="mt-5 flex flex-wrap items-center gap-2.5 border-t border-ink-100 pt-4">
            <button
              onClick={() => void testConnection()}
              disabled={!configured || testing}
              className="flex items-center gap-2 rounded-lg border border-ink-200 bg-white px-3.5 py-2 text-[12.5px] font-bold text-ink-600 transition hover:bg-ink-50 disabled:pointer-events-none disabled:opacity-40"
            >
              {testing ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}
              Probar conexión
            </button>
            {testResult === "ok" && (
              <span className="flex items-center gap-1 text-[12px] font-bold text-ok">
                <Check size={13} /> ¡Conexión exitosa!
              </span>
            )}
            {testResult === "fail" && (
              <span className="text-[12px] font-bold text-[#c04545]">No se pudo conectar. Revisá la clave y el modelo.</span>
            )}
            <button
              onClick={save}
              disabled={!configured}
              className="ml-auto flex items-center gap-2 rounded-lg bg-brand px-5 py-2 text-[13px] font-bold text-white shadow-md shadow-brand/25 transition hover:brightness-110 active:translate-y-px disabled:pointer-events-none disabled:opacity-40"
            >
              Guardar configuración
            </button>
          </div>
        </div>

        <p className="card-in mt-4 text-center text-[11.5px] text-ink-400" style={{ animationDelay: "200ms" }}>
          La clave se guarda únicamente en este navegador (localStorage) y nunca se envía a otro
          lugar que no sea el proveedor elegido.
        </p>

        {configured && (
          <button
            onClick={() => {
              saveAiConfig(defaultAiConfig());
              setCfg(defaultAiConfig());
            }}
            className="mx-auto mt-4 block text-[12px] font-semibold text-ink-400 underline decoration-dotted underline-offset-2 transition hover:text-[#c04545]"
          >
            Borrar la configuración de IA
          </button>
        )}
      </div>
    </div>
  );
}

function modelKeyFor(p: AiProvider): "geminiModel" | "openaiModel" | "groqModel" | "ollamaModel" {
  switch (p) {
    case "gemini": return "geminiModel";
    case "openai": return "openaiModel";
    case "groq": return "groqModel";
    case "ollama": return "ollamaModel";
  }
}
