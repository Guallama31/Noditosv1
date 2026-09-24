import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlignLeft,
  ChevronRight,
  Heading2,
  Image as ImageIcon,
  Lightbulb,
  Maximize,
  Minus,
  Plus,
  StickyNote,
  Wand2,
} from "lucide-react";
import type { MindNode, NodeFont, NodeImage, NodeKind, NotifyFn } from "../types";
import type { MindMapApi } from "../hooks/useMindMap";
import {
  computeLayout,
  edgeAnchor,
  edgePath,
  fitImage,
  nodeStyle,
  resolveTextStyle,
  withAlpha,
  type NodeBox,
} from "../lib/layout";
import {
  countNodes,
  findNode,
  findParent,
  insertChild,
  isDescendant,
  maxDepth,
  removeNode,
} from "../lib/tree";
import { parsePastedHtml, parsePastedText } from "../lib/paste";
import { fileToNodeImage, isProbablyImageUrl, urlToNodeImage } from "../lib/image";
import { ensureFonts } from "../lib/fonts";
import { screenRectToWorld, screenToWorld, worldToScreen, zoomAtPoint, type Camera } from "../lib/camera";
import { openUrl } from "../lib/links";
import { LinkText } from "./LinkText";
import { FontToolbar } from "./FontToolbar";
import {
  CanvasBackground,
  CanvasControls,
  CanvasEdges,
  CanvasInteractionOverlay,
  CanvasNodes,
  CanvasViewportLayer,
} from "./CanvasLayers";

const MAX_ZOOM = 1.5;
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

export const NODE_KINDS: Array<{ id: NodeKind; label: string; hint: string; icon: React.ReactNode; key: string }> = [
  { id: "idea", label: "Idea", hint: "Nodo común", icon: <Lightbulb size={15} />, key: "1" },
  { id: "title", label: "Título", hint: "Encabezado de sección", icon: <Heading2 size={15} />, key: "2" },
  { id: "text", label: "Texto", hint: "Párrafo extenso", icon: <AlignLeft size={15} />, key: "3" },
  { id: "image", label: "Imagen", hint: "Imagen con leyenda", icon: <ImageIcon size={15} />, key: "4" },
];

/* ================= selector de tipo de nodo ================= */

function TypePicker({
  x,
  y,
  onPick,
  onClose,
}: {
  x: number;
  y: number;
  onPick: (kind: NodeKind) => void;
  onClose: () => void;
}) {
  return (
    <>
      <div className="fixed inset-0 z-30" onClick={onClose} onContextMenu={(e) => { e.preventDefault(); onClose(); }} />
      <div
        className="pop-in fixed z-40 w-52 overflow-hidden rounded-xl border border-ink-200 bg-white shadow-2xl"
        style={{ left: clamp(x, 8, window.innerWidth - 216), top: clamp(y + 10, 8, window.innerHeight - 250) }}
      >
        <p className="border-b border-ink-100 bg-ink-50 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.14em] text-ink-400">
          Tipo de subnodo
        </p>
        {NODE_KINDS.map((k) => (
          <button
            key={k.id}
            onClick={() => onPick(k.id)}
            className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition hover:bg-ink-50"
          >
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-ink-100 text-ink-600">{k.icon}</span>
            <span className="flex-1">
              <span className="block text-[13px] font-bold text-ink-800">{k.label}</span>
              <span className="block text-[11px] text-ink-400">{k.hint}</span>
            </span>
            <kbd className="kbd">{k.key}</kbd>
          </button>
        ))}
      </div>
    </>
  );
}

/* ================= vista de nodo ================= */

interface NodeViewProps {
  node: MindNode;
  box: NodeBox;
  minX: number;
  minY: number;
  selected: boolean;
  editing: boolean;
  dimmed: boolean;
  isTarget: boolean;
  searchMatch?: boolean;
  onPointerDown: (e: React.PointerEvent, id: string) => void;
  onPointerMove: (e: React.PointerEvent) => void;
  onPointerUp: () => void;
  onLostCapture: () => void;
  onDoubleClick: (e: React.MouseEvent, id: string) => void;
  onToggleCollapse: (id: string) => void;
  onCommit: (id: string, text: string) => void;
  onCancel: () => void;
  onTab: (id: string) => void;
  onRequestImage: (id: string) => void;
  onFontChange: (id: string, font: NodeFont | null) => void;
  screen?: { left: number; top: number; width: number; height: number; scale: number };
  lowDetail?: boolean;
}

