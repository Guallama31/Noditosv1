import type { MindNode } from "../types";
import { createNode } from "./tree";

export interface PastedLine {
  level: number;
  text: string;
  isList: boolean;
  isNote: boolean;
}

/* ---------------- texto plano ---------------- */

// Viñetas de Word, LibreOffice, PDF y editores varios (●○▪■◦•‣, glifos de Symbol, etc.)
const BULLET_RE =
  /^[\s]*([●○◐◑▪▫■□◦•·∙‣⁃◊※★☆►▸‒–—-]|\[[ x]?\]|\((?:[x ])?\)|[0-9]{1,2}[.)]|[a-zA-Z][.)])\s+/;
const NOTE_RE = /^>\s?/;

function indentLevel(raw: string): number {
  let i = 0;
  for (const ch of raw) {
    if (ch === "\t") i += 1;
    else if (ch === " ") {
      i += 0.5;
    } else break;
  }
  return Math.floor(i);
}

export function parsePastedText(text: string): PastedLine[] {
  const out: PastedLine[] = [];
  for (const raw of text.split(/\r?\n/)) {
    if (!raw.trim()) continue;
    if (NOTE_RE.test(raw.trim())) {
      out.push({ level: indentLevel(raw), text: raw.trim().replace(NOTE_RE, "").trim(), isList: false, isNote: true });
      continue;
    }
    const level = indentLevel(raw);
    const stripped = raw.trimStart().replace(BULLET_RE, "").trim();
    const isList = BULLET_RE.test(raw.trimStart());
    // Tabuladores entre la viñeta y el texto también cuentan como profundidad
    // (Word los usa en las viñetas anidadas).
    const afterBullet = raw.trimStart().match(BULLET_RE)?.[0] ?? "";
    const innerTabs = (afterBullet.match(/\t/g) ?? []).length;
    if (out.length > 0) {
      const prev = out[out.length - 1];
      if (!prev.isList && prev.level === level && !NOTE_RE.test(prev.text) && out.length < 500) {
        prev.text += " " + (stripped || raw.trim());
        continue;
      }
    }
    out.push({ level: level + innerTabs, text: stripped || raw.trim(), isList, isNote: false });
  }
  return out;
}

/* ---------------- HTML (Word, Google Docs, web) ---------------- */

function cleanText(el: Element): string {
  return (el.textContent ?? "").replace(/\s+/g, " ").trim();
}

export function parsePastedHtml(html: string): PastedLine[] | null {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const body = doc.body;
  if (!body || body.children.length === 0) return null;

  const out: PastedLine[] = [];

  const headingLevel = (p: Element): number | null => {
    const tag = p.tagName;
    if (/^H[1-6]$/.test(tag)) return parseInt(tag[1], 10) - 1;
    const style = p.getAttribute("style") ?? "";
    const mso = style.match(/mso-outline-level:\s*(\d+)/i);
    if (mso) return Math.max(0, parseInt(mso[1], 10) - 1);
    const cls = (p.getAttribute("class") ?? "").toLowerCase();
    const cm = cls.match(/msoheading(\d)/i) ?? cls.match(/heading\s?(\d)/i) ?? cls.match(/titulo\s?(\d)/i);
    if (cm) return Math.max(0, parseInt(cm[1], 10) - 1);
    return null;
  };

  const listLevel = (el: Element): number | null => {
    const style = el.getAttribute("style") ?? "";
    const mso = style.match(/mso-list:\s*\w*\s*level(\d+)/i);
    if (mso) return parseInt(mso[1], 10) - 1;
    let level = 0;
    let node: Element | null = el;
    while (node && node !== body) {
      if (node.tagName === "UL" || node.tagName === "OL") level++;
      node = node.parentElement;
    }
    if (level > 0) return level - 1;
    const ml = style.match(/margin-left:\s*([\d.]+)pt/i);
    if (ml) return Math.min(8, Math.round(parseFloat(ml[1]) / 36));
    return null;
  };

  const walk = (root: Element) => {
    for (const child of Array.from(root.children)) {
      const tag = child.tagName;
      if (tag === "UL" || tag === "OL") {
        for (const li of Array.from(child.children)) {
          if (li.tagName !== "LI") continue;
          const lvl = listLevel(li) ?? 0;
          const text = cleanText(li);
          if (text) out.push({ level: lvl, text, isList: true, isNote: false });
          for (const sub of Array.from(li.children)) {
            if (sub.tagName === "UL" || sub.tagName === "OL") walk(sub);
          }
        }
        continue;
      }
      if (/^H[1-6]$/.test(tag)) {
        const text = cleanText(child);
        if (text) out.push({ level: headingLevel(child) ?? 0, text, isList: false, isNote: false });
        continue;
      }
      if (tag === "P" || tag === "DIV") {
        const hl = headingLevel(child);
        const text = cleanText(child);
        if (!text) continue;
        const lvl = listLevel(child);
        if (lvl !== null) {
          out.push({ level: lvl, text, isList: true, isNote: false });
        } else if (hl !== null) {
          out.push({ level: hl, text, isList: false, isNote: false });
        } else {
          // Un párrafo corto todo en negrita suele ser un título "de facto".
          const runs = Array.from(child.querySelectorAll("b, strong"));
          const bold =
            runs.length > 0 &&
            runs.every((r) => (r.textContent ?? "").trim().length > 0) &&
            runs.reduce((a, r) => a + (r.textContent ?? "").length, 0) >= text.length - 2;
          if (bold && text.length <= 90) {
            out.push({ level: 0, text, isList: false, isNote: false, });
            (out[out.length - 1] as PastedLine & { heading?: boolean }).heading = true;
          } else {
            out.push({ level: -1, text, isList: false, isNote: false });
          }
        }
        continue;
      }
      if (tag === "TABLE") {
        for (const row of Array.from(child.querySelectorAll("tr"))) {
          const cells = Array.from(row.querySelectorAll("td, th")).map(cleanText).filter(Boolean);
          if (cells.length) out.push({ level: 0, text: cells.join(" — "), isList: true, isNote: false });
        }
        continue;
      }
      walk(child);
    }
  };
  walk(body);
  return out.length > 0 ? out : null;
}

