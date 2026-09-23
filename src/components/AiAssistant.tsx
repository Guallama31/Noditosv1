import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import {
  ArrowDownWideNarrow,
  BookOpen,
  Bot,
  Copy,
  Crosshair,
  FileText,
  Files,
  HelpCircle,
  Languages,
  ListTree,
  Loader2,
  PenLine,
  RotateCcw,
  Scale,
  Send,
  Sparkles,
  StickyNote,
  Trash2,
  Wand2,
  X,
  type LucideIcon,
} from "lucide-react";
import type { MindNode, NotifyFn } from "../types";
import type { MindMapApi } from "../hooks/useMindMap";
import type { AiConfig, OutlineItem, QAItem } from "../lib/ai";
import {
  askAi,
  isAiConfigured,
  mapToCompactText,
  parseIndexGroups,
  parseIndexList,
  parseOutline,
  parseQA,
  parseSuggestionList,
  PROVIDERS,
} from "../lib/ai";
import { copyText } from "../lib/formats";
import { countNodes, createNode, findNode, sanitizeNode } from "../lib/tree";
import { ErrorBoundary } from "./ErrorBoundary";

const LANGS = [
  { code: "en", name: "Inglés" },
  { code: "pt", name: "Portugués" },
  { code: "fr", name: "Francés" },
  { code: "de", name: "Alemán" },
  { code: "it", name: "Italiano" },
];

export type AiAssistantHandle = {
  openTool: (toolId: string) => void;
};

export const AI_TOOL_DEFS: Array<{
  id: string;
  label: string;
  title: string;
  icon: LucideIcon;
}> = [
  { id: "suggest", label: "Subnodos", title: "Sugerir subnodos para el nodo actual", icon: Wand2 },
  { id: "improve", label: "Mejorar", title: "Reescribir el texto del nodo", icon: PenLine },
  { id: "structure", label: "Estructurar", title: "Convertir texto en nodos jerárquicos", icon: ListTree },
  { id: "translate", label: "Traducir", title: "Traducir esta rama o nodo", icon: Languages },
  { id: "summarize", label: "Resumir", title: "Generar un resumen del mapa o rama", icon: FileText },
  { id: "explain", label: "Explicar", title: "Explicar esta idea en palabras simples", icon: BookOpen },
  { id: "questions", label: "Preguntas", title: "Generar preguntas y respuestas", icon: HelpCircle },
  { id: "reorder", label: "Priorizar", title: "Ordenar subnodos por prioridad", icon: ArrowDownWideNarrow },
  { id: "critic", label: "Crítico", title: "Hacer un análisis crítico", icon: Scale },
  { id: "dupes", label: "Duplicados", title: "Buscar nodos duplicados", icon: Files },
];

type MsgKind =
  | "suggestions"
  | "rewrite"
  | "outline"
  | "summary"
  | "explain"
  | "questions"
  | "translate"
  | "reorder"
  | "critic"
  | "duplicates"
  | "error"
  | undefined;

interface DupNode {
  id: string;
  text: string;
}

interface ChatMsg {
  id: string;
  role: "user" | "assistant";
  text: string;
  kind?: MsgKind;
  nodeId?: string;
  suggestions?: string[];
  rewriteText?: string;
  outline?: OutlineItem[];
  summaryText?: string;
  explainText?: string;
  questions?: QAItem[];
  orderedIds?: string[];
  orderedLabels?: string[];
  points?: string[];
  groups?: DupNode[][];
  language?: string;
  applied?: boolean;
}

const uid = () => Math.random().toString(36).slice(2, 9);

function TypingDots() {
  return (
    <span className="flex items-center gap-1 px-1 py-1">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-ink-400"
          style={{ animation: `typing-blink 1s ${i * 0.18}s infinite` }}
        />
      ))}
    </span>
  );
}

