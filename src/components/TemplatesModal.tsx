import { X } from "lucide-react";
import type { TemplateDef } from "../lib/templates";
import { TEMPLATES } from "../lib/templates";
import { buildPreview } from "../lib/library";
import { countNodes, maxDepth } from "../lib/tree";
import { Modal } from "./Modals";

function TemplateCard({ template, onUse }: { template: TemplateDef; onUse: (t: TemplateDef) => void }) {
  const root = template.build();
  const preview = buildPreview(root);
  const nodes = countNodes(root);
  const Icon = template.icon;

  return (
    <button
      onClick={() => onUse(template)}
      className="group flex flex-col overflow-hidden rounded-xl border border-ink-200 bg-white text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-ink-300 hover:shadow-lg"
    >
      <div
        className="relative h-[104px] overflow-hidden border-b border-ink-100"
        style={{
          background:
            "radial-gradient(rgba(94,94,110,0.14) 1px, transparent 1px) 0 0/14px 14px, linear-gradient(160deg,#f6f5f2 0%, #efede8 100%)",
        }}
      >
        <svg
          viewBox={`0 0 ${preview.width} ${preview.height}`}
          className="absolute left-1/2 top-1/2 h-[82%] max-w-[90%] -translate-x-1/2 -translate-y-1/2 transition-transform duration-300 group-hover:scale-[1.05]"
          preserveAspectRatio="xMidYMid meet"
          aria-hidden
        >
          {preview.edges.map((e, i) => (
            <path key={`e${i}`} d={e.d} fill="none" stroke={e.color} strokeWidth={1.4} strokeLinecap="round" opacity={0.5} />
          ))}
          {preview.dots.map((d, i) => (
            <circle
              key={`d${i}`}
              cx={d.x}
              cy={d.y}
              r={d.r}
              fill={d.color}
              stroke={d.root ? "#ffffff" : "none"}
              strokeWidth={d.root ? 2 : 0}
            />
          ))}
        </svg>
        <span
          className="absolute right-2 top-2 rounded-md px-2 py-0.5 text-[10px] font-bold text-white opacity-0 shadow transition group-hover:opacity-100"
          style={{ background: template.color }}
        >
          Usar plantilla →
        </span>
      </div>
      <div className="px-3.5 py-3">
        <div className="flex items-center gap-2">
          <span
            className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-white shadow-sm"
            style={{ background: template.color }}
          >
            <Icon size={16} />
          </span>
          <p className="truncate font-display text-[14px] font-bold text-ink-900">{template.name}</p>
        </div>
        <p className="mt-1.5 line-clamp-2 text-[11.5px] leading-snug text-ink-500">{template.desc}</p>
        <p className="mt-2 text-[10.5px] font-bold text-ink-400">
          {nodes} nodos · {maxDepth(root)} niveles
        </p>
      </div>
    </button>
  );
}

export function TemplatesModal({ onClose, onUse }: { onClose: () => void; onUse: (t: TemplateDef) => void }) {
  return (
    <Modal onClose={onClose} width={920}>
      <div className="flex items-center justify-between border-b border-ink-200 px-6 py-4">
        <div className="flex items-center gap-3">
          <div>
            <h2 className="font-display text-lg font-bold text-ink-900">Plantillas</h2>
            <p className="mt-0.5 text-[12.5px] text-ink-400">
              Empezá con una estructura lista y dale forma a tu idea.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <span className="rounded-full bg-ink-100 px-2.5 py-1 text-[11px] font-bold text-ink-500">
            {TEMPLATES.length} plantillas
          </span>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-ink-400 transition hover:bg-ink-100 hover:text-ink-700"
            aria-label="Cerrar"
          >
            <X size={17} />
          </button>
        </div>
      </div>
      <div className="max-h-[64vh] overflow-y-auto p-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {TEMPLATES.map((t) => (
            <TemplateCard key={t.id} template={t} onUse={onUse} />
          ))}
        </div>
      </div>
    </Modal>
  );
}
