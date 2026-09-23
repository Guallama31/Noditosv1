import { describe, expect, it } from "vitest";
import { createNode } from "./tree";
import { parseFile, serialize, slugify } from "./formats";

describe("formats", () => {
  it("serializa JSON reimportable conservando metadatos", () => {
    const root = createNode("Proyecto", { meta: { tags: ["app"], priority: "high", taskDone: false } }, [
      createNode("Tarea", { notes: "Detalle", meta: { status: "todo", dueDate: "2026-12-01" } }),
    ]);
    const json = serialize("json", root, "Plan");
    const parsed = parseFile("plan.json", json);
    expect(parsed.title).toBe("Plan");
    expect(parsed.root.meta?.tags).toEqual(["app"]);
    expect(parsed.root.children[0].meta?.dueDate).toBe("2026-12-01");
  });

  it("incluye tareas y metadatos en Markdown", () => {
    const root = createNode("Proyecto", { meta: { tags: ["cliente"], taskDone: true, progress: 100 } });
    const md = serialize("md", root, "Plan");
    expect(md).toContain("[x] Proyecto");
    expect(md).toContain("#cliente");
    expect(md).toContain("progreso: 100%");
  });

  it("genera slugs estables", () => {
    expect(slugify("Árbol de ideas 2026" )).toBe("arbol-de-ideas-2026");
  });
});
