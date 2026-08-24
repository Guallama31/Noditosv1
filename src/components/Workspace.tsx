import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle } from "lucide-react";
import type { MapSnapshot, MindNode, NotifyFn } from "../types";
import { useMindMap } from "../hooks/useMindMap";
import { Toolbar } from "./Toolbar";
import { OutlinePanel } from "./OutlinePanel";
import { Inspector } from "./Inspector";
import { Canvas, type FocusTarget } from "./Canvas";
import { AiAssistant } from "./AiAssistant";
import { ExportModal } from "./ExportModal";
import { ConfirmModal, HelpModal } from "./Modals";
import { IMPORT_ACCEPT, parseAnyFile } from "../lib/formats";
import { loadAiConfig } from "../lib/ai";
import { countNodes, findNode, pathOf } from "../lib/tree";

type ConfirmState =
  | { kind: "import"; root: MindNode; title?: string; filename: string }
  | { kind: "stop" }
  | null;

export function Workspace({
  map,
  onPersist,
  onOpenLibrary,
  onCreateNew,
  onOpenAiSettings,
  notify,
  flushRef,
  canStop,
  stopped,
  onRequestStop,
}: {
  map: { id: string; title: string; root: MindNode };
  onPersist: (snap: MapSnapshot) => void;
  onOpenLibrary: () => void;
  onCreateNew: () => void;
  onOpenAiSettings: () => void;
  notify: NotifyFn;
  flushRef: React.MutableRefObject<() => void>;
  canStop: boolean;
  stopped: boolean;
  onRequestStop: () => void;
}) {
  const api = useMindMap({ root: map.root, title: map.title });
  // La configuración de IA se lee al montar (se refresca al volver de ajustes).
  const aiCfg = loadAiConfig();

  /* ---------- autoguardado ---------- */
  const [savedAt, setSavedAt] = useState<number | null>(null);
  useEffect(() => {
    const t = window.setTimeout(() => {
      onPersist({ root: api.root, title: api.title });
      setSavedAt(Date.now());
    }, 600);
    return () => window.clearTimeout(t);
  }, [api.root, api.title, onPersist]);

  // Guarda instantánea (la usa "Detener servidor").
  useEffect(() => {
    flushRef.current = () => onPersist({ root: api.root, title: api.title });
  });

  /* ---------- ui ---------- */
  const [outlineOpen, setOutlineOpen] = useState(true);
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [showExport, setShowExport] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmState>(null);
  const [focusTarget, setFocusTarget] = useState<FocusTarget | null>(null);
  const [fitTick, setFitTick] = useState(0);
  const [pendingMove, setPendingMove] = useState<{ id: string; targetId: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const focusNode = useCallback(
    (id: string) => {
      api.select(id);
      setFocusTarget({ id, tick: Date.now() });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [api.select],
  );

  const openImport = useCallback(() => fileRef.current?.click(), []);

  /* ---------- selector de imagen compartido (Canvas + Inspector) ---------- */
  const imageInputRef = useRef<HTMLInputElement>(null);
  const imageTargetRef = useRef<string | null>(null);
  const requestImage = useCallback((id: string) => {
    imageTargetRef.current = id;
    imageInputRef.current?.click();
  }, []);
  const onImagePicked = useCallback(
    async (file: File | undefined) => {
      const id = imageTargetRef.current;
      imageTargetRef.current = null;
      if (!file || !id) return;
      if (!file.type.startsWith("image/")) {
        notify("El archivo no es una imagen", "error");
        return;
      }
      try {
        const { fileToNodeImage } = await import("../lib/image");
        const image = await fileToNodeImage(file);
        api.setImage(id, image);
        api.select(id);
        notify("Imagen añadida al nodo");
      } catch {
        notify("No se pudo procesar la imagen", "error");
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [notify],
  );

  const onImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const { root, title } = await parseAnyFile(file);
      if (countNodes(api.root) > 1) {
        setConfirm({ kind: "import", root, title, filename: file.name });
      } else {
        api.replaceMap(root, title ?? file.name.replace(/\.[^.]+$/, ""));
        setFitTick((t) => t + 1);
        notify(`Importados ${countNodes(root)} nodos desde ${file.name}`);
      }
    } catch (err) {
      notify(err instanceof Error ? err.message : "No se pudo importar el archivo", "error");
    }
  };

  const selectedNode = api.selectedId ? findNode(api.root, api.selectedId) : null;
  const selectedPath = api.selectedId ? pathOf(api.root, api.selectedId) : null;

  const modalOpen =
    showExport || showHelp || confirm !== null || pendingMove !== null;

  return (
    <>
      <Toolbar
        title={api.title}
        onTitleChange={(t) => api.setTitle(t)}
        canUndo={api.canUndo}
        canRedo={api.canRedo}
        onUndo={api.undo}
        onRedo={api.redo}
        onOpenLibrary={onOpenLibrary}
        onCreateNew={onCreateNew}
        onImport={openImport}
        onExport={() => setShowExport(true)}
        onHelp={() => setShowHelp(true)}
        outlineOpen={outlineOpen}
        onToggleOutline={() => setOutlineOpen((o) => !o)}
        inspectorOpen={inspectorOpen}
        onToggleInspector={() => setInspectorOpen((o) => !o)}
        hasSelection={selectedNode !== null}
        savedAt={savedAt}
        canStop={canStop}
        stopped={stopped}
        onStopServer={onRequestStop}
      />

      <div className="flex min-h-0 flex-1">
        <OutlinePanel
          root={api.root}
          selectedId={api.selectedId}
          open={outlineOpen}
          onSelect={focusNode}
          onToggleCollapse={(id) => api.toggleCollapse(id)}
          onClose={() => setOutlineOpen(false)}
        />

        <div className="relative flex min-w-0 flex-1">
          <Canvas
            api={api}
            notify={notify}
            focusTarget={focusTarget}
            fitTick={fitTick}
            hotkeysDisabled={modalOpen}
            onExportHotkey={() => setShowExport(true)}
            onImportHotkey={openImport}
            onHelpHotkey={() => setShowHelp(true)}
            onRequestImage={requestImage}
            onRequestMove={(id, targetId) => setPendingMove({ id, targetId })}
          />
          <AiAssistant
            api={api}
            notify={notify}
            selectedNode={selectedNode}
            cfg={aiCfg}
            onOpenSettings={onOpenAiSettings}
            onFocusNode={focusNode}
          />

          {/* botón flotante para reabrir el Inspector cuando está oculto */}
          {selectedNode && !inspectorOpen && (
            <button
              onClick={() => setInspectorOpen(true)}
              title="Mostrar inspector"
              className="pop-in absolute right-0 top-1/2 z-30 flex -translate-y-1/2 items-center gap-1.5 rounded-l-lg border border-r-0 border-ink-200/80 bg-white/95 py-3 pl-1.5 pr-2 text-ink-500 shadow-md transition hover:bg-white hover:text-ink-800"
            >
              <span className="text-[10px] font-bold uppercase tracking-wider">Inspector</span>
            </button>
          )}
        </div>

        {selectedNode && selectedPath && inspectorOpen && (
          <Inspector
            node={selectedNode}
            path={selectedPath}
            api={api}
            onClose={() => setInspectorOpen(false)}
            onFocusNode={focusNode}
            onPickImage={requestImage}
          />
        )}
      </div>

      <input ref={fileRef} type="file" accept={IMPORT_ACCEPT} className="hidden" onChange={onImportFile} />
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          void onImagePicked(e.target.files?.[0]);
          e.target.value = "";
        }}
      />

      {showExport && (
        <ExportModal root={api.root} title={api.title} onClose={() => setShowExport(false)} notify={notify} />
      )}
      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}

      {confirm?.kind === "import" && (
        <ConfirmModal
          title="Importar archivo"
          message={
            <>
              <strong>{confirm.filename}</strong> contiene{" "}
              <strong>{countNodes(confirm.root)} nodos</strong> y sustituirá el mapa actual.
              Podrás deshacer con Ctrl+Z.
            </>
          }
          confirmLabel="Sustituir e importar"
          onConfirm={() => {
            api.replaceMap(confirm.root, confirm.title ?? confirm.filename.replace(/\.[^.]+$/, ""));
            setFitTick((t) => t + 1);
            notify(`Importados ${countNodes(confirm.root)} nodos`);
          }}
          onClose={() => setConfirm(null)}
        />
      )}

      {/* confirmación de unión de nodos: vive fuera del DOM del lienzo,
          así sus botones nunca quedan atrapados por el paneo */}
      {pendingMove &&
        (() => {
          const node = findNode(api.root, pendingMove.id);
          const target = findNode(api.root, pendingMove.targetId);
          if (!node || !target) return null;
          const sub = countNodes(node) - 1;
          const tSub = countNodes(target) - 1;
          const trim = (t: string) => {
            const s = t.trim() || "Idea";
            return s.length > 34 ? s.slice(0, 34) + "…" : s;
          };
          const nLabel = trim(node.text);
          const tLabel = trim(target.text);
          const bothParents = sub > 0 && tSub > 0;
          const plural = (n: number) => (n === 1 ? "subnodo" : "subnodos");
          return (
            <ConfirmModal
              title={bothParents ? "Unir dos ramas" : "Unir nodos"}
              message={
                <span className="block space-y-2.5 text-left">
                  {bothParents && (
                    <span className="flex items-start gap-2 rounded-lg border border-brand/40 bg-brand/10 px-3 py-2.5 text-[12.5px] font-semibold leading-snug text-[#8c3220]">
                      <AlertTriangle size={15} className="mt-0.5 shrink-0" />
                      <span>
                        Estás moviendo la rama «{nLabel}» ({sub} {plural(sub)}) dentro de la rama
                        «{tLabel}» ({tSub} {plural(tSub)}). Toda su estructura interna viaja con ella.
                      </span>
                    </span>
                  )}
                  <span className="block leading-relaxed">
                    «{nLabel}» pasará a ser subnodo de «{tLabel}»
                    {sub > 0 && !bothParents && (
                      <>, junto con sus {sub} {plural(sub)}</>
                    )}
                    .
                  </span>
                  <span className="block text-[12px] text-ink-400">
                    Podés deshacerlo en cualquier momento con Ctrl+Z.
                  </span>
                </span>
              }
              confirmLabel={bothParents ? "Sí, unir las ramas" : "Unir nodos"}
              onConfirm={() => {
                const moved = api.moveNode(pendingMove.id, pendingMove.targetId);
                if (moved) {
                  api.select(pendingMove.id);
                  notify(`«${nLabel}» ahora cuelga de «${tLabel}»`);
                  window.setTimeout(() => focusNode(pendingMove.id), 40);
                }
              }}
              onClose={() => setPendingMove(null)}
            />
          );
        })()}
    </>
  );
}
