import { useRef } from "react";
import {
  ArrowUpRight,
  Copy,
  Download,
  FilePlus2,
  LayoutTemplate,
  Network,
  Power,
  RotateCcw,
  Sparkles,
  Trash2,
  Upload,
} from "lucide-react";
import type { StoredMap, TrashedMap } from "../lib/library";
import { buildPreview, timeAgo } from "../lib/library";
import { countNodes, maxDepth } from "../lib/tree";
import { isAiConfigured, loadAiConfig, PROVIDERS } from "../lib/ai";
import { IMPORT_ACCEPT } from "../lib/formats";

function MapCard({
  map,
  index,
  onOpen,
  onRename,
  onDuplicate,
  onDelete,
}: {
  map: StoredMap;
  index: number;
  onOpen: () => void;
  onRename: (title: string) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const preview = buildPreview(map.root);
  const nodes = countNodes(map.root);

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter") onOpen();
      }}
      className="card-in group cursor-pointer overflow-hidden rounded-xl border border-ink-200 bg-white text-left shadow-sm transition duration-200 hover:-translate-y-1 hover:border-ink-300 hover:shadow-xl hover:shadow-ink-900/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand"
      style={{ animationDelay: `${Math.min(index, 8) * 55}ms` }}
    >
      <div
        className="relative h-[132px] overflow-hidden border-b border-ink-100"
        style={{
          background:
            "radial-gradient(rgba(23,23,32,0.07) 1px, transparent 1px) 0 0/16px 16px, linear-gradient(to right, rgba(23,23,32,0.035) 1px, transparent 1px) 0 0/48px 48px, linear-gradient(to bottom, rgba(23,23,32,0.035) 1px, transparent 1px) 0 0/48px 48px, linear-gradient(160deg,#fafafb 0%, #f4f4f6 100%)",
        }}
      >
        <svg
          viewBox={`0 0 ${preview.width} ${preview.height}`}
          className="absolute left-1/2 top-1/2 h-[86%] max-w-[92%] -translate-x-1/2 -translate-y-1/2 transition-transform duration-300 group-hover:scale-[1.06]"
          preserveAspectRatio="xMidYMid meet"
          aria-hidden
        >
          {preview.edges.map((e, i) => (
            <path key={`e${i}`} d={e.d} fill="none" stroke={e.color} strokeWidth={1.5} strokeLinecap="round" opacity={0.5} />
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

        {preview.clipped > 0 && (
          <span className="absolute bottom-2 right-2 rounded-full bg-ink-800/85 px-2 py-0.5 text-[10px] font-bold text-white">
            +{preview.clipped}
          </span>
        )}

        <span className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-ink-800 text-white opacity-0 shadow-md transition-all duration-200 group-hover:opacity-100">
          <ArrowUpRight size={15} />
        </span>

        <div className="absolute left-2 top-2 flex gap-1 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          <button
            title="Duplicar mapa"
            aria-label="Duplicar mapa"
            onClick={(e) => {
              e.stopPropagation();
              onDuplicate();
            }}
            className="grid h-7 w-7 place-items-center rounded-full border border-ink-200 bg-white/95 text-ink-500 shadow-sm transition hover:text-ink-800"
          >
            <Copy size={13} />
          </button>
          <button
            title="Eliminar mapa"
            aria-label="Eliminar mapa"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="grid h-7 w-7 place-items-center rounded-full border border-ink-200 bg-white/95 text-[#c04545] shadow-sm transition hover:bg-[#e05252] hover:text-white"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      <div className="px-4 py-3.5">
        <input
          defaultValue={map.title}
          key={map.title}
          aria-label="Título del mapa"
          spellCheck={false}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === "Enter") e.currentTarget.blur();
          }}
          onBlur={(e) => {
            const t = e.currentTarget.value.trim();
            if (t && t !== map.title) onRename(t);
            else e.currentTarget.value = map.title;
          }}
          className="w-full truncate rounded-md border border-transparent bg-transparent font-display text-[15px] font-bold text-ink-900 transition hover:border-ink-200 focus:border-brand/60 focus:bg-ink-50 focus:px-1.5"
        />
        <p className="mt-1 text-[12px] font-medium text-ink-400">
          {timeAgo(map.updatedAt)}
          <span className="mx-1.5 text-ink-200">·</span>
          {nodes} nodo{nodes === 1 ? "" : "s"}
          <span className="mx-1.5 text-ink-200">·</span>
          {maxDepth(map.root)} nivel{maxDepth(map.root) === 1 ? "" : "es"}
        </p>
      </div>
    </article>
  );
}

