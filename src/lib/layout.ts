import type { LayoutMode, MindNode, NodeKind } from "../types";
import { countNodes } from "./tree";

export const H_GAP = 56;
export const V_GAP = 10;

export const BRANCH_COLORS = [
  "#b54a33",
  "#5e7e9e",
  "#69634d",
  "#c08a2e",
  "#8d5b7c",
  "#4e7e76",
  "#5e5e6e",
  "#996f33",
];

export interface LayoutModeDef {
  id: LayoutMode;
  label: string;
  hint: string;
}

export const LAYOUT_MODES: LayoutModeDef[] = [
  { id: "auto", label: "Automática", hint: "Los hijos siguen el lado de la rama; en la raíz se reparten equilibrados." },
  { id: "right", label: "Todo a la derecha", hint: "Coloca todos los hijos al lado derecho del nodo, centrados respecto de él." },
  { id: "left", label: "Todo a la izquierda", hint: "Coloca todos los hijos al lado izquierdo del nodo, centrados respecto de él." },
  { id: "split", label: "Centrada al padre", hint: "Reparte los hijos a ambos lados, con el bloque centrado respecto del padre." },
  { id: "alternate", label: "Alternada", hint: "Los hijos se alternan: uno a la derecha, el siguiente a la izquierda…" },
  { id: "top", label: "Cascada", hint: "Alinea los hijos con la parte superior del padre y deja que crezcan hacia abajo." },
];

export type Side = -1 | 0 | 1;

const PAD_X = [20, 13, 11];
const PAD_Y = [13, 8, 7];
const LINE_H = [25, 21, 20];
const MAX_W = [440, 300, 250];

const KIND_STYLE: Record<string, { padX: number; padY: number; lineH: number; maxW: number }> = {
  title: { padX: 14, padY: 9, lineH: 24, maxW: 400 },
  text: { padX: 15, padY: 11, lineH: 20, maxW: 300 },
  image: { padX: 9, padY: 9, lineH: 20, maxW: 300 },
};

/*
 * Medición de texto con el propio motor de layout del navegador (un <div>
 * oculto), que es exactamente el mismo que luego renderiza los nodos. Así el
 * ancho medido coincide con el real y el texto no se desencaja de la burbuja
 * a ningún nivel de zoom (canvas.measureText, en cambio, discrepa del DOM).
 */
const TEXT_W_BUFFER = 3;

let measEl: HTMLDivElement | null = null;
function getMeasurer(): HTMLDivElement {
  if (!measEl || !measEl.isConnected) {
    measEl = document.createElement("div");
    measEl.setAttribute("aria-hidden", "true");
    measEl.style.cssText =
      "position:absolute;left:-9999px;top:0;visibility:hidden;white-space:pre;pointer-events:none;";
    document.body.appendChild(measEl);
  }
  return measEl;
}

const wordWidthCache = new Map<string, number>();
function wordWidth(word: string, font: string): number {
  const key = font + "\u0000" + word;
  let w = wordWidthCache.get(key);
  if (w === undefined) {
    const el = getMeasurer();
    el.style.font = font;
    el.textContent = word;
    w = el.getBoundingClientRect().width;
    wordWidthCache.set(key, w);
  }
  return w;
}

function domLineWidth(line: string, font: string): number {
  const el = getMeasurer();
  el.style.font = font;
  el.textContent = line;
  return el.getBoundingClientRect().width;
}

/** Ancho del borde del nodo en su estado base (hay que descontarlo del contenido). */
function baseBorderWidth(kind: NodeKind, depth: number): number {
  if (kind === "image") return 1.5;
  if (kind === "title") return 1.5;
  if (kind === "text") return 1;
  return depth >= 2 ? 1.5 : 0;
}

