import type { MindNode } from "../types";
import { countNodes, createNode, sanitizeNode } from "./tree";

export type ExportFormat = "mm" | "md" | "json" | "opml" | "txt" | "docx";

export interface FormatDef {
  id: ExportFormat;
  label: string;
  ext: string;
  mime: string;
  desc: string;
}

export const FORMATS: FormatDef[] = [
  { id: "mm", label: "Freeplane", ext: ".mm", mime: "application/x-freemind", desc: "Formato nativo de Freeplane: abre el archivo directamente y conserva jerarquía, notas, colores y plegado." },
  { id: "docx", label: "Word", ext: ".docx", mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", desc: "Documento Word real: la jerarquía se convierte en títulos y viñetas con el color de cada rama, y las notas aparecen como bloques destacados." },
  { id: "md", label: "Markdown", ext: ".md", mime: "text/markdown", desc: "Esquema con sangría por nivel. Las notas se incluyen como citas bajo su nodo." },
  { id: "txt", label: "Texto plano", ext: ".txt", mime: "text/plain", desc: "Esquema legible en cualquier editor, con sangría de árbol (├─ └─) y las notas de cada nodo incluidas." },
  { id: "json", label: "JSON", ext: ".json", mime: "application/json", desc: "Copia íntegra del árbol de Noditos: perfecta para reimportar sin perder absolutamente nada." },
  { id: "opml", label: "OPML", ext: ".opml", mime: "text/x-opml", desc: "Estándar de esquemas, compatible con Workflowy, Dynalist u OmniOutliner." },
];

export const IMPORT_ACCEPT = ".mm,.json,.opml,.xml,.docx";

/* ---------------- utilidades ---------------- */

function esc(v: string): string {
  return v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

export function slugify(title: string): string {
  const slug = title.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-+|-+$/g, "").toLowerCase();
  return slug || "mapa";
}

export function download(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  downloadBlob(filename, blob);
}

export function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 800);
}

export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      ta.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

/* ---------------- serialización ---------------- */

function notesToHtml(notes: string): string {
  return notes.split("\n").map((l) => `<p>${esc(l)}</p>`).join("");
}

function toMM(node: MindNode, depth: number): string {
  const ind = "  ".repeat(depth);
  const attrs = [`TEXT="${esc(node.text)}"`];
  if (node.collapsed && node.children.length > 0) attrs.push('FOLDED="true"');
  if (node.color) attrs.push(`COLOR="${esc(node.color)}"`);
  let inner = "";
  if (node.notes.trim()) inner += `${ind}  <richcontent TYPE="NOTE"><html><head></head><body>${notesToHtml(node.notes)}</body></html></richcontent>\n`;
  inner += node.children.map((c) => toMM(c, depth + 1)).join("");
  if (!inner) return `${ind}<node ${attrs.join(" ")} />\n`;
  return `${ind}<node ${attrs.join(" ")}>\n${inner}${ind}</node>\n`;
}

