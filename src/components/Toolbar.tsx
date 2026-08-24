import {
  Download,
  FilePlus2,
  HelpCircle,
  LibraryBig,
  Network,
  PanelLeft,
  PanelRight,
  Power,
  Redo2,
  Undo2,
  Upload,
} from "lucide-react";

interface ToolbarProps {
  title: string;
  onTitleChange: (t: string) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onOpenLibrary: () => void;
  onCreateNew: () => void;
  onImport: () => void;
  onExport: () => void;
  onHelp: () => void;
  outlineOpen: boolean;
  onToggleOutline: () => void;
  inspectorOpen: boolean;
  onToggleInspector: () => void;
  hasSelection: boolean;
  savedAt: number | null;
  canStop?: boolean;
  stopped?: boolean;
  onStopServer?: () => void;
}

function TBtn({
  label,
  onClick,
  disabled,
  active,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={`rounded-lg p-2 transition active:translate-y-px disabled:pointer-events-none disabled:opacity-30 ${
        active ? "bg-white/15 text-white shadow-inner" : "text-ink-300 hover:bg-white/10 hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}

export function Toolbar(props: ToolbarProps) {
  return (
    <header className="relative z-30 flex h-[54px] shrink-0 items-center gap-2 border-b border-ink-800 bg-ink-900 px-3 shadow-md">
      <div className="flex items-center gap-2.5">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand shadow-md shadow-brand/30">
          <Network size={17} className="text-white" strokeWidth={2.4} />
        </span>
        <span className="leading-none">
          <span className="font-display block text-[17px] font-bold tracking-tight text-white">Noditos</span>
          <span className="mt-0.5 block text-[9px] font-semibold uppercase tracking-[0.22em] text-ink-400">
            mapas de ideas
          </span>
        </span>
      </div>

      <input
        value={props.title}
        onChange={(e) => props.onTitleChange(e.target.value)}
        spellCheck={false}
        aria-label="Título del mapa"
        className="ml-2 w-44 rounded-md border border-transparent bg-transparent px-2 py-1.5 text-[13.5px] font-semibold text-ink-200 transition hover:border-ink-700 focus:border-brand/60 focus:bg-ink-800 focus:text-white sm:w-60"
      />

      {props.savedAt && (
        <span className="ml-1 hidden items-center gap-1.5 text-[11px] font-medium text-ink-500 md:flex">
          <span className="h-1.5 w-1.5 rounded-full bg-ok" />
          Guardado
        </span>
      )}

      <div className="ml-auto flex items-center gap-0.5">
        <TBtn label="Deshacer (Ctrl+Z)" onClick={props.onUndo} disabled={!props.canUndo}>
          <Undo2 size={16} />
        </TBtn>
        <TBtn label="Rehacer (Ctrl+Y)" onClick={props.onRedo} disabled={!props.canRedo}>
          <Redo2 size={16} />
        </TBtn>

        <span className="mx-1.5 h-6 w-px bg-white/10" />

        <button
          onClick={props.onOpenLibrary}
          title="Biblioteca de mapas"
          className="mr-1 flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-[12px] font-bold text-ink-300 transition hover:border-white/25 hover:bg-white/10 hover:text-white active:translate-y-px"
        >
          <LibraryBig size={15} />
          Biblioteca
        </button>
        <TBtn label="Nuevo mapa (se guarda el actual)" onClick={props.onCreateNew}>
          <FilePlus2 size={16} />
        </TBtn>
        <TBtn label="Importar (.mm, .json, .opml, .docx)" onClick={props.onImport}>
          <Upload size={16} />
        </TBtn>
        <button
          onClick={props.onExport}
          title="Exportar (Ctrl+E)"
          className="ml-1 flex items-center gap-1.5 rounded-lg bg-brand px-3 py-2 text-[12.5px] font-bold text-white shadow-md shadow-brand/25 transition hover:brightness-110 active:translate-y-px"
        >
          <Download size={14} />
          Exportar
        </button>

        <span className="mx-1.5 h-6 w-px bg-white/10" />

        <TBtn
          label={props.outlineOpen ? "Ocultar esquema" : "Mostrar esquema"}
          onClick={props.onToggleOutline}
          active={props.outlineOpen}
        >
          <PanelLeft size={16} />
        </TBtn>
        <TBtn
          label={
            !props.hasSelection
              ? "Seleccioná un nodo para ver el inspector"
              : props.inspectorOpen
                ? "Ocultar inspector"
                : "Mostrar inspector"
          }
          onClick={props.onToggleInspector}
          disabled={!props.hasSelection}
          active={props.inspectorOpen && props.hasSelection}
        >
          <PanelRight size={16} />
        </TBtn>
        <TBtn label="Ayuda y atajos" onClick={props.onHelp}>
          <HelpCircle size={16} />
        </TBtn>

        {props.canStop && (
          <>
            <span className="mx-1.5 h-6 w-px bg-white/10" />
            <button
              onClick={props.onStopServer}
              disabled={props.stopped}
              title={
                props.stopped
                  ? "El servidor local ya está detenido"
                  : "Detener el servidor local de Noditos.exe (la app queda inutilizable hasta volver a abrirlo)"
              }
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-[12.5px] font-bold transition active:translate-y-px ${
                props.stopped ? "cursor-default text-ink-500" : "text-[#ff9b9b] hover:bg-[#e05252]/15"
              }`}
            >
              <Power size={15} strokeWidth={2.6} />
              {props.stopped ? "Detenido" : "Detener"}
            </button>
          </>
        )}
      </div>
    </header>
  );
}
