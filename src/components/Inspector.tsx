import { useEffect, useState } from "react";
import {
  AlignLeft,
  ArrowUpRight,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  Flag,
  Heading2,
  Image as ImageIcon,
  Lightbulb,
  Link,
  Plus,
  Tag,
  Trash2,
  User,
} from "lucide-react";
import type { LayoutMode, MindNode, NodeKind, NodePriority, NodeReviewStatus, NodeRisk, NodeStatus } from "../types";
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

const PRIORITIES: Array<{ id: NodePriority; label: string }> = [
  { id: "none", label: "Sin prioridad" },
  { id: "low", label: "Baja" },
  { id: "medium", label: "Media" },
  { id: "high", label: "Alta" },
  { id: "urgent", label: "Urgente" },
];
const STATUSES: Array<{ id: NodeStatus; label: string }> = [
  { id: "none", label: "Sin estado" },
  { id: "todo", label: "Pendiente" },
  { id: "doing", label: "En curso" },
  { id: "blocked", label: "Bloqueado" },
  { id: "done", label: "Terminado" },
];
const RISKS: Array<{ id: NodeRisk; label: string }> = [
  { id: "none", label: "Sin riesgo" },
  { id: "low", label: "Bajo" },
  { id: "medium", label: "Medio" },
  { id: "high", label: "Alto" },
];
const REVIEWS: Array<{ id: NodeReviewStatus; label: string }> = [
  { id: "none", label: "Sin revisión" },
  { id: "pending", label: "Pendiente" },
  { id: "approved", label: "Aprobado" },
  { id: "changes", label: "Con cambios" },
];

/* ---------- glifo de disposición ---------- */
function LayoutGlyph({ mode, small = false }: { mode: LayoutMode; small?: boolean }) {
  const cls = small ? "h-[18px] w-[18px]" : "h-6 w-6";
  const dot = "h-1.5 w-1.5 rounded-full";
  switch (mode) {
    case "right":
      return (
        <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth={1.4}>
          <circle cx="5" cy="12" r="2.2" fill="currentColor" stroke="none" />
          <path d="M7.2 12h4M11 6h3M11 12h4M11 18h3M11 6v12" />
          <circle cx="16.5" cy="6" r="1.4" className={dot} fill="currentColor" stroke="none" />
          <circle cx="17.5" cy="12" r="1.4" className={dot} fill="currentColor" stroke="none" />
          <circle cx="16.5" cy="18" r="1.4" className={dot} fill="currentColor" stroke="none" />
        </svg>
      );
    case "left":
      return (
        <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth={1.4}>
          <circle cx="19" cy="12" r="2.2" fill="currentColor" stroke="none" />
          <path d="M16.8 12h-4M13 6H10M13 12H9M13 18h-3M13 6v12" />
          <circle cx="7.5" cy="6" r="1.4" className={dot} fill="currentColor" stroke="none" />
          <circle cx="6.5" cy="12" r="1.4" className={dot} fill="currentColor" stroke="none" />
          <circle cx="7.5" cy="18" r="1.4" className={dot} fill="currentColor" stroke="none" />
        </svg>
      );
    case "split":
      return (
        <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth={1.4}>
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
        <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth={1.4}>
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
        <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth={1.4}>
          <circle cx="5" cy="5" r="2" fill="currentColor" stroke="none" />
          <path d="M7 5h3M10 5v14M10 9h4M10 14h5M10 19h4" />
          <circle cx="16" cy="9" r="1.3" className={dot} fill="currentColor" stroke="none" />
          <circle cx="17" cy="14" r="1.3" className={dot} fill="currentColor" stroke="none" />
          <circle cx="16" cy="19" r="1.3" className={dot} fill="currentColor" stroke="none" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" className={cls} fill="none" stroke="currentColor" strokeWidth={1.4}>
          <circle cx="12" cy="12" r="2.2" fill="currentColor" stroke="none" />
          <path d="M9.8 12H6M14.2 12h3.8M6 12V8.5M6 12v3.5M18 12V8.5M18 12v3.5" />
          <circle cx="6" cy="7.5" r="1.3" className={dot} fill="currentColor" stroke="none" />
          <circle cx="6" cy="16.5" r="1.3" className={dot} fill="currentColor" stroke="none" />
          <circle cx="18" cy="7.5" r="1.3" className={dot} fill="currentColor" stroke="none" />
          <circle cx="18" cy="16.5" r="1.3" className={dot} fill="currentColor" stroke="none" />
        </svg>
      );
  }
}