/* ---------------- construcción del árbol ---------------- */

/**
 * Convierte líneas en un árbol. Reglas:
 * - Las líneas con viñeta/nivel se anidan bajo la última línea de texto previa
 *   y entre sí según su sangría relativa.
 * - Las líneas de texto encadenan profundidad (título → subtítulo) hasta el
 *   primer grupo de viñetas; las siguientes vuelven a ese nivel.
 * - Las notas ("> …") se agregan al nodo anterior.
 * Devuelve un contenedor cuyos hijos son las raíces del resultado.
 */
export function buildPastedTree(items: PastedLine[]): MindNode {
  const container = createNode("");
  if (items.length === 0) return container;

  interface Frame {
    node: MindNode;
    level: number;
    isList: boolean;
    isHeading: boolean;
  }

  const stack: Frame[] = [{ node: container, level: -1, isList: false, isHeading: false }];
  let firstGroupLevel: number | null = null;
  let sawList = false;
  const minListLevel = items.filter((i) => i.isList).reduce((a, i) => Math.min(a, i.level), 9);

  for (const item of items) {
    if (item.isNote) {
      const top = stack[stack.length - 1];
      if (top.node !== container) {
        top.node.notes = top.node.notes ? `${top.node.notes}\n${item.text}` : item.text;
      }
      continue;
    }

    const heading = (item as PastedLine & { heading?: boolean }).heading === true;
    const isList = item.isList || item.level >= 0;
    let level = item.level;

    if (isList) {
      if (!sawList) {
        sawList = true;
        firstGroupLevel = stack.length - 1;
      }
      level = (firstGroupLevel ?? 0) + 1 + (item.level - minListLevel);
    } else if (heading) {
      // Los títulos vuelven al nivel base y abren una nueva rama.
      level = 0;
      while (stack.length - 1 > 0) stack.pop();
    } else {
      // Línea de texto simple: profundiza un nivel respecto del nodo anterior
      // (encadenado de esquema) o vuelve al nivel del primer grupo.
      if (sawList && firstGroupLevel !== null) {
        level = firstGroupLevel + 1;
        while (stack.length - 1 > level) stack.pop();
      } else {
        level = stack.length; // profundiza respecto del anterior
      }
    }

    while (stack.length - 1 > level) stack.pop();
    const parent = stack[stack.length - 1].node;
    const node = createNode(item.text);
    parent.children.push(node);
    stack.push({ node, level, isList, isHeading: heading });
  }
  return container;
}
