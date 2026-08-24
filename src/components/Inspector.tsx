import { useEffect, useState } from "react";
import {
  AlignLeft,
  ArrowUpRight,
  ChevronDown,
  ChevronRight,
  Heading2,
  Image as ImageIcon,
  Lightbulb,
  Link,
  Plus,
  StickyNote,
  Trash2,
  X,
} from "lucide-react";
import type { LayoutMode, MindNode, NodeKind } from "../types";
import type { MindMapApi } from "../hooks/useMindMap";
import { BRANCH_COLORS, LAYOUT_MODES, withAlpha } from "../lib/layout";
import { countNodes } from "../lib/tree";
import { findUrls } from "../lib/links";

const KIND_META: Record<NodeKind, { label: string; icon: React.ReactNode; hint: string }> = {
  idea: { label: "Idea", icon: <Lightbulb size={14} />, hint: "Nodo común" },
  title: { label: "Título", icon: <Heading2 size={14} />, hint: "Encabezado de sección" },
  text: { label: "Texto", icon: <AlignLeft size={14} />, hint: "Párrafo extenso" },
  image: { label: "Imagen", icon: <ImageIcon size={14} />, hint: "Imagen con leyenda" },
};

function LayoutGlyph({ mode }: { mode: LayoutMode }) {
  const dot = "h-1.5 w-1.5 rounded-full";
  const p = "h-2 w-2 rounded-full bg-current";
  switch (mode) {
    case "right":
      return (
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.4}>
          <circle cx="5" cy="12" r="2.2" fill="currentColor" stroke="none" />
          <path d="M7.2 12h4M11 6h3M11 12h4M11 18h3M11 6v12" />
          <circle cx="16.5" cy="6" r="1.4" className={dot} fill="currentColor" stroke="none" />
          <circle cx="17.5" cy="12" r="1.4" className={dot} fill="currentColor" stroke="none" />
          <circle cx="16.5" cy="18" r="1.4" className={dot} fill="currentColor" stroke="none" />
        </svg>
      );
    case "left":
      return (
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.4}>
          <circle cx="19" cy="12" r="2.2" fill="currentColor" stroke="none" />
          <path d="M16.8 12h-4M13 6H10M13 12H9M13 18h-3M13 6v12" />
          <circle cx="7.5" cy="6" r="1.4" className={dot} fill="currentColor" stroke="none" />
          <circle cx="6.5" cy="12" r="1.4" className={dot} fill="currentColor" stroke="none" />
          <circle cx="7.5" cy="18" r="1.4" className={dot} fill="currentColor" stroke="none" />
        </svg>
      );
    case "split":
      return (
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.4}>
          <circle cx="12" cy="12" r="2.2" fill="currentColor" stroke="none" />
          <path d="M9.8 12H7M14.2 12H17M7 6v12M17 6v12M7 8H4.5M7 16H4.5M17 8h2.5M17 16h2.5" />
          <circle cx="3.6" cy="8" r="1.2" className={dot} fill="currentColor" stroke="none" />
          <circle cx="3.6" cy="16" r="1.2" className={dot} fill="currentColor" stroke="none" />
          <circle cx="20.4" cy="8" r="1.2" className={dot} fill="currentColor" stroke="none" />
          <circle cx="20.4" cy="16" r="1.2" className={dot} fill="currentColor" stroke="none" />
        </svg>
      );
    case "alternate":
      return (
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.4}>
          <circle cx="12" cy="5" r="2" fill="currentColor" stroke="none" />
          <path d="M12 7v3M12 10H6M12 10h6M6 10v4M18 10v4" />
          <circle cx="6" cy="15.5" r="1.4" className={dot} fill="currentColor" stroke="none" />
          <circle cx="18" cy="15.5" r="1.4" className={dot} fill="currentColor" stroke="none" />
          <path d="M12 10v9" strokeDasharray="2 2" />
          <circle cx="12" cy="20" r="1.4" className={dot} fill="currentColor" stroke="none" />
        </svg>
      );
    case "top":
      return (
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.4}>
          <circle cx="5" cy="5" r="2" fill="currentColor" stroke="none" />
          <path d="M7 5h3M10 5v14M10 9h4M10 14h5M10 19h4" />
          <circle cx="16" cy="9" r="1.3" className={dot} fill="currentColor" stroke="none" />
          <circle cx="17" cy="14" r="1.3" className={dot} fill="currentColor" stroke="none" />
          <circle cx="16" cy="19" r="1.3" className={dot} fill="currentColor" stroke="none" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.4}>
          <circle cx="12" cy="12" r="2.2" fill="currentColor" stroke="none" />
          <path d="M9.8 12H6M14.2 12h3.8M6 12V8.5M6 12v3.5M18 12V8.5M18 12v3.5" />
          <circle cx="6" cy="7.5" r="1.3" className={dot} fill="currentColor" stroke="none" />
          <circle cx="6" cy="16.5" r="1.3" className={dot} fill="currentColor" stroke="none" />
          <circle cx="18" cy="7.5" r="1.3" className={dot} fill="currentColor" stroke="none" />
          <circle cx="18" cy="16.5" r="1.3" className={dot} fill="currentColor" stroke="none" />
        </svg>
      );
  }
  void p;
}