const NodeView = memo(function NodeView({
  node,
  box,
  minX,
  minY,
  selected,
  editing,
  dimmed,
  isTarget,
  searchMatch,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onLostCapture,
  onDoubleClick,
  onToggleCollapse,
  onCommit,
  onCancel,
  onTab,
  onRequestImage,
  onFontChange,
  screen,
  lowDetail = false,
}: NodeViewProps) {
  const d = box.depth;
  const renderScale = screen?.scale ?? 1;
  const st = nodeStyle(box, selected, dimmed, d === 0 ? false : isTarget);
  const kind = box.kind;
  const color = box.color;
  const [draft, setDraft] = useState(node.text);

  useEffect(() => {
    if (editing) setDraft(node.text);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing, node.id]);

  // La tipografía y el padding salen de resolveTextStyle, la misma función que
  // usa la medición del layout: así el texto encaja exacto en la burbuja.
  const ty = resolveTextStyle(node, d);
  const borderLeft = kind === "text" ? `3px solid ${color}` : undefined;
  const hasImage = kind === "image";
  const img = hasImage ? (node.image ? fitImage(node.image.aspect) : null) : null;

  const isDark = d === 0 || (d === 1 && kind === "idea");

  return (
    <div
      className="absolute select-none"
      style={{
        left: screen?.left ?? box.cx - box.w / 2 - minX,
        top: screen?.top ?? box.cy - box.h / 2 - minY,
        width: screen?.width ?? box.w,
        height: screen?.height ?? box.h,
        zIndex: selected ? 20 : d === 0 ? 10 : 5,
        pointerEvents: screen ? "auto" : undefined,
      }}
    >
      <div
        onPointerDown={(e) => onPointerDown(e, box.id)}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onLostPointerCapture={onLostCapture}
        onDoubleClick={(e) => onDoubleClick(e, box.id)}
        className={`group relative flex h-full w-full flex-col justify-center transition-[box-shadow,opacity,border-color,filter] duration-150 ${
          d === 0 ? "cursor-default" : "cursor-grab active:cursor-grabbing"
        }`}
        style={{
          boxSizing: "border-box",
          background: st.background,
          backgroundImage: st.backgroundImage,
          border: st.border,
          borderLeft,
          borderRadius: d === 0 ? 16 : kind === "image" ? 12 : 10,
          color: st.textColor,
          fontWeight: ty.fontWeight,
          fontSize: ty.fontSize * renderScale,
          lineHeight: `${ty.lineHeight * renderScale}px`,
          fontFamily: ty.fontFamily,
          fontStyle: ty.italic ? "italic" : undefined,
          boxShadow: searchMatch ? `${st.shadow}, 0 0 0 4px rgba(181,74,51,0.22)` : st.shadow,
          opacity: st.opacity,
          filter: selected ? "saturate(1.02)" : undefined,
          padding: `${ty.padY * renderScale}px ${ty.padX * renderScale}px`,
          touchAction: "none",
        }}
      >
        {hasImage ? (
          <div className="flex h-full w-full flex-col items-center justify-center gap-1.5">
            {img && node.image ? (
              <img
                src={node.image.src}
                alt={node.image.alt || node.text.trim() || "Imagen del nodo"}
                draggable={false}
                className="rounded-lg object-cover"
                style={{ width: img.w * renderScale, height: img.h * renderScale }}
              />
            ) : (
              <div
                className="grid place-items-center rounded-lg border-2 border-dashed text-ink-300"
                style={{ width: 200 * renderScale, height: 120 * renderScale, borderColor: withAlpha(color, 0.4) }}
              >
                <span className="flex flex-col items-center gap-1 text-[11px] font-semibold">
                  <ImageIcon size={20} />
                  Doble clic para añadir
                </span>
              </div>
            )}
            {box.lines.length > 0 && (
              <div className="w-full text-center">
                {box.lines.map((l, i) => (
                  <div key={i} className="overflow-hidden whitespace-pre">
                    {l || " "}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          box.lines.map((line, i) => (
            <div key={i} className="overflow-hidden whitespace-pre" style={{ minHeight: "1em" }}>
              <LinkText text={line || " "} tone={isDark ? "light" : "dark"} />
            </div>
          ))
        )}

        {kind === "title" && (
          <span
            className="absolute bottom-[5px] left-1/2 h-[2.5px] w-2/3 -translate-x-1/2 rounded-full"
            style={{ background: color }}
          />
        )}

        {!lowDetail && box.hasNotes && !hasImage && (
          <span
            title="Tiene notas"
            className="absolute -right-1.5 -top-1.5 grid h-4 w-4 place-items-center rounded-full border-2 border-white bg-[#c08a2e] text-white shadow-sm"
          >
            <StickyNote size={8} />
          </span>
        )}

        {box.childCount > 0 && (
          <button
            aria-label={box.collapsed ? "Expandir" : "Plegar"}
            title={box.collapsed ? `Expandir (${box.childCount} hijos)` : "Plegar hijos"}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onToggleCollapse(box.id);
            }}
            className={`absolute top-1/2 z-10 grid h-5 w-5 -translate-y-1/2 place-items-center rounded-full border-2 border-white text-white shadow-md transition hover:scale-110 active:scale-95 ${
              box.collapsed ? "bg-brand" : "opacity-40 hover:opacity-100"
            }`}
            style={{ background: box.collapsed ? "#b54a33" : color, [box.side === -1 ? "right" : "left"]: -10 } as React.CSSProperties}
          >
            <ChevronRight
              size={11}
              strokeWidth={3}
              className={box.collapsed ? (box.side === -1 ? "-rotate-180" : "") : box.side === -1 ? "-rotate-90" : "rotate-90"}
            />
            {box.collapsed && (
              <span className="absolute -top-4 left-1/2 -translate-x-1/2 rounded-full bg-ink-900 px-1.5 py-px text-[9px] font-bold text-white shadow">
                {box.childCount}
              </span>
            )}
          </button>
        )}

        {editing && (
          <div className="absolute inset-0 z-30" onPointerDown={(e) => e.stopPropagation()}>
            <textarea
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onFocus={(e) => e.currentTarget.select()}
              onBlur={() => onCommit(box.id, draft)}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  onCommit(box.id, draft);
                } else if (e.key === "Escape") {
                  onCancel();
                } else if (e.key === "Tab") {
                  e.preventDefault();
                  onCommit(box.id, draft);
                  onTab(box.id);
                }
              }}
              className="h-full w-full resize-none rounded-[inherit] border-2 border-brand bg-white p-2 text-ink-900 shadow-xl"
              style={{
                fontFamily: "inherit",
                fontSize: "inherit",
                fontWeight: "inherit",
                fontStyle: "inherit",
                lineHeight: "inherit",
              }}
            />
            <FontToolbar node={node} depth={box.depth} onFontChange={onFontChange} />
          </div>
        )}
      </div>
    </div>
  );
});

