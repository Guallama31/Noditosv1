import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Network, RefreshCw } from "lucide-react";
import { ErrorBoundary } from "./components/ErrorBoundary";
import type { MapSnapshot, ToastItem, ToastKind } from "./types";
import { Workspace } from "./components/Workspace";
import { LibraryScreen } from "./components/LibraryScreen";
import { AiSettingsScreen } from "./components/AiSettingsScreen";
import { TemplatesModal } from "./components/TemplatesModal";
import { ConfirmModal } from "./components/Modals";
import { Toasts } from "./components/Toasts";
import type { MapTemplate } from "./lib/templates";
import { parseAnyFile } from "./lib/formats";
import { countNodes } from "./lib/tree";
import { sampleMap } from "./lib/sample";
import {
  createLibraryBackup,
  createStoredMap,
  mergeLibraryData,
  maybeCreateAutoVersion,
  moveMapToTrash,
  parseLibraryBackup,
  restoreFromTrash,
  saveLibraryData,
  loadLibraryData,
  type LibraryDataShape,
  type StoredMap,
} from "./lib/library";
import { download } from "./lib/formats";
import { clearShareHash, parseShareHash } from "./lib/share";

type ConfirmState = { kind: "delete"; map: StoredMap } | { kind: "stop" } | null;

/**
 * Cuando la app se sirve desde Noditos.exe, el servidor inyecta un token
 * aleatorio en una etiqueta <meta>. Su presencia habilita el botón "Detener".
 */
function readStopToken(): string | null {
  const value = document
    .querySelector('meta[name="noditos-stop-token"]')
    ?.getAttribute("content");
  return value && value !== "__NODITOS_STOP_TOKEN__" ? value : null;
}

/** Pantalla de recuperación global: ningún error deja la app en negro. */
function CrashScreen({ error }: { error: Error }) {
  return (
    <div className="app-surface flex h-full items-center justify-center p-6">
      <div className="pop-in w-full max-w-md rounded-2xl border border-ink-200 bg-white p-8 text-center shadow-2xl shadow-ink-900/15">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-brand/15 text-brand">
          <Network size={26} strokeWidth={2.2} />
        </span>
        <h1 className="mt-4 font-display text-[22px] font-bold tracking-tight text-ink-900">
          Noditos encontró un obstáculo
        </h1>
        <p className="mt-2 text-[13.5px] leading-relaxed text-ink-500">
          Algo salió mal al dibujar la pantalla. Tus mapas están a salvo: el guardado
          automático ya los dejó en tu biblioteca.
        </p>
        <p className="mx-auto mt-3 max-h-24 w-fit max-w-full overflow-y-auto break-words rounded-lg border border-ink-100 bg-ink-50 px-3 py-2 text-left font-mono text-[11px] leading-snug text-ink-400">
          {error.message}
        </p>
        <button
          onClick={() => window.location.reload()}
          className="mt-5 inline-flex items-center gap-2 rounded-lg bg-ink-800 px-5 py-2.5 text-[13.5px] font-bold text-white shadow-md shadow-ink-900/20 transition hover:bg-ink-700 active:translate-y-px"
        >
          <RefreshCw size={15} />
          Recargar Noditos
        </button>
      </div>
    </div>
  );
}