export function Inspector({
  node,
  path,
  api,
  onClose,
  onFocusNode,
  onPickImage,
}: {
  node: MindNode;
  path: MindNode[];
  api: MindMapApi;
  onClose: () => void;
  onFocusNode: (id: string) => void;
  onPickImage: (id: string) => void;
}) {
  const [text, setText] = useState(node.text);
  const [notes, setNotes] = useState(node.notes);
  const [focused, setFocused] = useState<"text" | "notes" | null>(null);
  const [showKinds, setShowKinds] = useState(false);
  const [showAllKids, setShowAllKids] = useState(false);
  const [recursiveLayout, setRecursiveLayout] = useState(false);

  useEffect(() => {
    setText(node.text);
    setNotes(node.notes);
    setShowKinds(false);
    setShowAllKids(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [node.id]);

  useEffect(() => {
    if (focused !== "text") setText(node.text);
    if (focused !== "notes") setNotes(node.notes);
  }, [node.text, node.notes, focused]);

  const isRoot = path.length === 1;
  const descendants = countNodes(node) - 1;
  const activeMode: LayoutMode = node.layout ?? "auto";
  const urls = findUrls(`${node.text} ${node.notes}`);

  const addKind = (kind: NodeKind) => {
    setShowKinds(false);
    const newId = api.addChild(node.id, kind);
    if (kind === "image" && newId) onPickImage(newId);
  };

  /** Salta al hijo, expandiendo la rama si está plegada. */
  const goToChild = (childId: string) => {
    if (node.collapsed) api.toggleCollapse(node.id);
    onFocusNode(childId);
  };

  return (
    <aside className="pop-in flex w-[292px] shrink-0 flex-col border-l border-ink-200 bg-white">
      <div className="flex items-center justify-between border-b border-ink-100 px-4 py-3">
        <h2 className="font-display text-[13px] font-bold uppercase tracking-[0.12em] text-ink-800">Inspector</h2>
        <button
          onClick={onClose}
          aria-label="Ocultar inspector"
          title="Ocultar inspector"
          className="rounded-md p-1 text-ink-400 transition hover:bg-ink-100 hover:text-ink-700"
        >
          <X size={15} />
        </button>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto p-4">
        <section>
          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-ink-400">Ubicación</p>
          <div className="flex flex-wrap items-center gap-1">
            {path.map((p, i) => (
              <span key={p.id} className="flex items-center gap-1">
                {i > 0 && <ChevronRight size={10} className="text-ink-300" />}
                <button
                  onClick={() => onFocusNode(p.id)}
                  className={`max-w-[110px] truncate rounded-md border px-1.5 py-0.5 text-[11px] font-medium transition ${
                    i === path.length - 1
                      ? "border-ink-800 bg-ink-800 text-white"
                      : "border-ink-200 text-ink-500 hover:bg-ink-50"
                  }`}
                >
                  {p.text.trim() || "Idea"}
                </button>
              </span>
            ))}
          </div>
        </section>

        <section>
          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-ink-400">Texto del nodo</p>
          <textarea
            rows={2}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onFocus={() => setFocused("text")}
            onBlur={() => {
              setFocused(null);
              api.updateText(node.id, text);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                e.currentTarget.blur();
              }
            }}
            className="w-full resize-none rounded-lg border border-ink-200 bg-ink-50 px-3 py-2 text-[13px] text-ink-800 transition focus:border-ink-400 focus:bg-white focus:ring-2 focus:ring-ink-200"
          />
        </section>

        <section>
          <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-ink-400">
            <StickyNote size={11} className="text-[#c08a2e]" />
            Notas (se exportan con el nodo)
          </p>
          <textarea
            rows={4}
            placeholder="Detalles, enlaces, contexto…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onFocus={() => setFocused("notes")}
            onBlur={() => {
              setFocused(null);
              if (notes !== node.notes) api.updateNotes(node.id, notes);
            }}
            className="w-full resize-none rounded-lg border border-ink-200 bg-ink-50 px-3 py-2 text-[13px] leading-relaxed text-ink-800 transition placeholder:text-ink-300 focus:border-ink-400 focus:bg-white focus:ring-2 focus:ring-ink-200"
          />
          {urls.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {urls.map((u) => (
                <a
                  key={u}
                  href={u}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={u}
                  className="flex max-w-full items-center gap-1 rounded-full border border-brand/30 bg-brand/8 px-2 py-0.5 text-[11px] font-semibold text-brand transition hover:bg-brand/15"
                >
                  <Link size={10} className="shrink-0" />
                  <span className="truncate">{u.replace(/^https?:\/\/(www\.)?/, "").slice(0, 28)}</span>
                  <ArrowUpRight size={10} className="shrink-0" />
                </a>
              ))}
            </div>
          )}
        </section>

        <section>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-ink-400">Tipo de nodo</p>
          <div className="grid grid-cols-4 gap-1.5">
            {(Object.keys(KIND_META) as NodeKind[]).map((k) => {
              const active = (node.kind ?? "idea") === k;
              return (
                <button
                  key={k}
                  title={KIND_META[k].hint}
                  onClick={() => api.setKind(node.id, k)}
                  className={`flex flex-col items-center gap-1 rounded-lg border px-1 py-2 transition active:translate-y-px ${
                    active
                      ? "border-ink-800 bg-ink-800 text-white shadow-sm"
                      : "border-ink-200 bg-white text-ink-500 hover:border-ink-300 hover:bg-ink-50"
                  }`}
                >
                  {KIND_META[k].icon}
                  <span className="text-[9.5px] font-bold">{KIND_META[k].label}</span>
                </button>
              );
            })}
          </div>
          {(node.kind ?? "idea") === "image" && (
            <div className="mt-2 flex gap-1.5">
              <button
                onClick={() => onPickImage(node.id)}
                className="flex-1 rounded-lg border border-ink-200 bg-white px-2 py-1.5 text-[11.5px] font-bold text-ink-600 transition hover:bg-ink-50"
              >
                {node.image ? "Reemplazar imagen" : "Elegir imagen"}
              </button>
              {node.image && (
                <button
                  onClick={() => api.setImage(node.id, null)}
                  className="rounded-lg border border-danger/30 bg-danger/5 px-2 py-1.5 text-[11.5px] font-bold text-danger transition hover:bg-danger/10"
                >
                  Quitar
                </button>
              )}
            </div>
          )}
        </section>

        <section>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-ink-400">Color de rama</p>
          <div className="flex flex-wrap items-center gap-2">
            <button
              title="Color automático (hereda de la rama)"
              aria-label="Color automático"
              onClick={() => api.setColor(node.id, null)}
              className={`grid h-7 w-7 place-items-center rounded-full border-2 border-white shadow ring-1 ring-ink-200 transition hover:scale-110 ${
                node.color === null ? "ring-2 ring-ink-800" : ""
              }`}
              style={{ background: "conic-gradient(#b54a33, #5e7e9e, #c08a2e, #8d5b7c, #b54a33)" }}
            >
              <span className="h-2.5 w-2.5 rounded-full bg-white" />
            </button>
            {BRANCH_COLORS.map((c) => (
              <button
                key={c}
                title={c}
                aria-label={`Color ${c}`}
                onClick={() => api.setColor(node.id, c)}
                className={`h-7 w-7 rounded-full border-2 border-white shadow transition hover:scale-110 ${
                  node.color === c ? "ring-2 ring-ink-800 ring-offset-1" : ""
                }`}
                style={{ background: c }}
              />
            ))}
          </div>
        </section>

        <section>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-ink-400">Disposición de los hijos</p>
          <div className="grid grid-cols-3 gap-1.5">
            {LAYOUT_MODES.map((m) => {
              const active = activeMode === m.id;
              return (
                <button
                  key={m.id}
                  title={m.hint}
                  aria-pressed={active}
                  onClick={() => api.setLayout(node.id, m.id, recursiveLayout)}
                  className={`flex flex-col items-center gap-1 rounded-lg border px-1 pb-1.5 pt-2 transition active:translate-y-px ${
                    active
                      ? "border-ink-800 bg-ink-800 text-white shadow-sm"
                      : "border-ink-200 bg-white text-ink-500 hover:border-ink-300 hover:bg-ink-50 hover:text-ink-700"
                  }`}
                >
                  <LayoutGlyph mode={m.id} />
                  <span className="text-[9.5px] font-bold leading-none">{m.label}</span>
                </button>
              );
            })}
          </div>
          <label className="mt-2.5 flex cursor-pointer select-none items-center gap-2 text-[12px] font-medium text-ink-500">
            <input
              type="checkbox"
              checked={recursiveLayout}
              onChange={(e) => setRecursiveLayout(e.target.checked)}
              className="h-3.5 w-3.5 accent-[#b54a33]"
            />
            Aplicar también a las subramas
          </label>
        </section>

        <section>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-ink-400">Hijos directos</p>
          {node.children.length === 0 ? (
            <p className="rounded-lg border border-dashed border-ink-200 px-3 py-2.5 text-[12px] italic leading-snug text-ink-400">
              Sin subnodos todavía. Con <kbd className="kbd">Tab</kbd> creás el primero.
            </p>
          ) : (
            <>
              <div className="flex flex-col gap-1">
                {(showAllKids ? node.children : node.children.slice(0, 8)).map((child) => {
                  const sub = countNodes(child) - 1;
                  const dot = child.color ?? node.color ?? "#8a8a96";
                  return (
                    <button
                      key={child.id}
                      onClick={() => goToChild(child.id)}
                      title={`Ir a «${child.text.trim() || "Idea"}»`}
                      className="group flex items-center gap-2 rounded-lg border border-ink-100 bg-ink-50 px-2.5 py-1.5 text-left transition hover:border-ink-300 hover:bg-white hover:shadow-sm active:translate-y-px"
                    >
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: dot }} />
                      <span className="min-w-0 flex-1 truncate text-[12.5px] font-medium text-ink-700">
                        {child.text.trim() || <em className="text-ink-400">Idea</em>}
                      </span>
                      {sub > 0 && (
                        <span className="shrink-0 rounded-full bg-ink-200/60 px-1.5 text-[10px] font-bold text-ink-500">
                          +{sub}
                        </span>
                      )}
                      <ChevronRight
                        size={12}
                        className="shrink-0 text-ink-300 transition group-hover:translate-x-0.5 group-hover:text-ink-600"
                      />
                    </button>
                  );
                })}
              </div>
              {node.children.length > 8 && (
                <button
                  onClick={() => setShowAllKids((s) => !s)}
                  className="mt-1.5 w-full rounded-lg py-1 text-[11.5px] font-bold text-ink-500 transition hover:bg-ink-100 hover:text-ink-700"
                >
                  {showAllKids ? "Mostrar menos" : `Mostrar los ${node.children.length - 8} restantes`}
                </button>
              )}
            </>
          )}
        </section>

        <section>
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-ink-400">Estadísticas</p>
          <div className="grid grid-cols-3 gap-2">
            {[
              [String(node.children.length), "Directos"],
              [String(descendants), "Descend."],
              [String(path.length), "Nivel"],
            ].map(([value, label]) => (
              <div key={label} className="rounded-lg border border-ink-100 bg-ink-50 px-2 py-2 text-center">
                <p className="font-display text-lg font-bold leading-none text-ink-800">{value}</p>
                <p className="mt-1 text-[9px] font-bold uppercase tracking-wider text-ink-400">{label}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="space-y-2 border-t border-ink-100 p-4">
        <div className="relative">
          <div className="flex gap-1.5">
            <button
              onClick={() => api.addChild(node.id)}
              className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-ink-800 px-3 py-2 text-[13px] font-semibold text-white transition hover:bg-ink-700 active:translate-y-px"
            >
              <Plus size={15} />
              Añadir subnodo
            </button>
            <button
              onClick={() => setShowKinds((v) => !v)}
              aria-label="Elegir tipo de subnodo"
              className={`rounded-lg border px-2 transition active:translate-y-px ${
                showKinds
                  ? "border-ink-800 bg-ink-800 text-white"
                  : "border-ink-200 bg-white text-ink-600 hover:bg-ink-50"
              }`}
            >
              <ChevronDown size={15} />
            </button>
          </div>
          {showKinds && (
            <div className="pop-in absolute bottom-full left-0 z-40 mb-1.5 w-full overflow-hidden rounded-lg border border-ink-200 bg-white shadow-xl">
              {(Object.keys(KIND_META) as NodeKind[]).map((k) => (
                <button
                  key={k}
                  onClick={() => addKind(k)}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[12.5px] font-semibold text-ink-700 transition hover:bg-ink-50"
                >
                  <span className="text-ink-400">{KIND_META[k].icon}</span>
                  <span className="flex-1">{KIND_META[k].label}</span>
                  <span className="text-[10.5px] font-medium text-ink-400">{KIND_META[k].hint}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          onClick={() => api.toggleCollapse(node.id)}
          disabled={node.children.length === 0}
          className="flex w-full items-center gap-2 rounded-lg border border-ink-200 bg-white px-3 py-2 text-[13px] font-semibold text-ink-700 transition hover:bg-ink-50 disabled:pointer-events-none disabled:opacity-40"
        >
          {node.collapsed ? <ChevronRight size={15} /> : <ChevronDown size={15} />}
          {node.collapsed ? "Expandir rama" : "Plegar rama"}
        </button>
        <button
          onClick={() => api.deleteNode(node.id)}
          disabled={isRoot}
          className="flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-[13px] font-semibold transition active:translate-y-px disabled:pointer-events-none disabled:opacity-40"
          style={{
            color: "#c04545",
            borderColor: withAlpha("#e05252", 0.35),
            background: withAlpha("#e05252", 0.04),
          }}
        >
          <Trash2 size={15} />
          Eliminar nodo
        </button>
      </div>
    </aside>
  );
}
