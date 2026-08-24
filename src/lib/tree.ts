import type { MindNode } from "../types";

export const LAYOUT_VALUES = ["auto", "right", "left", "split", "alternate", "top"];
const KIND_VALUES = ["idea", "title", "text", "image"];

export function uid(): string {
  return Date.now().toString(36).slice(-5) + Math.random().toString(36).slice(2, 8);
}

export function createNode(
  text = "",
  extra: Partial<Omit<MindNode, "id" | "children">> = {},
  children: MindNode[] = [],
): MindNode {
  return {
    id: uid(),
    kind: "idea",
    text,
    notes: "",
    color: null,
    layout: null,
    collapsed: false,
    image: null,
    pos: null,
    font: null,
    children,
    ...extra,
  };
}

export function findNode(root: MindNode, id: string): MindNode | null {
  if (root.id === id) return root;
  for (const c of root.children) {
    const f = findNode(c, id);
    if (f) return f;
  }
  return null;
}

export function findParent(root: MindNode, id: string): MindNode | null {
  for (const c of root.children) {
    if (c.id === id) return root;
    const f = findParent(c, id);
    if (f) return f;
  }
  return null;
}

export function pathOf(root: MindNode, id: string): MindNode[] | null {
  if (root.id === id) return [root];
  for (const c of root.children) {
    const sub = pathOf(c, id);
    if (sub) return [root, ...sub];
  }
  return null;
}

export function updateNode(
  root: MindNode,
  id: string,
  fn: (n: MindNode) => MindNode,
): MindNode {
  if (root.id === id) return fn(root);
  if (root.children.length === 0) return root;
  let changed = false;
  const children = root.children.map((c) => {
    const next = updateNode(c, id, fn);
    if (next !== c) changed = true;
    return next;
  });
  return changed ? { ...root, children } : root;
}

export function removeNode(root: MindNode, id: string): MindNode {
  return {
    ...root,
    children: root.children.filter((c) => c.id !== id).map((c) => removeNode(c, id)),
  };
}

export function insertChild(
  root: MindNode,
  parentId: string,
  node: MindNode,
  index?: number,
): MindNode {
  return updateNode(root, parentId, (p) => {
    const children = [...p.children];
    const at =
      index === undefined || index < 0 || index > children.length ? children.length : index;
    children.splice(at, 0, node);
    return { ...p, children, collapsed: false };
  });
}

export function isDescendant(node: MindNode, id: string): boolean {
  return node.children.some((c) => c.id === id || isDescendant(c, id));
}

export function moveNode(root: MindNode, id: string, targetId: string): MindNode | null {
  if (id === targetId) return null;
  const node = findNode(root, id);
  if (!node) return null;
  if (isDescendant(node, targetId)) return null;
  const parent = findParent(root, id);
  if (parent && parent.id === targetId) return null;
  return insertChild(removeNode(root, id), targetId, node);
}

export function countNodes(node: MindNode): number {
  return 1 + node.children.reduce((a, c) => a + countNodes(c), 0);
}

export function maxDepth(node: MindNode, depth = 1): number {
  return node.children.reduce((a, c) => Math.max(a, maxDepth(c, depth + 1)), depth);
}

/** Convierte datos externos en un árbol seguro. */
export function sanitizeNode(raw: unknown): MindNode {
  const obj = (raw ?? {}) as Record<string, unknown>;
  const childrenRaw = Array.isArray(obj.children) ? obj.children : [];
  const kind = KIND_VALUES.includes(obj.kind as string) ? (obj.kind as MindNode["kind"]) : "idea";
  const layout = LAYOUT_VALUES.includes(obj.layout as string)
    ? (obj.layout as MindNode["layout"])
    : null;
  const img = obj.image as Record<string, unknown> | null | undefined;
  const image =
    img && typeof img.src === "string" && typeof img.aspect === "number" && img.aspect > 0
      ? { src: img.src, aspect: img.aspect }
      : null;
  const posRaw = obj.pos as Record<string, unknown> | null | undefined;
  const pos =
    posRaw &&
    typeof posRaw.x === "number" &&
    typeof posRaw.y === "number" &&
    Number.isFinite(posRaw.x) &&
    Number.isFinite(posRaw.y)
      ? { x: posRaw.x, y: posRaw.y }
      : null;
  const fontRaw = obj.font as Record<string, unknown> | null | undefined;
  const font =
    fontRaw && typeof fontRaw.family === "string" && typeof fontRaw.size === "number" && fontRaw.size > 0
      ? {
          family: fontRaw.family,
          size: fontRaw.size,
          lineHeight:
            typeof fontRaw.lineHeight === "number" && fontRaw.lineHeight > 0 ? fontRaw.lineHeight : 1.3,
          bold: Boolean(fontRaw.bold),
          italic: Boolean(fontRaw.italic),
        }
      : null;
  return {
    id: typeof obj.id === "string" && obj.id ? obj.id : uid(),
    kind,
    text: typeof obj.text === "string" ? obj.text : "",
    notes: typeof obj.notes === "string" ? obj.notes : "",
    color: typeof obj.color === "string" ? obj.color : null,
    layout,
    collapsed: Boolean(obj.collapsed),
    image,
    pos,
    font,
    children: childrenRaw.map((c) => sanitizeNode(c)),
  };
}
