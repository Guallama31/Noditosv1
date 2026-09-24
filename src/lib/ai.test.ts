import { describe, expect, it } from "vitest";
import { parseIndexGroups, parseIndexList, parseOutline, parseQA, parseSuggestionList } from "./ai";

describe("AI parsers", () => {
  it("extrae sugerencias desde JSON o listas", () => {
    expect(parseSuggestionList('["Uno", "Dos"]')).toEqual(["Uno", "Dos"]);
    expect(parseSuggestionList("- Alfa\n- Beta")).toEqual(["Alfa", "Beta"]);
  });

  it("rechaza arrays JSON cortados para permitir reintentos", () => {
    expect(() => parseSuggestionList('["Riesgo completo", "Supuesto incompleto')).toThrow();
  });

  it("parsea índices, grupos y pares pregunta/respuesta", () => {
    expect(parseIndexList("2, 1", 3)).toEqual([2, 1, 0]);
    expect(parseIndexGroups("[[0,2],[3,4]]", 5)).toEqual([[0, 2], [3, 4]]);
    expect(parseQA("Pregunta: ¿Qué es?\nRespuesta: Una prueba")).toEqual([
      { q: "¿Qué es?", a: "Una prueba" },
    ]);
  });

  it("parsea preguntas numeradas aunque no vengan en JSON", () => {
    expect(parseQA("Pregunta 1: ¿Qué es un consorcio?\nRespuesta 1: Una asociación para un fin común.")).toEqual([
      { q: "¿Qué es un consorcio?", a: "Una asociación para un fin común." },
    ]);
    expect(parseQA("Pregunta 1: ¿Qué se evalúa? Respuesta: La coherencia del mapa.")).toEqual([
      { q: "¿Qué se evalúa?", a: "La coherencia del mapa." },
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
