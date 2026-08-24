import type { MindNode } from "../types";
import { countNodes, createNode, sanitizeNode, uid } from "./tree";
import { BRANCH_COLORS } from "./layout";

export interface StoredMap {
  id: string;
  title: string;
  root: MindNode;
  createdAt: number;
  updatedAt: number;
}

export interface LibraryDataShape {
  maps: StoredMap[];
  lastOpenedId: string | null;
}

const LIB_KEY = "noditos.library.v1";
const LEGACY_KEY = "nodal.map.v1";

export function loadLibraryData(): LibraryDataShape {
  try {
    const raw = localStorage.getItem(LIB_KEY);
    if (raw) {
      const obj = JSON.parse(raw) as Partial<LibraryDataShape>;
      if (obj && Array.isArray(obj.maps)) {
        return {
          maps: obj.maps
            .filter((m) => m && m.root && Array.isArray(m.root.children))
            .map((m) => ({
              ...m,
              root: sanitizeNode(m.root),
              title: typeof m.title === "string" ? m.title : "Mapa sin título",
            })),
          lastOpenedId: typeof obj.lastOpenedId === "string" ? obj.lastOpenedId : null,
        };
      }
    }
  } catch {
    /* datos corruptos: empezar de cero */
  }
  // Migración desde versiones anteriores (mapa único).
  try {
    const legacy = localStorage.getItem(LEGACY_KEY);
    if (legacy) {
      const obj = JSON.parse(legacy) as { root?: unknown; title?: string };
      if (obj && obj.root && typeof obj.root === "object") {
        const now = Date.now();
        const map: StoredMap = {
          id: uid(),
          title: typeof obj.title === "string" && obj.title.trim() ? obj.title : "Mi mapa (migrado)",
          root: sanitizeNode(obj.root),
          createdAt: now,
          updatedAt: now,
        };
        const data: LibraryDataShape = { maps: [map], lastOpenedId: null };
        saveLibraryData(data);
        return data;
      }
    }
  } catch {
    /* sin datos viejos */
  }
  return { maps: [], lastOpenedId: null };
}

export function saveLibraryData(data: LibraryDataShape) {
  try {
    localStorage.setItem(LIB_KEY, JSON.stringify(data));
  } catch {
    /* almacenamiento lleno */
  }
}

export function createStoredMap(title = "Mapa sin título", root?: MindNode): StoredMap {
  const now = Date.now();
  return {
    id: uid(),
    title,
    root: root ?? createNode("Idea central"),
    createdAt: now,
    updatedAt: now,
  };
}

export function timeAgo(ts: number): string {
  const min = Math.floor((Date.now() - ts) / 60000);
  if (min < 1) return "recién";
  if (min < 60) return `hace ${min} min`;
  const d = new Date(ts);
  const today = new Date();
  const hm = d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
  if (d.toDateString() === today.toDateString()) return `hoy ${hm}`;
  const yesterday = new Date(today.getTime() - 86400000);
  if (d.toDateString() === yesterday.toDateString()) return `ayer ${hm}`;
  const opts: Intl.DateTimeFormatOptions =
    d.getFullYear() === today.getFullYear()
      ? { day: "numeric", month: "short" }
      : { day: "numeric", month: "short", year: "numeric" };
  return d.toLocaleDateString("es-ES", opts);
}

/* ---------------- miniatura del árbol ---------------- */

export interface PreviewEdge { d: string; color: string; }
export interface PreviewDot { x: number; y: number; r: number; color: string; root?: boolean; }
export interface MapPreview {
  edges: PreviewEdge[];
  dots: PreviewDot[];
  width: number;
  height: number;
  clipped: number;
}

interface FlatNode {
  node: MindNode;
  depth: number;
  color: string;
  parent?: FlatNode;
}

const MAX_PREVIEW = 46;

function flatten(node: MindNode, depth: number, inherited: string, parent: FlatNode | undefined, out: FlatNode[]) {
  const color = node.color ?? inherited;
  const flat: FlatNode = { node, depth, color, parent };
  out.push(flat);
  node.children.forEach((child, i) => {
    if (out.length >= MAX_PREVIEW) return;
    const childInherited = depth === 0 ? BRANCH_COLORS[i % BRANCH_COLORS.length] : color;
    flatten(child, depth + 1, childInherited, flat, out);
  });
}

/** Diagrama pequeño del mapa para las tarjetas. */
export function buildPreview(root: MindNode): MapPreview {
  const flat: FlatNode[] = [];
  flatten(root, 0, BRANCH_COLORS[0], undefined, flat);
  const colW = 24;
  const rowH = 12;
  const pad = 10;
  const maxDepth = flat.reduce((a, f) => Math.max(a, f.depth), 0);
  const pos = new Map<string, { x: number; y: number }>();
  flat.forEach((f, i) => pos.set(f.node.id, { x: pad + f.depth * colW, y: pad + i * rowH }));
  const edges: PreviewEdge[] = [];
  const dots: PreviewDot[] = [];
  for (const f of flat) {
    const p = pos.get(f.node.id)!;
    if (f.parent) {
      const q = pos.get(f.parent.node.id)!;
      const mx = (q.x + p.x) / 2 + 6;
      edges.push({ d: `M ${q.x} ${q.y} C ${mx} ${q.y}, ${mx} ${p.y}, ${p.x} ${p.y}`, color: f.color });
    }
    dots.push({ x: p.x, y: p.y, r: f.depth === 0 ? 5 : f.depth === 1 ? 3.4 : 2.6, color: f.color, root: f.depth === 0 });
  }
  return {
    edges,
    dots,
    width: pad * 2 + maxDepth * colW + 6,
    height: pad * 2 + (flat.length - 1) * rowH + 6,
    clipped: Math.max(0, countNodes(root) - flat.length),
  };
}