/** Estilo de texto efectivo (base por tipo/nivel + tipografía personalizada). */
export function resolveTextStyle(node: MindNode, depth: number) {
  const kind: NodeKind = node.kind ?? "idea";
  const d = Math.min(depth, 2);
  let fontFamily: string;
  let fontWeight: number;
  let fontSize: number;
  let lineH: number;
  let padX: number;
  let padY: number;
  let maxW: number;

  if (kind === "title") {
    const s = KIND_STYLE.title;
    fontFamily = '"Bricolage Grotesque", sans-serif';
    fontWeight = 700;
    fontSize = 17;
    lineH = s.lineH;
    padX = s.padX; padY = s.padY; maxW = s.maxW;
  } else if (kind === "text") {
    const s = KIND_STYLE.text;
    fontFamily = '"Instrument Sans", sans-serif';
    fontWeight = 400;
    fontSize = 13.5;
    lineH = s.lineH;
    padX = s.padX; padY = s.padY; maxW = s.maxW;
  } else if (kind === "image") {
    const s = KIND_STYLE.image;
    fontFamily = '"Instrument Sans", sans-serif';
    fontWeight = 500;
    fontSize = 13.5;
    lineH = s.lineH;
    padX = s.padX; padY = s.padY; maxW = s.maxW;
  } else {
    fontFamily = d === 0 ? '"Bricolage Grotesque", sans-serif' : '"Instrument Sans", sans-serif';
    fontWeight = d === 0 ? 700 : d === 1 ? 600 : 500;
    fontSize = d === 0 ? 19 : d === 1 ? 15 : 14;
    lineH = LINE_H[d];
    padX = PAD_X[d]; padY = PAD_Y[d]; maxW = MAX_W[d];
  }

  let italic = false;
  const f = node.font;
  if (f) {
    fontFamily = `"${f.family}", sans-serif`;
    fontSize = f.size;
    fontWeight = f.bold ? 700 : 400;
    italic = f.italic;
    lineH = Math.round(f.size * f.lineHeight);
  }
  return { fontFamily, fontWeight, fontSize, lineHeight: lineH, padX, padY, maxW, italic };
}

export function canvasFontString(st: {
  fontFamily: string;
  fontWeight: number;
  fontSize: number;
  italic: boolean;
}): string {
  return `${st.italic ? "italic " : ""}${st.fontWeight} ${st.fontSize}px ${st.fontFamily}`;
}

