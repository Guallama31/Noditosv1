import { useRef, useState } from "react";
import type {
  LayoutMode,
  MapSnapshot,
  MindNode,
  NodeFont,
  NodeImage,
  NodeKind,
  NodePos,
} from "../types";
import {
  countNodes,
  createNode,
  findNode,
  findParent,
  insertChild,
  moveNode as moveInTree,
  removeNode,
  updateNode,
} from "../lib/tree";
import { buildPastedTree, type PastedLine } from "../lib/paste";

export type MindMapApi = ReturnType<typeof useMindMap>;

export function useMindMap(initial: MapSnapshot) {
  const [snap, setSnap] = useState<MapSnapshot>(initial);
  const [selectedId, setSelectedId] = useState<string | null>(initial.root.id);
  const [editingId, setEditingId] = useState<string | null>(null);

  const snapRef = useRef(snap);
  snapRef.current = snap;
  const past = useRef<MapSnapshot[]>([]);
  const future = useRef<MapSnapshot[]>([]);

  const mutate = (fn: (s: MapSnapshot) => MapSnapshot) => {
    setSnap((s) => {
      const next = fn(s);
      if (next === s) return s;
      past.current = [...past.current.slice(-59), s];
      future.current = [];
      return next;
    });
  };

  return {
    root: snap.root,
    title: snap.title,
    selectedId,
    editingId,
    canUndo: past.current.length > 0,
    canRedo: future.current.length > 0,

    select(id: string | null) {
      setSelectedId(id);
      if (id === null) setEditingId(null);
    },

    startEdit(id: string) {
      setSelectedId(id);
      setEditingId(id);
    },

    commitEdit(id: string, text: string) {
      setEditingId(null);
      const trimmed = text.trim();
      const node = findNode(snapRef.current.root, id);
      if (!node) return;
      // Nodo vacío sin texto: se elimina (salvo la raíz).
      if (!trimmed && !node.notes.trim() && node.children.length === 0 && id !== snapRef.current.root.id) {
        mutate((s) => ({ ...s, root: removeNode(s.root, id) }));
        return;
      }
      if (trimmed === node.text) return;
      mutate((s) => ({ ...s, root: updateNode(s.root, id, (n) => ({ ...n, text: trimmed })) }));
    },

    cancelEdit() {
      setEditingId(null);
    },

    addChild(parentId: string, kind: NodeKind = "idea"): string | undefined {
      if (!findNode(snapRef.current.root, parentId)) return undefined;
      const node = createNode("", { kind });
      mutate((s) => ({ ...s, root: insertChild(s.root, parentId, node) }));
      setSelectedId(node.id);
      if (kind !== "image") setEditingId(node.id);
      return node.id;
    },

    addSibling(id: string, kind: NodeKind = "idea"): string | undefined {
      const current = snapRef.current;
      if (id === current.root.id) return this.addChild(current.root.id, kind);
      const parent = findParent(current.root, id);
      if (!parent) return undefined;
      const index = parent.children.findIndex((c) => c.id === id);
      const node = createNode("", { kind });
      mutate((s) => ({ ...s, root: insertChild(s.root, parent.id, node, index + 1) }));
      setSelectedId(node.id);
      if (kind !== "image") setEditingId(node.id);
      return node.id;
    },

    addManyChildren(parentId: string, texts: string[]) {
      if (!texts.length) return;
      const nodes = texts.map((t) => createNode(t));
      mutate((s) => {
        let root = s.root;
        for (const n of nodes) root = insertChild(root, parentId, n);
        return { ...s, root };
      });
    },

    addImageChild(parentId: string, image: NodeImage) {
      if (!findNode(snapRef.current.root, parentId)) return;
      const node = createNode("", { kind: "image", image });
      mutate((s) => ({ ...s, root: insertChild(s.root, parentId, node) }));
      setSelectedId(node.id);
    },

    setKind(id: string, kind: NodeKind) {
      mutate((s) => ({ ...s, root: updateNode(s.root, id, (n) => ({ ...n, kind })) }));
    },

    setImage(id: string, image: NodeImage | null) {
      mutate((s) => ({
        ...s,
        root: updateNode(s.root, id, (n) => ({ ...n, image, kind: image ? "image" : n.kind })),
      }));
    },

    setFont(id: string, font: NodeFont | null) {
      mutate((s) => ({ ...s, root: updateNode(s.root, id, (n) => ({ ...n, font })) }));
    },

    setPos(id: string, pos: NodePos) {
      mutate((s) => ({ ...s, root: updateNode(s.root, id, (n) => ({ ...n, pos })) }));
    },

    clearPositions() {
      mutate((s) => {
        const clear = (n: MindNode): MindNode => ({ ...n, pos: null, children: n.children.map(clear) });
        return { ...s, root: clear(s.root) };
      });
    },

    setLayout(id: string, mode: LayoutMode, recursive: boolean) {
      mutate((s) => ({
        ...s,
        root: updateNode(s.root, id, (n) => {
          const apply = (x: MindNode): MindNode => ({
            ...x,
            layout: mode,
            children: recursive ? x.children.map(apply) : x.children,
          });
          return apply(n);
        }),
      }));
    },

    updateText(id: string, text: string) {
      mutate((s) => ({ ...s, root: updateNode(s.root, id, (n) => ({ ...n, text })) }));
    },

    updateNotes(id: string, notes: string) {
      mutate((s) => ({ ...s, root: updateNode(s.root, id, (n) => ({ ...n, notes })) }));
    },

    setColor(id: string, color: string | null) {
      mutate((s) => ({ ...s, root: updateNode(s.root, id, (n) => ({ ...n, color })) }));
    },

    toggleCollapse(id: string) {
      mutate((s) => ({ ...s, root: updateNode(s.root, id, (n) => ({ ...n, collapsed: !n.collapsed })) }));
    },

    deleteNode(id: string) {
      if (id === snapRef.current.root.id) return;
      mutate((s) => ({ ...s, root: removeNode(s.root, id) }));
      setSelectedId(snapRef.current.root.id);
    },

    moveNode(id: string, targetId: string): boolean {
      const next = moveInTree(snapRef.current.root, id, targetId);
      if (!next) return false;
      mutate((s) => ({ ...s, root: next }));
      return true;
    },

    /** Reordena los hijos de parentId según el orden de ids dado. */
    reorderChildren(parentId: string, orderedIds: string[]) {
      mutate((s) => ({
        ...s,
        root: updateNode(s.root, parentId, (n) => {
          const byId = new Map(n.children.map((c) => [c.id, c]));
          const children = orderedIds.map((i) => byId.get(i)).filter((c): c is MindNode => Boolean(c));
          for (const c of n.children) if (!orderedIds.includes(c.id)) children.push(c);
          return { ...n, children };
        }),
      }));
    },

    /** Inserta un árbol como hermano de anchorId, justo después de él. */
    insertBranch(anchorId: string, tree: MindNode) {
      const current = snapRef.current;
      if (anchorId === current.root.id) {
        mutate((s) => ({ ...s, root: insertChild(s.root, current.root.id, tree) }));
        return;
      }
      const parent = findParent(current.root, anchorId);
      if (!parent) return;
      const index = parent.children.findIndex((c) => c.id === anchorId);
      mutate((s) => ({ ...s, root: insertChild(s.root, parent.id, tree, index + 1) }));
    },

    /** Pega texto como nodos jerarquizados bajo `id`. */
    pasteInto(id: string, items: PastedLine[]): number {
      if (items.length === 0) return 0;
      const target = findNode(snapRef.current.root, id);
      if (!target) return 0;
      if (items.length === 1 && !items[0].isNote) {
        const text = items[0].text;
        mutate((s) => ({ ...s, root: updateNode(s.root, id, (n) => ({ ...n, text })) }));
        return 0;
      }
      const tree = buildPastedTree(items);
      const created = countNodes(tree) - 1;
      if (created === 0 && !tree.notes) return 0;
      mutate((s) => ({
        ...s,
        root: updateNode(s.root, id, (n) => ({
          ...n,
          notes: tree.notes ? (n.notes ? `${n.notes}\n${tree.notes}` : tree.notes) : n.notes,
          children: [...n.children, ...tree.children],
          collapsed: false,
        })),
      }));
      return created;
    },

    undo() {
      setSnap((s) => {
        if (past.current.length === 0) return s;
        const prev = past.current[past.current.length - 1];
        past.current = past.current.slice(0, -1);
        future.current = [...future.current, s];
        return prev;
      });
      setEditingId(null);
    },

    redo() {
      setSnap((s) => {
        if (future.current.length === 0) return s;
        const next = future.current[future.current.length - 1];
        future.current = future.current.slice(0, -1);
        past.current = [...past.current, s];
        return next;
      });
      setEditingId(null);
    },

    newMap() {
      past.current = [];
      future.current = [];
      const root = createNode("Idea central");
      setSnap({ root, title: "Mapa sin título" });
      setSelectedId(root.id);
      setEditingId(null);
    },

    replaceMap(root: MindNode, title: string) {
      mutate((s) => ({ ...s, root, title }));
      setSelectedId(root.id);
      setEditingId(null);
    },

    setTitle(title: string) {
      mutate((s) => ({ ...s, title }));
    },
  };
}