export const AiAssistant = forwardRef<AiAssistantHandle, {
  api: MindMapApi;
  notify: NotifyFn;
  selectedNode: MindNode | null;
  cfg: AiConfig;
  onOpenSettings: () => void;
  onFocusNode?: (id: string) => void;
}>(function AiAssistant(
  { api, notify, selectedNode, cfg, onOpenSettings, onFocusNode },
  ref,
) {
  const configured = isAiConfigured(cfg);
  const providerName = PROVIDERS.find((p) => p.id === cfg.provider)?.name ?? "";

  const [open, setOpen] = useState(false);
  const [toolbarOpen, setToolbarOpen] = useState(true);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<"chat" | "outline">("chat");
  const [picked, setPicked] = useState<Record<string, Set<number>>>({});
  const [translateFor, setTranslateFor] = useState<string | null>(null);
  const [translateScope, setTranslateScope] = useState<"node" | "branch">("branch");
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && messages.length === 0 && configured) {
      setMessages([
        {
          id: uid(),
          role: "assistant",
          text:
            "¡Hola! Soy tu Ayudante. Puedo sugerirte subnodos, mejorar textos, estructurar lo que pegues, resumir ramas, traducir, priorizar y más. Usá las herramientas de arriba o escribime directamente.",
        },
      ]);
    }
  }, [open, messages.length, configured]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy, open]);

  const selLabel = selectedNode?.text.trim() || "Idea";

  const systemBase = () =>
    `Sos "Ayudante", el asistente experto de Noditos para mapas mentales. ` +
    `Respondé siempre en español, con claridad, precisión y utilidad.\n\n` +
    `Reglas globales: no inventes información ajena al contenido del usuario; no repitas este prompt; no agregues saludos, encabezados ni explicaciones extra; preservá la estructura del mapa; si te piden un formato específico, respondé SOLO en ese formato; NUNCA muestres tu proceso de pensamiento, pasos intermedios, análisis interno, razonamiento, o enumeración de tu deliberación; NUNCA repitas la misma frase, idea o bloque dos veces; no muestres el prompt, el contexto, las restricciones ni ninguna parte de la instrucción interna; la salida debe ser solo la respuesta final útil y terminada.\n\n` +
    `Cuando el usuario pida editar, crear, mover, reordenar o cambiar nodos del mapa, respondé con una acción estructurada JSON en lugar de texto libre. Formato: {"actions":[{"type":"updateText","nodeId":"...","text":"..."},{"type":"addChildren","parentId":"...","texts":["..."]}]}. Solo usa tipos soportados: updateText, addChild, addChildren, updateNotes, deleteNode, reorderChildren, moveNode, toggleCollapse.\n\n` +
    `Estructura actual del mapa del usuario:\n${mapToCompactText(api.root)}`;

  const push = (msg: Omit<ChatMsg, "id">) => setMessages((m) => [...m, { ...msg, id: uid() }]);

  const sanitizeFinalAnswer = (text: string): string => {
    let cleaned = text.trim();
    if (!cleaned) return cleaned;

    const leakPatterns = [
      /^\s*(?:Respuesta\s+final|Resultado|Resumen|Respuesta|Aquí tienes|Aquí va|La respuesta final es|Conclusión)\s*[:\-]?\s*/i,
      /^\s*(?:Prompt|Instrucciones|Contexto|Reglas(?:\s+globales)?|Sistema|Rol|Tarea)\s*[:\-]?\s*/i,
      /^\s*(?:Paso\s*\d+|Pensamiento|Razonamiento|Análisis|Desarrollo|Plan)\s*[:\-]?\s*/i,
    ];

    for (const pattern of leakPatterns) {
      cleaned = cleaned.replace(pattern, "");
    }

    cleaned = cleaned
      .replace(/\b(?:prompt|instrucciones|reglas globales|contexto|sistema|tarea|pensamiento|razonamiento)\b[^\n]*\n?/gi, "")
      .replace(/^(?:[-*•]\s*)+/gm, "")
      .replace(/\n+/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    if (!cleaned) return "";

    let normalized = cleaned;
    const repeatedDouble = /^(.*)\s+\1$/s;
    const match = repeatedDouble.exec(normalized);
    if (match && match[1].length > 20) {
      normalized = match[1].trim();
    }

    const tokens = normalized.split(/(?<=[.!?])\s+/).filter(Boolean);
    const deduped: string[] = [];
    for (const token of tokens) {
      const current = token.trim();
      if (!current) continue;
      const prev = deduped[deduped.length - 1]?.trim();
      if (prev && prev.toLowerCase() === current.toLowerCase()) continue;
      deduped.push(current);
    }

    const result = deduped.join(" ").trim();
    return result || normalized;
  };

  type AiMapAction =
    | { type: "updateText"; nodeId?: string; text: string }
    | { type: "addChild"; parentId?: string; text: string }
    | { type: "addChildren"; parentId?: string; texts: string[] }
    | { type: "updateNotes"; nodeId?: string; notes: string }
    | { type: "deleteNode"; nodeId: string }
    | { type: "reorderChildren"; parentId: string; orderedIds: string[] }
    | { type: "moveNode"; nodeId: string; targetId: string }
    | { type: "toggleCollapse"; nodeId: string };

  const parseStructuredActionReply = (raw: string): AiMapAction[] | null => {
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
        const parsed = JSON.parse(candidate);
        const actions = Array.isArray(parsed)
          ? parsed
          : Array.isArray(parsed?.actions)
            ? parsed.actions
            : parsed && typeof parsed === "object" && (parsed as any).type
              ? [parsed]
              : null;

        if (!actions) continue;
        const normalized = actions
          .map((entry: any) => {
            const type = String(entry?.type ?? "").trim().toLowerCase();
            if (!type) return null;

            if (type === "updateText") {
              return { type: "updateText", nodeId: entry.nodeId, text: String(entry.text ?? "") };
            }
            if (type === "addChild") {
              return { type: "addChild", parentId: entry.parentId, text: String(entry.text ?? "") };
            }
            if (type === "addChildren") {
              const texts = Array.isArray(entry.texts) ? entry.texts.map((v: unknown) => String(v)) : [];
              return { type: "addChildren", parentId: entry.parentId, texts };
            }
            if (type === "updateNotes") {
              return { type: "updateNotes", nodeId: entry.nodeId, notes: String(entry.notes ?? "") };
            }
            if (type === "deleteNode") {
              return { type: "deleteNode", nodeId: String(entry.nodeId ?? "") };
            }
            if (type === "reorderChildren") {
              const orderedIds = Array.isArray(entry.orderedIds) ? entry.orderedIds.map((v: unknown) => String(v)) : [];
              return { type: "reorderChildren", parentId: String(entry.parentId ?? ""), orderedIds };
            }
            if (type === "moveNode") {
              return { type: "moveNode", nodeId: String(entry.nodeId ?? ""), targetId: String(entry.targetId ?? "") };
            }
            if (type === "toggleCollapse") {
              return { type: "toggleCollapse", nodeId: String(entry.nodeId ?? "") };
            }
            return null;
          })
          .filter((v: AiMapAction | null): v is AiMapAction => Boolean(v));

        if (normalized.length) return normalized;
      } catch {
        // intentar siguiente candidato
      }
    }

    return null;
  };

  const normalizeMapRef = (value?: string): string | undefined => {
    const raw = (value ?? "").trim();
    if (!raw) return undefined;
    const normalized = raw.toLowerCase();
    if (["root", "raiz", "raíz", "rootid", "root_id", "la raiz", "la raíz"].includes(normalized)) {
      return api.root.id;
    }
    return raw;
  };

  const executeMapActions = (actions: AiMapAction[]) => {
    for (const action of actions) {
      try {
        if (action.type === "updateText") {
          const targetId = normalizeMapRef(action.nodeId) ?? selectedNode?.id ?? api.root.id;
          if (targetId) api.updateText(targetId, action.text);
          continue;
        }
        if (action.type === "addChild") {
          const parentId = normalizeMapRef(action.parentId) ?? selectedNode?.id ?? api.root.id;
          if (action.text.trim()) api.addManyChildren(parentId, [action.text.trim()]);
          continue;
        }
        if (action.type === "addChildren") {
          const parentId = normalizeMapRef(action.parentId) ?? selectedNode?.id ?? api.root.id;
          const texts = (action.texts ?? []).map((t) => t.trim()).filter(Boolean);
          if (texts.length) api.addManyChildren(parentId, texts);
          continue;
        }
        if (action.type === "updateNotes") {
          const targetId = normalizeMapRef(action.nodeId) ?? selectedNode?.id ?? api.root.id;
          if (targetId) api.updateNotes(targetId, action.notes);
          continue;
        }
        if (action.type === "deleteNode") {
          const targetId = normalizeMapRef(action.nodeId);
          if (targetId && targetId !== api.root.id) api.deleteNode(targetId);
          continue;
        }
        if (action.type === "reorderChildren") {
          const parentId = normalizeMapRef(action.parentId);
          if (parentId && action.orderedIds.length) api.reorderChildren(parentId, action.orderedIds);
          continue;
        }
        if (action.type === "moveNode") {
          const nodeId = normalizeMapRef(action.nodeId);
          const targetId = normalizeMapRef(action.targetId);
          if (nodeId && targetId && nodeId !== targetId) api.moveNode(nodeId, targetId);
          continue;
        }
        if (action.type === "toggleCollapse") {
          const targetId = normalizeMapRef(action.nodeId);
          if (targetId) api.toggleCollapse(targetId);
        }
      } catch {
        // silenciar acción inválida
      }
    }
  };

  const parseNaturalMapCommand = (text: string): AiMapAction[] | null => {
    const input = (text ?? "").trim();
    if (!input) return null;

    const lower = input.toLowerCase();
    const targetNode = selectedNode ?? api.root;
    const targetId = targetNode?.id ?? api.root.id;

    const maybeTextAfter = (prefixes: RegExp[], fallback = input) => {
      for (const reg of prefixes) {
        const match = fallback.match(reg);
        if (match?.[1]) return match[1].trim();
      }
      return fallback.trim();
    };

    if (/(agrega|añade|suma|crear|crea|nueva|sumale)/i.test(lower) && /(subnodo|hijo|debajo|bajo|rama)/i.test(lower)) {
      const valueText = maybeTextAfter([
        /(?:agrega|añade|suma|sumale|crear|crea|nueva)\s+(?:subnodo|hijo|rama|nodo)?\s*(?:debajo|bajo|al nodo|al padre)?\s*(?:de|del)?\s*(?:este\s+nodo|este|el\s+nodo)?\s*(?:[:\-]\s*)?(.*)$/i,
        /(?:agrega|añade|suma|sumale)\s*(.*)$/i,
      ]);
      const values = valueText
        .split(/[\n,;•\-]/)
        .map((v) => v.replace(/^\s*[-*•]\s*/, "").trim())
        .filter(Boolean)
        .slice(0, 10);
      if (values.length) return [{ type: "addChildren", parentId: targetId, texts: values }];
    }

    if (/(actualiza|cambia|renombra|edita|llama|nombra|cambia el texto|reemplaza)/i.test(lower) && /(nodo|texto|este|este nodo)/i.test(lower)) {
      const value = maybeTextAfter([
        /(?:actualiza|cambia|renombra|edita|llama|nombra|reemplaza)\s+(?:este\s+nodo|el\s+nodo|este|el\s+texto|este\s+texto|el\s+texto\s+del\s+nodo)?\s*(?:por|a|como|en|=)?\s*(.*)$/i,
        /(?:actualiza|cambia|renombra|edita|llama|nombra|reemplaza)\s*(.*)$/i,
      ], input.replace(/^(?:yo\s+quiero|quiero)\s+/i, ""));
      if (value && value.length > 1 && value !== targetNode.text.trim()) {
        return [{ type: "updateText", nodeId: targetId, text: value }];
      }
    }

    if (/(reordena|orden[a|á]|prioriz[a|á]|pon estos|colocalos)/i.test(lower) && /(subnodo|hijo|nodos|orden)/i.test(lower)) {
      const childTexts = (targetNode.children ?? []).map((child) => child.text.trim()).filter(Boolean);
      if (childTexts.length > 1) {
        const listCandidate = input
          .replace(/^(?:reordena|ordena|prioriza|priorit[a|á]|pon|coloca)\s+/i, "")
          .replace(/^(?:los|estos|subnodos|hijos)\s+/i, "")
          .replace(/\b(?:por\s+prioridad|por\s+orden|seg[úu]n|como)\b.*$/i, "")
          .replace(/^[\s:;\-]+/, "");

        const orderFromText = listCandidate
          .split(/[\n,;•\-]/)
          .map((item) => item.replace(/^\s*[-*•]\s*/, "").trim())
          .filter(Boolean);

        if (orderFromText.length) {
          const orderedIds = orderFromText
            .map((label) => targetNode.children.find((child) => child.text.trim().toLowerCase() === label.toLowerCase())?.id)
            .filter((id): id is string => Boolean(id));

          if (orderedIds.length) {
            return [{ type: "reorderChildren", parentId: targetId, orderedIds }];
          }
        }
      }
    }

    if (/(elimina|borra|borrar|quita)/i.test(lower) && /(nodo|este|éste|este nodo)/i.test(lower)) {
      return [{ type: "deleteNode", nodeId: targetId }];
    }

    if (/(colaps|expand)/i.test(lower) && /(nodo|este|éste|rama|hijo)/i.test(lower)) {
      return [{ type: "toggleCollapse", nodeId: targetId }];
    }

    if (/(nota|anota|apunta|guardar nota|guarda nota)/i.test(lower)) {
      const payload = maybeTextAfter([
        /(?:nota|anota|apunta|guardar nota|guarda nota)\s*(?:sobre|de|del|al|en)?\s*(?:este\s+nodo|este|el\s+nodo|al\s+nodo)?\s*(?:[:\-]\s*)?(.*)$/i,
        /(?:nota|anota|apunta|guardar nota|guarda nota)\s*(.*)$/i,
      ]);
      if (payload && payload.length > 1) return [{ type: "updateNotes", nodeId: targetId, notes: payload }];
    }

    if (/(cual|qué|como|why)/i.test(lower) && !/(subnodo|hijo|orden|editar|agregar)/i.test(lower)) {
      return null;
    }

    return null;
  };

  const hasVisibleDuplication = (text: string): boolean => {
    const compact = sanitizeFinalAnswer(text).replace(/\s+/g, " ").trim();
    if (!compact || compact.length < 40) return false;

    const promptLeak = /(prompt|instrucci[oó]n|reglas globales|contexto|tarea|proceso de pensamiento|pasos intermedios|razonamiento)/i;
    if (promptLeak.test(compact)) return true;

    const repeatedDouble = /^(.*)\s+\1$/s;
    if (repeatedDouble.test(compact)) return true;

    const sentences = compact.split(/(?<=[.!?])\s+/).filter(Boolean);
    if (sentences.length >= 2) {
      const last = sentences[sentences.length - 1].toLowerCase();
      for (let i = 0; i < sentences.length - 1; i++) {
        if (sentences[i].toLowerCase() === last) return true;
      }
    }

    const half = Math.floor(compact.length / 2);
    for (let size = Math.max(20, half); size > 20; size--) {
      const candidate = compact.slice(0, size);
      if (candidate.length < 25) continue;
      if (compact.slice(size).includes(candidate)) return true;
    }

    for (let i = 1; i < sentences.length; i++) {
      if (sentences[i - 1].toLowerCase() === sentences[i].toLowerCase()) return true;
    }

    return false;
  };

  const runWithRetry = async (
    userText: string,
    system: string,
    user: string,
    build: (reply: string) => Omit<ChatMsg, "id"> & { id?: string },
    attempts = 2,
  ) => {
    let last: string | null = null;

    for (let attempt = 0; attempt < attempts; attempt++) {
      const reply = await askAi(cfg, system, user);
      last = reply;
      if (!hasVisibleDuplication(reply)) {
        const safeReply = sanitizeFinalAnswer(reply);
        try {
          const built = build(safeReply);
          setMessages((m) => [...m, { ...built, id: built.id ?? uid() }]);
          return;
        } catch {
          setMessages((m) => [
            ...m,
            {
              id: uid(),
              role: "assistant",
              kind: "error",
              text: "Recibí una respuesta, pero no pude interpretarla. Probá de nuevo.",
            },
          ]);
          return;
        }
      }

      if (attempt < attempts - 1) {
        // Reintento reforzado: pedimos una respuesta nueva y compacta, sin repetición.
        const retrySystem =
          system +
          `\n\nIMPORTANTE: Tu respuesta anterior estaba duplicada. Reescribí la respuesta final desde cero, sin repetir ninguna frase ni bloque. ` +
          `Entregá SOLO la respuesta final, compacta y no duplicada.`;
        const retryUser = user + `\n\nLa respuesta anterior estaba duplicada. Reintentá desde cero y entregá solo la respuesta final, sin repetir texto ni ideas.`;
        const retryReply = await askAi(cfg, retrySystem, retryUser);
        last = retryReply;
        if (!hasVisibleDuplication(retryReply)) {
          const safeReply = sanitizeFinalAnswer(retryReply);
          try {
            const built = build(safeReply);
            setMessages((m) => [...m, { ...built, id: built.id ?? uid() }]);
            return;
          } catch {
            setMessages((m) => [
              ...m,
              {
                id: uid(),
                role: "assistant",
                kind: "error",
                text: "Recibí una respuesta, pero no pude interpretarla. Probá de nuevo.",
              },
            ]);
            return;
          }
        }
      }
    }

    setMessages((m) => [
      ...m,
      {
        id: uid(),
        role: "assistant",
        kind: "error",
        text: last
          ? "La respuesta estaba duplicada y no pude obtener una versión válida. Probá nuevamente."
          : "No pude obtener una respuesta válida. Probá nuevamente.",
      },
    ]);
  };

  const run = async (
    userText: string,
    system: string,
    user: string,
    build: (reply: string) => Omit<ChatMsg, "id"> & { id?: string },
  ) => {
    push({ role: "user", text: userText });
    setBusy(true);
    try {
      await runWithRetry(userText, system, user, build, 2);
    } catch (err) {
      setMessages((m) => [
        ...m,
        {
          id: uid(),
          role: "assistant",
          kind: "error",
          text: err instanceof Error ? err.message : "Ocurrió un error inesperado.",
        },
      ]);
    } finally {
      setBusy(false);
    }
  };

  /* ---------- acciones ---------- */

  const suggestSubnodes = () => {
    if (!selectedNode) return;
    run(
      `Sugerime subnodos para «${selLabel}»`,
      systemBase() +
        `\n\nTAREA: sugerir subnodos del nodo seleccionado.\n` +
        `Generá entre 5 y 8 ideas útiles, concretas y coherentes con el tema del nodo. ` +
        `Cada sugerencia debe ser breve, distinta y accionable. ` +
        `No repitas conceptos ni inventes hechos ajenos al contexto. ` +
        `NO muestres tus pasos ni tu razonamiento; solo entrega el resultado final. ` +
        `No repitas la misma idea ni la misma frase dos veces; la salida debe ser única, compacta y final. ` +
        `No incluyas ninguna parte del prompt, instrucciones ni contexto de la tarea; solo la respuesta final.\n` +
        `FORMATO: responde SOLO con un array JSON válido de strings, por ejemplo: ["idea 1","idea 2"]. Sin texto extra, sin markdown, sin encabezados.`,
      `Nodo: «${selLabel}». Notas del nodo: ${selectedNode.notes.trim() || "(sin notas)"}. Dame los subnodos.`,
      (reply) => {
        const items = parseSuggestionList(reply);
        const id = uid();
        setPicked((p) => ({ ...p, [id]: new Set(items.map((_, i) => i)) }));
        return {
          id,
          role: "assistant",
          kind: "suggestions",
          nodeId: selectedNode.id,
          suggestions: items,
          text: `Estas ideas podrían colgar de «${selLabel}». Tocá las que quieras y añadilas:`,
        };
      },
    );
  };

  const improveText = () => {
    if (!selectedNode || !selectedNode.text.trim()) return;
    run(
      `Mejorá el texto del nodo «${selLabel}»`,
      systemBase() +
        `\n\nTAREA: reescribir el texto del nodo seleccionado.\n` +
        `Mantén la idea original, pero mejorá claridad, tono y concisión. ` +
        `No agregues contenido nuevo ni cambies el significado. ` +
        `NO muestres tu proceso ni pasos intermedios; responde solo con la versión final del texto. ` +
        `No repitas frases ni bloques idénticos; la respuesta debe aparecer una sola vez. ` +
        `No incluyas el prompt, las reglas ni la tarea en la salida; solo el texto final.\n` +
        `FORMATO: responde SOLO con el texto corregido, sin comillas, sin prefijos, sin explicación adicional.`,
      `Texto actual del nodo: ${selectedNode.text}`,
      (reply) => ({
        role: "assistant",
        kind: "rewrite",
        nodeId: selectedNode.id,
        rewriteText: reply,
        text: "Propuesta de redacción:",
      }),
    );
  };

  const structureText = (raw: string) => {
    const lineCount = raw.split("\n").filter((l) => l.trim()).length;
    const targetId = selectedNode?.id ?? api.root.id;
    run(
      `Estructurar texto (${lineCount} líneas)`,
      systemBase() +
        `\n\nTAREA: convertir texto libre en estructura jerárquica del mapa.\n` +
        `Identificá ideas principales, subideas y relaciones de dependencia. ` +
        `Usá level 0 para la idea principal y valores mayores para subnodos. ` +
        `No inventes contenido: solo organiza lo que el usuario envió. ` +
        `NO muestres tu razonamiento ni pasos de análisis; responde solo con el esquema final. ` +
        `No repitas la misma idea o la misma línea; entrega un esquema único y limpio. ` +
        `No incluyas nada del prompt, ninguna regla ni texto de instrucciones; solo el esquema final.\n` +
        `FORMATO: responde SOLO con un array JSON válido de objetos del tipo [{"level":0,"text":"Idea principal"},{"level":1,"text":"Subidea"}]. Sin texto extra, sin markdown, sin bloque de código.`,
      raw,
      (reply) => ({
        role: "assistant",
        kind: "outline",
        nodeId: targetId,
        outline: parseOutline(reply),
        text: `Así organizaría ese contenido. ¿Lo creo como nodos bajo «${
          selectedNode ? selLabel : api.root.text.trim() || "Idea central"
        }»?`,
      }),
    );
    setMode("chat");
  };

  /* ---------- herramientas de análisis ---------- */

  const summarize = () => {
    const target = selectedNode ?? api.root;
    const label = target.text.trim() || "el mapa";
    run(
      `Resumir «${label}»`,
      systemBase() +
        `\n\nTAREA: resumir la rama o nodo indicado.\n` +
        `Extraé los puntos más importantes, las conclusiones y la idea central. ` +
        `El resumen debe ser breve, útil y directo, en 2 a 4 frases o en una lista muy corta de puntos clave. ` +
        `NO describas tu proceso de pensamiento ni tus pasos intermedios; entrega solo el resumen final. ` +
        `No repitas frases ni vuelvas a decir lo mismo de otra manera. ` +
        `No incluyas ninguna parte del prompt ni de la instrucción; solo el resumen final.\n` +
        `FORMATO: responde SOLO con el resumen, sin título, sin saludos, sin introducción y sin texto extra.`,
      `Rama a resumir:\n${mapToCompactText(target)}`,
      (reply) => ({
        role: "assistant",
        kind: "summary",
        nodeId: target.id,
        summaryText: reply,
        text: `Resumen de «${label}»:`,
      }),
    );
  };

  const explain = () => {
    if (!selectedNode || !selectedNode.text.trim()) return;
    run(
      `Explicar «${selLabel}»`,
      systemBase() +
        `\n\nTAREA: explicar la idea seleccionada con lenguaje simple.\n` +
        `Explicá la idea central de forma clara, didáctica y breve. ` +
        `Usá un tono accesible y práctico, como si estuvieras explicándoselo a alguien que no conoce el tema. ` +
        `Máximo 4 o 5 oraciones. ` +
        `NO expliques tu razonamiento ni los pasos que usaste; solo da la explicación final. ` +
        `No repitas la misma idea dos veces ni vuelvas a decir la misma frase. ` +
        `No incluyas ninguna línea del prompt ni la tarea; solo la explicación final.\n` +
        `FORMATO: responde SOLO con la explicación, sin título, sin introducción y sin texto extra.`,
      `Concepto: ${selectedNode.text}`,
      (reply) => ({
        role: "assistant",
        kind: "explain",
        nodeId: selectedNode.id,
        explainText: reply,
        text: `Explicación de «${selLabel}»:`,
      }),
    );
  };

  const questions = () => {
    const target = selectedNode ?? api.root;
    const label = target.text.trim() || "el mapa";
    run(
      `Preguntas de estudio sobre «${label}»`,
      systemBase() +
        `\n\nTAREA: generar preguntas de estudio con respuestas.\n` +
        `Basándote en la rama indicada, generá entre 5 y 8 preguntas útiles y respuestas breves, precisas y fieles al contenido. ` +
        `No inventes datos ajenos ni hagas suposiciones. ` +
        `NO muestres tu razonamiento, pasos o análisis; entrega solo las preguntas y respuestas finales. ` +
        `No repitas preguntas ni respuestas iguales; la salida debe ser única y compacta. ` +
        `No incluyas el prompt ni ninguna instrucción interna; solo el resultado final.\n` +
        `FORMATO: responde SOLO con un array JSON válido de objetos del tipo [{"q":"pregunta","a":"respuesta"}] y nada más.`,
      `Rama:\n${mapToCompactText(target)}`,
      (reply) => ({
        role: "assistant",
        kind: "questions",
        questions: parseQA(reply),
        text: `Preguntas de estudio sobre «${label}»:`,
      }),
    );
  };

  const startTranslate = () => {
    const target = selectedNode ?? api.root;
    setTranslateFor(target.id);
    // Por defecto se traduce la rama completa si el nodo tiene hijos.
    setTranslateScope(target.children.length > 0 ? "branch" : "node");
  };

  const translateTo = (lang: string) => {
    const id = translateFor;
    const scope = translateScope;
    setTranslateFor(null);
    if (!id) return;
    const target = findNode(api.root, id) ?? api.root;
    const label = target.text.trim() || "el mapa";

    const formatRule =
      `Respondé ÚNICAMENTE con un array JSON válido de objetos {"level":numero,"text":"...","notes":"..."}. ` +
      `Escapá las comillas internas como \\". Sin texto adicional, sin bloques de código, sin markdown.`;

    if (scope === "node") {
      // Solo el nodo elegido: su texto y sus notas.
      run(
        `Traducir el nodo «${label}» al ${lang}`,
        systemBase() +
          `\n\nTraducí ÚNICAMENTE el nodo indicado (su texto y sus notas) al ${lang}. ` +
          `Devolvé un array con un solo objeto donde "level" es 0, "text" es el texto traducido y "notes" son las notas traducidas (o "" si no tiene). ` +
          formatRule,
        `Nodo: ${target.text.trim() || "(sin texto)"}\nNotas: ${target.notes.trim() || "(sin notas)"}`,
        (reply) => ({
          role: "assistant",
          kind: "translate",
          nodeId: target.id,
          outline: parseOutline(reply),
          language: lang,
          text: `Traducción de «${label}» al ${lang}:`,
        }),
      );
      return;
    }

    // Nodo y todos sus hijos: la rama completa con la información asociada.
    run(
      `Traducir «${label}» y sus subnodos al ${lang}`,
      systemBase() +
        `\n\nTAREA: traducir una rama completa al ${lang}.\n` +
        `Conservá exactamente la jerarquía, la cantidad de nodos y el orden del árbol. ` +
        `Cada nodo debe conservar su nivel y traducirse de forma natural al idioma destino. ` +
        `Traducí también las notas de cada nodo cuando existan. ` +
        `NO incluyas pasos de razonamiento ni explicaciones del proceso; responde solo con el resultado traducido final. ` +
        `No repitas frases ni bloques idénticos en la salida.\n` +
        formatRule +
        ` Ejemplo: [{"level":0,"text":"Launch","notes":""},{"level":1,"text":"Research","notes":"Key sources"}]`,
      mapToCompactText(target, 150, true),
      (reply) => ({
        role: "assistant",
        kind: "translate",
        nodeId: target.id,
        outline: parseOutline(reply),
        language: lang,
        text: `Traducción de «${label}» y sus subnodos al ${lang}:`,
      }),
    );
  };

  const reorder = () => {
    if (!selectedNode || selectedNode.children.length < 2) return;
    const kids = selectedNode.children;
    const list = kids.map((c, i) => `${i}: ${c.text.trim() || "(sin texto)"}`).join("\n");
    run(
      `Priorizar subnodos de «${selLabel}»`,
      systemBase() +
        `\n\nTAREA: priorizar los subnodos por importancia.\n` +
        `Ordená los subnodos de más a menos relevantes según impacto, urgencia y valor para la idea principal. ` +
        `No repitas índices ni agregues elementos nuevos. ` +
        `NO muestres tus pasos de deliberación; responde solo con la priorización final. ` +
        `La salida debe ser única y sin duplicados.\n` +
        `FORMATO: responde SOLO con un array JSON válido de índices numéricos, por ejemplo [2,0,1]. Sin texto extra, sin markdown.`,
      `Subnodos:\n${list}`,
      (reply) => {
        const order = parseIndexList(reply, kids.length);
        return {
          role: "assistant",
          kind: "reorder",
          nodeId: selectedNode.id,
          orderedIds: order.map((i) => kids[i].id),
          orderedLabels: order.map((i) => kids[i].text.trim() || "(sin texto)"),
          text: `Orden sugerido por prioridad para «${selLabel}»:`,
        };
      },
    );
  };

  const critic = () => {
    const target = selectedNode ?? api.root;
    const label = target.text.trim() || "el mapa";
    run(
      `Análisis crítico de «${label}»`,
      systemBase() +
        `\n\nTAREA: hacer un análisis crítico de la idea o rama.\n` +
        `Señalá 3 a 6 debilidades, riesgos, supuestos no validados o puntos ciegos. ` +
        `Sé directo, honesto y constructivo; no inventes datos ajenos. ` +
        `NO muestres tu proceso de análisis ni pasos de pensamiento; entrega solo la crítica final. ` +
        `No repitas puntos ni frases idénticas.\n` +
        `FORMATO: responde SOLO con un array JSON de strings breves, por ejemplo ["Falta evidencia","Supuesto no validado"]. Sin texto extra, sin markdown.`,
      `Rama a analizar:\n${mapToCompactText(target)}`,
      (reply) => ({
        role: "assistant",
        kind: "critic",
        points: parseSuggestionList(reply),
        text: `Puntos críticos de «${label}»:`,
      }),
    );
  };

  const duplicates = () => {
    const flat: DupNode[] = [];
    const walk = (n: MindNode) => {
      const t = n.text.trim();
      if (t) flat.push({ id: n.id, text: t });
      n.children.forEach(walk);
    };
    walk(api.root);
    if (flat.length < 2) {
      notify("El mapa necesita al menos 2 nodos con texto", "info");
      return;
    }
    const list = flat.map((n, i) => `${i}: ${n.text}`).join("\n");
    run(
      "Detectar nodos duplicados",
      systemBase() +
        `\n\nTAREA: detectar nodos duplicados o casi duplicados.\n` +
        `Revisá la lista de nodos y agrupá los que sean equivalentes o casi equivalentes, aunque varíen ligeramente en redacción. ` +
        `No marques como duplicados ideas distintas con enfoques diferentes. ` +
        `NO muestres tu razonamiento ni análisis interno; responde solo con el resultado final. ` +
        `No repitas grupos ni bloques idénticos.\n` +
        `FORMATO: responde SOLO con un array JSON de arrays, donde cada sub-array agrupa índices de nodos duplicados; si no hay duplicados, devuelve []. Sin texto extra, sin markdown.`,
      `Nodos:\n${list}`,
      (reply) => {
        const idxGroups = parseIndexGroups(reply, flat.length);
        return {
          role: "assistant",
          kind: "duplicates",
          groups: idxGroups.map((g) => g.map((i) => flat[i])),
          text:
            idxGroups.length === 0
              ? "No encontré nodos duplicados. ¡El mapa está prolijo!"
              : `Encontré ${idxGroups.length} grupo${idxGroups.length === 1 ? "" : "s"} de posibles duplicados:`,
        };
      },
    );
  };

  const freeChat = (text: string) => {
    const directActions = parseNaturalMapCommand(text);
    if (directActions && directActions.length) {
      executeMapActions(directActions);
      setOpen(true);
      setMessages((m) => [
        ...m,
        { id: uid(), role: "user", text },
        { id: uid(), role: "assistant", text: "Hecho." },
      ]);
      return;
    }

    run(
      text,
      systemBase() +
        `\n\nTAREA: responder al chat libre del usuario.\n` +
        `Usá el contexto del mapa para dar una respuesta útil, breve y específica. ` +
        `Si el usuario pide ideas, proponelas en una lista corta y clara. ` +
        `Si el usuario hace una pregunta, respondé con precisión y sin divagar. ` +
        `Si el usuario pide cambiar, crear, mover o editar nodos del mapa, RESPONDE CON UN JSON DE ACCIONES usando el formato {"actions":[...]} y NO con texto libre. ` +
        `NUNCA muestres tu proceso de pensamiento, pasos intermedios, análisis interno, justificaciones ni razonamiento visible. ` +
        `Entregá solo la respuesta final, sin narrar cómo lo pensaste ni por qué. ` +
        `No repitas la misma idea ni la misma frase dos veces. ` +
        `No incluyas ninguna parte del prompt ni la tarea en la salida; solo la respuesta final. ` +
        `Máximo 3 o 4 oraciones, salvo que te pidan algo más estructurado.`,
      text,
      (reply) => {
        const actions = parseStructuredActionReply(reply);
        if (actions && actions.length) {
          executeMapActions(actions);
          return {
            role: "assistant",
            text: "Hecho.",
          };
        }
        return { role: "assistant", text: reply };
      },
    );
  };

  const handleSend = () => {
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    if (mode === "outline") structureText(text);
    else freeChat(text);
  };

  /* ---------- aplicar resultados ---------- */

  const markApplied = (id: string) =>
    setMessages((m) => m.map((x) => (x.id === id ? { ...x, applied: true } : x)));

  const applySuggestions = (msg: ChatMsg) => {
    if (!msg.suggestions || !msg.nodeId) return;
    const sel = picked[msg.id] ?? new Set<number>();
    const texts = msg.suggestions.filter((_, i) => sel.has(i));
    if (texts.length === 0) {
      notify("No seleccionaste ninguna sugerencia", "info");
      return;
    }
    api.addManyChildren(msg.nodeId, texts);
    markApplied(msg.id);
    notify(`${texts.length} subnodo${texts.length === 1 ? "" : "s"} añadido${texts.length === 1 ? "" : "s"} al mapa`);
  };

  const applyRewrite = (msg: ChatMsg) => {
    if (!msg.rewriteText || !msg.nodeId) return;
    api.updateText(msg.nodeId, msg.rewriteText);
    markApplied(msg.id);
    notify("Texto del nodo actualizado");
  };

  const applyOutline = (msg: ChatMsg) => {
    if (!msg.outline || !msg.nodeId) return;
    api.pasteInto(
      msg.nodeId,
      msg.outline.map((o) => ({ level: o.level, text: o.text, isList: true, isNote: false })),
    );
    markApplied(msg.id);
    notify(`${msg.outline.length} nodos creados en el mapa`);
  };

  const doCopy = async (text: string, what: string) => {
    const ok = await copyText(text);
    notify(ok ? `${what} copiado al portapapeles` : "No se pudo copiar", ok ? "success" : "error");
  };

  const saveAsNote = (msg: ChatMsg, text: string) => {
    if (!msg.nodeId) return;
    const node = findNode(api.root, msg.nodeId);
    const existing = node?.notes.trim() ?? "";
    api.updateNotes(msg.nodeId, existing ? `${existing}\n\n${text}` : text);
    markApplied(msg.id);
    notify("Guardado como nota del nodo");
  };

  const applyReorder = (msg: ChatMsg) => {
    if (!msg.nodeId || !msg.orderedIds) return;
    api.reorderChildren(msg.nodeId, msg.orderedIds);
    markApplied(msg.id);
    notify("Subnodos reordenados por prioridad");
  };

  /**
   * Convierte el esquema traducido en un árbol real. A diferencia del pegado de
   * texto, los niveles son explícitos y confiables, así que se construye de
   * forma directa y determinística (sin heurísticas que puedan fallar).
   */
  const outlineToTree = (outline: OutlineItem[]): MindNode[] => {
    const roots: MindNode[] = [];
    const stack: Array<{ node: MindNode; level: number }> = [];
    for (const item of outline) {
      const node = createNode(item.text.trim(), {
        notes: item.notes?.trim() || "",
      });
      while (stack.length && stack[stack.length - 1].level >= item.level) stack.pop();
      if (stack.length === 0) roots.push(node);
      else stack[stack.length - 1].node.children.push(node);
      stack.push({ node, level: item.level });
    }
    return roots;
  };

  const applyTranslate = (msg: ChatMsg) => {
    if (!msg.outline || !msg.nodeId) return;
    const valid = msg.outline.filter(
      (o) => o && typeof o.text === "string" && o.text.trim().length > 0,
    );
    if (valid.length === 0) {
      notify("La traducción no trajo nodos para crear", "error");
      return;
    }
    try {
      const branches = outlineToTree(valid);
      if (branches.length === 0) {
        notify("No se pudo crear la rama traducida", "error");
        return;
      }
      let anchor = msg.nodeId;
      let created = 0;
      for (const branch of branches) {
        // sanitizeNode garantiza todos los campos y evita nodos malformados.
        api.insertBranch(anchor, sanitizeNode(branch));
        anchor = branch.id;
        created += countNodes(branch);
      }
      markApplied(msg.id);
      notify(`Rama traducida creada (${created} nodos)`);
    } catch {
      notify("No se pudo crear la rama traducida", "error");
    }
  };

  const togglePick = (msgId: string, idx: number) =>
    setPicked((p) => {
      const next = new Set(p[msgId] ?? []);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return { ...p, [msgId]: next };
    });

  /* ---------- barra de herramientas ---------- */

  const openTool = (toolId: string) => {
    setToolbarOpen(true);
    setOpen(true);
    switch (toolId) {
      case "suggest":
        suggestSubnodes();
        break;
      case "improve":
        improveText();
        break;
      case "structure":
        setMode("outline");
        break;
      case "translate":
        startTranslate();
        break;
      case "summarize":
        summarize();
        break;
      case "explain":
        explain();
        break;
      case "questions":
        questions();
        break;
      case "reorder":
        reorder();
        break;
      case "critic":
        critic();
        break;
      case "dupes":
        duplicates();
        break;
      default:
        break;
    }
  };

  useImperativeHandle(ref, () => ({ openTool }), [openTool]);

  const triggerTool = (fn: () => void) => () => {
    setToolbarOpen(true);
    setOpen(true);
    fn();
  };

  const tools = [
    { id: "suggest", label: "Subnodos", icon: Wand2, onClick: triggerTool(suggestSubnodes), disabled: busy || !selectedNode, title: selectedNode ? `Sugerir subnodos para «${selLabel}»` : "Seleccioná un nodo primero" },
    { id: "improve", label: "Mejorar", icon: PenLine, onClick: triggerTool(improveText), disabled: busy || !selectedNode || !selectedNode.text.trim(), title: selectedNode ? "Reescribir el texto del nodo" : "Seleccioná un nodo con texto" },
    { id: "structure", label: "Estructurar", icon: ListTree, onClick: triggerTool(() => { setMode("outline"); }), disabled: busy, title: "Pegar un texto y convertirlo en nodos" },
    { id: "translate", label: "Traducir", icon: Languages, onClick: triggerTool(startTranslate), disabled: busy, title: selectedNode ? `Traducir «${selLabel}» a otro idioma` : "Traducir todo el mapa" },
    { id: "summarize", label: "Resumir", icon: FileText, onClick: triggerTool(summarize), disabled: busy, title: selectedNode ? `Resumir «${selLabel}»` : "Resumir todo el mapa" },
    { id: "explain", label: "Explicar", icon: BookOpen, onClick: triggerTool(explain), disabled: busy || !selectedNode || !selectedNode.text.trim(), title: selectedNode ? `Desarrollar una explicación de «${selLabel}»` : "Seleccioná un nodo con texto" },
    { id: "questions", label: "Preguntas", icon: HelpCircle, onClick: triggerTool(questions), disabled: busy, title: selectedNode ? `Preguntas de estudio sobre «${selLabel}»` : "Preguntas de estudio sobre el mapa" },
    { id: "reorder", label: "Priorizar", icon: ArrowDownWideNarrow, onClick: triggerTool(reorder), disabled: busy || !selectedNode || selectedNode.children.length < 2, title: selectedNode && selectedNode.children.length >= 2 ? "Reordenar los subnodos por prioridad" : "Seleccioná un nodo con al menos 2 subnodos" },
    { id: "critic", label: "Crítico", icon: Scale, onClick: triggerTool(critic), disabled: busy, title: selectedNode ? `Análisis crítico de «${selLabel}»` : "Análisis crítico del mapa" },
    { id: "dupes", label: "Duplicados", icon: Files, onClick: triggerTool(duplicates), disabled: busy, title: "Detectar nodos duplicados en todo el mapa" },
  ];

  return (
    <>
      {toolbarOpen && configured && (
        <div
          className="absolute bottom-4 z-20 flex items-center gap-1 rounded-full border border-ink-700 bg-ink-900/95 px-1.5 py-1 shadow-lg shadow-ink-950/40 backdrop-blur-sm transition-all duration-200"
          style={{ right: "5.75rem" }}
        >
          {tools.map((tool) => {
            const Icon = tool.icon;
            return (
              <button
                key={tool.id}
                onClick={tool.onClick}
                disabled={tool.disabled}
                title={tool.title}
                className="flex items-center gap-1 rounded-full border border-ink-600 bg-ink-800 px-1.5 py-0.5 text-[9.5px] font-bold text-ink-200 transition hover:border-brand hover:text-brand disabled:pointer-events-none disabled:opacity-35"
              >
                <Icon size={9.5} />
                {tool.label}
              </button>
            );
          })}
          <button
            onClick={() => setToolbarOpen(false)}
            title="Plegar barra del asistente"
            className="grid h-5 w-5 place-items-center rounded-full border border-ink-600 bg-ink-800 text-ink-300 transition hover:border-brand hover:text-brand"
            aria-label="Plegar barra del asistente"
          >
            <X size={9} />
          </button>
        </div>
      )}

      {!toolbarOpen && configured && (
        <button
          onClick={() => setToolbarOpen(true)}
          title="Mostrar herramientas del asistente"
          className="group absolute bottom-4 z-20 grid h-9 w-9 place-items-center rounded-lg border border-ink-700 bg-ink-900 text-brand shadow-lg shadow-ink-950/40 transition-all duration-200 hover:scale-105"
          style={{ right: "4.9rem" }}
          aria-label="Mostrar herramientas del asistente"
        >
          <Wand2 size={16} />
          <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-ink-900 px-2 py-0.5 text-[9px] font-bold text-brand opacity-0 shadow-lg transition group-hover:opacity-100">
            Herramientas
          </span>
        </button>
      )}

      {/* aviso: no configurado */}
      {open && !configured && (
        <div className="pop-in absolute bottom-[4.6rem] right-4 z-40 flex w-[min(23.5rem,calc(100%-2rem))] flex-col overflow-hidden rounded-2xl border border-ink-700 bg-ink-900 shadow-2xl shadow-ink-950/50">
          <div className="flex items-center justify-between border-b border-ink-700/70 px-4 py-3">
            <div className="flex items-center gap-2.5">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand text-white">
                <Bot size={17} />
              </span>
              <p className="font-display text-[14px] font-bold text-white">Ayudante</p>
            </div>
            <button onClick={() => setOpen(false)} aria-label="Cerrar" className="rounded-md p-1.5 text-ink-400 transition hover:bg-ink-800 hover:text-ink-200">
              <X size={16} />
            </button>
          </div>
          <div className="px-5 py-6">
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-brand/15 text-brand">
              <Sparkles size={26} />
            </span>
            <h3 className="mt-4 text-center font-display text-[16px] font-bold text-white">Todavía no estoy configurado</h3>
            <p className="mt-2 text-center text-[13px] leading-relaxed text-ink-300">
              Para conversar conmigo necesitás conectar un proveedor de IA. Podés usar una clave
              gratuita de <strong className="text-ink-100">Gemini</strong>,{" "}
              <strong className="text-ink-100">OpenAI</strong> o <strong className="text-ink-100">Groq</strong>,
              o correr un modelo 100% local con <strong className="text-ink-100">Ollama</strong>.
            </p>
            <button
              onClick={() => {
                setOpen(false);
                onOpenSettings();
              }}
              className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-[13px] font-bold text-white shadow-lg shadow-brand/20 transition hover:brightness-105 active:translate-y-px"
            >
              <Wand2 size={15} />
              Configurar el Ayudante
            </button>
            <p className="mt-3 text-center text-[11px] text-ink-500">La clave se guarda solo en este navegador.</p>
          </div>
        </div>
      )}

      {/* panel de chat (con límite de errores: un fallo del Ayudante nunca apaga la app) */}
      {open && configured && (
        <ErrorBoundary
          fallback={(err) => (
            <div className="pop-in absolute bottom-[4.6rem] right-4 z-40 w-[min(23.5rem,calc(100%-2rem))] overflow-hidden rounded-2xl border border-ink-700 bg-ink-900 shadow-2xl">
              <div className="px-5 py-6 text-center">
                <p className="font-display text-[15px] font-bold text-white">El Ayudante se trabó</p>
                <p className="mt-2 break-words text-[12px] text-ink-400">{err.message}</p>
                <div className="mt-4 flex justify-center gap-2">
                  <button
                    onClick={() => window.location.reload()}
                    className="flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-[12px] font-bold text-white"
                  >
                    <RotateCcw size={12} />
                    Reintentar
                  </button>
                  <button
                    onClick={() => setOpen(false)}
                    className="rounded-lg border border-ink-600 px-3 py-1.5 text-[12px] font-bold text-ink-300"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            </div>
          )}
        >
          <div className="pop-in absolute bottom-[4.6rem] right-4 z-40 flex h-[min(34rem,calc(100%-6.5rem))] w-[min(23.5rem,calc(100%-2rem))] flex-col overflow-hidden rounded-2xl border border-ink-700 bg-ink-900 shadow-2xl shadow-ink-950/50">
            <div className="flex items-center justify-between border-b border-ink-700/70 px-4 py-3">
              <div className="flex items-center gap-2.5">
                <span className="relative grid h-8 w-8 place-items-center rounded-lg bg-brand text-white">
                  <Bot size={17} />
                  <span className="pulse-dot absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-ink-900 bg-ok" />
                </span>
                <div className="leading-none">
                  <p className="font-display text-[14px] font-bold text-white">Ayudante</p>
                  <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-400">{providerName}</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => setMessages([])} title="Limpiar conversación" className="rounded-md p-1.5 text-ink-400 transition hover:bg-ink-800 hover:text-ink-200">
                  <Trash2 size={14} />
                </button>
                <button onClick={() => setOpen(false)} title="Cerrar" className="rounded-md p-1.5 text-ink-400 transition hover:bg-ink-800 hover:text-ink-200">
                  <X size={15} />
                </button>
              </div>
            </div>

            {translateFor && (
                <div className="space-y-2 border-t border-ink-700/50 bg-ink-950/40 px-3 py-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold text-ink-300">¿Qué traducir?</span>
                    <button onClick={() => setTranslateFor(null)} aria-label="Cancelar traducción" className="rounded-md p-1 text-ink-400 transition hover:bg-ink-800 hover:text-ink-200">
                      <X size={13} />
                    </button>
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => setTranslateScope("node")}
                      className={`flex-1 rounded-lg border px-2 py-1.5 text-[11.5px] font-semibold transition ${
                        translateScope === "node"
                          ? "border-brand bg-brand/15 text-brand"
                          : "border-ink-600 bg-ink-800 text-ink-300 hover:border-ink-500"
                      }`}
                    >
                      Solo este nodo
                    </button>
                    <button
                      onClick={() => setTranslateScope("branch")}
                      className={`flex-1 rounded-lg border px-2 py-1.5 text-[11.5px] font-semibold transition ${
                        translateScope === "branch"
                          ? "border-brand bg-brand/15 text-brand"
                          : "border-ink-600 bg-ink-800 text-ink-300 hover:border-ink-500"
                      }`}
                    >
                      Nodo y subnodos
                    </button>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="shrink-0 text-[11px] font-semibold text-ink-300">Idioma:</span>
                    <div className="flex flex-wrap gap-1">
                      {LANGS.map((l) => (
                        <button
                          key={l.code}
                          onClick={() => translateTo(l.name)}
                          disabled={busy}
                          className="rounded-full border border-ink-600 bg-ink-800 px-2 py-0.5 text-[11px] font-semibold text-ink-200 transition hover:border-brand hover:text-brand disabled:pointer-events-none disabled:opacity-40"
                        >
                          {l.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            

            {/* mensajes */}
            <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-3.5 py-4">
              {messages.map((msg) => (
                <div key={msg.id} className={msg.role === "user" ? "flex justify-end" : "flex justify-start"}>
                  {msg.role === "user" ? (
                    <div className="max-w-[85%] rounded-2xl rounded-br-md bg-brand/90 px-3.5 py-2 text-[13px] leading-relaxed text-white shadow-sm">
                      {msg.text}
                    </div>
                  ) : (
                    <div className="max-w-[92%] space-y-2">
                      <div
                        className={`rounded-2xl rounded-bl-md px-3.5 py-2 text-[13px] leading-relaxed shadow-sm ${
                          msg.kind === "error"
                            ? "border border-danger/40 bg-danger/15 text-[#ffb0b0]"
                            : "bg-ink-800 text-ink-100"
                        }`}
                      >
                        {msg.text}
                      </div>

                      {msg.kind === "suggestions" && msg.suggestions && (
                        <div className="space-y-1.5">
                          <div className="flex flex-wrap gap-1.5">
                            {msg.suggestions.map((s, i) => {
                              const on = (picked[msg.id] ?? new Set()).has(i);
                              return (
                                <button
                                  key={i}
                                  onClick={() => togglePick(msg.id, i)}
                                  disabled={msg.applied}
                                  className={`rounded-full border px-2.5 py-1 text-[12px] font-medium transition ${
                                    on
                                      ? "border-brand/60 bg-brand/20 text-brand-soft"
                                      : "border-ink-600 bg-ink-800 text-ink-400 hover:text-ink-200"
                                  } disabled:opacity-50`}
                                >
                                  {s}
                                </button>
                              );
                            })}
                          </div>
                          <button
                            onClick={() => applySuggestions(msg)}
                            disabled={msg.applied}
                            className="flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-[12px] font-bold text-white transition hover:brightness-110 active:translate-y-px disabled:pointer-events-none disabled:opacity-40"
                          >
                            <Sparkles size={13} />
                            {msg.applied ? "Añadido al mapa ✓" : `Añadir ${(picked[msg.id] ?? new Set()).size} al mapa`}
                          </button>
                        </div>
                      )}

                      {msg.kind === "rewrite" && msg.rewriteText && (
                        <div className="space-y-1.5">
                          <div className="rounded-lg border border-ink-600 bg-ink-950/60 px-3 py-2 text-[12.5px] italic leading-relaxed text-ink-200">
                            “{msg.rewriteText}”
                          </div>
                          <button
                            onClick={() => applyRewrite(msg)}
                            disabled={msg.applied}
                            className="flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-[12px] font-bold text-white transition hover:brightness-110 active:translate-y-px disabled:pointer-events-none disabled:opacity-40"
                          >
                            <PenLine size={13} />
                            {msg.applied ? "Aplicado ✓" : "Aplicar al nodo"}
                          </button>
                        </div>
                      )}

                      {msg.kind === "outline" && msg.outline && (
                        <div className="space-y-1.5">
                          <div className="max-h-40 overflow-y-auto rounded-lg border border-ink-600 bg-ink-950/60 px-3 py-2 font-mono text-[11.5px] leading-relaxed text-ink-300">
                            {msg.outline.map((o, i) => (
                              <div key={i}>
                                <div style={{ paddingLeft: o.level * 14 }}>
                                  {o.level > 0 ? "└ " : ""}
                                  {o.text}
                                </div>
                                {o.notes && (
                                  <div
                                    className="flex items-start gap-1 italic text-ink-500"
                                    style={{ paddingLeft: o.level * 14 + 14 }}
                                  >
                                    <StickyNote size={11} className="mt-0.5 shrink-0 text-[#c08a2e]" />
                                    <span>{o.notes}</span>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                          <button
                            onClick={() => applyOutline(msg)}
                            disabled={msg.applied}
                            className="flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-[12px] font-bold text-white transition hover:brightness-110 active:translate-y-px disabled:pointer-events-none disabled:opacity-40"
                          >
                            <ListTree size={13} />
                            {msg.applied ? "Creado ✓" : `Crear ${msg.outline.length} nodos`}
                          </button>
                        </div>
                      )}

                      {(msg.kind === "summary" || msg.kind === "explain") && (msg.summaryText || msg.explainText) && (
                        <div className="space-y-1.5">
                          <div className="rounded-lg border border-ink-600 bg-ink-950/60 px-3 py-2 text-[12.5px] leading-relaxed text-ink-200">
                            {msg.summaryText ?? msg.explainText}
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            <button
                              onClick={() => doCopy((msg.summaryText ?? msg.explainText)!, msg.kind === "summary" ? "Resumen" : "Explicación")}
                              className="flex items-center gap-1.5 rounded-lg border border-ink-600 px-3 py-1.5 text-[12px] font-semibold text-ink-300 transition hover:border-ink-400 hover:text-ink-100 active:translate-y-px"
                            >
                              <Copy size={13} />
                              Copiar
                            </button>
                            <button
                              onClick={() => saveAsNote(msg, (msg.summaryText ?? msg.explainText)!)}
                              disabled={msg.applied}
                              className="flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-[12px] font-bold text-white transition hover:brightness-110 active:translate-y-px disabled:pointer-events-none disabled:opacity-40"
                            >
                              <StickyNote size={13} />
                              {msg.applied ? "Guardado ✓" : "Guardar como nota"}
                            </button>
                          </div>
                        </div>
                      )}

                      {msg.kind === "questions" && msg.questions && (
                        <div className="space-y-1.5">
                          <div className="max-h-52 space-y-2.5 overflow-y-auto rounded-lg border border-ink-600 bg-ink-950/60 px-3 py-2.5">
                            {msg.questions.map((qa, i) => (
                              <div key={i}>
                                <p className="text-[12.5px] font-bold leading-snug text-ink-100">
                                  {i + 1}. {qa.q}
                                </p>
                                <p className="mt-0.5 text-[12px] leading-relaxed text-ink-400">{qa.a}</p>
                              </div>
                            ))}
                          </div>
                          <button
                            onClick={() =>
                              doCopy(msg.questions!.map((qa, i) => `${i + 1}. ${qa.q}\n   ${qa.a}`).join("\n\n"), "Preguntas de estudio")
                            }
                            className="flex items-center gap-1.5 rounded-lg border border-ink-600 px-3 py-1.5 text-[12px] font-semibold text-ink-300 transition hover:border-ink-400 hover:text-ink-100 active:translate-y-px"
                          >
                            <Copy size={13} />
                            Copiar todas
                          </button>
                        </div>
                      )}

                      {msg.kind === "translate" && msg.outline && (
                        <div className="space-y-1.5">
                          <div className="max-h-40 overflow-y-auto rounded-lg border border-ink-600 bg-ink-950/60 px-3 py-2 font-mono text-[11.5px] leading-relaxed text-ink-300">
                            {msg.outline.map((o, i) => (
                              <div key={i} style={{ paddingLeft: o.level * 14 }}>
                                {o.level > 0 ? "└ " : ""}
                                {o.text}
                              </div>
                            ))}
                          </div>
                          <button
                            onClick={() => applyTranslate(msg)}
                            disabled={msg.applied}
                            className="flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-[12px] font-bold text-white transition hover:brightness-110 active:translate-y-px disabled:pointer-events-none disabled:opacity-40"
                          >
                            <Languages size={13} />
                            {msg.applied ? "Rama creada ✓" : "Crear rama traducida"}
                          </button>
                        </div>
                      )}

                      {msg.kind === "reorder" && msg.orderedLabels && (
                        <div className="space-y-1.5">
                          <div className="rounded-lg border border-ink-600 bg-ink-950/60 px-3 py-2">
                            {msg.orderedLabels.map((label, i) => (
                              <div key={i} className="flex items-center gap-2 py-0.5">
                                <span
                                  className={`grid shrink-0 place-items-center rounded-full text-[10px] font-bold ${
                                    i === 0 ? "bg-brand text-white" : "bg-ink-700 text-ink-300"
                                  }`}
                                  style={{ width: 18, height: 18 }}
                                >
                                  {i + 1}
                                </span>
                                <span className="truncate text-[12.5px] text-ink-200">{label}</span>
                              </div>
                            ))}
                          </div>
                          <button
                            onClick={() => applyReorder(msg)}
                            disabled={msg.applied}
                            className="flex items-center gap-1.5 rounded-lg bg-brand px-3 py-1.5 text-[12px] font-bold text-white transition hover:brightness-110 active:translate-y-px disabled:pointer-events-none disabled:opacity-40"
                          >
                            <ArrowDownWideNarrow size={13} />
                            {msg.applied ? "Orden aplicado ✓" : "Aplicar este orden"}
                          </button>
                        </div>
                      )}

                      {msg.kind === "critic" && msg.points && (
                        <div className="space-y-1.5">
                          <div className="space-y-1.5 rounded-lg border border-ink-600 bg-ink-950/60 px-3 py-2.5">
                            {msg.points.map((p, i) => (
                              <div key={i} className="flex items-start gap-2">
                                <Crosshair size={13} className="mt-0.5 shrink-0 text-brand" />
                                <p className="text-[12.5px] leading-relaxed text-ink-200">{p}</p>
                              </div>
                            ))}
                          </div>
                          <button
                            onClick={() => doCopy(msg.points!.map((p) => `• ${p}`).join("\n"), "Análisis crítico")}
                            className="flex items-center gap-1.5 rounded-lg border border-ink-600 px-3 py-1.5 text-[12px] font-semibold text-ink-300 transition hover:border-ink-400 hover:text-ink-100 active:translate-y-px"
                          >
                            <Copy size={13} />
                            Copiar
                          </button>
                        </div>
                      )}

                      {msg.kind === "duplicates" && msg.groups && msg.groups.length > 0 && (
                        <div className="space-y-1.5">
                          {msg.groups.map((g, gi) => (
                            <div key={gi} className="rounded-lg border border-ink-600 bg-ink-950/60 px-3 py-2">
                              <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-ink-500">Grupo {gi + 1}</p>
                              {g.map((n) => (
                                <button
                                  key={n.id}
                                  onClick={() => onFocusNode?.(n.id)}
                                  disabled={!onFocusNode}
                                  title="Ir a este nodo en el mapa"
                                  className="flex w-full items-center gap-1.5 rounded-md px-1 py-0.5 text-left transition hover:bg-ink-800 disabled:cursor-default"
                                >
                                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                                  <span className="truncate text-[12.5px] text-ink-200">{n.text}</span>
                                </button>
                              ))}
                            </div>
                          ))}
                          <p className="text-[11px] text-ink-500">Tocá un nodo para ir hasta él en el mapa.</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
              {busy && (
                <div className="flex justify-start">
                  <div className="rounded-2xl rounded-bl-md bg-ink-800 px-3 py-2">
                    <TypingDots />
                  </div>
                </div>
              )}
            </div>

            {/* entrada */}
            <div className="border-t border-ink-700/70 p-3">
              {mode === "outline" && (
                <p className="mb-2 rounded-md border border-brand/40 bg-brand/10 px-2.5 py-1.5 text-[11px] font-medium leading-snug text-brand-soft">
                  Modo estructurar: pegá o escribí el texto y tocá el botón. La IA lo convertirá en nodos jerárquicos.
                </p>
              )}
              <div className="flex items-end gap-2">
                <textarea
                  rows={mode === "outline" ? 3 : 1}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder={mode === "outline" ? "Pegá acá el texto a estructurar…" : "Preguntale algo sobre tu mapa…"}
                  className="max-h-32 flex-1 resize-none rounded-xl border border-ink-600 bg-ink-800 px-3 py-2 text-[13px] text-ink-100 transition placeholder:text-ink-500 focus:border-ink-400 focus:ring-1 focus:ring-ink-500"
                />
                <button
                  onClick={handleSend}
                  disabled={busy || !input.trim()}
                  title={mode === "outline" ? "Estructurar texto" : "Enviar"}
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand text-white transition hover:brightness-110 active:translate-y-px disabled:pointer-events-none disabled:opacity-35"
                >
                  {busy ? <Loader2 size={16} className="animate-spin" /> : mode === "outline" ? <ListTree size={16} /> : <Send size={15} />}
                </button>
              </div>
            </div>
          </div>
        </ErrorBoundary>
      )}

      {/* burbuja */}
      <button
        onClick={() => setOpen((o) => !o)}
        title={configured ? "Abrir el Ayudante" : "Configurar el Ayudante IA"}
        className={`group absolute bottom-4 right-4 z-40 grid place-items-center rounded-lg shadow-lg transition hover:scale-105 active:translate-y-px ${
          open ? "bg-ink-700 text-white" : "bg-ink-900 text-brand"
        }`}
        style={{ width: 44, height: 44 }}
      >
        {open ? <X size={18} /> : <Bot size={19} />}
        {configured && !open && (
          <span className="pulse-dot absolute right-1 top-1 h-2.5 w-2.5 rounded-full border-2 border-paper bg-ok" />
        )}
        {!configured && !open && (
          <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-ink-900 px-2 py-0.5 text-[10px] font-bold text-brand opacity-0 shadow-lg transition group-hover:opacity-100">
            Configurar IA
          </span>
        )}
      </button>
    </>
  );
});
