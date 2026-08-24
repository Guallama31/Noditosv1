import { ChevronRight, Network, PanelLeft, StickyNote } from "lucide-react";
import type { MindNode } from "../types";
import { BRANCH_COLORS } from "../lib/layout";
import { countNodes } from "../lib/tree";

interface RowProps {
  node: MindNode;
  depth: number;
  inherited: string;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onToggleCollapse: (id: string) => void;
}

function Row({ node, depth, inherited, selectedId, onSelect, onToggleCollapse }: RowProps) {
  const color = node.color ?? inherited;
  const selected = node.id === selectedId;
  const hasChildren = node.children.length > 0;
  const open = !node.collapsed;

  return (
    <div>
      <div
        role="button"
        tabIndex={-1}
        onClick={() => onSelect(node.id)}
        className={`group mx-2 flex cursor-pointer items-center gap-1.5 rounded-md py-[5px] pr-2 transition ${
          selected ? "bg-ink-800 text-white shadow-sm" : "text-ink-600 hover:bg-ink-100/80"
        }`}
        style={{ marginLeft: 8 + depth * 15 }}
      >
        {hasChildren ? (
          <button
            aria-label={open ? "Plegar" : "Expandir"}
            onClick={(e) => {
              e.stopPropagation();
              onToggleCollapse(node.id);
            }}
            className={`shrink-0 rounded p-0.5 transition hover:bg-ink-200/60 ${selected ? "hover:bg-white/15" : ""}`}
          >
            <ChevronRight size={13} className={`transition-transform duration-200 ${open ? "rotate-90" : ""}`} />
          </button>
        ) : (
          <span className="w-[17px] shrink-0" />
        )}

        {depth === 0 ? (
          <Network size={13} className={`shrink-0 ${selected ? "text-brand" : "text-ink-400"}`} />
        ) : (
          <span
            className="h-2 w-2 shrink-0 rounded-full"
            style={{ background: color, boxShadow: `0 0 0 2px ${selected ? "rgba(255,255,255,0.25)" : "transparent"}` }}
          />
        )}

        <span className={`min-w-0 flex-1 truncate text-[13px] ${selected ? "font-semibold" : ""}`}>
          {node.text.trim() ? node.text : <em className="opacity-50">Idea</em>}
        </span>

        {node.notes.trim() && (
          <StickyNote size={11} className={`shrink-0 ${selected ? "text-brand-soft" : "text-[#c08a2e]"}`} />
        )}
        {hasChildren && node.collapsed && (
          <span className={`shrink-0 rounded px-1 text-[10px] font-bold ${selected ? "bg-white/15" : "bg-ink-200/70 text-ink-500"}`}>
            {node.children.length}
          </span>
        )}
      </div>

      {hasChildren &&
        open &&
        node.children.map((child) => (
          <Row
            key={child.id}
            node={child}
            depth={depth + 1}
            inherited={color}
            selectedId={selectedId}
            onSelect={onSelect}
            onToggleCollapse={onToggleCollapse}
          />
        ))}
    </div>
  );
}

export function OutlinePanel({
  root,
  selectedId,
  open,
  onSelect,
  onToggleCollapse,
  onClose,
}: {
  root: MindNode;
  selectedId: string | null;
  open: boolean;
  onSelect: (id: string) => void;
  onToggleCollapse: (id: string) => void;
  onClose: () => void;
}) {
  return (
    <aside
      className={`relative z-30 flex shrink-0 flex-col overflow-hidden border-r border-ink-200 bg-white transition-[width] duration-300 ease-out ${
        open ? "w-[262px]" : "w-0 border-r-0"
      }`}
    >
      <div className="flex h-full w-[262px] shrink-0 flex-col self-start overflow-hidden">
        <div className="flex items-center justify-between border-b border-ink-100 px-4 py-3">
          <div className="flex items-center gap-2">
            <h2 className="font-display text-[13px] font-bold uppercase tracking-[0.12em] text-ink-800">Esquema</h2>
            <span className="rounded-full bg-ink-100 px-2 py-0.5 text-[11px] font-bold text-ink-500">
              {countNodes(root)}
            </span>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar esquema"
            className="rounded-md p-1 text-ink-400 transition hover:bg-ink-100 hover:text-ink-700"
          >
            <PanelLeft size={15} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto py-2">
          <Row
            node={root}
            depth={0}
            inherited={BRANCH_COLORS[0]}
            selectedId={selectedId}
            onSelect={onSelect}
            onToggleCollapse={onToggleCollapse}
          />
        </div>
        <p className="border-t border-ink-100 px-4 py-2.5 text-[11px] leading-snug text-ink-400">
          Misma jerarquía que el lienzo: el orden y las asociaciones se conservan al exportar.
        </p>
      </div>
    </aside>
  );
}
