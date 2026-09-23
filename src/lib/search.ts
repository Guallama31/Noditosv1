import type { MindNode, NodeKind } from "../types";

export interface SearchOptions {
  includeText: boolean;
  includeNotes: boolean;
  includeTags: boolean;
  kind: NodeKind | "all";
  due: "all" | "overdue" | "today" | "upcoming";
}

export interface SearchResult {
  node: MindNode;
  path: MindNode[];
  matches: Array<"texto" | "notas" | "etiquetas" | "fecha">;
}

export const DEFAULT_SEARCH_OPTIONS: SearchOptions = {
  includeText: true,
  includeNotes: true,
  includeTags: true,
  kind: "all",
  due: "all",
};

function fold(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function isToday(date: Date, now = new Date()): boolean {
  return date.toDateString() === now.toDateString();
}

function dueMatches(value: string | undefined, mode: SearchOptions["due"]): boolean {
  if (mode === "all") return true;
  if (!value) return false;
  const due = new Date(value.length === 10 ? `${value}T23:59:59` : value);
  if (Number.isNaN(due.getTime())) return false;
  const now = new Date();
  if (mode === "today") return isToday(due, now);
  if (mode === "overdue") return due.getTime() < now.getTime() && !isToday(due, now);
  if (mode === "upcoming") return due.getTime() >= now.getTime();
  return true;
}

export function searchNodes(root: MindNode, rawQuery: string, options: SearchOptions = DEFAULT_SEARCH_OPTIONS): SearchResult[] {
  const query = fold(rawQuery.trim());
  const results: SearchResult[] = [];
  const walk = (node: MindNode, path: MindNode[]) => {
    const currentPath = [...path, node];
    const matches: SearchResult["matches"] = [];
    const kindOk = options.kind === "all" || node.kind === options.kind;
    const dueOk = dueMatches(node.meta?.dueDate, options.due);

    if (kindOk && dueOk) {
      if (query) {
        if (options.includeText && fold(node.text).includes(query)) matches.push("texto");
        if (options.includeNotes && fold(node.notes).includes(query)) matches.push("notas");
        if (options.includeTags && node.meta?.tags?.some((tag) => fold(tag).includes(query))) matches.push("etiquetas");
      } else if (options.due !== "all") {
        matches.push("fecha");
      }
    }

    if (matches.length > 0) results.push({ node, path: currentPath, matches });
    node.children.forEach((child) => walk(child, currentPath));
  };
  walk(root, []);
  return results;
}

export function pathLabel(path: MindNode[]): string {
  return path.map((node) => node.text.trim() || "Idea").join(" › ");
}