/* ================= lienzo ================= */

export interface FocusTarget {
  id: string;
  tick: number;
}

interface CanvasProps {
  api: MindMapApi;
  notify: NotifyFn;
  focusTarget: FocusTarget | null;
  fitTick: number;
  hotkeysDisabled: boolean;
  onExportHotkey: () => void;
  onImportHotkey: () => void;
  onSearchHotkey: () => void;
  onHelpHotkey: () => void;
  onRequestImage: (id: string) => void;
  searchMatchIds?: Set<string>;
  onRequestMove: (id: string, targetId: string) => void;
}

export function Canvas({
  api,
  notify,
  focusTarget,
  fitTick,
  hotkeysDisabled,
  onExportHotkey,
  onImportHotkey,
  onSearchHotkey,
  onHelpHotkey,
  onRequestImage,
  onRequestMove,
  searchMatchIds,
}: CanvasProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<Camera>({ scale: 1, tx: 0, ty: 0 });
  const viewRef = useRef<Camera>(view);
  viewRef.current = view;
  const [animating, setAnimating] = useState(false);
  const [panning, setPanning] = useState(false);
  const panRef = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null);
  const [fontTick, setFontTick] = useState(0);
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const update = () => {
      const rect = el.getBoundingClientRect();
      setViewportSize({ width: rect.width, height: rect.height });
    };
    update();
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(update) : null;
    observer?.observe(el);
    return () => observer?.disconnect();
  }, []);

  const layout = useMemo(
    () => computeLayout(api.root),
    // fontTick fuerza a re-medir cuando cargan las fuentes web
    [api.root, fontTick],
  );
  const layoutRef = useRef(layout);
  layoutRef.current = layout;
  const apiRef = useRef(api);
  apiRef.current = api;
  const notifyRef = useRef(notify);
  notifyRef.current = notify;
  const hotkeysRef = useRef(hotkeysDisabled);
  hotkeysRef.current = hotkeysDisabled;
  const onRequestMoveRef = useRef(onRequestMove);
  onRequestMoveRef.current = onRequestMove;
  const onRequestImageRef = useRef(onRequestImage);
  onRequestImageRef.current = onRequestImage;

  /* ---------- arrastre ---------- */
  const [drag, setDrag] = useState<{ id: string; x: number; y: number; dx: number; dy: number; over: string | null } | null>(null);
  const dragRef = useRef<{
    id: string; startX: number; startY: number; moved: boolean; pid: number;
    dx: number; dy: number; over: string | null;
  } | null>(null);

  /* ---------- selector de tipo (Tab) ---------- */
  const [picker, setPicker] = useState<string | null>(null);
  const pickerRef = useRef(picker);
  pickerRef.current = picker;
  const openPicker = useCallback((id: string) => setPicker(id), []);
  const closePicker = useCallback(() => setPicker(null), []);
  const pickKind = useCallback((parentId: string, kind: NodeKind) => {
    setPicker(null);
    apiRef.current.addChild(parentId, kind);
  }, []);

  const onFontChange = useCallback((id: string, font: NodeFont | null) => {
    apiRef.current.setFont(id, font);
    if (font) ensureFonts([font.family]).then(() => setFontTick((t) => t + 1));
    else setFontTick((t) => t + 1);
  }, []);

  const nodeById = useMemo(() => {
    const map = new Map<string, MindNode>();
    const walk = (n: MindNode) => {
      map.set(n.id, n);
      n.children.forEach(walk);
    };
    walk(api.root);
    return map;
  }, [api.root]);

  /* ---------- arrastre: subrama desplazada en vivo ---------- */
  const dragIds = useMemo(() => {
    const set = new Set<string>();
    if (!drag) return set;
    const node = nodeById.get(drag.id);
    if (!node) return set;
    const collect = (n: MindNode) => {
      set.add(n.id);
      n.children.forEach(collect);
    };
    collect(node);
    return set;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drag?.id, nodeById]);

  const displayBoxes = useMemo(() => {
    if (!drag) return layout.boxes;
    const shifted = new Map(layout.boxes);
    for (const id of dragIds) {
      const b = shifted.get(id);
      if (b) shifted.set(id, { ...b, cx: b.cx + drag.dx, cy: b.cy + drag.dy });
    }
    return shifted;
  }, [layout.boxes, drag, dragIds]);

  /* ---------- vista ---------- */
  const fit = useCallback((animate: boolean) => {
    const el = wrapperRef.current;
    if (!el) return;
    const b = layoutRef.current.bounds;
    const { width, height } = el.getBoundingClientRect();
    const w = b.maxX - b.minX + 140;
    const h = b.maxY - b.minY + 140;
    const scale = clamp(Math.min(width / w, height / h), 0.2, 1.1);
    setAnimating(animate);
    setView({
      scale,
      tx: width / 2 - scale * ((b.minX + b.maxX) / 2),
      ty: height / 2 - scale * ((b.minY + b.maxY) / 2),
    });
  }, []);
  const fitRef = useRef(fit);
  fitRef.current = fit;

  const centerOn = useCallback((id: string, minScale = 0.85) => {
    const box = layoutRef.current.boxes.get(id);
    const el = wrapperRef.current;
    if (!box || !el) return;
    const { width, height } = el.getBoundingClientRect();
    const v = viewRef.current;
    const scale = clamp(Math.max(v.scale, minScale), 0.2, MAX_ZOOM);
    setAnimating(true);
    setView({ scale, tx: width / 2 - scale * box.cx, ty: height / 2 - scale * box.cy });
  }, []);
  const centerRoot = useCallback(() => {
    if (!api.root?.id) return;
    centerOn(api.root.id, 0.9);
  }, [api.root, centerOn]);
  const centerOnRef = useRef(centerOn);
  centerOnRef.current = centerOn;

  const zoomBy = useCallback((k: number) => {
    const el = wrapperRef.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    setAnimating(false);
    setView((v) => {
      const scale = clamp(v.scale * k, 0.2, MAX_ZOOM);
      const kk = scale / v.scale;
      return zoomAtPoint(v, { x: width / 2, y: height / 2 }, scale);
    });
  }, []);

  /* ---------- efectos ---------- */
  useEffect(() => {
    fitRef.current(false);
    let alive = true;
    document.fonts?.ready.then(() => {
      if (alive) {
        setFontTick((t) => t + 1);
        requestAnimationFrame(() => fitRef.current(false));
      }
    });
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    let raf = 0;
    let pending: WheelEvent | null = null;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      pending = e;
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const ev = pending;
        pending = null;
        if (!ev) return;
        const rect = el.getBoundingClientRect();
        const mx = ev.clientX - rect.left;
        const my = ev.clientY - rect.top;
        setAnimating(false);
        setView((v) => {
          const scale = clamp(v.scale * Math.exp(-ev.deltaY * 0.0013), 0.2, MAX_ZOOM);
          return zoomAtPoint(v, { x: mx, y: my }, scale);
        });
      });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      el.removeEventListener("wheel", onWheel);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  useEffect(() => {
    if (focusTarget) centerOnRef.current(focusTarget.id, 0.8);
  }, [focusTarget]);

  useEffect(() => {
    if (fitTick > 0) fit(true);
  }, [fitTick, fit]);

  /* precarga de tipografías personalizadas */
  const usedFamilies = useMemo(() => {
    const set = new Set<string>();
    const walk = (n: MindNode) => {
      if (n.font?.family) set.add(n.font.family);
      n.children.forEach(walk);
    };
    walk(api.root);
    return Array.from(set).sort().join("|");
  }, [api.root]);
  useEffect(() => {
    if (!usedFamilies) return;
    let alive = true;
    ensureFonts(usedFamilies.split("|")).then(() => {
      if (alive) setFontTick((t) => t + 1);
    });
    return () => {
      alive = false;
    };
  }, [usedFamilies]);

  /* ---------- atajos ---------- */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (hotkeysRef.current) return;
      const t = e.target as HTMLElement;
      const typing = !!t.closest("textarea, input, [contenteditable='true']");
      if (typing) return;
      if (pickerRef.current) {
        const kind = NODE_KINDS.find((k) => k.key === e.key);
        if (kind) {
          e.preventDefault();
          pickKind(pickerRef.current, kind.id);
        } else if (e.key === "Escape") {
          closePicker();
        }
        return;
      }
      const apiNow = apiRef.current;
      const sel = apiNow.selectedId;
      const mod = e.ctrlKey || e.metaKey;

      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) apiNow.redo();
        else apiNow.undo();
        return;
      }
      if (mod && e.key.toLowerCase() === "y") {
        e.preventDefault();
        apiNow.redo();
        return;
      }
      if (mod && e.key.toLowerCase() === "e") {
        e.preventDefault();
        onExportHotkey();
        return;
      }
      if (mod && e.key.toLowerCase() === "f") {
        e.preventDefault();
        onSearchHotkey();
        return;
      }
      if (mod && e.key.toLowerCase() === "s") {
        e.preventDefault();
        notifyRef.current("Guardado automático al día", "info");
        return;
      }
      if (mod && e.key.toLowerCase() === "o") {
        e.preventDefault();
        onImportHotkey();
        return;
      }
      if (mod && e.shiftKey && e.key === "?") {
        e.preventDefault();
        onHelpHotkey();
        return;
      }
      if (e.key === "Escape") {
        apiNow.select(null);
        return;
      }
      if (!sel) return;
      const node = findNode(apiNow.root, sel);
      if (!node) return;

      if (e.key === "Tab" || e.key === "Insert") {
        e.preventDefault();
        openPicker(sel);
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        apiNow.addSibling(sel);
        return;
      }
      if (e.key === "F2") {
        e.preventDefault();
        apiNow.startEdit(sel);
        return;
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        apiNow.deleteNode(sel);
        return;
      }
      if (e.key === " ") {
        e.preventDefault();
        apiNow.toggleCollapse(sel);
        return;
      }
      // navegación con flechas
      const parent = findParent(apiNow.root, sel);
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        if (parent) apiNow.select(parent.id);
        return;
      }
      if (e.key === "ArrowRight") {
        e.preventDefault();
        if (node.children.length > 0) {
          if (node.collapsed) apiNow.toggleCollapse(sel);
          apiNow.select(node.children[0].id);
        }
        return;
      }
      if (e.key === "ArrowUp" || e.key === "ArrowDown") {
        e.preventDefault();
        if (!parent) return;
        const idx = parent.children.findIndex((c) => c.id === sel);
        const next = e.key === "ArrowUp" ? parent.children[idx - 1] : parent.children[idx + 1];
        if (next) apiNow.select(next.id);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------- pegado ---------- */
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      if (hotkeysRef.current) return;
      const el = e.target as HTMLElement | null;
      if (el && el.closest("textarea, input, [contenteditable='true']")) return;
      if (apiRef.current.editingId) return;

      // Imagen en el portapapeles → nodo de imagen.
      const clipItems = e.clipboardData?.items;
      if (clipItems) {
        for (const it of clipItems) {
          if (it.type.startsWith("image/")) {
            const file = it.getAsFile();
            if (!file) continue;
            e.preventDefault();
            const selId = apiRef.current.selectedId ?? apiRef.current.root.id;
            const selNode = findNode(apiRef.current.root, selId);
            fileToNodeImage(file)
              .then((image) => {
                if (selNode?.kind === "image") {
                  apiRef.current.setImage(selId, image);
                  notifyRef.current("Imagen reemplazada en el nodo");
                } else {
                  apiRef.current.addImageChild(selId, image);
                  notifyRef.current("Nodo de imagen creado con la imagen pegada");
                }
              })
              .catch(() => notifyRef.current("No se pudo procesar la imagen", "error"));
            return;
          }
        }
      }

      // Preferimos el HTML (Word/Docs traen la jerarquía real).
      let items = null;
      const html = e.clipboardData?.getData("text/html");
      if (html) items = parsePastedHtml(html);
      const text = e.clipboardData?.getData("text/plain");
      if (!items) {
        if (!text || !text.trim()) return;
        items = parsePastedText(text);
      }
      if (items.length === 0) return;
      e.preventDefault();

      const targetId = apiRef.current.selectedId ?? apiRef.current.root.id;
      const target = findNode(apiRef.current.root, targetId);
      const created = apiRef.current.pasteInto(targetId, items);
      const label = target?.text.trim() ? `«${target.text.trim()}»` : "el nodo raíz";
      if (items.length === 1 && !items[0].isNote) {
        notifyRef.current("Texto pegado en el nodo");
      } else {
        notifyRef.current(
          created === 1 ? `Se creó 1 nodo bajo ${label}` : `Se crearon ${created} nodos bajo ${label}`,
        );
      }
      window.setTimeout(() => centerOnRef.current(targetId, 0.8), 40);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, []);

  /* ---------- arrastrar y soltar imágenes ---------- */
  const applyImageToCurrentSelection = useCallback((image: NodeImage, verb = "añadida") => {
    const selId = apiRef.current.selectedId ?? apiRef.current.root.id;
    const selected = findNode(apiRef.current.root, selId);
    if (selected?.kind === "image") {
      apiRef.current.setImage(selId, image);
      notifyRef.current(`Imagen ${verb} en el nodo seleccionado`);
    } else {
      apiRef.current.addImageChild(selId, image);
      notifyRef.current(`Nodo de imagen creado con la imagen ${verb}`);
    }
  }, []);

  const onCanvasDragOver = useCallback((e: React.DragEvent) => {
    const types = Array.from(e.dataTransfer.types);
    if (types.includes("Files") || types.includes("text/uri-list") || types.includes("text/plain")) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
    }
  }, []);

  const onCanvasDrop = useCallback((e: React.DragEvent) => {
    const files = Array.from(e.dataTransfer.files ?? []);
    const imageFile = files.find((file) => file.type.startsWith("image/"));
    const uri = e.dataTransfer.getData("text/uri-list") || e.dataTransfer.getData("text/plain");
    if (!imageFile && !isProbablyImageUrl(uri)) return;
    e.preventDefault();
    e.stopPropagation();
    if (imageFile) {
      fileToNodeImage(imageFile)
        .then((image) => applyImageToCurrentSelection(image, "soltada"))
        .catch(() => notifyRef.current("No se pudo procesar la imagen soltada", "error"));
      return;
    }
    urlToNodeImage(uri)
      .then((image) => applyImageToCurrentSelection(image, "por URL"))
      .catch((err) => notifyRef.current(err instanceof Error ? err.message : "No se pudo cargar la imagen por URL", "error"));
  }, [applyImageToCurrentSelection]);

  /* ---------- handlers de nodo (estables) ---------- */
  const hitTest = (dragRect: { left: number; right: number; top: number; bottom: number }, excludeId: string): string | null => {
    const dragNode = findNode(apiRef.current.root, excludeId);
    const camera = viewRef.current;
    const dragTopLeft = worldToScreen({ x: dragRect.left, y: dragRect.top }, camera);
    const dragBottomRight = worldToScreen({ x: dragRect.right, y: dragRect.bottom }, camera);
    const dragArea = (dragBottomRight.x - dragTopLeft.x) * (dragBottomRight.y - dragTopLeft.y);
    let best: string | null = null;
    let bestArea = 0;
    for (const box of layoutRef.current.boxes.values()) {
      if (box.id === excludeId) continue;
      if (dragNode && isDescendant(dragNode, box.id)) continue;
      const pad = 6;
      const center = worldToScreen({ x: box.cx, y: box.cy }, camera);
      const left = center.x - (box.w / 2 + pad) * camera.scale;
      const right = center.x + (box.w / 2 + pad) * camera.scale;
      const top = center.y - (box.h / 2 + pad) * camera.scale;
      const bottom = center.y + (box.h / 2 + pad) * camera.scale;
      const overlapW = Math.min(dragBottomRight.x, right) - Math.max(dragTopLeft.x, left);
      const overlapH = Math.min(dragBottomRight.y, bottom) - Math.max(dragTopLeft.y, top);
      if (overlapW <= 0 || overlapH <= 0) continue;
      const area = overlapW * overlapH;
      const boxArea = (right - left) * (bottom - top);
      if (area >= 0.15 * Math.min(dragArea, boxArea) && area > bestArea) {
        bestArea = area;
        best = box.id;
      }
    }
    return best;
  };

  const draggedRect = (id: string, dx: number, dy: number) => {
    const box = layoutRef.current.boxes.get(id);
    if (!box) return null;
    return {
      left: box.cx + dx - box.w / 2,
      right: box.cx + dx + box.w / 2,
      top: box.cy + dy - box.h / 2,
      bottom: box.cy + dy + box.h / 2,
    };
  };

  const onNodePointerDown = useCallback((e: React.PointerEvent, id: string) => {
    if (e.button !== 0) return;
    const linkEl = (e.target as HTMLElement).closest?.(".nodal-link") as HTMLElement | null;
    if (linkEl && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      e.stopPropagation();
      const href = linkEl.dataset.href;
      if (href) {
        openUrl(href);
        notifyRef.current("Abriendo vínculo en una pestaña nueva…", "info");
      }
      return;
    }
    e.stopPropagation();
    if (apiRef.current.editingId === id) return;
    apiRef.current.select(id);
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    dragRef.current = { id, startX: e.clientX, startY: e.clientY, moved: false, pid: e.pointerId, dx: 0, dy: 0, over: null };
  }, []);

  const onNodePointerMove = useCallback((e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d || e.pointerId !== d.pid) return;
    if (!d.moved) {
      if (Math.hypot(e.clientX - d.startX, e.clientY - d.startY) < 6) return;
      d.moved = true;
      apiRef.current.select(d.id);
    }
    const v = viewRef.current;
    const canvasRect = wrapperRef.current?.getBoundingClientRect();
    const originX = canvasRect?.left ?? 0;
    const originY = canvasRect?.top ?? 0;
    const startWorld = screenToWorld({ x: d.startX - originX, y: d.startY - originY }, v);
    const currentWorld = screenToWorld({ x: e.clientX - originX, y: e.clientY - originY }, v);
    const dx = currentWorld.x - startWorld.x;
    const dy = currentWorld.y - startWorld.y;
    const rect = draggedRect(d.id, dx, dy);
    const over = rect ? hitTest(rect, d.id) : null;
    d.dx = dx;
    d.dy = dy;
    d.over = over;
    setDrag({ id: d.id, x: e.clientX, y: e.clientY, dx, dy, over });
  }, []);

  const onNodePointerUp = useCallback(() => {
    const d = dragRef.current;
    dragRef.current = null;
    if (!d) return;
    if (d.moved) {
      if (d.over) {
        if (d.id === apiRef.current.root.id) {
          notifyRef.current("El nodo raíz no puede colgarse de otro nodo", "info");
        } else {
          const parent = findParent(apiRef.current.root, d.id);
          if (parent && parent.id === d.over) {
            notifyRef.current("Ese nodo ya cuelga del destino elegido", "info");
          } else {
            onRequestMoveRef.current(d.id, d.over);
          }
        }
      } else {
        const box = layoutRef.current.boxes.get(d.id);
        if (box) apiRef.current.setPos(d.id, { x: box.cx + d.dx, y: box.cy + d.dy });
      }
    } else {
      apiRef.current.select(d.id);
    }
    setDrag(null);
  }, []);

  const onLostCapture = useCallback(() => {
    dragRef.current = null;
    setDrag(null);
  }, []);

  const onNodeDoubleClick = useCallback((_e: React.MouseEvent, id: string) => {
    const n = findNode(apiRef.current.root, id);
    if (n?.kind === "image") onRequestImageRef.current(id);
    else apiRef.current.startEdit(id);
  }, []);

  const onNodeToggleCollapse = useCallback((id: string) => apiRef.current.toggleCollapse(id), []);
  const onNodeCommit = useCallback((id: string, text: string) => apiRef.current.commitEdit(id, text), []);
  const onNodeCancel = useCallback(() => apiRef.current.cancelEdit(), []);

  /* ---------- fondo: pan + doble clic ---------- */
  const onBgPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    panRef.current = { x: e.clientX, y: e.clientY, tx: view.tx, ty: view.ty };
    setPanning(true);
    setAnimating(false);
    api.select(null);
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
  };
  const onBgPointerMove = (e: React.PointerEvent) => {
    const p = panRef.current;
    if (!p) return;
    setView((v) => ({ ...v, tx: p.tx + e.clientX - p.x, ty: p.ty + e.clientY - p.y }));
  };
  const onBgPointerUp = () => {
    panRef.current = null;
    setPanning(false);
  };
  const onBgDoubleClick = () => {
    apiRef.current.addChild(apiRef.current.root.id);
  };

  /* ---------- previsualización de unión ---------- */
  const preview = useMemo(() => {
    if (!drag?.over) return null;
    if (drag.id === api.root.id) return null;
    const parent = findParent(api.root, drag.id);
    if (parent && parent.id === drag.over) return null;
    return { id: drag.id, over: drag.over };
  }, [drag, api.root]);

  /** Layout hipotético: cómo quedaría el mapa si se soltara ahora. */
  const dropPreview = useMemo(() => {
    if (!preview) return null;
    const dragged = findNode(api.root, preview.id);
    if (!dragged || isDescendant(dragged, preview.over)) return null;
    const next = insertChild(removeNode(api.root, preview.id), preview.over, dragged);
    if (!next) return null;
    const laid = computeLayout(next);
    const box = laid.boxes.get(preview.id);
    if (!box) return null;
    return { box, color: box.color };
  }, [preview, api.root]);

  /* ---------- render ---------- */
  const bounds = layout.bounds;
  const bw = bounds.maxX - bounds.minX;
  const bh = bounds.maxY - bounds.minY;
  const totalNodes = countNodes(api.root);
  const depth = maxDepth(api.root);
  const rootBox = layout.boxes.get(api.root.id);
  const lowDetail = view.scale < 0.35;
  const visibleWorld = useMemo(
    () => screenRectToWorld(
      { left: -900, top: -900, right: viewportSize.width + 900, bottom: viewportSize.height + 900 },
      view,
    ),
    [view, viewportSize],
  );
  const visibleBoxes = useMemo(() => {
    const result = new Map<string, NodeBox>();
    for (const box of displayBoxes.values()) {
      const visible =
        box.id === api.selectedId ||
        dragIds.has(box.id) ||
        (box.cx + box.w / 2 >= visibleWorld.left &&
          box.cx - box.w / 2 <= visibleWorld.right &&
          box.cy + box.h / 2 >= visibleWorld.top &&
          box.cy - box.h / 2 <= visibleWorld.bottom);
      if (visible) result.set(box.id, box);
    }
    return result;
  }, [displayBoxes, api.selectedId, dragIds, visibleWorld]);
  const activeBox = api.selectedId ? displayBoxes.get(api.selectedId) : undefined;
  const activeTopLeft = activeBox
    ? worldToScreen({ x: activeBox.cx - activeBox.w / 2, y: activeBox.cy - activeBox.h / 2 }, view)
    : undefined;
  const activeScreen = activeBox && activeTopLeft
    ? {
        left: activeTopLeft.x,
        top: activeTopLeft.y,
        width: activeBox.w * view.scale,
        height: activeBox.h * view.scale,
        scale: view.scale,
      }
    : undefined;
  const manualCount = useMemo(() => {
    let c = 0;
    const walk = (n: MindNode) => {
      if (n.pos) c++;
      n.children.forEach(walk);
    };
    walk(api.root);
    return c;
  }, [api.root]);

  const edgePaths = useMemo(
    () =>
      layout.edges.map((edge) => {
        const from = displayBoxes.get(edge.fromId);
        const to = displayBoxes.get(edge.toId);
        if (!from || !to) return null;
        const active = edge.toId === api.selectedId;
        const detaching = preview !== null && edge.toId === preview.id;
        return (
          <path
            key={edge.toId}
            d={edgePath(from, to, bounds.minX, bounds.minY)}
            fill="none"
            stroke={edge.color}
            strokeOpacity={detaching ? 0.22 : active ? 1 : 0.7}
            strokeWidth={detaching ? 2 : active ? 3 : 2}
            strokeLinecap="round"
            className={`edge-path ${active && !detaching ? "edge-active" : ""}`}
          />
        );
      }),
    [layout, displayBoxes, api.selectedId, preview, bounds.minX, bounds.minY],
  );

  return (
    <div
      ref={wrapperRef}
      className={`canvas-dots relative h-full w-full select-none overflow-hidden ${
        panning || drag ? "cursor-grabbing" : "cursor-grab"
      }`}
      onPointerDown={onBgPointerDown}
      onPointerMove={onBgPointerMove}
      onPointerUp={onBgPointerUp}
      onDoubleClick={onBgDoubleClick}
      onDragOver={onCanvasDragOver}
      onDrop={onCanvasDrop}
    >
      <CanvasBackground />

      <CanvasViewportLayer
        className={animating ? "canvas-anim" : undefined}
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          // Mantener el lienzo en una capa 2D evita que el navegador lo
          // convierta en una textura bitmap al hacer zoom. En particular,
          // translate3d/scale3d + will-change suelen dejar texto y nodos
          // borrosos después de varios acercamientos.
          transform: `translate(${view.tx}px, ${view.ty}px) scale(${view.scale})`,
          transformOrigin: "0 0",
        }}
      >
        <div style={{ position: "absolute", left: bounds.minX, top: bounds.minY, width: bw, height: bh }}>
          <CanvasEdges>
          <svg
            className="absolute left-0 top-0 overflow-visible"
            width={bw}
            height={bh}
            shapeRendering="geometricPrecision"
          >
            {edgePaths}

            {/* hilo de previsualización */}
            {preview && dropPreview &&
              (() => {
                const from = displayBoxes.get(preview.over);
                if (!from) return null;
                const to = dropPreview.box;
                const anchor = edgeAnchor(from, to);
                return (
                  <g className="pointer-events-none">
                    <path
                      d={edgePath(from, to, bounds.minX, bounds.minY)}
                      fill="none"
                      stroke={from.color}
                      strokeOpacity={0.95}
                      strokeWidth={3}
                      strokeLinecap="round"
                      className="edge-path edge-active"
                    />
                    <circle cx={anchor.x - bounds.minX} cy={anchor.y - bounds.minY} r={5} fill={from.color} />
                    <circle
                      cx={anchor.x - bounds.minX}
                      cy={anchor.y - bounds.minY}
                      r={7}
                      fill="none"
                      stroke={from.color}
                      strokeWidth={2}
                      className="anchor-pulse"
                      style={{ transformOrigin: `${anchor.x - bounds.minX}px ${anchor.y - bounds.minY}px` }}
                    />
                  </g>
                );
              })()}
          </svg>

          {/* fantasma del destino */}
          {preview && dropPreview && (
            <div
              className="pointer-events-none absolute rounded-xl border-2 border-dashed"
              style={{
                left: dropPreview.box.cx - dropPreview.box.w / 2 - bounds.minX,
                top: dropPreview.box.cy - dropPreview.box.h / 2 - bounds.minY,
                width: dropPreview.box.w,
                height: dropPreview.box.h,
                borderColor: dropPreview.color,
                background: withAlpha(dropPreview.color, 0.08),
                boxShadow: `0 0 0 4px ${withAlpha(dropPreview.color, 0.1)}`,
              }}
            />
          )}
          </CanvasEdges>

          <CanvasNodes>
          {[...visibleBoxes.values()].map((box) => {
            // El nodo activo se pinta en el overlay de pantalla para que el
            // navegador rasterice su texto al tamaño final, no como textura
            // ampliada del viewport completo.
            if (box.id === api.selectedId) return null;
            const node = nodeById.get(box.id);
            if (!node) return null;
            return (
              <NodeView
                key={box.id}
                node={node}
                box={box}
                minX={bounds.minX}
                minY={bounds.minY}
                selected={api.selectedId === box.id}
                editing={api.editingId === box.id}
                dimmed={false}
                isTarget={drag?.over === box.id}
                searchMatch={searchMatchIds?.has(box.id)}
                onPointerDown={onNodePointerDown}
                onPointerMove={onNodePointerMove}
                onPointerUp={onNodePointerUp}
                onLostCapture={onLostCapture}
                onDoubleClick={onNodeDoubleClick}
                onToggleCollapse={onNodeToggleCollapse}
                onCommit={onNodeCommit}
                onCancel={onNodeCancel}
                onTab={openPicker}
                onRequestImage={onRequestImageRef.current}
                onFontChange={onFontChange}
                lowDetail={lowDetail}
              />
            );
          })}
          </CanvasNodes>

        </div>
      </CanvasViewportLayer>

      {/* Overlay del nodo activo: evita ampliar una textura del viewport y
          conserva edición, links y controles HTML nativos. */}
      <CanvasInteractionOverlay>
      {activeBox && activeScreen && (() => {
        const node = nodeById.get(activeBox.id);
        if (!node) return null;
        return (
          <NodeView
            key={`active-${activeBox.id}`}
            node={node}
            box={activeBox}
            minX={0}
            minY={0}
            selected
            editing={api.editingId === activeBox.id}
            dimmed={false}
            isTarget={drag?.over === activeBox.id}
            searchMatch={searchMatchIds?.has(activeBox.id)}
            onPointerDown={onNodePointerDown}
            onPointerMove={onNodePointerMove}
            onPointerUp={onNodePointerUp}
            onLostCapture={onLostCapture}
            onDoubleClick={onNodeDoubleClick}
            onToggleCollapse={onNodeToggleCollapse}
            onCommit={onNodeCommit}
            onCancel={onNodeCancel}
            onTab={openPicker}
            onRequestImage={onRequestImageRef.current}
            onFontChange={onFontChange}
            screen={activeScreen}
            lowDetail={lowDetail}
          />
        );
      })()}
      </CanvasInteractionOverlay>

      <CanvasControls>
      {/* zoom */}
      <div
        className="absolute right-3 top-3 z-20 flex flex-col items-center gap-0.5 rounded-lg border border-ink-200/80 bg-white/95 p-0.5 shadow-sm"
        onPointerDown={(e) => e.stopPropagation()}
        onDoubleClick={(e) => e.stopPropagation()}
      >
        <button onClick={() => zoomBy(1.25)} title="Acercar" className="grid h-6 w-6 place-items-center rounded-md text-ink-500 transition hover:bg-ink-100 hover:text-ink-800 active:scale-95">
          <Plus size={13} />
        </button>
        <button onClick={() => fit(true)} title="Ajustar a la pantalla" className="w-9 rounded-md py-0.5 text-center text-[10px] font-bold tabular-nums text-ink-600 transition hover:bg-ink-100">
          {Math.round(view.scale * 100)}%
        </button>
        <button onClick={() => zoomBy(1 / 1.25)} title="Alejar" className="grid h-6 w-6 place-items-center rounded-md text-ink-500 transition hover:bg-ink-100 hover:text-ink-800 active:scale-95">
          <Minus size={13} />
        </button>
        <span className="my-0.5 h-px w-4 bg-ink-200" />
        <button onClick={centerRoot} title="Centrar mapa" className="grid h-6 w-6 place-items-center rounded-md text-ink-500 transition hover:bg-ink-100 hover:text-ink-800 active:scale-95">
          <Maximize size={13} />
        </button>
      </div>

      {/* barra de estado */}
      <div
        className="absolute left-4 top-4 z-20 flex items-center gap-2 rounded-lg border border-ink-200/80 bg-white/90 px-3 py-1.5 text-[11px] font-semibold text-ink-500 shadow-sm"
        onPointerDown={(e) => e.stopPropagation()}
        onDoubleClick={(e) => e.stopPropagation()}
        style={{ transform: "translateX(calc(0%))" }}
      >
        <span>{totalNodes} nodos</span>
        <span className="text-ink-300">·</span>
        <span>{depth} niveles</span>
        {manualCount > 0 && (
          <>
            <span className="text-ink-300">·</span>
            <span className="text-brand">{manualCount} movidos</span>
            <button
              onClick={() => {
                apiRef.current.clearPositions();
                window.setTimeout(() => fitRef.current(true), 30);
                notifyRef.current("Distribución automática restaurada");
              }}
              title="Volver a la distribución automática"
              className="flex items-center gap-1 rounded-md border border-ink-200 bg-white px-1.5 py-0.5 text-[10px] font-bold text-ink-600 transition hover:border-brand hover:text-brand"
            >
              <Wand2 size={11} />
              Reacomodar
            </button>
          </>
        )}
      </div>
      </CanvasControls>

      {/* fantasma del nodo en arrastre */}
      {drag && drag.over && (
        <div
          className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-full"
          style={{ left: drag.x, top: drag.y - 14 }}
        >
          <div className="rounded-md bg-ink-900 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-brand shadow-lg">
            Soltar para colgar aquí
          </div>
        </div>
      )}

      {/* selector de tipo */}
      {picker &&
        (() => {
          const box = layout.boxes.get(picker);
          if (!box) return null;
          const el = wrapperRef.current?.getBoundingClientRect();
          const anchor = worldToScreen({ x: box.cx, y: box.cy + box.h / 2 }, view);
          const x = (el?.left ?? 0) + anchor.x;
          const y = (el?.top ?? 0) + anchor.y;
          return <TypePicker x={x} y={y} onPick={(kind) => pickKind(picker, kind)} onClose={closePicker} />;
        })()}
    </div>
  );
}


