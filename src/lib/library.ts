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

export interface TrashedMap extends StoredMap {
  deletedAt: number;
}

export interface MapVersion {
  id: string;
  mapId: string;
  title: string;
  root: MindNode;
  createdAt: number;
  reason: "auto" | "manual" | "delete" | "restore";
  nodeCount: number;
}

export interface LibraryDataShape {
  maps: StoredMap[];
  lastOpenedId: string | null;
  trash: TrashedMap[];
  versions: MapVersion[];
}

export interface SaveLibraryResult {
  ok: boolean;
  bytes: number;
  warning?: string;
  error?: unknown;
}

const LIB_KEY = "noditos.library.v1";
const LEGACY_KEY = "nodal.map.v1";
export const BACKUP_APP = "NoditosBackup";
export const LIBRARY_SOFT_LIMIT_BYTES = 4.4 * 1024 * 1024;
const MAX_TRASH = 30;
const MAX_VERSIONS_PER_MAP = 18;
const MAX_TOTAL_VERSIONS = 180;
export const AUTO_VERSION_INTERVAL_MS = 5 * 60 * 1000;

let lastStorageWarningAt = 0;

function emitStorageWarning(message: string) {
  if (typeof window === "undefined") return;
  const now = Date.now();
  if (now - lastStorageWarningAt < 45_000) return;
  lastStorageWarningAt = now;
  window.dispatchEvent(new CustomEvent("noditos-storage-warning", { detail: message }));
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(0)} KB`;
  return `${(kb / 1024).toFixed(1).replace(".", ",")} MB`;
}

function approxBytes(text: string): number {
  return new Blob([text]).size;
}

function normalizeMap(raw: unknown): StoredMap | null {
  const obj = (raw ?? {}) as Record<string, unknown>;
  if (!obj || typeof obj !== "object" || !obj.root) return null;
  const now = Date.now();
  return {
    id: typeof obj.id === "string" && obj.id ? obj.id : uid(),
    title: typeof obj.title === "string" && obj.title.trim() ? obj.title : "Mapa sin título",
    root: sanitizeNode(obj.root),
    createdAt: typeof obj.createdAt === "number" ? obj.createdAt : now,
    updatedAt: typeof obj.updatedAt === "number" ? obj.updatedAt : now,
  };
}

function normalizeTrash(raw: unknown): TrashedMap[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((entry) => {
      const map = normalizeMap(entry);
      if (!map) return null;
      const deletedAt = typeof (entry as Record<string, unknown>).deletedAt === "number"
        ? (entry as Record<string, unknown>).deletedAt as number
        : Date.now();
      return { ...map, deletedAt };
    })
    .filter((m): m is TrashedMap => Boolean(m))
    .sort((a, b) => b.deletedAt - a.deletedAt)
    .slice(0, MAX_TRASH);
}

function normalizeVersions(raw: unknown): MapVersion[] {
  if (!Array.isArray(raw)) return [];
  return pruneVersions(
    raw
      .map((entry) => {
        const obj = (entry ?? {}) as Record<string, unknown>;
        if (!obj.root || typeof obj.mapId !== "string") return null;
        return {
          id: typeof obj.id === "string" && obj.id ? obj.id : uid(),
          mapId: obj.mapId,
          title: typeof obj.title === "string" && obj.title.trim() ? obj.title : "Mapa sin título",
          root: sanitizeNode(obj.root),
          createdAt: typeof obj.createdAt === "number" ? obj.createdAt : Date.now(),
          reason: obj.reason === "manual" || obj.reason === "delete" || obj.reason === "restore" ? obj.reason : "auto",
          nodeCount: typeof obj.nodeCount === "number" ? obj.nodeCount : countNodes(sanitizeNode(obj.root)),
        } satisfies MapVersion;
      })
      .filter((v): v is MapVersion => Boolean(v)),
  );
}

function normalizeLibrary(raw: unknown): LibraryDataShape | null {
  const obj = (raw ?? {}) as Record<string, unknown>;
  if (!obj || typeof obj !== "object" || !Array.isArray(obj.maps)) return null;
  return {
    maps: obj.maps.map(normalizeMap).filter((m): m is StoredMap => Boolean(m)),
    lastOpenedId: typeof obj.lastOpenedId === "string" ? obj.lastOpenedId : null,
    trash: normalizeTrash(obj.trash),
    versions: normalizeVersions(obj.versions),
  };
}

export function loadLibraryData(): LibraryDataShape {
  try {
    const raw = localStorage.getItem(LIB_KEY);
    if (raw) {
      const data = normalizeLibrary(JSON.parse(raw));
      if (data) return data;
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
        const data: LibraryDataShape = { maps: [map], lastOpenedId: null, trash: [], versions: [] };
        saveLibraryData(data);
        return data;
      }
    }
  } catch {
    /* sin datos viejos */
  }
  return { maps: [], lastOpenedId: null, trash: [], versions: [] };
}

export function saveLibraryData(data: LibraryDataShape): SaveLibraryResult {
  const safe: LibraryDataShape = {
    maps: data.maps,
    lastOpenedId: data.lastOpenedId,
    trash: (data.trash ?? []).slice(0, MAX_TRASH),
    versions: pruneVersions(data.versions ?? []),
  };
  const raw = JSON.stringify(safe);
  const bytes = approxBytes(raw);
  try {
    localStorage.setItem(LIB_KEY, raw);
    if (bytes > LIBRARY_SOFT_LIMIT_BYTES) {
      const warning = `Tu biblioteca ocupa ${formatBytes(bytes)}. Exportá un backup o usá imágenes por URL para evitar llenar el almacenamiento local.`;
      emitStorageWarning(warning);
      return { ok: true, bytes, warning };
    }
    return { ok: true, bytes };
  } catch (error) {
    const warning = "No se pudo guardar: el almacenamiento local parece estar lleno. Exportá un backup y eliminá imágenes o mapas pesados.";
    emitStorageWarning(warning);
    return { ok: false, bytes, warning, error };
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

export function createMapVersion(map: StoredMap, reason: MapVersion["reason"] = "manual"): MapVersion {
  return {
    id: uid(),
    mapId: map.id,
    title: map.title,
    root: JSON.parse(JSON.stringify(map.root)) as MindNode,
    createdAt: Date.now(),
    reason,
    nodeCount: countNodes(map.root),
  };
}

export function pruneVersions(versions: MapVersion[]): MapVersion[] {
  const sorted = [...versions].sort((a, b) => b.createdAt - a.createdAt);
  const perMap = new Map<string, number>();
  const kept: MapVersion[] = [];
  for (const version of sorted) {
    const n = perMap.get(version.mapId) ?? 0;
    if (n >= MAX_VERSIONS_PER_MAP) continue;
    perMap.set(version.mapId, n + 1);
    kept.push(version);
    if (kept.length >= MAX_TOTAL_VERSIONS) break;
  }
  return kept;
}

export function maybeCreateAutoVersion(data: LibraryDataShape, mapId: string, now = Date.now()): LibraryDataShape {
  const map = data.maps.find((m) => m.id === mapId);
  if (!map) return data;
  const last = (data.versions ?? []).filter((v) => v.mapId === mapId).sort((a, b) => b.createdAt - a.createdAt)[0];
  if (last && now - last.createdAt < AUTO_VERSION_INTERVAL_MS) return data;
  return { ...data, versions: pruneVersions([createMapVersion(map, "auto"), ...(data.versions ?? [])]) };
}

export function moveMapToTrash(data: LibraryDataShape, id: string): LibraryDataShape {
  const map = data.maps.find((m) => m.id === id);
  if (!map) return data;
  const deletedAt = Date.now();
  return {
    ...data,
    maps: data.maps.filter((m) => m.id !== id),
    trash: [{ ...map, deletedAt }, ...(data.trash ?? [])].slice(0, MAX_TRASH),
    versions: pruneVersions([createMapVersion(map, "delete"), ...(data.versions ?? [])]),
    lastOpenedId: data.lastOpenedId === id ? null : data.lastOpenedId,
  };
}

export function restoreFromTrash(data: LibraryDataShape, id: string): LibraryDataShape {
  const trashed = (data.trash ?? []).find((m) => m.id === id);
  if (!trashed) return data;
  const { deletedAt: _deletedAt, ...map } = trashed;
  return {
    ...data,
    maps: [{ ...map, updatedAt: Date.now() }, ...data.maps],
    trash: data.trash.filter((m) => m.id !== id),
    versions: pruneVersions([createMapVersion(map, "restore"), ...(data.versions ?? [])]),
  };
}

export interface LibraryBackupFile {
  app: typeof BACKUP_APP;
  version: 1;
  exportedAt: string;
  data: LibraryDataShape;
}

export function createLibraryBackup(data: LibraryDataShape): string {
  const safe: LibraryBackupFile = {
    app: BACKUP_APP,
    version: 1,
    exportedAt: new Date().toISOString(),
    data: {
      maps: data.maps,
      lastOpenedId: data.lastOpenedId,
      trash: data.trash ?? [],
      versions: pruneVersions(data.versions ?? []),
    },
  };
  return JSON.stringify(safe, null, 2);
}

export function parseLibraryBackup(content: string): LibraryDataShape {
  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("El backup no es un JSON válido.");
  }
  const obj = (parsed ?? {}) as Record<string, unknown>;
  const data = obj.app === BACKUP_APP ? obj.data : obj;
  const normalized = normalizeLibrary(data);
  if (!normalized) throw new Error("El archivo no parece un backup de Noditos.");
  return normalized;
}

export function mergeLibraryData(current: LibraryDataShape, incoming: LibraryDataShape): LibraryDataShape {
  const used = new Set([...current.maps.map((m) => m.id), ...(current.trash ?? []).map((m) => m.id)]);
  const cloneMap = <T extends StoredMap>(map: T): T => {
    let id = map.id;
    if (used.has(id)) id = uid();
    used.add(id);
    return { ...map, id, root: JSON.parse(JSON.stringify(map.root)) as MindNode };
  };
  const importedMaps = incoming.maps.map(cloneMap);
  const importedTrash = (incoming.trash ?? []).map(cloneMap).slice(0, MAX_TRASH);
  const idMap = new Map<string, string>();
  incoming.maps.forEach((m, index) => idMap.set(m.id, importedMaps[index].id));
  const importedVersions = (incoming.versions ?? []).map((version) => ({
    ...version,
    id: uid(),
    mapId: idMap.get(version.mapId) ?? version.mapId,
    root: JSON.parse(JSON.stringify(version.root)) as MindNode,
  }));
  return {
    maps: [...current.maps, ...importedMaps],
    lastOpenedId: importedMaps[0]?.id ?? current.lastOpenedId,
    trash: [...(current.trash ?? []), ...importedTrash].slice(0, MAX_TRASH),
    versions: pruneVersions([...(current.versions ?? []), ...importedVersions]),
  };
}

export function timeAgo(ts: number): string {
  const min = Math.floor((Date.now() - ts) / 60000);
  if (min < 1) return `recién`;
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