/** Acceso a la configuración del Ayudante IA, con estado visible. */
function AiSettingsButton({ onOpen }: { onOpen: () => void }) {
  const cfg = loadAiConfig();
  const configured = isAiConfigured(cfg);
  const provider = PROVIDERS.find((p) => p.id === cfg.provider);

  return (
    <button
      onClick={onOpen}
      title={configured ? `Ayudante IA conectado a ${provider?.name ?? cfg.provider}` : "Configurar el Ayudante IA"}
      className={`group flex w-full items-center justify-between gap-2 rounded-lg border px-3.5 py-2 text-[13px] font-semibold shadow-sm transition active:translate-y-px ${
        configured
          ? "border-teal-brand/30 bg-teal-brand/10 text-teal-brand hover:bg-teal-brand/15"
          : "border-ink-200 bg-white text-ink-600 hover:border-ink-300 hover:bg-ink-50"
      }`}
    >
      <span className="flex items-center gap-2">
        <Sparkles size={15} className={configured ? "text-teal-brand" : "text-brand transition group-hover:rotate-12"} />
        Ayudante IA
      </span>
      <span className="flex items-center gap-1.5 text-[11px] font-bold">
        {configured ? (
          <>
            <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-ok" />
            {provider?.name ?? cfg.provider}
          </>
        ) : (
          <>
            <span className="h-1.5 w-1.5 rounded-full bg-[#c08a2e]" />
            Sin configurar
          </>
        )}
      </span>
    </button>
  );
}

