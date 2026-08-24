import { useState } from "react";
import { Bold, Check, ChevronDown, Italic, RotateCcw } from "lucide-react";
import type { MindNode, NodeFont } from "../types";
import { FONTS, FONT_CATEGORIES, ensureFont } from "../lib/fonts";
import { resolveTextStyle } from "../lib/layout";

const SIZES = [10, 11, 12, 13, 14, 16, 18, 20, 24, 28, 32, 40, 48, 60, 72];
const LINE_HEIGHTS = [1, 1.15, 1.3, 1.5, 1.75, 2, 2.5];

/** Barra de formato (estilo Word) para personalizar la tipografía del nodo. */
export function FontToolbar({
  node,
  depth,
  onFontChange,
}: {
  node: MindNode;
  depth: number;
  onFontChange: (id: string, font: NodeFont | null) => void;
}) {
  const [showFonts, setShowFonts] = useState(false);
  const [showSizes, setShowSizes] = useState(false);
  const [showLh, setShowLh] = useState(false);

  const base = resolveTextStyle(node, depth);
  const f = node.font ?? null;
  const family = f?.family ?? base.fontFamily.replace(/"/g, "").split(",")[0];
  const size = f?.size ?? base.fontSize;
  const lh = f?.lineHeight ?? 1.3;
  const bold = f?.bold ?? false;
  const italic = f?.italic ?? false;

  const patch = (p: Partial<NodeFont>) => {
    onFontChange(node.id, { family, size, lineHeight: lh, bold, italic, ...p });
  };

  const btn =
    "grid h-7 w-7 place-items-center rounded-md border border-ink-200 bg-white text-ink-600 shadow-sm transition hover:bg-ink-50 active:translate-y-px";

  return (
    <div
      className="pop-in pointer-events-auto absolute left-1/2 top-full z-30 mt-2 flex -translate-x-1/2 items-center gap-1 rounded-lg border border-ink-200 bg-white p-1 shadow-lg"
      onPointerDown={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
    >
      {/* familia */}
      <div className="relative">
        <button
          onClick={() => {
            setShowFonts((v) => !v);
            setShowSizes(false);
            setShowLh(false);
          }}
          className="flex h-7 items-center gap-1 rounded-md border border-ink-200 bg-white px-2 text-[11px] font-semibold text-ink-600 shadow-sm transition hover:bg-ink-50"
          title="Tipo de letra"
        >
          <span className="max-w-[84px] truncate">{family}</span>
          <ChevronDown size={11} />
        </button>
        {showFonts && (
          <div className="pop-in absolute left-0 top-full z-40 mt-1 max-h-56 w-52 overflow-y-auto rounded-lg border border-ink-200 bg-white p-1 shadow-xl">
            {FONT_CATEGORIES.map((cat) => (
              <div key={cat}>
                <p className="px-2 pb-0.5 pt-1.5 text-[9px] font-bold uppercase tracking-[0.14em] text-ink-400">
                  {cat}
                </p>
                {FONTS.filter((x) => x.category === cat).map((x) => (
                  <button
                    key={x.family}
                    onClick={() => {
                      ensureFont(x.family);
                      patch({ family: x.family });
                      setShowFonts(false);
                    }}
                    onMouseEnter={() => ensureFont(x.family)}
                    className={`flex w-full items-center justify-between rounded-md px-2 py-1 text-left text-[13px] text-ink-700 transition hover:bg-ink-100 ${
                      family === x.family ? "bg-ink-50 font-bold" : ""
                    }`}
                    style={{ fontFamily: `"${x.family}", sans-serif` }}
                  >
                    <span className="truncate">{x.family}</span>
                    {family === x.family && <Check size={12} className="text-brand" />}
                  </button>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* tamaño */}
      <div className="relative">
        <button
          onClick={() => {
            setShowSizes((v) => !v);
            setShowFonts(false);
            setShowLh(false);
          }}
          className="flex h-7 w-11 items-center justify-center gap-0.5 rounded-md border border-ink-200 bg-white text-[11px] font-bold tabular-nums text-ink-600 shadow-sm transition hover:bg-ink-50"
          title="Tamaño"
        >
          {size}
          <ChevronDown size={11} />
        </button>
        {showSizes && (
          <div className="pop-in absolute left-0 top-full z-40 mt-1 grid max-h-56 grid-cols-3 gap-0.5 overflow-y-auto rounded-lg border border-ink-200 bg-white p-1 shadow-xl">
            {SIZES.map((s) => (
              <button
                key={s}
                onClick={() => {
                  patch({ size: s });
                  setShowSizes(false);
                }}
                className={`rounded-md px-2 py-1 text-[12px] font-semibold tabular-nums transition hover:bg-ink-100 ${
                  size === s ? "bg-ink-800 text-white" : "text-ink-600"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      <button
        onClick={() => patch({ bold: !bold })}
        className={`${btn} ${bold ? "border-ink-800 bg-ink-800 text-white" : ""}`}
        title="Negrita"
      >
        <Bold size={13} />
      </button>
      <button
        onClick={() => patch({ italic: !italic })}
        className={`${btn} ${italic ? "border-ink-800 bg-ink-800 text-white" : ""}`}
        title="Itálica"
      >
        <Italic size={13} />
      </button>

      {/* interlineado */}
      <div className="relative">
        <button
          onClick={() => {
            setShowLh((v) => !v);
            setShowFonts(false);
            setShowSizes(false);
          }}
          className="flex h-7 items-center gap-1 rounded-md border border-ink-200 bg-white px-2 text-[10px] font-bold text-ink-600 shadow-sm transition hover:bg-ink-50"
          title="Interlineado"
        >
          1.5
          <ChevronDown size={11} />
        </button>
        {showLh && (
          <div className="pop-in absolute right-0 top-full z-40 mt-1 flex flex-col gap-0.5 rounded-lg border border-ink-200 bg-white p-1 shadow-xl">
            {LINE_HEIGHTS.map((v) => (
              <button
                key={v}
                onClick={() => {
                  patch({ lineHeight: v });
                  setShowLh(false);
                }}
                className={`rounded-md px-3 py-1 text-[12px] font-semibold tabular-nums transition hover:bg-ink-100 ${
                  Math.abs(lh - v) < 0.01 ? "bg-ink-800 text-white" : "text-ink-600"
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        )}
      </div>

      {f && (
        <button
          onClick={() => onFontChange(node.id, null)}
          className={btn}
          title="Restablecer al estilo automático"
        >
          <RotateCcw size={12} />
        </button>
      )}
    </div>
  );
}