export function withAlpha(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(full, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

export function nodeStyle(box: NodeBox, selected: boolean, dimmed: boolean, isTarget: boolean) {
  const d = box.depth;
  const kind = box.kind;
  const color = box.color;
  let background: string;
  let backgroundImage = "none";
  let border: string;
  let textColor: string;
  let shadow: string;

  if (kind === "image") {
    background = "#ffffff";
    backgroundImage = "linear-gradient(180deg, rgba(255,255,255,1) 0%, rgba(247,246,244,1) 100%)";
    border = `1.5px solid ${selected ? color : withAlpha(color, 0.35)}`;
    textColor = "#33333d";
    shadow = "0 1px 0 rgba(255,255,255,0.9) inset, 0 2px 10px rgba(38,38,46,0.08)";
  } else if (kind === "title") {
    background = withAlpha(color, 0.12);
    backgroundImage = "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.01))";
    border = `1.5px solid ${selected ? color : withAlpha(color, 0.4)}`;
    textColor = "#26262e";
    shadow = "0 1px 0 rgba(255,255,255,0.55) inset";
  } else if (kind === "text") {
    background = "#ffffff";
    backgroundImage = "linear-gradient(180deg, rgba(255,255,255,1) 0%, rgba(250,249,247,1) 100%)";
    border = `1px solid ${selected ? color : "#ddd9d4"}`;
    textColor = "#45454f";
    shadow = "0 1px 0 rgba(255,255,255,0.8) inset, 0 2px 6px rgba(38,38,46,0.05)";
  } else if (d === 0) {
    background = "#33333d";
    backgroundImage = "linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)";
    border = "1px solid rgba(255,255,255,0.08)";
    textColor = "#ffffff";
    shadow = "0 1px 0 rgba(255,255,255,0.08) inset, 0 12px 24px rgba(38,38,46,0.22)";
  } else if (d === 1) {
    background = color;
    backgroundImage = "linear-gradient(180deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.02) 100%)";
    border = "1px solid rgba(255,255,255,0.12)";
    textColor = "#ffffff";
    shadow = "0 1px 0 rgba(255,255,255,0.12) inset, 0 8px 18px " + withAlpha(color, 0.22);
  } else {
    background = "#ffffff";
    backgroundImage = "linear-gradient(180deg, rgba(255,255,255,1) 0%, rgba(249,248,246,1) 100%)";
    border = `1.5px solid ${selected ? color : withAlpha(color, 0.45)}`;
    textColor = "#33333d";
    shadow = "0 1px 0 rgba(255,255,255,0.9) inset, 0 2px 8px rgba(38,38,46,0.07)";
  }

  if (isTarget) {
    border = `2px solid ${color}`;
    shadow = `0 0 0 2px ${withAlpha(color, 0.18)}, 0 8px 20px ${withAlpha(color, 0.20)}`;
  } else if (selected) {
    shadow += `, 0 0 0 2px ${withAlpha(color, 0.18)}`;
  }

  return { background, backgroundImage, border, textColor, shadow, opacity: dimmed ? 0.55 : 1 };
}

export function kindStyle(kind: NodeKind) {
  return KIND_STYLE[kind] ?? null;
}

/** Tamaño en pantalla de la imagen de un nodo (mantiene proporción). */
export function fitImage(aspect: number): { w: number; h: number } {
  const maxW = 260;
  const maxH = 190;
  let w = maxW;
  let h = w / aspect;
  if (h > maxH) {
    h = maxH;
    w = h * aspect;
  }
  return { w: Math.round(w), h: Math.round(h) };
}

function wrapText(text: string, maxW: number, font: string): string[] {
  const spaceW = wordWidth(" ", font);
  const lines: string[] = [];
  for (const raw of text.split("\n")) {
    if (raw.trim() === "") {
      lines.push("");
      continue;
    }
    const words = raw.split(/\s+/);
    let line = "";
    let lineW = 0;
    for (const w of words) {
      const wW = wordWidth(w, font);
      const testW = line ? lineW + spaceW + wW : wW;
      if (testW > maxW && line) {
        lines.push(line);
        line = w;
        lineW = wW;
      } else {
        line = line ? line + " " + w : w;
        lineW = testW;
      }
    }
    if (line) lines.push(line);
  }
  return lines.length ? lines : [""];
}

function measure(node: MindNode, depth: number) {
  const st = resolveTextStyle(node, depth);
  const kind = node.kind ?? "idea";
  const fontStr = canvasFontString(st);
  const borderW = baseBorderWidth(kind, depth);
  if (kind === "image") {
    const img = node.image ? fitImage(node.image.aspect) : { w: 200, h: 130 };
    const text = node.text.trim();
    const labelLines = text ? wrapText(text, img.w, fontStr) : [];
    const h = img.h + (labelLines.length ? labelLines.length * st.lineHeight + 6 : 0) + st.padY * 2;
    return {
      w: img.w + st.padX * 2 + borderW * 2 + TEXT_W_BUFFER,
      h,
      lines: labelLines,
      fontSize: st.fontSize,
      fontWeight: st.fontWeight,
      lineHeight: st.lineHeight,
      fontFamily: st.fontFamily,
      italic: st.italic,
      img,
    };
  }
  const raw = node.text.trim() || (depth === 0 ? "Idea central" : "Idea");
  const lines = wrapText(raw, st.maxW - st.padX * 2, fontStr);
  let textW = 0;
  for (const l of lines) if (l) textW = Math.max(textW, domLineWidth(l, fontStr));
  let extra = 0;
  if (kind === "title") extra = 10; // regla inferior
  return {
    // borde real + margen de seguridad: el texto siempre cabe en la burbuja
    w: Math.ceil(textW) + st.padX * 2 + borderW * 2 + TEXT_W_BUFFER,
    h: lines.length * st.lineHeight + st.padY * 2 + extra,
    lines,
    fontSize: st.fontSize,
    fontWeight: st.fontWeight,
    lineHeight: st.lineHeight,
    fontFamily: st.fontFamily,
    italic: st.italic,
    img: null as { w: number; h: number } | null,
  };
}

export interface NodeBox {
  id: string;
  parentId: string | null;
  cx: number;
  cy: number;
  w: number;
  h: number;
  depth: number;
  side: Side;
  color: string;
  kind: NodeKind;
  lines: string[];
  childCount: number;
  collapsed: boolean;
  hasNotes: boolean;
}

export interface Edge {
  fromId: string;
  toId: string;
  color: string;
}

export interface LayoutResult {
  boxes: Map<string, NodeBox>;
  edges: Edge[];
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
}

function assignSides(children: MindNode[], mode: LayoutMode | "flow", dir: Side): Side[] {
  switch (mode) {
    case "right":
      return children.map(() => 1);
    case "left":
      return children.map(() => -1);
    case "alternate": {
      const base: Side = dir === -1 ? -1 : 1;
      return children.map((_, i) => (i % 2 === 0 ? base : ((-base) as Side)));
    }
    case "split": {
      let loadR = 0;
      let loadL = 0;
      return children.map((child) => {
        const s: Side = loadR <= loadL ? 1 : -1;
        const w = countNodes(child);
        if (s === 1) loadR += w;
        else loadL += w;
        return s;
      });
    }
    case "flow":
    default:
      return children.map(() => (dir === 0 ? 1 : dir));
  }
}

export function computeLayout(root: MindNode): LayoutResult {
  // La caché de anchos de palabra es válida solo dentro de un cálculo: al
  // empezar uno nuevo se limpia, de modo que si una fuente web terminó de
  // cargar entre medio, el texto se remida con la tipografía real.
  wordWidthCache.clear();
  const boxes = new Map<string, NodeBox>();
  const edges: Edge[] = [];
  const mCache = new Map<string, ReturnType<typeof measure>>();
  const hCache = new Map<string, number>();

  const mOf = (node: MindNode, depth: number) => {
    let m = mCache.get(node.id);
    if (!m) {
      m = measure(node, depth);
      mCache.set(node.id, m);
    }
    return m;
  };

  const subtreeH = (node: MindNode, depth: number): number => {
    const cached = hCache.get(node.id);
    if (cached !== undefined) return cached;
    const own = mOf(node, depth).h;
    let h = own;
    if (!node.collapsed && node.children.length > 0) {
      const ch = node.children.reduce((a, c) => a + subtreeH(c, depth + 1), 0) + V_GAP * (node.children.length - 1);
      h = Math.max(own, ch);
    }
    hCache.set(node.id, h);
    return h;
  };

  const place = (
    node: MindNode,
    edgeCx: number,
    yTop: number,
    dir: Side,
    depth: number,
    parentId: string,
    inherited: string,
    parentMode: LayoutMode,
  ) => {
    const m = mOf(node, depth);
    const color = node.color ?? inherited;
    const total = subtreeH(node, depth);
    const mode: LayoutMode = node.layout ?? parentMode;
    const topAligned = mode === "top" && depth > 0;
    const cx = edgeCx + dir * (m.w / 2);
    const cy = topAligned ? yTop + m.h / 2 : yTop + total / 2;
    boxes.set(node.id, {
      id: node.id,
      parentId,
      cx,
      cy,
      w: m.w,
      h: m.h,
      depth,
      side: dir,
      color,
      kind: node.kind ?? "idea",
      lines: m.lines,
      childCount: node.children.length,
      collapsed: node.collapsed,
      hasNotes: node.notes.trim().length > 0,
    });
    edges.push({ fromId: parentId, toId: node.id, color });
    layChildren(node, depth, mode);
  };

  const layChildren = (node: MindNode, depth: number, mode: LayoutMode) => {
    const box = boxes.get(node.id)!;
    if (node.collapsed || node.children.length === 0) return;
    const isRoot = depth === 0;
    const sideMode: LayoutMode | "flow" = mode === "auto" ? (isRoot ? "split" : "flow") : mode;
    const sides = assignSides(node.children, sideMode, box.side);
    const groups = new Map<Side, MindNode[]>();
    node.children.forEach((child, i) => {
      const s = sides[i];
      const g = groups.get(s);
      if (g) g.push(child);
      else groups.set(s, [child]);
    });
    for (const s of [1, -1] as const) {
      const group = groups.get(s);
      if (!group || group.length === 0) continue;

      // En alternada, cada lado se considera una rama independiente y se centra
      // alrededor del padre. Así evitamos que un hijo se quede por encima o por
      // debajo del eje principal del nodo raíz, y tampoco se solapa con otros
      // elementos del mismo lado al ordenar verticalmente.
      if (mode === "alternate") {
        const reserved: Array<{ cy: number; span: number }> = [];
        const step = 34;
        const maxDrift = 180;

        for (const child of group) {
          const originalIndex = node.children.indexOf(child);
          const childInherited = isRoot
            ? child.color ?? BRANCH_COLORS[originalIndex % BRANCH_COLORS.length]
            : box.color;
          const childH = subtreeH(child, depth + 1);
          const span = childH + V_GAP;

          let candidateCy = box.cy;
          let found = false;

          const offsets: number[] = [0, -step, step, -2 * step, 2 * step, -3 * step, 3 * step, -4 * step, 4 * step];
          for (const offset of offsets) {
            const y = box.cy + offset;
            if (Math.abs(y - box.cy) > maxDrift) continue;
            const overlaps = reserved.some((item) => Math.abs(y - item.cy) < (span + item.span) / 2 + 12);
            if (!overlaps) {
              candidateCy = y;
              found = true;
              break;
            }
          }

          if (!found) {
            for (let i = 1; i <= 32; i++) {
              const variants = [i * step, -i * step];
              for (const offset of variants) {
                const y = box.cy + offset;
                if (Math.abs(y - box.cy) > maxDrift) continue;
                const overlaps = reserved.some((item) => Math.abs(y - item.cy) < (span + item.span) / 2 + 12);
                if (!overlaps) {
                  candidateCy = y;
                  found = true;
                  break;
                }
              }
              if (found) break;
            }
          }

          if (!found) {
            candidateCy = box.cy;
          }

          reserved.push({ cy: candidateCy, span });
          place(child, box.cx + s * (box.w / 2 + H_GAP), candidateCy - childH / 2, s, depth + 1, node.id, childInherited, mode);
        }
        continue;
      }

      const groupH = group.reduce((a, c) => a + subtreeH(c, depth + 1), 0) + V_GAP * (group.length - 1);
      const offsetBase = mode === "top" ? box.cy - box.h / 2 : box.cy - groupH / 2;
      let offset = offsetBase;
      for (const child of group) {
        const originalIndex = node.children.indexOf(child);
        const childInherited = isRoot
          ? child.color ?? BRANCH_COLORS[originalIndex % BRANCH_COLORS.length]
          : box.color;
        place(child, box.cx + s * (box.w / 2 + H_GAP), offset, s, depth + 1, node.id, childInherited, mode);
        offset += subtreeH(child, depth + 1) + V_GAP;
      }
    }
  };

  const rootM = mOf(root, 0);
  boxes.set(root.id, {
    id: root.id,
    parentId: null,
    cx: 0,
    cy: 0,
    w: rootM.w,
    h: rootM.h,
    depth: 0,
    side: 0,
    color: root.color ?? "#33333d",
    kind: root.kind ?? "idea",
    lines: rootM.lines,
    childCount: root.children.length,
    collapsed: root.collapsed,
    hasNotes: root.notes.trim().length > 0,
  });
  layChildren(root, 0, root.layout ?? "auto");

  /* Posiciones manuales: el nodo va donde el usuario lo dejó y su subrama viaja con él. */
  const shiftSubtree = (node: MindNode, dx: number, dy: number) => {
    const b = boxes.get(node.id);
    if (b) boxes.set(node.id, { ...b, cx: b.cx + dx, cy: b.cy + dy });
    for (const c of node.children) shiftSubtree(c, dx, dy);
  };
  const applyManual = (node: MindNode) => {
    if (node.pos) {
      const b = boxes.get(node.id);
      if (b) {
        const dx = node.pos.x - b.cx;
        const dy = node.pos.y - b.cy;
        if (dx !== 0 || dy !== 0) shiftSubtree(node, dx, dy);
      }
    }
    for (const c of node.children) applyManual(c);
  };
  applyManual(root);

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const b of boxes.values()) {
    minX = Math.min(minX, b.cx - b.w / 2);
    maxX = Math.max(maxX, b.cx + b.w / 2);
    minY = Math.min(minY, b.cy - b.h / 2);
    maxY = Math.max(maxY, b.cy + b.h / 2);
  }
  return { boxes, edges, bounds: { minX, minY, maxX, maxY } };
}

/* ---------------- conexiones ---------------- */

type BoxLike = Pick<NodeBox, "cx" | "cy" | "w" | "h">;

/** Curva de conexión eligiendo el ancla según la posición relativa. */
export function edgePath(from: BoxLike, to: BoxLike, minX: number, minY: number): string {
  const dx = to.cx - from.cx;
  const dy = to.cy - from.cy;
  if (Math.abs(dx) >= Math.abs(dy)) {
    const dir: 1 | -1 = dx >= 0 ? 1 : -1;
    const x1 = from.cx + dir * (from.w / 2) - minX;
    const y1 = from.cy - minY;
    const x2 = to.cx - dir * (to.w / 2) - minX;
    const y2 = to.cy - minY;
    const mx = (x1 + x2) / 2;
    return `M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`;
  }
  const vdir: 1 | -1 = dy >= 0 ? 1 : -1;
  const x1 = from.cx - minX;
  const y1 = from.cy + vdir * (from.h / 2) - minY;
  const x2 = to.cx - minX;
  const y2 = to.cy - vdir * (to.h / 2) - minY;
  const my = (y1 + y2) / 2;
  return `M ${x1} ${y1} C ${x1} ${my}, ${x2} ${my}, ${x2} ${y2}`;
}

/** Punto de anclaje del hilo sobre un nodo, hacia el otro nodo. */
export function edgeAnchor(from: BoxLike, to: BoxLike): { x: number; y: number } {
  const dx = to.cx - from.cx;
  const dy = to.cy - from.cy;
  if (Math.abs(dx) >= Math.abs(dy)) {
    const dir: 1 | -1 = dx >= 0 ? 1 : -1;
    return { x: from.cx + dir * (from.w / 2), y: from.cy };
  }
  const vdir: 1 | -1 = dy >= 0 ? 1 : -1;
  return { x: from.cx, y: from.cy + vdir * (from.h / 2) };
}
