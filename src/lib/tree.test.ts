import { describe, expect, it } from "vitest";
import { countNodes, createNode, findNode, insertChild, moveNode, sanitizeNode } from "./tree";

describe("tree", () => {
  it("crea, inserta y encuentra nodos", () => {
    const root = createNode("Raíz");
    const child = createNode("Hijo");
    const next = insertChild(root, root.id, child);
    expect(countNodes(next)).toBe(2);
    expect(findNode(next, child.id)?.text).toBe("Hijo");
  });

  it("evita mover un nodo dentro de su propio descendiente", () => {
    const grandchild = createNode("Nieto");
    const child = createNode("Hijo", {}, [grandchild]);
    const root = createNode("Raíz", {}, [child]);
    expect(moveNode(root, child.id, grandchild.id)).toBeNull();
  });

  it("sanea metadatos e imágenes importadas", () => {
    const node = sanitizeNode({
      id: "x",
      kind: "image",
      text: "Foto",
      image: { src: "https://example.com/a.jpg", aspect: 1.5, source: "url", alt: "Alt" },
      meta: {
        tags: ["#uno", "dos", "uno"],
        priority: "urgent",
        status: "doing",
        dueDate: "2026-10-15",
        progress: 150,
      },
      children: [],
    });
    expect(node.image?.source).toBe("url");
    expect(node.image?.alt).toBe("Alt");
    expect(node.meta?.tags).toEqual(["uno", "dos"]);
    expect(node.meta?.priority).toBe("urgent");
    expect(node.meta?.progress).toBe(100);
  });
});
