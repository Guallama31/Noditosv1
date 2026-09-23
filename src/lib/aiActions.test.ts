import { describe, expect, it } from "vitest";
import { parseStructuredActionReply } from "./aiActions";

describe("AI structured map actions", () => {
  it("parsea acciones camelCase dentro de { actions }", () => {
    expect(parseStructuredActionReply('{"actions":[{"type":"updateText","nodeId":"n1","text":"Nuevo"}]}')).toEqual([
      { type: "updateText", nodeId: "n1", text: "Nuevo" },
    ]);
  });

  it("acepta snake_case y arrays directos", () => {
    expect(parseStructuredActionReply('[{"type":"add_children","parent_id":"root","texts":["A","B"]}]')).toEqual([
      { type: "addChildren", parentId: "root", texts: ["A", "B"] },
    ]);
  });

  it("extrae JSON aunque venga con texto o fences", () => {
    const reply = '```json\n{"type":"move-node","nodeId":"a","targetId":"b"}\n```';
    expect(parseStructuredActionReply(reply)).toEqual([
      { type: "moveNode", nodeId: "a", targetId: "b" },
    ]);
  });
});