export function LibraryScreen({
  maps,
  trash,
  onOpen,
  onCreate,
  onLoadSample,
  onDuplicate,
  onDelete,
  onRename,
  onImportFile,
  onExportBackup,
  onImportBackup,
  onRestoreTrash,
  onEmptyTrash,
  onOpenTemplates,
  onOpenAiSettings,
  canStop,
  stopped,
  onRequestStop,
}: {
  maps: StoredMap[];
  trash: TrashedMap[];
  onOpen: (id: string) => void;
  onCreate: () => void;
  onLoadSample: () => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onImportFile: (file: File) => void;
  onExportBackup: () => void;
  onImportBackup: (file: File) => void;
  onRestoreTrash: (id: string) => void;
  onEmptyTrash: () => void;
  onOpenTemplates: () => void;
  onOpenAiSettings: () => void;
  canStop: boolean;
  stopped: boolean;
  onRequestStop: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const backupRef = useRef<HTMLInputElement>(null);
  const sorted = [...maps].sort((a, b) => b.updatedAt - a.updatedAt);
  const totalNodes = maps.reduce((acc, m) => acc + countNodes(m.root), 0);

  return (
    <div className="app-surface app-surface--fixed relative flex-1 overflow-y-auto">
      <div className="wash wash-a" style={{ width: 520, height: 520, left: "-8%", top: "-12%", background: "rgba(120,124,138,0.10)" }} />
      <div className="wash wash-b" style={{ width: 560, height: 560, right: "-10%", bottom: "-16%", background: "rgba(140,136,150,0.08)" }} />

      <div className="relative mx-auto max-w-5xl px-6 pb-16 pt-10">
        <header className="card-in">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-brand shadow-lg shadow-brand/30">
                <Network size={22} className="text-white" strokeWidth={2.4} />
              </span>
              <div className="leading-none">
                <p className="font-display text-[22px] font-bold tracking-tight text-ink-900">Noditos</p>
                <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.24em] text-ink-400">mapas de ideas</p>
              </div>
            </div>

            {/* acciones + Ayudante IA debajo, alineados a la derecha */}
            <div className="flex flex-col items-stretch gap-2.5">
              <div className="flex flex-wrap items-center justify-end gap-2.5">
                <button
                  onClick={() => fileRef.current?.click()}
                  className="flex items-center gap-2 rounded-lg border border-ink-200 bg-white px-3.5 py-2.5 text-[13px] font-semibold text-ink-600 shadow-sm transition hover:border-ink-300 hover:bg-ink-50 active:translate-y-px"
                >
                  <Upload size={15} />
                  Importar mapa
                </button>
                <button
                  onClick={onExportBackup}
                  className="flex items-center gap-2 rounded-lg border border-ink-200 bg-white px-3.5 py-2.5 text-[13px] font-semibold text-ink-600 shadow-sm transition hover:border-ink-300 hover:bg-ink-50 active:translate-y-px"
                >
                  <Download size={15} />
                  Backup
                </button>
                <button
                  onClick={() => backupRef.current?.click()}
                  className="flex items-center gap-2 rounded-lg border border-ink-200 bg-white px-3.5 py-2.5 text-[13px] font-semibold text-ink-600 shadow-sm transition hover:border-ink-300 hover:bg-ink-50 active:translate-y-px"
                >
                  <Upload size={15} />
                  Restaurar
                </button>
                <button
                  onClick={onOpenTemplates}
                  className="flex items-center gap-2 rounded-lg border border-ink-200 bg-white px-3.5 py-2.5 text-[13px] font-semibold text-ink-600 shadow-sm transition hover:border-ink-300 hover:bg-ink-50 active:translate-y-px"
                >
                  <LayoutTemplate size={15} />
                  Plantillas
                </button>
                <button
                  onClick={onCreate}
                  className="flex items-center gap-2 rounded-lg bg-ink-800 px-4 py-2.5 text-[13px] font-bold text-white shadow-md shadow-ink-900/20 transition hover:bg-ink-700 active:translate-y-px"
                >
                  <FilePlus2 size={15} />
                  Nuevo mapa
                </button>
              </div>
              <AiSettingsButton onOpen={onOpenAiSettings} />
            </div>
          </div>

          {canStop && (
            <div className="mt-3 flex flex-wrap items-center gap-2.5">
              <button
                onClick={onRequestStop}
                disabled={stopped}
                className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-[12.5px] font-bold transition active:translate-y-px ${
                  stopped
                    ? "cursor-default border-ink-200 text-ink-400"
                    : "border-[#e05252]/30 bg-white text-[#c04545] hover:bg-[#e05252]/5"
                }`}
              >
                <Power size={14} />
                {stopped ? "Servidor detenido" : "Detener servidor"}
              </button>
            </div>
          )}
        </header>

        <div className="card-in mt-12" style={{ animationDelay: "60ms" }}>
          <h1 className="font-display text-[clamp(30px,4.5vw,46px)] font-bold leading-[1.05] tracking-tight text-ink-900">
            Tus mapas,
            <br />
            siempre a mano.
          </h1>
          <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-ink-500">
            Todo lo que trabajás queda guardado en este navegador. Abrí cualquiera de tus mapas y
            continuá exactamente donde lo dejaste.
          </p>
          {maps.length > 0 && (
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-ink-200 bg-white px-3 py-1 text-[12px] font-bold text-ink-600 shadow-sm">
                {maps.length} mapa{maps.length === 1 ? "" : "s"}
              </span>
              <span className="rounded-full border border-ink-200 bg-white px-3 py-1 text-[12px] font-bold text-ink-600 shadow-sm">
                {totalNodes} nodos en total
              </span>
            </div>
          )}
        </div>

        {sorted.length > 0 ? (
          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {sorted.map((m, i) => (
              <MapCard
                key={m.id}
                map={m}
                index={i}
                onOpen={() => onOpen(m.id)}
                onRename={(t) => onRename(m.id, t)}
                onDuplicate={() => onDuplicate(m.id)}
                onDelete={() => onDelete(m.id)}
              />
            ))}
          </div>
        ) : (
          <div className="card-in mt-10" style={{ animationDelay: "140ms" }}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <button
                onClick={onCreate}
                className="group flex min-h-[168px] flex-col items-start justify-between rounded-xl border-2 border-dashed border-ink-300 bg-white/50 p-5 text-left transition hover:border-brand hover:bg-brand/5"
              >
                <span className="grid h-10 w-10 place-items-center rounded-lg bg-ink-800 text-white shadow-md transition group-hover:bg-brand">
                  <FilePlus2 size={18} />
                </span>
                <span>
                  <span className="block font-display text-[16px] font-bold text-ink-800">Crear mi primer mapa</span>
                  <span className="mt-1 block text-[13px] leading-snug text-ink-500">
                    Empezá desde una idea central y ramificá con Tab.
                  </span>
                </span>
              </button>
              <button
                onClick={onLoadSample}
                className="group flex min-h-[168px] flex-col items-start justify-between rounded-xl border border-ink-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-teal-brand/50 hover:shadow-lg"
              >
                <span className="grid h-10 w-10 place-items-center rounded-lg bg-teal-brand/15 text-teal-brand">
                  <Sparkles size={18} />
                </span>
                <span>
                  <span className="block font-display text-[16px] font-bold text-ink-800">Explorar el mapa de ejemplo</span>
                  <span className="mt-1 block text-[13px] leading-snug text-ink-500">
                    Un plan de lanzamiento completo para ver la app en acción.
                  </span>
                </span>
              </button>
              <button
                onClick={onOpenTemplates}
                className="group flex min-h-[168px] flex-col items-start justify-between rounded-xl border border-ink-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-brand/50 hover:shadow-lg"
              >
                <span className="grid h-10 w-10 place-items-center rounded-lg bg-brand/15 text-brand">
                  <LayoutTemplate size={18} />
                </span>
                <span>
                  <span className="block font-display text-[16px] font-bold text-ink-800">Usar una plantilla</span>
                  <span className="mt-1 block text-[13px] leading-snug text-ink-500">
                    Libros, negocios, planes de acción y más, listos para editar.
                  </span>
                </span>
              </button>
            </div>
          </div>
        )}

        {trash.length > 0 && (
          <section className="card-in mt-10 rounded-2xl border border-ink-200 bg-white/85 p-5 shadow-sm" style={{ animationDelay: "180ms" }}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-[18px] font-bold text-ink-900">Papelera</h2>
                <p className="mt-1 text-[12.5px] text-ink-500">
                  Los mapas eliminados quedan acá para que puedas restaurarlos antes de vaciarla.
                </p>
              </div>
              <button
                onClick={onEmptyTrash}
                className="flex items-center gap-1.5 rounded-lg border border-danger/30 bg-danger/5 px-3 py-2 text-[12px] font-bold text-danger transition hover:bg-danger/10"
              >
                <Trash2 size={14} />
                Vaciar papelera
              </button>
            </div>
            <div className="mt-4 divide-y divide-ink-100 overflow-hidden rounded-xl border border-ink-100 bg-white">
              {trash.map((m) => (
                <div key={m.id} className="flex flex-wrap items-center gap-3 px-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-bold text-ink-800">{m.title}</p>
                    <p className="text-[11px] font-medium text-ink-400">
                      {countNodes(m.root)} nodos · eliminado {timeAgo(m.deletedAt)}
                    </p>
                  </div>
                  <button
                    onClick={() => onRestoreTrash(m.id)}
                    className="flex items-center gap-1.5 rounded-lg border border-ink-200 bg-ink-50 px-3 py-1.5 text-[11.5px] font-bold text-ink-600 transition hover:bg-white hover:text-ink-800"
                  >
                    <RotateCcw size={13} />
                    Restaurar
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        <footer className="card-in mt-16 pb-2 text-center" style={{ animationDelay: "220ms" }}>
          <div className="mx-auto mb-4 h-px w-14 bg-ink-300/40" />
          <p className="font-display text-[15px] font-bold tracking-tight text-ink-500">
            Hecho por <span className="text-ink-700">JM</span>
          </p>
          <p className="mt-1.5 text-[10px] font-semibold uppercase tracking-[0.3em] text-[#c7c4bb]">Using Qwen</p>
        </footer>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept={IMPORT_ACCEPT}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) onImportFile(file);
        }}
      />
      <input
        ref={backupRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) onImportBackup(file);
        }}
      />
    </div>
  );
}
