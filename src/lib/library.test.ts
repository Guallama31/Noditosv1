import { describe, expect, it } from "vitest";
import { createNode } from "./tree";
import {
  createLibraryBackup,
  createStoredMap,
  mergeLibraryData,
  moveMapToTrash,
  parseLibraryBackup,
  restoreFromTrash,
  type LibraryDataShape,
} from "./library";

const empty = (): LibraryDataShape => ({ maps: [], lastOpenedId: null, trash: [], versions: [] });

describe("library backups and trash", () => {
  it("mueve mapas a papelera y los restaura", () => {
    const map = createStoredMap("Mapa", createNode("Raíz"));
    const trashed = moveMapToTrash({ ...empty(), maps: [map], lastOpenedId: map.id }, map.id);
    expect(trashed.maps).toHaveLength(0);
    expect(trashed.trash[0].id).toBe(map.id);
    expect(trashed.versions[0].reason).toBe("delete");

    const restored = restoreFromTrash(trashed, map.id);
    expect(restored.maps[0].id).toBe(map.id);
    expect(restored.trash).toHaveLength(0);
  });

  it("exporta e importa backups completos", () => {
    const map = createStoredMap("Mapa", createNode("Raíz"));
    const data: LibraryDataShape = { ...empty(), maps: [map], lastOpenedId: map.id };
    const backup = createLibraryBackup(data);
    const parsed = parseLibraryBackup(backup);
    expect(parsed.maps[0].title).toBe("Mapa");
    expect(parsed.lastOpenedId).toBe(map.id);
  });

  it("fusiona backups evitando ids duplicados", () => {
    const map = createStoredMap("Mapa", createNode("Raíz"));
    const current: LibraryDataShape = { ...empty(), maps: [map] };
    const incoming: LibraryDataShape = { ...empty(), maps: [map] };
    const merged = mergeLibraryData(current, incoming);
    expect(merged.maps).toHaveLength(2);
    expect(new Set(merged.maps.map((m) => m.id)).size).toBe(2);
  });
});