function AppInner() {
  /* ---------- biblioteca ---------- */
  const [data, setData] = useState<LibraryDataShape>(() => {
    const loaded = loadLibraryData();
    const shared = parseShareHash();
    if (!shared) return loaded;
    const map = createStoredMap(shared.title, shared.root);
    const next = { ...loaded, maps: [map, ...loaded.maps], lastOpenedId: map.id };
    saveLibraryData(next);
    clearShareHash();
    return next;
  });
  const dataRef = useRef(data);
  dataRef.current = data;

  // Siempre se arranca en la biblioteca.
  const [openMapId, setOpenMapId] = useState<string | null>(null);
  const [aiSettingsOpen, setAiSettingsOpen] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [confirm, setConfirm] = useState<ConfirmState>(null);

  const persist = useCallback((next: LibraryDataShape) => {
    setData(next);
    saveLibraryData(next);
  }, []);

  const upsertMap = useCallback(
    (id: string, snap: MapSnapshot) => {
      const d = maybeCreateAutoVersion(dataRef.current, id);
      const maps = d.maps.map((m) =>
        m.id === id ? { ...m, ...snap, updatedAt: Date.now() } : m,
      );
      persist({ ...d, maps });
    },
    [persist],
  );

  /* ---------- toasts ---------- */
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const toastSeq = useRef(1);
  const notify = useCallback((message: string, kind: ToastKind = "success") => {
    const id = toastSeq.current++;
    setToasts((t) => [...t.slice(-2), { id, kind, message }]);
    window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3400);
  }, []);

  useEffect(() => {
    const onWarning = (event: Event) => {
      const detail = (event as CustomEvent<string>).detail;
      notify(detail || "Revisá el almacenamiento local de Noditos", "error");
    };
    window.addEventListener("noditos-storage-warning", onWarning);
    return () => window.removeEventListener("noditos-storage-warning", onWarning);
  }, [notify]);

  /* ---------- detener el servidor (Noditos.exe) ---------- */
  const stopToken = useMemo(readStopToken, []);
  const [serverStopped, setServerStopped] = useState(false);
  const flushRef = useRef<() => void>(() => {});
  const requestStop = useCallback(() => setConfirm({ kind: "stop" }), []);

  const doStopServer = useCallback(async () => {
    if (!stopToken) return;
    flushRef.current();
    try {
      await fetch(`/__noditos/stop?token=${encodeURIComponent(stopToken)}`, { method: "POST" });
    } catch {
      /* el servidor ya salió */
    }
    setServerStopped(true);
    notify("Servidor detenido — cerrando pestaña…", "info");
    window.close();
    window.setTimeout(() => {
      notify("El navegador impidió el cierre automático; podés cerrar la pestaña manualmente.", "info");
    }, 900);
  }, [stopToken, notify]);

  /* ---------- acciones de biblioteca ---------- */
  const createAndOpen = useCallback(
    (map: StoredMap, message?: string) => {
      const d = dataRef.current;
      persist({ ...d, maps: [...d.maps, map], lastOpenedId: map.id });
      setOpenMapId(map.id);
      if (message) notify(message);
    },
    [persist, notify],
  );

  const handleCreateNew = useCallback(() => {
    createAndOpen(createStoredMap());
  }, [createAndOpen]);

  const openMap = useCallback(
    (id: string) => {
      persist({ ...dataRef.current, lastOpenedId: id });
      setOpenMapId(id);
    },
    [persist],
  );

  const goLibrary = useCallback(() => setOpenMapId(null), []);
  const openAiSettings = useCallback(() => setAiSettingsOpen(true), []);

  const handleDuplicate = useCallback(
    (id: string) => {
      const src = dataRef.current.maps.find((m) => m.id === id);
      if (!src) return;
      const clone: StoredMap = {
        ...createStoredMap(`${src.title} (copia)`),
        root: JSON.parse(JSON.stringify(src.root)) as StoredMap["root"],
      };
      persist({ ...dataRef.current, maps: [...dataRef.current.maps, clone] });
      notify(`Duplicado como «${clone.title}»`);
    },
    [persist, notify],
  );

  const handleDeleteConfirmed = useCallback(() => {
    if (confirm?.kind !== "delete") return;
    persist(moveMapToTrash(dataRef.current, confirm.map.id));
    notify("Mapa enviado a la papelera. Podés restaurarlo desde la biblioteca.", "info");
  }, [confirm, persist, notify]);

  const handleRename = useCallback(
    (id: string, title: string) => {
      upsertMap(id, { root: dataRef.current.maps.find((m) => m.id === id)!.root, title });
    },
    [upsertMap],
  );

  const handleImportNew = useCallback(
    async (file: File) => {
      try {
        const { root, title } = await parseAnyFile(file);
        const map = createStoredMap(title ?? file.name.replace(/\.[^.]+$/, ""), root);
        createAndOpen(map, `Importados ${countNodes(root)} nodos desde ${file.name}`);
      } catch (err) {
        notify(err instanceof Error ? err.message : "No se pudo importar el archivo", "error");
      }
    },
    [createAndOpen, notify],
  );

  const handleLoadSample = useCallback(() => {
    const s = sampleMap();
    createAndOpen(createStoredMap(s.title, s.root), "Mapa de ejemplo creado");
  }, [createAndOpen]);

  const handleUseTemplate = useCallback(
    (t: MapTemplate) => {
      setShowTemplates(false);
      createAndOpen(createStoredMap(t.title, t.build()), `Plantilla «${t.name}» creada`);
    },
    [createAndOpen],
  );

  const handleExportBackup = useCallback(() => {
    const stamp = new Date().toISOString().slice(0, 10);
    download(`noditos-backup-${stamp}.json`, createLibraryBackup(dataRef.current), "application/json");
    notify("Backup completo exportado");
  }, [notify]);

  const handleImportBackup = useCallback(
    async (file: File) => {
      try {
        const incoming = parseLibraryBackup(await file.text());
        const merged = mergeLibraryData(dataRef.current, incoming);
        persist(merged);
        notify(`Backup importado: ${incoming.maps.length} mapa${incoming.maps.length === 1 ? "" : "s"}`);
      } catch (err) {
        notify(err instanceof Error ? err.message : "No se pudo importar el backup", "error");
      }
    },
    [persist, notify],
  );

  const handleRestoreTrash = useCallback(
    (id: string) => {
      persist(restoreFromTrash(dataRef.current, id));
      notify("Mapa restaurado desde la papelera");
    },
    [persist, notify],
  );

  const handleEmptyTrash = useCallback(() => {
    persist({ ...dataRef.current, trash: [] });
    notify("Papelera vaciada", "info");
  }, [persist, notify]);

  const openMapEntry = openMapId ? data.maps.find((m) => m.id === openMapId) : null;

  return (
    <div className="flex h-full flex-col overflow-hidden bg-paper font-body">
      {aiSettingsOpen ? (
        <AiSettingsScreen onBack={() => setAiSettingsOpen(false)} />
      ) : openMapEntry ? (
        <Workspace
          key={openMapEntry.id}
          map={openMapEntry}
          onPersist={(snap) => upsertMap(openMapEntry.id, snap)}
          onOpenLibrary={goLibrary}
          onCreateNew={handleCreateNew}
          onOpenAiSettings={openAiSettings}
          notify={notify}
          versions={(data.versions ?? []).filter((v) => v.mapId === openMapEntry.id)}
          flushRef={flushRef}
          canStop={stopToken !== null}
          stopped={serverStopped}
          onRequestStop={requestStop}
        />
      ) : (
        <LibraryScreen
          maps={data.maps}
          trash={data.trash ?? []}
          onOpen={openMap}
          onCreate={handleCreateNew}
          onLoadSample={handleLoadSample}
          onDuplicate={handleDuplicate}
          onDelete={(id) => {
            const m = data.maps.find((x) => x.id === id);
            if (m) setConfirm({ kind: "delete", map: m });
          }}
          onRename={handleRename}
          onImportFile={handleImportNew}
          onExportBackup={handleExportBackup}
          onImportBackup={handleImportBackup}
          onRestoreTrash={handleRestoreTrash}
          onEmptyTrash={handleEmptyTrash}
          onOpenTemplates={() => setShowTemplates(true)}
          onOpenAiSettings={openAiSettings}
          canStop={stopToken !== null}
          stopped={serverStopped}
          onRequestStop={requestStop}
        />
      )}

      {showTemplates && <TemplatesModal onClose={() => setShowTemplates(false)} onUse={handleUseTemplate} />}

      {confirm?.kind === "delete" && (
        <ConfirmModal
          title="¿Eliminar este mapa?"
          message={
            <>
              <strong>«{confirm.map.title}»</strong> ({countNodes(confirm.map.root)} nodos) se
              moverá a la papelera. Desde la biblioteca podés restaurarlo o vaciar la papelera
              cuando ya tengas un backup.
            </>
          }
          confirmLabel="Mover a papelera"
          danger
          onConfirm={handleDeleteConfirmed}
          onClose={() => setConfirm(null)}
        />
      )}

      {confirm?.kind === "stop" && (
        <ConfirmModal
          title="¿Detener Noditos?"
          message="El servidor local se apagará y la pestaña se cerrará. Tus mapas ya quedaron guardados en tu biblioteca."
          confirmLabel="Detener y cerrar"
          danger
          onConfirm={() => void doStopServer()}
          onClose={() => setConfirm(null)}
        />
      )}

      <Toasts toasts={toasts} onDismiss={(id) => setToasts((t) => t.filter((x) => x.id !== id))} />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary fallback={(err) => <CrashScreen error={err} />}>
      <AppInner />
    </ErrorBoundary>
  );
}
