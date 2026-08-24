import type { MindNode } from "../types";
import { createNode } from "./tree";

const W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
const DC = "http://purl.org/dc/elements/1.1/";

interface RunInfo {
  text: string;
  bold: boolean;
}

type Item =
  | { kind: "heading"; level: number; text: string }
  | { kind: "list"; ilvl: number; text: string }
  | { kind: "para"; text: string };

/* ---------------- utilidades XML ---------------- */

function attr(el: Element | null, name: string): string | null {
  if (!el) return null;
  return el.getAttributeNS(W, name) ?? el.getAttribute(`w:${name}`);
}

function directChild(el: Element, local: string): Element | null {
  for (const c of Array.from(el.children)) {
    if (c.localName === local) return c;
  }
  return null;
}

function runsOf(p: Element): RunInfo[] {
  return Array.from(p.getElementsByTagNameNS(W, "r")).map((r) => {
    const parts = Array.from(r.getElementsByTagNameNS(W, "t")).map(
      (t) => t.textContent ?? "",
    );
    const tabs = r.getElementsByTagNameNS(W, "tab").length;
    const text = parts.join("") + (tabs ? " ".repeat(tabs) : "");
    const rPr = directChild(r, "rPr");
    const b = rPr ? directChild(rPr, "b") : null;
    const val = b ? attr(b, "val") : null;
    const bold = !!b && val !== "0" && val !== "false";
    return { text, bold };
  });
}

/* ---------------- clasificación de párrafos ---------------- */

/**
 * Convierte un párrafo w:p en un item con su rol jerárquico:
 * encabezado (por nivel de esquema, estilo Heading/Título o negrita),
 * viñeta numerada (con su nivel de sangría) o párrafo común.
 */
function classify(p: Element): Item | null {
  const runs = runsOf(p);
  const text = runs
    .map((r) => r.text)
    .join("")
    .trim();
  if (!text) return null;

  const pPr = directChild(p, "pPr");
  const styleEl = pPr ? directChild(pPr, "pStyle") : null;
  const style = attr(styleEl, "val");
  const outlineEl = pPr ? directChild(pPr, "outlineLvl") : null;
  const outline = outlineEl ? parseInt(attr(outlineEl, "val") ?? "", 10) : NaN;
  const numPr = pPr ? directChild(pPr, "numPr") : null;

  // 1) Encabezado por nivel de esquema (el más confiable).
  if (Number.isFinite(outline) && outline >= 0) {
    return { kind: "heading", level: Math.min(outline + 1, 9), text };
  }

  // 2) Encabezado por estilo (cubre plantillas en varios idiomas:
  //    Heading1, Ttulo1, Título1, berschrift1, Titre1…).
  if (style) {
    const m = style.match(
      /(?:heading|titulo|ttulo|berschrift|titre|encabezado)\s*([1-9])/i,
    );
    if (m) return { kind: "heading", level: parseInt(m[1], 10), text };
    if (/^(?:title|titulo|ttulo|título)$/i.test(style)) {
      return { kind: "heading", level: 1, text };
    }
  }

  // 3) Viñeta / numeración, con su nivel de sangría (ilvl).
  if (numPr) {
    const ilvlEl = directChild(numPr, "ilvl");
    const ilvl = Math.max(0, parseInt(attr(ilvlEl, "val") ?? "0", 10) || 0);
    return { kind: "list", ilvl: Math.min(ilvl, 8), text };
  }

  // 4) Pseudo-encabezado: párrafo corto escrito todo en negrita,
  //    el patrón típico de quien no usa estilos de título.
  const nonEmpty = runs.filter((r) => r.text.trim());
  const allBold = nonEmpty.length > 0 && nonEmpty.every((r) => r.bold);
  if (allBold && text.length <= 80 && !/[.。:;]$/.test(text)) {
    return { kind: "heading", level: -1, text };
  }

  return { kind: "para", text };
}

/* ---------------- tablas ---------------- */

/** Cada fila de la tabla se convierte en un nodo (celdas unidas con ·). */
function tableItems(tbl: Element): Item[] {
  return Array.from(tbl.getElementsByTagNameNS(W, "tr"))
    .map((tr) =>
      Array.from(tr.getElementsByTagNameNS(W, "tc"))
        .map((tc) =>
          Array.from(tc.getElementsByTagNameNS(W, "t"))
            .map((t) => t.textContent ?? "")
            .join("")
            .trim(),
        )
        .filter(Boolean)
        .join(" · "),
    )
    .filter(Boolean)
    .map((text) => ({ kind: "para", text }));
}

