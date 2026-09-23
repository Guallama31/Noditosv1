export type AiMapAction =
  | { type: "updateText"; nodeId?: string; text: string }
  | { type: "addChild"; parentId?: string; text: string }
  | { type: "addChildren"; parentId?: string; texts: string[] }
  | { type: "updateNotes"; nodeId?: string; notes: string }
  | { type: "deleteNode"; nodeId: string }
  | { type: "reorderChildren"; parentId: string; orderedIds: string[] }
  | { type: "moveNode"; nodeId: string; targetId: string }
  | { type: "toggleCollapse"; nodeId: string };

function normalizeActionType(value: unknown): string {
  return String(value ?? "")
    .trim()
    .replace(/[\s_-]+/g, "")
    .toLowerCase();
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map((entry) => String(entry)) : [];
}

function getField(obj: Record<string, unknown>, ...names: string[]): unknown {
  for (const name of names) {
    if (name in obj) return obj[name];
  }
  return undefined;
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function normalizeAction(entry: unknown): AiMapAction | null {
  const obj = (entry ?? {}) as Record<string, unknown>;
  const type = normalizeActionType(obj.type);
  if (!type) return null;

  const nodeId = optionalString(getField(obj, "nodeId", "node_id", "node-id"));
  const parentId = optionalString(getField(obj, "parentId", "parent_id", "parent-id"));
  const targetId = getField(obj, "targetId", "target_id", "target-id");
  const orderedIds = getField(obj, "orderedIds", "ordered_ids", "ordered-ids");

  if (type === "updatetext") {
    return { type: "updateText", nodeId, text: String(obj.text ?? "") };
  }
  if (type === "addchild") {
    return { type: "addChild", parentId, text: String(obj.text ?? "") };
  }
  if (type === "addchildren") {
    return { type: "addChildren", parentId, texts: asStringArray(obj.texts) };
  }
  if (type === "updatenotes") {
    return { type: "updateNotes", nodeId, notes: String(obj.notes ?? "") };
  }
  if (type === "deletenode") {
    return { type: "deleteNode", nodeId: String(nodeId ?? "") };
  }
  if (type === "reorderchildren") {
    return { type: "reorderChildren", parentId: String(parentId ?? ""), orderedIds: asStringArray(orderedIds) };
  }
  if (type === "movenode") {
    return { type: "moveNode", nodeId: String(nodeId ?? ""), targetId: String(targetId ?? "") };
  }
  if (type === "togglecollapse") {
    return { type: "toggleCollapse", nodeId: String(nodeId ?? "") };
  }
  return null;
}

/**
 * Interpreta acciones JSON devueltas por un modelo.
 * Acepta { actions: [...] }, un array directo o una acción individual, con tipos
 * camelCase, snake_case o kebab-case para que la integración sea tolerante.
 */
export function parseStructuredActionReply(raw: string): AiMapAction[] | null {
  const text = (raw ?? "").trim();
  if (!text) return null;

  const candidates: string[] = [];
  const stripped = text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  candidates.push(stripped);

  const jsonLike = stripped.match(/\{[\s\S]*\}/);
  if (jsonLike) candidates.push(jsonLike[0]);
  const arrayLike = stripped.match(/\[[\s\S]*\]/);
  if (arrayLike) candidates.push(arrayLike[0]);

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate) as unknown;
      const record = (parsed ?? {}) as Record<string, unknown>;
      const actions = Array.isArray(parsed)
        ? parsed
        : Array.isArray(record.actions)
          ? record.actions
          : record && typeof record === "object" && "type" in record
            ? [record]
            : null;

      if (!actions) continue;
      const normalized = actions
        .map(normalizeAction)
        .filter((action): action is AiMapAction => Boolean(action));

      if (normalized.length) return normalized;
    } catch {
      // intenta con el siguiente candidato
    }
  }

  return null;
}