function metaParts(node: MindNode): string[] {
  const m = node.meta;
  if (!m) return [];
  const parts: string[] = [];
  if (m.taskDone) parts.push("tarea completada");
  if (m.status && m.status !== "none") parts.push(`estado: ${m.status}`);
  if (m.priority && m.priority !== "none") parts.push(`prioridad: ${m.priority}`);
  if (m.dueDate) parts.push(`vence: ${m.dueDate}`);
  if (m.assignee) parts.push(`responsable: ${m.assignee}`);
  if (m.progress !== undefined) parts.push(`progreso: ${m.progress}%`);
  if (m.tags?.length) parts.push(`etiquetas: ${m.tags.map((t) => `#${t}`).join(" ")}`);
  return parts;
}

function toMarkdown(node: MindNode, level: number): string {
  const ind = "  ".repeat(level);
  const checkbox = node.meta?.taskDone !== undefined ? (node.meta.taskDone ? "[x] " : "[ ] ") : "";
  let out = `${ind}- ${checkbox}${node.text.replace(/\n/g, `\n${ind}  `) || "(vacío)"}\n`;
  const meta = metaParts(node);
  if (meta.length) out += `${ind}  _${meta.join(" · ")}_\n`;
  if (node.image?.source === "url") out += `${ind}  ![${node.image.alt ?? node.text}](${node.image.src})\n`;
  if (node.notes.trim()) for (const l of node.notes.split("\n")) out += `${ind}  > ${l}\n`;
  for (const c of node.children) out += toMarkdown(c, level + 1);
  return out;
}

function toOPML(node: MindNode, depth: number): string {
  const ind = "  ".repeat(depth);
  const attrs = [`text="${esc(node.text)}"`];
  if (node.notes.trim()) attrs.push(`_note="${esc(node.notes)}"`);
  if (node.meta?.tags?.length) attrs.push(`_tags="${esc(node.meta.tags.join(","))}"`);
  if (node.meta?.status && node.meta.status !== "none") attrs.push(`_status="${esc(node.meta.status)}"`);
  if (node.meta?.priority && node.meta.priority !== "none") attrs.push(`_priority="${esc(node.meta.priority)}"`);
  if (node.meta?.dueDate) attrs.push(`_due="${esc(node.meta.dueDate)}"`);
  if (node.image?.source === "url") attrs.push(`_image="${esc(node.image.src)}"`);
  if (!node.children.length) return `${ind}<outline ${attrs.join(" ")} />\n`;
  return `${ind}<outline ${attrs.join(" ")}>\n${node.children.map((c) => toOPML(c, depth + 1)).join("")}${ind}</outline>\n`;
}

function txtNoteLines(notes: string, indent: string): string {
  return notes.split("\n").map((l, i) => (i === 0 ? `${indent}Nota: ${l}` : `${indent}      ${l}`)).join("\n") + "\n";
}

function toTXT(node: MindNode, prefix: string, connector: string, isLast: boolean): string {
  const checkbox = node.meta?.taskDone !== undefined ? (node.meta.taskDone ? "[x] " : "[ ] ") : "";
  let out = `${prefix}${connector}${checkbox}${node.text.trim() || "(sin texto)"}\n`;
  const childPrefix = prefix + (connector ? (isLast ? "   " : "│  ") : "");
  const meta = metaParts(node);
  if (meta.length) out += `${childPrefix}Meta: ${meta.join(" · ")}\n`;
  if (node.notes.trim()) out += txtNoteLines(node.notes, childPrefix);
  node.children.forEach((c, i) => {
    const last = i === node.children.length - 1;
    out += toTXT(c, childPrefix, last ? "└─ " : "├─ ", last);
  });
  return out;
}

export function serialize(format: ExportFormat, root: MindNode, title: string): string {
  switch (format) {
    case "mm":
      return `<?xml version="1.0" encoding="UTF-8"?>\n<map version="freeplane 1.9.0">\n${toMM(root, 1)}</map>\n`;
    case "md":
      return `# ${title || "Mapa de ideas"}\n\n${toMarkdown(root, 0)}`;
    case "json":
      return JSON.stringify({ app: "Noditos", version: 1, title, exportedAt: new Date().toISOString(), root }, null, 2);
    case "opml":
      return `<?xml version="1.0" encoding="UTF-8"?>\n<opml version="2.0">\n<head>\n  <title>${esc(title || "Mapa de ideas")}</title>\n</head>\n<body>\n${toOPML(root, 1)}</body>\n</opml>\n`;
    case "txt": {
      const labeled: MindNode = { ...root, text: root.text.trim() || title || "Mapa de ideas" };
      const total = countNodes(labeled);
      return `${toTXT(labeled, "", "", true)}\n— ${total} nodo${total === 1 ? "" : "s"} · exportado desde Noditos —\n`;
    }
    case "docx":
      // El .docx es binario (ver buildDocxBlob); como texto se muestra el esquema Markdown.
      return `# ${title || "Mapa de ideas"}\n\n${toMarkdown(root, 0)}`;
  }
}

/* ---------------- Word (.docx) ---------------- */

const hexToRgb = (hex: string) => hex.replace("#", "");

export async function buildDocxBlob(root: MindNode, title: string): Promise<Blob> {
  const {
    Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
    LevelFormat, convertInchesToTwip, BorderStyle,
  } = await import("docx");

  const hexToRgba = (hex: string, a: number) => {
    const h = hexToRgb(hex);
    const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
    const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    return `${Math.round(r * a + 255 * (1 - a)).toString(16).padStart(2, "0")}${Math.round(g * a + 255 * (1 - a)).toString(16).padStart(2, "0")}${Math.round(b * a + 255 * (1 - a)).toString(16).padStart(2, "0")}`;
  };

  const children: InstanceType<typeof Paragraph>[] = [];

  const walk = (node: MindNode, depth: number, inherited: string) => {
    const color = hexToRgb(node.color ?? inherited);
    const text = node.text.trim() || "(sin texto)";
    if (depth === 0) {
      children.push(new Paragraph({
        children: [new TextRun({ text: text || title || "Mapa de ideas", bold: true, size: 40, color: "33333D", font: "Calibri" })],
        spacing: { after: 240 },
      }));
    } else if (depth <= 3) {
      children.push(new Paragraph({
        heading: depth === 1 ? HeadingLevel.HEADING_1 : depth === 2 ? HeadingLevel.HEADING_2 : HeadingLevel.HEADING_3,
        children: [new TextRun({ text, color, bold: true })],
        spacing: { before: 200, after: 80 },
      }));
    } else {
      children.push(new Paragraph({
        children: [new TextRun({ text, color: "45454F" })],
        bullet: { level: Math.min(depth - 4, 4) },
        spacing: { after: 40 },
      }));
    }
    if (node.notes.trim()) {
      children.push(new Paragraph({
        children: [new TextRun({ text: node.notes.replace(/\n/g, "  ·  "), italics: true, color: "75757F", size: 20 })],
        indent: { left: convertInchesToTwip(0.3) },
        border: { left: { style: BorderStyle.SINGLE, size: 12, color: hexToRgba(node.color ?? inherited, 0.6) } },
        spacing: { after: 160 },
      }));
    }
    for (const c of node.children) walk(c, depth + 1, node.color ?? inherited);
  };
  walk(root, 0, "#B54A33");

  const doc = new Document({
    creator: "Noditos",
    title: title || "Mapa de ideas",
    description: "Exportado desde Noditos — editor de mapas de ideas",
    numbering: {
      config: [
        {
          reference: "noditos-bullets",
          levels: [0, 1, 2, 3, 4].map((level) => ({
            level,
            format: LevelFormat.BULLET,
            text: level === 0 ? "•" : "◦",
            alignment: AlignmentType.LEFT,
            style: { paragraph: { indent: { left: convertInchesToTwip(0.4 + level * 0.25), hanging: convertInchesToTwip(0.2) } } },
          })),
        },
      ],
    },
    sections: [{ properties: {}, children }],
  });
  return Packer.toBlob(doc);
}

/* ---------------- importación ---------------- */

function htmlToText(html: string): string {
  const withBreaks = html.replace(/<\/p>/gi, "\n").replace(/<br\s*\/?>/gi, "\n");
  const doc = new DOMParser().parseFromString(withBreaks, "text/html");
  return (doc.body.textContent ?? "").replace(/\n{3,}/g, "\n\n").trim();
}

function fromMMElement(el: Element): MindNode {
  let text = el.getAttribute("TEXT") ?? "";
  let notes = "";
  const children: MindNode[] = [];
  for (const child of Array.from(el.children)) {
    if (child.tagName === "richcontent") {
      const type = child.getAttribute("TYPE");
      if (type === "NODE" && !text) text = htmlToText(child.innerHTML);
      if (type === "NOTE") notes = htmlToText(child.innerHTML);
    } else if (child.tagName === "node") {
      children.push(fromMMElement(child));
    }
  }
  return createNode(text, { notes, color: el.getAttribute("COLOR"), collapsed: el.getAttribute("FOLDED") === "true" }, children);
}

function parseMM(content: string): { root: MindNode; title?: string } {
  const doc = new DOMParser().parseFromString(content, "text/xml");
  if (doc.getElementsByTagName("parsererror").length > 0) throw new Error("El archivo no es un XML válido.");
  const nodeEl = doc.getElementsByTagName("node")[0];
  if (!nodeEl) throw new Error("No se encontró ningún nodo en el archivo .mm");
  return { root: sanitizeNode(fromMMElement(nodeEl)) };
}

function fromOutline(el: Element): MindNode {
  const children = Array.from(el.children).filter((c) => c.tagName === "outline").map(fromOutline);
  const tags = (el.getAttribute("_tags") ?? "").split(",").map((t) => t.trim()).filter(Boolean);
  const imageUrl = el.getAttribute("_image");
  return createNode(
    el.getAttribute("text") ?? "",
    {
      notes: el.getAttribute("_note") ?? el.getAttribute("note") ?? "",
      meta: tags.length ? { tags } : null,
      image: imageUrl ? { src: imageUrl, aspect: 16 / 9, source: "url" } : null,
      kind: imageUrl ? "image" : "idea",
    },
    children,
  );
}

function parseOPML(content: string): { root: MindNode; title?: string } {
  const doc = new DOMParser().parseFromString(content, "text/xml");
  if (doc.getElementsByTagName("parsererror").length > 0) throw new Error("El archivo no es un OPML válido.");
  const outlineEl = doc.getElementsByTagName("outline")[0];
  if (!outlineEl) throw new Error("El OPML no contiene ningún esquema.");
  const title = doc.getElementsByTagName("title")[0]?.textContent?.trim() || undefined;
  return { root: sanitizeNode(fromOutline(outlineEl)), title };
}

function parseJSON(content: string): { root: MindNode; title?: string } {
  let obj: unknown;
  try {
    obj = JSON.parse(content);
  } catch {
    throw new Error("El JSON no se pudo interpretar.");
  }
  const record = (obj ?? {}) as Record<string, unknown>;
  const rawRoot = (record.root ?? record) as Record<string, unknown>;
  if (typeof rawRoot !== "object" || rawRoot === null || !("children" in rawRoot)) {
    throw new Error("El JSON no tiene estructura de mapa de Noditos.");
  }
  const title = typeof record.title === "string" && record.title ? record.title : undefined;
  return { root: sanitizeNode(rawRoot), title };
}

export function parseFile(filename: string, content: string): { root: MindNode; title?: string } {
  const name = filename.toLowerCase();
  if (name.endsWith(".json")) return parseJSON(content);
  if (name.endsWith(".opml")) return parseOPML(content);
  if (name.endsWith(".mm") || name.endsWith(".xml")) return parseMM(content);
  const t = content.trim();
  if (t.startsWith("{")) return parseJSON(content);
  if (/<opml/i.test(t)) return parseOPML(content);
  if (/<map/i.test(t)) return parseMM(content);
  throw new Error("Formato no reconocido. Usá archivos .mm, .json, .opml o .docx.");
}

/* ---------------- importación de Word ---------------- */

interface DocxLine {
  level: number; // -1 = párrafo suelto
  text: string;
  isHeading: boolean;
}

function parseDocxXml(xml: string): DocxLine[] {
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  const W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
  const lines: DocxLine[] = [];

  const paraText = (p: Element): string =>
    Array.from(p.getElementsByTagNameNS(W, "t")).map((t) => t.textContent ?? "").join("");

  const paraLevel = (p: Element): { level: number; isHeading: boolean } => {
    const pPr = p.getElementsByTagNameNS(W, "pPr")[0];
    if (!pPr) return { level: -1, isHeading: false };
    const styleId = pPr.getElementsByTagNameNS(W, "pStyle")[0]?.getAttributeNS(W, "val") ?? "";
    const hMatch = styleId.match(/^(?:heading|titulo|title|berschrift|titre)\s?(\d)$/i) ?? styleId.match(/^h(\d)$/i);
    const outlineLvl = pPr.getElementsByTagNameNS(W, "outlineLvl")[0]?.getAttributeNS(W, "val");
    if (hMatch) return { level: Math.max(0, parseInt(hMatch[1], 10) - 1), isHeading: true };
    if (outlineLvl !== null && outlineLvl !== undefined) return { level: parseInt(outlineLvl, 10), isHeading: true };
    const numPr = pPr.getElementsByTagNameNS(W, "numPr")[0];
    if (numPr) {
      const ilvl = numPr.getElementsByTagNameNS(W, "ilvl")[0]?.getAttributeNS(W, "val");
      return { level: ilvl ? parseInt(ilvl, 10) : 0, isHeading: false };
    }
    return { level: -1, isHeading: false };
  };

  const body = doc.getElementsByTagNameNS(W, "body")[0];
  if (!body) return lines;
  for (const el of Array.from(body.children)) {
    if (el.localName === "p") {
      const text = paraText(el).trim();
      if (!text) continue;
      const { level, isHeading } = paraLevel(el);
      lines.push({ level, text, isHeading });
    } else if (el.localName === "tbl") {
      for (const row of Array.from(el.getElementsByTagNameNS(W, "tr"))) {
        const cells = Array.from(row.getElementsByTagNameNS(W, "tc")).map(paraText).map((t) => t.trim()).filter(Boolean);
        if (cells.length) lines.push({ level: 0, text: cells.join(" — "), isHeading: false });
      }
    }
  }
  return lines;
}

export async function parseDocxFile(file: File): Promise<{ root: MindNode; title?: string }> {
  const JSZip = (await import("jszip")).default;
  let zip;
  try {
    zip = await JSZip.loadAsync(file);
  } catch {
    throw new Error("El archivo no parece un .docx válido.");
  }
  const docXml = await zip.file("word/document.xml")?.async("string");
  if (!docXml) throw new Error("El .docx no contiene un documento legible.");
  const lines = parseDocxXml(docXml);
  if (lines.length === 0) throw new Error("El documento no tiene texto.");

  // Convertir a PastedLine: encabezados y viñetas conservan su nivel real.
  const items = lines.map((l) => ({
    level: l.isHeading ? l.level : l.level >= 0 ? l.level + 1 : -1,
    text: l.text,
    isList: l.level >= 0 && !l.isHeading,
    isNote: false,
    ...(l.isHeading ? { heading: true } : {}),
  }));
  const { buildPastedTree } = await import("./paste");
  const tree = buildPastedTree(items);
  const children = tree.children;
  if (children.length === 0) throw new Error("No se pudo extraer contenido del documento.");

  let title: string | undefined;
  const coreXml = await zip.file("docProps/core.xml")?.async("string");
  if (coreXml) {
    const m = coreXml.match(/<dc:title>([^<]*)<\/dc:title>/);
    if (m && m[1].trim()) title = m[1].trim();
  }

  // Si hay una única raíz, úsala como raíz del mapa; si no, el nombre del archivo.
  if (children.length === 1) {
    return { root: children[0], title: title ?? children[0].text.trim().slice(0, 60) };
  }
  return { root: createNode(title ?? "Documento importado", {}, children), title };
}

/** Punto de entrada único: detecta el formato por extensión/contenido. */
export async function parseAnyFile(file: File): Promise<{ root: MindNode; title?: string }> {
  if (file.name.toLowerCase().endsWith(".docx")) return parseDocxFile(file);
  const text = await file.text();
  return parseFile(file.name, text);
}