/* ---------- sección colapsable ---------- */
function Section({
  title,
  value,
  defaultOpen = true,
  children,
}: {
  title: string;
  value?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="border-b border-ink-100 last:border-b-0">
      <div className="flex items-stretch">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="group flex flex-1 cursor-pointer items-center gap-1.5 px-4 py-2.5 text-left transition hover:bg-ink-50/80"
        >
          <ChevronDown
            size={12}
            className={`shrink-0 text-ink-400 transition-transform duration-200 ${open ? "" : "-rotate-90"}`}
          />
          <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink-500 transition group-hover:text-ink-800">
            {title}
          </span>
        </button>
        {value !== undefined && (
          <span className="flex items-center pr-4 text-[10.5px] font-bold tabular-nums text-ink-400">{value}</span>
        )}
      </div>
      <div className="section-body" data-open={open}>
        <div className="section-clip">
          <div className="px-4 pb-4">{children}</div>
        </div>
      </div>
    </section>
  );
}

/* ---------- etiqueta de campo ---------- */
function Field({
  label,
  icon,
  className,
  children,
}: {
  label: string;
  icon?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`block ${className ?? ""}`}>
      <span className="mb-1 flex items-center gap-1 text-[9.5px] font-bold uppercase tracking-[0.12em] text-ink-400">
        {icon}
        {label}
      </span>
      {children}
    </label>
  );
}

/* ---------- select con chevron propio ---------- */
function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: Array<{ id: string; label: string }>;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full cursor-pointer appearance-none rounded-lg border border-ink-200 bg-ink-50 py-[7px] pl-2.5 pr-7 text-[12px] font-semibold text-ink-700 transition hover:border-ink-300 focus:border-ink-400 focus:bg-white focus:ring-2 focus:ring-ink-200"
      >
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown size={12} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-ink-400" />
    </div>
  );
}

