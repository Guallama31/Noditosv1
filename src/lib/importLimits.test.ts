import { describe, expect, it } from "vitest";
import {
  IMPORT_LIMITS,
  assertFileSize,
  assertMindMapLimits,
  assertTextSize,
  assertZipLimits,
} from "./importLimits";
import { parseFile } from "./formats";
import { parseLibraryBackup } from "./library";

describe("límites de importación", () => {
  it("rechaza archivos antes de leerlos cuando superan el tamaño permitido", () => {
    expect(() => assertFileSize({ name: "enorme.json", size: 101 }, 100)).toThrow(/límite/);
  });

  it("mide bytes UTF-8 y no sólo caracteres", () => {
    expect(() => assertTextSize("á".repeat(6), 10)).toThrow(/límite/);
    expect(() => assertTextSize("a".repeat(10), 10)).not.toThrow();
  });

  it("rechaza profundidad hostil antes de sanitizar recursivamente", () => {
    const root: Record<string, unknown> = { text: "0", children: [] };
    let cursor = root;
    for (let depth = 0; depth <= IMPORT_LIMITS.depth; depth += 1) {
      const child: Record<string, unknown> = { text: String(depth + 1), children: [] };
      (cursor.children as unknown[]).push(child);
      cursor = child;
    }
    expect(() => assertMindMapLimits(root)).toThrow(/niveles/);
    expect(() => parseFile("hostil.json", JSON.stringify({ root }))).toThrow(/niveles/);
  });

  it("rechaza demasiados nodos y textos desproporcionados", () => {
    const many = {
      text: "raíz",
      children: Array.from({ length: IMPORT_LIMITS.nodes }, (_, index) => ({ text: String(index), children: [] })),
    };
    expect(() => assertMindMapLimits(many)).toThrow(/nodos/);
    expect(() => assertMindMapLimits({ text: "x".repeat(IMPORT_LIMITS.nodeTextChars + 1), children: [] })).toThrow(/caracteres/);
  });

  it("rechaza ZIP con muchas entradas o expansión declarada excesiva", () => {
    expect(() => assertZipLimits({ bomb: { _data: { uncompressedSize: IMPORT_LIMITS.zipUncompressedBytes + 1 } } })).toThrow(/descomprimido/);
    const entries = Object.fromEntries(
      Array.from({ length: IMPORT_LIMITS.zipEntries + 1 }, (_, index) => [String(index), { _data: { uncompressedSize: 1 } }]),
    );
    expect(() => assertZipLimits(entries)).toThrow(/archivos internos/);
  });

  it("rechaza backups con demasiados mapas antes de normalizarlos", () => {
    const maps = Array.from({ length: IMPORT_LIMITS.mapsPerBackup + 1 }, (_, index) => ({
      id: String(index),
      title: "Mapa",
      root: { text: "Raíz", children: [] },
    }));
    expect(() => parseLibraryBackup(JSON.stringify({ maps }))).toThrow(/mapas/);
  });
});
