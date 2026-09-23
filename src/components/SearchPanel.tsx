import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Replace, Search, X } from "lucide-react";
import type { NodeKind } from "../types";
import type { SearchOptions, SearchResult } from "../lib/search";
import { pathLabel } from "../lib/search";

const KIND_OPTIONS: Array<{ id: NodeKind | "all"; label: string }> = [
  { id: "all", label: "Todos" },
  { id: "idea", label: "Ideas" },
  { id: "title", label: "Títulos" },
  { id: "text", label: "Textos" },
  { id: "image", label: "Imágenes" },
];

export function SearchPanel({
  query,
  onQueryChange,
  options,
  onOptionsChange,
  results,
  activeIndex,
  onActiveIndexChange,
  onFocusResult,
  onReplace,
  onClose,
}: {
  query: string;
  onQueryChange: (value: string) => void;
  options: SearchOptions;
  onOptionsChange: (next: SearchOptions) => void;
  results: SearchResult[];
  activeIndex: number;
  onActiveIndexChange: (index: number) => void;
  onFocusResult: (result: SearchResult) => void;
  onReplace: (replacement: string) => number;
  onClose: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [replacement, setReplacement] = useState("");

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  const hasResults = results.length > 0;
  const active = hasResults ? Math.min(activeIndex, results.length - 1) : -1;

  const move = (delta: number) => {
    if (!hasResults) return;
    const next = (active + delta + results.length) % results.length;
    onActiveIndexChange(next);
    onFocusResult(results[next]);
  };

  return (
    <div
      className="pop-in absolute left-4 top-4 z-40 w-[min(460px,calc(100%-2rem))] overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-2xl shadow-ink-900/15"
      onPointerDown={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center gap-2 border-b border-ink-100 px-3 py-2.5">
        <Search size={16} className="text-brand" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") onClose();
            if (e.key === "Enter") {
              e.preventDefault();
              move(e.shiftKey ? -1 : 1);
            }
          }}
          placeholder="Buscar en textos, notas y etiquetas…"
          className="min-w-0 flex-1 bg-transparent text-[13px] font-semibold text-ink-800 placeholder:text-ink-300"
        />
        <span className="rounded-full bg-ink-100 px-2 py-0.5 text-[10.5px] font-bold text-ink-500">
          {results.length}
        </span>
        <button
          onClick={() => move(-1)}
          disabled={!hasResults}
          title="Resultado anterior"
          className="rounded-md p-1.5 text-ink-500 transition hover:bg-ink-100 disabled:opacity-30"
        >
          <ArrowUp size={14} />
        </button>
        <button
          onClick={() => move(1)}
          disabled={!hasResults}
          title="Resultado siguiente"
          className="rounded-md p-1.5 text-ink-500 transition hover:bg-ink-100 disabled:opacity-30"
        >
          <ArrowDown size={14} />
        </button>
        <button onClick={onClose} aria-label="Cerrar buscador" className="rounded-md p-1.5 text-ink-400 transition hover:bg-ink-100 hover:text-ink-700">
          <X size={15} />
        </button>
      </div>

      <div className="space-y-2 border-b border-ink-100 px-3 py-2.5">
        <div className="flex flex-wrap items-center gap-2 text-[11.5px] font-semibold text-ink-500">
          {[
            ["includeText", "Texto"],
            ["includeNotes", "Notas"],
            ["includeTags", "Etiquetas"],
          ].map(([key, label]) => (
            <label key={key} className="flex cursor-pointer items-center gap-1.5 rounded-full border border-ink-200 bg-ink-50 px-2 py-1">
              <input
                type="checkbox"
                checked={Boolean(options[key as keyof SearchOptions])}
                onChange={(e) => onOptionsChange({ ...options, [key]: e.target.checked })}
                className="h-3 w-3 accent-[#b54a33]"
              />
              {label}
            </label>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <select
            value={options.kind}
            onChange={(e) => onOptionsChange({ ...options, kind: e.target.value as SearchOptions["kind"] })}
            className="rounded-lg border border-ink-200 bg-white px-2 py-1.5 text-[12px] font-semibold text-ink-600"
          >
            {KIND_OPTIONS.map((opt) => <option key={opt.id} value={opt.id}>{opt.label}</option>)}
          </select>
          <select
            value={options.due}
            onChange={(e) => onOptionsChange({ ...options, due: e.target.value as SearchOptions["due"] })}
            className="rounded-lg border border-ink-200 bg-white px-2 py-1.5 text-[12px] font-semibold text-ink-600"
          >
            <option value="all">Todas las fechas</option>
            <option value="overdue">Vencidas</option>
            <option value="today">Vencen hoy</option>
            <option value="upcoming">Próximas</option>
          </select>
        </div>
      </div>

      <div className="max-h-64 overflow-y-auto px-2 py-2">
        {results.length === 0 ? (
          <p className="px-3 py-6 text-center text-[12.5px] text-ink-400">
            {query.trim() || options.due !== "all" ? "Sin coincidencias." : "Escribí para buscar o filtrá por fecha."}
          </p>
        ) : (
          results.map((result, index) => (
            <button
              key={result.node.id}
              onClick={() => {
                onActiveIndexChange(index);
                onFocusResult(result);
              }}
              className={`mb-1 w-full rounded-lg px-2.5 py-2 text-left transition ${
                index === active ? "bg-brand/10 ring-1 ring-brand/30" : "hover:bg-ink-50"
              }`}
            >
              <span className="block truncate text-[12.5px] font-bold text-ink-800">
                {result.node.text.trim() || "Idea sin texto"}
              </span>
              <span className="mt-0.5 block truncate text-[10.5px] font-medium text-ink-400">
                {pathLabel(result.path)} · {result.matches.join(", ")}
              </span>
            </button>
          ))
        )}
      </div>

      <div className="flex items-center gap-2 border-t border-ink-100 bg-ink-50 px-3 py-2.5">
        <Replace size={14} className="shrink-0 text-ink-400" />
        <input
          value={replacement}
          onChange={(e) => setReplacement(e.target.value)}
          placeholder="Reemplazar por…"
          className="min-w-0 flex-1 rounded-lg border border-ink-200 bg-white px-2 py-1.5 text-[12px] text-ink-700 placeholder:text-ink-300"
        />
        <button
          onClick={() => onReplace(replacement)}
          disabled={!query.trim() || (!options.includeText && !options.includeNotes)}
          className="rounded-lg bg-ink-800 px-3 py-1.5 text-[11.5px] font-bold text-white transition hover:bg-ink-700 disabled:pointer-events-none disabled:opacity-35"
        >
          Reemplazar
        </button>
      </div>
    </div>
  );
}