export function Inspector({
  node,
  path,
  api,
  onClose,
  onFocusNode,
  onPickImage,
  onSetImageUrl,
}: {
  node: MindNode;
  path: MindNode[];
  api: MindMapApi;
  onClose: () => void;
  onFocusNode: (id: string) => void;
  onPickImage: (id: string) => void;
  onSetImageUrl: (id: string, url: string) => void;
}) {
  const [text, setText] = useState(node.text);
  const [notes, setNotes] = useState(node.notes);
  const [imageUrl, setImageUrl] = useState(node.image?.source === "url" ? node.image.src : "");
  const [focused, setFocused] = useState<"text" | "notes" | null>(null);
  const [showKinds, setShowKinds] = useState(false);
  const [showAllKids, setShowAllKids] = useState(false);
  const [showMoreMeta, setShowMoreMeta] = useState(false);
  const [recursiveLayout, setRecursiveLayout] = useState(false);

  useEffect(() => {
    setText(node.text);
    setNotes(node.notes);
    setImageUrl(node.image?.source === "url" ? node.image.src : "");
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
  const meta = node.meta ?? {};
  const progress = meta.progress ?? 0;
  const fieldCls =
    "w-full rounded-lg border border-ink-200 bg-ink-50 px-2.5 py-[7px] text-[12px] font-semibold text-ink-700 transition focus:border-ink-400 focus:bg-white focus:ring-2 focus:ring-ink-200";
  const setMeta = (patch: NonNullable<MindNode["meta"]>) => api.updateMeta(node.id, patch);

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
    <div className="canvas-dots relative h-full w-[clamp(19rem,30vw,26rem)] shrink-0">
      {/* tarjeta flotante */}
      <aside className="pop-in absolute inset-y-3 left-0 right-3 z-10 flex flex-col overflow-hidden rounded-lg border border-ink-200/80 bg-white shadow-[0_14px_40px_-10px_rgba(38,38,46,0.22),0_3px_10px_-3px_rgba(38,38,46,0.08)]">
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {/* ---------- ubicación ---------- */}
          <Section title="Ubicación">
            <div className="flex flex-wrap items-center gap-x-1 gap-y-1">
              {path.map((p, i) => {
                const last = i === path.length - 1;
                return (
                  <span key={p.id} className="flex min-w-0 items-center gap-1">
                    {i > 0 && <ChevronRight size={10} className="shrink-0 text-ink-300" />}
                    <button
                      onClick={() => onFocusNode(p.id)}
                      title={p.text.trim() || "Idea"}
                      className={`max-w-[150px] truncate rounded-md px-1.5 py-0.5 text-[11.5px] font-semibold transition ${
                        last
                          ? "bg-ink-800 text-white"
                          : "text-ink-500 hover:bg-ink-100 hover:text-ink-800"
                      }`}
                    >
                      {p.text.trim() || "Idea"}
                    </button>
                  </span>
                );
              })}
            </div>
          </Section>

          {/* ---------- texto del nodo ---------- */}
          <Section title="Texto del nodo">
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
          </Section>

          {/* ---------- notas ---------- */}
          <Section title="Notas" defaultOpen={false}>
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
            <p className="mt-2 text-[10.5px] font-medium leading-snug text-ink-400">
              Las notas se exportan junto con el nodo.
            </p>
          </Section>

          {/* ---------- tarea y metadatos ---------- */}
          <Section title="Tarea y metadatos">
            <label className="flex cursor-pointer select-none items-center gap-2 text-[12px] font-semibold text-ink-600">
              <input
                type="checkbox"
                checked={Boolean(meta.taskDone)}
                onChange={(e) =>
                  setMeta({ taskDone: e.target.checked, status: e.target.checked ? "done" : meta.status })
                }
                className="h-3.5 w-3.5 accent-[#0f9d8a]"
              />
              Marcar como tarea completada
            </label>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <Field label="Estado">
                <Select
                  value={meta.status ?? "none"}
                  onChange={(v) => setMeta({ status: v as NodeStatus })}
                  options={STATUSES}
                />
              </Field>
              <Field label="Prioridad">
                <Select
                  value={meta.priority ?? "none"}
                  onChange={(v) => setMeta({ priority: v as NodePriority })}
                  options={PRIORITIES}
                />
              </Field>
            </div>

            <Field label="Etiquetas" icon={<Tag size={10} />} className="mt-2">
              <input
                value={(meta.tags ?? []).join(", ")}
                onChange={(e) => setMeta({ tags: e.target.value.split(",").map((t) => t.trim()).filter(Boolean) })}
                placeholder="producto, investigación, idea"
                className={fieldCls}
              />
            </Field>

            <div className="mt-2 grid grid-cols-2 gap-2">
              <Field label="Inicio" icon={<CalendarDays size={10} />}>
                <input
                  type="date"
                  value={meta.startDate ?? ""}
                  onChange={(e) => setMeta({ startDate: e.target.value || undefined })}
                  className={fieldCls}
                />
              </Field>
              <Field label="Límite" icon={<CalendarDays size={10} />}>
                <input
                  type="date"
                  value={meta.dueDate ?? ""}
                  onChange={(e) => setMeta({ dueDate: e.target.value || undefined })}
                  className={fieldCls}
                />
              </Field>
            </div>

            <button
              type="button"
              onClick={() => setShowMoreMeta((v) => !v)}
              className="mt-2.5 flex w-full cursor-pointer items-center justify-center gap-1 rounded-md py-1 text-[10.5px] font-bold uppercase tracking-[0.08em] text-ink-400 transition hover:bg-ink-50 hover:text-ink-700"
            >
              <ChevronDown size={11} className={`transition-transform duration-200 ${showMoreMeta ? "rotate-180" : ""}`} />
              {showMoreMeta ? "Ocultar campos adicionales" : "Responsable, categoría, riesgo y revisión"}
            </button>

            {showMoreMeta && (
              <div className="pop-in mt-1 space-y-2 rounded-lg border border-dashed border-ink-200 p-2.5">
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Responsable" icon={<User size={10} />}>
                    <input
                      value={meta.assignee ?? ""}
                      onChange={(e) => setMeta({ assignee: e.target.value || undefined })}
                      className={fieldCls}
                    />
                  </Field>
                  <Field label="Categoría">
                    <input
                      value={meta.category ?? ""}
                      onChange={(e) => setMeta({ category: e.target.value || undefined })}
                      className={fieldCls}
                    />
                  </Field>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Riesgo" icon={<Flag size={10} />}>
                    <Select
                      value={meta.risk ?? "none"}
                      onChange={(v) => setMeta({ risk: v as NodeRisk })}
                      options={RISKS}
                    />
                  </Field>
                  <Field label="Revisión">
                    <Select
                      value={meta.review ?? "none"}
                      onChange={(v) => setMeta({ review: v as NodeReviewStatus })}
                      options={REVIEWS}
                    />
                  </Field>
                </div>
              </div>
            )}
          </Section>

          {/* ---------- progreso ---------- */}
          <Section title="Progreso" value={`${progress}%`}>
            <div className="h-2 w-full overflow-hidden rounded-full bg-ink-100">
              <div
                className="h-full rounded-full transition-[width] duration-200"
                style={{ width: `${progress}%`, background: progress >= 100 ? "#2e9e5b" : "#b54a33" }}
              />
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={progress}
              onChange={(e) => setMeta({ progress: Number(e.target.value) })}
              className="mt-2.5 w-full accent-[#b54a33]"
            />
          </Section>

          {/* ---------- tipo de nodo ---------- */}
          <Section title="Tipo de nodo">
            <div className="grid grid-cols-4 gap-1.5">
              {(Object.keys(KIND_META) as NodeKind[]).map((k) => {
                const active = (node.kind ?? "idea") === k;
                return (
                  <button
                    key={k}
                    title={KIND_META[k].hint}
                    onClick={() => api.setKind(node.id, k)}
                    className={`flex cursor-pointer flex-col items-center gap-1 rounded-lg border px-1 py-2 transition active:translate-y-px ${
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
              <div className="mt-2 space-y-2">
                <div className="flex gap-1.5">
                  <button
                    onClick={() => onPickImage(node.id)}
                    className="flex-1 cursor-pointer rounded-lg border border-ink-200 bg-white px-2 py-1.5 text-[11.5px] font-bold text-ink-600 transition hover:bg-ink-50"
                  >
                    {node.image ? "Reemplazar imagen" : "Elegir imagen"}
                  </button>
                  {node.image && (
                    <button
                      onClick={() => api.setImage(node.id, null)}
                      className="cursor-pointer rounded-lg border border-danger/30 bg-danger/5 px-2 py-1.5 text-[11.5px] font-bold text-danger transition hover:bg-danger/10"
                    >
                      Quitar
                    </button>
                  )}
                </div>
                <Field label="Imagen por URL">
                  <div className="flex gap-1.5">
                    <input
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && imageUrl.trim()) onSetImageUrl(node.id, imageUrl);
                      }}
                      placeholder="https://…/imagen.jpg"
                      className={`${fieldCls} min-w-0 flex-1 font-medium`}
                    />
                    <button
                      onClick={() => imageUrl.trim() && onSetImageUrl(node.id, imageUrl)}
                      className="shrink-0 cursor-pointer rounded-lg bg-ink-800 px-2.5 py-1.5 text-[11px] font-bold text-white transition hover:bg-ink-700"
                    >
                      Usar
                    </button>
                  </div>
                </Field>
                {node.image && (
                  <Field label="Texto alternativo">
                    <input
                      value={node.image.alt ?? ""}
                      onChange={(e) => api.setImage(node.id, { ...node.image!, alt: e.target.value })}
                      placeholder="Descripción accesible de la imagen"
                      className={`${fieldCls} font-medium`}
                    />
                  </Field>
                )}
                {node.image?.size && (
                  <p className="text-[10.5px] font-semibold text-ink-400">
                    {node.image.source === "url" ? "Referencia externa" : "Imagen comprimida"} ·{" "}
                    {Math.round(node.image.size / 1024)} KB
                  </p>
                )}
              </div>
            )}
          </Section>

          {/* ---------- color de rama ---------- */}
          <Section title="Color de rama">
            <div className="flex flex-wrap items-center gap-2">
              <button
                title="Color automático (hereda de la rama)"
                aria-label="Color automático"
                onClick={() => api.setColor(node.id, null)}
                className={`grid h-7 w-7 cursor-pointer place-items-center rounded-full border-2 border-white shadow ring-1 ring-ink-200 transition hover:scale-110 ${
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
                  className={`h-7 w-7 cursor-pointer rounded-full border-2 border-white shadow transition hover:scale-110 ${
                    node.color === c ? "ring-2 ring-ink-800 ring-offset-1" : ""
                  }`}
                  style={{ background: c }}
                />
              ))}
            </div>
          </Section>

          {/* ---------- disposición de los hijos ---------- */}
          <Section title="Disposición de los hijos">
            <div className="grid grid-cols-2 gap-1.5">
              {LAYOUT_MODES.map((m) => {
                const active = activeMode === m.id;
                return (
                  <button
                    key={m.id}
                    title={m.hint}
                    aria-pressed={active}
                    onClick={() => api.setLayout(node.id, m.id, recursiveLayout)}
                    className={`flex cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-2 transition active:translate-y-px ${
                      active
                        ? "border-ink-800 bg-ink-800 text-white shadow-sm"
                        : "border-ink-200 bg-white text-ink-600 hover:border-ink-300 hover:bg-ink-50 hover:text-ink-800"
                    }`}
                  >
                    <LayoutGlyph mode={m.id} small />
                    <span className="min-w-0 text-left text-[10.5px] font-bold leading-tight">{m.label}</span>
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
          </Section>

          {/* ---------- hijos directos ---------- */}
          <Section
            title="Hijos directos"
            defaultOpen={false}
            value={node.children.length > 0 ? String(node.children.length) : undefined}
          >
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
                        className="group flex cursor-pointer items-center gap-2 rounded-lg border border-ink-100 bg-ink-50 px-2.5 py-1.5 text-left transition hover:border-ink-300 hover:bg-white hover:shadow-sm active:translate-y-px"
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
                    className="mt-1.5 w-full cursor-pointer rounded-lg py-1 text-[11.5px] font-bold text-ink-500 transition hover:bg-ink-100 hover:text-ink-700"
                  >
                    {showAllKids ? "Mostrar menos" : `Mostrar los ${node.children.length - 8} restantes`}
                  </button>
                )}
              </>
            )}
          </Section>

          {/* ---------- estadísticas ---------- */}
          <Section title="Estadísticas" defaultOpen={false}>
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
          </Section>
        </div>

        {/* ---------- acciones ---------- */}
        <div className="space-y-1.5 border-t border-ink-100 bg-white px-3 py-3">
          <div className="relative">
            <div className="flex gap-1.5">
              <button
                onClick={() => api.addChild(node.id)}
                className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-lg bg-ink-800 px-3 py-2 text-[13px] font-semibold text-white transition hover:bg-ink-700 active:translate-y-px"
              >
                <Plus size={15} />
                Añadir subnodo
              </button>
              <button
                onClick={() => setShowKinds((v) => !v)}
                aria-label="Elegir tipo de subnodo"
                className={`cursor-pointer rounded-lg border px-2 transition active:translate-y-px ${
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
                    className="flex w-full cursor-pointer items-center gap-2.5 px-3 py-2 text-left text-[12.5px] font-semibold text-ink-700 transition hover:bg-ink-50"
                  >
                    <span className="text-ink-400">{KIND_META[k].icon}</span>
                    <span className="flex-1">{KIND_META[k].label}</span>
                    <span className="text-[10.5px] font-medium text-ink-400">{KIND_META[k].hint}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex gap-1.5">
            <button
              onClick={() => api.toggleCollapse(node.id)}
              disabled={node.children.length === 0}
              className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-ink-200 bg-white px-2 py-1.5 text-[12px] font-semibold text-ink-700 transition hover:bg-ink-50 disabled:pointer-events-none disabled:opacity-40"
            >
              {node.collapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />}
              {node.collapsed ? "Expandir rama" : "Plegar rama"}
            </button>
            <button
              onClick={() => api.deleteNode(node.id)}
              disabled={isRoot}
              className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg border px-2 py-1.5 text-[12px] font-semibold transition active:translate-y-px disabled:pointer-events-none disabled:opacity-40"
              style={{
                color: "#c04545",
                borderColor: withAlpha("#e05252", 0.35),
                background: withAlpha("#e05252", 0.04),
              }}
            >
              <Trash2 size={13} />
              Eliminar
            </button>
          </div>
        </div>
      </aside>

      {/* pestaña de colapso, anclada al borde izquierdo del panel */}
      <button
        onClick={onClose}
        title="Minimizar inspector"
        aria-label="Minimizar inspector"
        className="absolute left-0 top-1/2 z-20 grid h-10 w-[22px] -translate-x-1/2 -translate-y-1/2 cursor-pointer place-items-center rounded-lg border border-ink-200 bg-white text-ink-500 shadow-md transition hover:text-ink-900 hover:shadow-lg active:scale-95"
      >
        <ChevronRight size={14} />
      </button>
    </div>
  );
}
