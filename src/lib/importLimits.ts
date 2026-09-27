export const IMPORT_LIMITS = {
  textFileBytes: 10 * 1024 * 1024,
  backupFileBytes: 25 * 1024 * 1024,
  docxFileBytes: 25 * 1024 * 1024,
  zipEntries: 1_000,
  zipUncompressedBytes: 100 * 1024 * 1024,
  docxXmlBytes: 50 * 1024 * 1024,
  nodes: 10_000,
  depth: 100,
  nodeTextChars: 20_000,
  nodeNotesChars: 100_000,
  shareHashChars: 180_000,
  mapsPerBackup: 2_000,
  versionsPerBackup: 20_000,
} as const;

function bytesInText(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

export function formatLimit(bytes: number): string {
  return bytes >= 1024 * 1024
    ? `${Math.round(bytes / (1024 * 1024))} MB`
    : `${Math.round(bytes / 1024)} KB`;
}

export function assertFileSize(file: Pick<File, "size" | "name">, maxBytes: number, kind = "archivo"): void {
  if (file.size > maxBytes) {
    throw new Error(`El ${kind} supera el límite de ${formatLimit(maxBytes)} (${file.name}).`);
  }
}

export function assertTextSize(content: string, maxBytes = IMPORT_LIMITS.textFileBytes, kind = "archivo"): void {
  if (bytesInText(content) > maxBytes) {
    throw new Error(`El ${kind} supera el límite de ${formatLimit(maxBytes)}.`);
  }
}

/**
 * Valida la forma y los límites antes de que sanitizeNode recorra datos JSON no
 * confiables. Es iterativo para que una entrada profundamente anidada no pueda
 * agotar la pila del navegador.
 */
export function assertMindMapLimits(root: unknown): void {
  if (!root || typeof root !== "object" || Array.isArray(root)) {
    throw new Error("El mapa no contiene una raíz válida.");
  }

  const stack: Array<{ value: unknown; depth: number }> = [{ value: root, depth: 0 }];
  const seen = new Set<object>();
  let nodes = 0;

  while (stack.length) {
    const { value, depth } = stack.pop()!;
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new Error("El mapa contiene un nodo inválido.");
    }
    const objectValue = value as Record<string, unknown>;
    if (seen.has(objectValue)) throw new Error("El mapa contiene referencias circulares.");
    seen.add(objectValue);

    nodes += 1;
    if (nodes > IMPORT_LIMITS.nodes) {
      throw new Error(`El mapa supera el límite de ${IMPORT_LIMITS.nodes.toLocaleString("es-AR")} nodos.`);
    }
    if (depth > IMPORT_LIMITS.depth) {
      throw new Error(`El mapa supera el límite de ${IMPORT_LIMITS.depth} niveles.`);
    }
    if (typeof objectValue.text === "string" && objectValue.text.length > IMPORT_LIMITS.nodeTextChars) {
      throw new Error(`Un nodo supera el límite de ${IMPORT_LIMITS.nodeTextChars.toLocaleString("es-AR")} caracteres.`);
    }
    if (typeof objectValue.notes === "string" && objectValue.notes.length > IMPORT_LIMITS.nodeNotesChars) {
      throw new Error(`Una nota supera el límite de ${IMPORT_LIMITS.nodeNotesChars.toLocaleString("es-AR")} caracteres.`);
    }

    const children = objectValue.children;
    if (children === undefined || children === null) continue;
    if (!Array.isArray(children)) throw new Error("El mapa contiene una lista de hijos inválida.");
    for (let index = children.length - 1; index >= 0; index -= 1) {
      stack.push({ value: children[index], depth: depth + 1 });
    }
  }
}

interface ZipEntryLike {
  dir?: boolean;
  _data?: { uncompressedSize?: number };
}

/** Usa el tamaño declarado en el directorio central antes de descomprimir. */
export function assertZipLimits(files: Record<string, ZipEntryLike>): void {
  const entries = Object.values(files);
  if (entries.length > IMPORT_LIMITS.zipEntries) {
    throw new Error(`El documento contiene más de ${IMPORT_LIMITS.zipEntries.toLocaleString("es-AR")} archivos internos.`);
  }
  let total = 0;
  for (const entry of entries) {
    if (entry.dir) continue;
    const size = entry._data?.uncompressedSize;
    if (typeof size !== "number" || !Number.isFinite(size) || size < 0) {
      throw new Error("No se pudo verificar el tamaño descomprimido del documento.");
    }
    total += size;
    if (total > IMPORT_LIMITS.zipUncompressedBytes) {
      throw new Error(`El documento supera el límite descomprimido de ${formatLimit(IMPORT_LIMITS.zipUncompressedBytes)}.`);
    }
  }
}

export function assertDocxXmlSize(xml: string): void {
  assertTextSize(xml, IMPORT_LIMITS.docxXmlBytes, "contenido XML del documento");
}
