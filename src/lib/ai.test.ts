import { describe, expect, it } from "vitest";
import { parseIndexList, parseOutline, parseQA, parseSuggestionList } from "./ai";

describe("AI parsers", () => {
  it("extrae sugerencias desde JSON o listas", () => {
    expect(parseSuggestionList('["Uno", "Dos"]')).toEqual(["Uno", "Dos"]);
    expect(parseSuggestionList("- Alfa\n- Beta")).toEqual(["Alfa", "Beta"]);
  });

  it("parsea índices y pares pregunta/respuesta", () => {
    expect(parseIndexList("2, 1", 3)).toEqual([2, 1, 0]);
    expect(parseQA("Pregunta: ¿Qué es?\nRespuesta: Una prueba")).toEqual([
      { q: "¿Qué es?", a: "Una prueba" },
    ]);
  });

  it("normaliza outlines jerárquicos", () => {
    const outline = parseOutline('[{"level":0,"text":"Raíz"},{"level":1,"text":"Hijo","notes":"Nota"}]');
    expect(outline).toEqual([
      { level: 0, text: "Raíz", notes: undefined },
      { level: 1, text: "Hijo", notes: "Nota" },
    ]);
  });
});