/* ---------------- armado del árbol ---------------- */

function buildTree(items: Item[], fallbackTitle: string): MindNode {
  const root = createNode("");
  // Pila de encabezados: la entrada 0 es la raíz (nivel 0).
  const stack: Array<{ level: number; node: MindNode }> = [
    { level: 0, node: root },
  ];
  let listStack: MindNode[] = [];
  let baseLevel: number | null = null;
  let lastHeadingLevel = 0;

  for (const item of items) {
    if (item.kind === "heading") {
      // Los pseudo-encabezados se ubican un nivel bajo el último encabezado.
      const raw =
        item.level === -1
          ? Math.min(lastHeadingLevel + 1, 6)
          : item.level;

      // El primer encabezado del documento pasa a ser el nodo raíz.
      if (baseLevel === null) {
        baseLevel = raw;
        root.text = item.text;
        lastHeadingLevel = 1;
        listStack = [];
        continue;
      }

      const eff = Math.max(1, raw - baseLevel + 1);
      while (stack.length > 1 && stack[stack.length - 1].level >= eff) {
        stack.pop();
      }
      const parent = stack[stack.length - 1].node;
      const node = createNode(item.text);
      parent.children.push(node);
      stack.push({ level: eff, node });
      lastHeadingLevel = eff;
      listStack = [];
      continue;
    }

    const section = stack[stack.length - 1].node;

    if (item.kind === "list") {
      const parent =
        item.ilvl === 0 ? section : (listStack[item.ilvl - 1] ?? section);
      const node = createNode(item.text);
      parent.children.push(node);
      listStack[item.ilvl] = node;
      listStack.length = item.ilvl + 1;
      continue;
    }

    // Párrafo común (o fila de tabla): hijo del encabezado actual.
    section.children.push(createNode(item.text));
    listStack = [];
  }

  if (!root.text.trim()) root.text = fallbackTitle || "Documento importado";
  return root;
}

/* ---------------- punto de entrada ---------------- */

/**
 * Lee un archivo .docx y lo convierte en un árbol de nodos:
 * encabezados → niveles, viñetas → hijos anidados por sangría,
 * párrafos y tablas → nodos hoja bajo su sección.
 */
export async function parseDocx(
  file: File,
): Promise<{ root: MindNode; title?: string }> {
  const { default: JSZip } = await import("jszip");

  let zip;
  try {
    zip = await JSZip.loadAsync(file);
  } catch {
    throw new Error("El archivo no parece un .docx válido de Word.");
  }

  const docFile = zip.file("word/document.xml");
  if (!docFile) {
    throw new Error("El .docx no contiene un documento Word reconocible.");
  }

  const xml = await docFile.async("text");
  const doc = new DOMParser().parseFromString(xml, "text/xml");
  if (doc.getElementsByTagName("parsererror").length > 0) {
    throw new Error("No se pudo interpretar el contenido del documento.");
  }
  const body = doc.getElementsByTagNameNS(W, "body")[0];
  if (!body) throw new Error("El documento no tiene contenido (body).");

  const items: Item[] = [];
  for (const child of Array.from(body.children)) {
    if (child.localName === "p") {
      const it = classify(child);
      if (it) items.push(it);
    } else if (child.localName === "tbl") {
      items.push(...tableItems(child));
    }
  }
  if (items.length === 0) {
    throw new Error("El documento no tiene texto para importar.");
  }

  // Título: la propiedad del documento si existe, si no el nombre del archivo.
  let title = file.name.replace(/\.docx$/i, "");
  const core = zip.file("docProps/core.xml");
  if (core) {
    try {
      const coreDoc = new DOMParser().parseFromString(
        await core.async("text"),
        "text/xml",
      );
      const t = coreDoc
        .getElementsByTagNameNS(DC, "title")[0]
        ?.textContent?.trim();
      if (t) title = t;
    } catch {
      /* sin propiedades: se usa el nombre del archivo */
    }
  }

  return { root: buildTree(items, title), title };
}
