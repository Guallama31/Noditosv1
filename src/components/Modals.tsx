import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";

export function Modal({
  onClose,
  children,
  width = 460,
}: {
  onClose: () => void;
  children: ReactNode;
  width?: number;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-5">
      <div className="fade-in absolute inset-0 bg-ink-950/65" onClick={onClose} />
      <div
        className="pop-in relative max-h-[92vh] w-full overflow-hidden rounded-xl border border-ink-200 bg-ink-50 shadow-2xl shadow-ink-950/40"
        style={{ maxWidth: width }}
      >
        {children}
      </div>
    </div>
  );
}

export function ConfirmModal({
  title,
  message,
  confirmLabel,
  danger = false,
  onConfirm,
  onClose,
}: {
  title: string;
  message: ReactNode;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Modal onClose={onClose} width={440}>
      <div className="p-6">
        <h2 className="font-display text-lg font-bold text-ink-900">{title}</h2>
        <div className="mt-2 text-sm leading-relaxed text-ink-500">{message}</div>
        <div className="mt-6 flex justify-end gap-2.5">
          <button
            onClick={onClose}
            className="rounded-lg border border-ink-200 bg-white px-4 py-2 text-sm font-semibold text-ink-600 transition hover:bg-ink-100"
          >
            Cancelar
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm transition ${
              danger ? "bg-danger hover:bg-[#c94444]" : "bg-ink-800 hover:bg-ink-700"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}

const SHORTCUTS: Array<[string[], string]> = [
  [["Tab"], "Nuevo subnodo (elegí el tipo)"],
  [["Enter"], "Nuevo nodo hermano"],
  [["F2"], "Editar el nodo seleccionado"],
  [["Supr"], "Eliminar nodo"],
  [["Espacio"], "Plegar / expandir rama"],
  [["↑", "↓"], "Moverse entre hermanos"],
  [["←", "→"], "Ir al padre o al primer hijo"],
  [["Ctrl", "Z"], "Deshacer"],
  [["Ctrl", "Y"], "Rehacer"],
  [["Ctrl", "E"], "Exportar mapa"],
  [["Ctrl", "O"], "Importar archivo"],
  [["Esc"], "Deseleccionar / cerrar"],
];

export function HelpModal({ onClose }: { onClose: () => void }) {
  return (
    <Modal onClose={onClose} width={520}>
      <div className="flex items-center justify-between border-b border-ink-200 px-6 py-4">
        <h2 className="font-display text-lg font-bold text-ink-900">Atajos y gestos</h2>
        <button
          onClick={onClose}
          className="rounded-md p-1.5 text-ink-400 transition hover:bg-ink-100 hover:text-ink-700"
          aria-label="Cerrar"
        >
          <X size={17} />
        </button>
      </div>
      <div className="grid grid-cols-1 gap-x-8 gap-y-2.5 overflow-y-auto p-6 sm:grid-cols-2">
        {SHORTCUTS.map(([keys, label]) => (
          <div key={label} className="flex items-center justify-between gap-3">
            <span className="text-[13px] text-ink-600">{label}</span>
            <span className="flex shrink-0 items-center gap-1">
              {keys.map((k) => (
                <kbd key={k} className="kbd">{k}</kbd>
              ))}
            </span>
          </div>
        ))}
      </div>
      <div className="border-t border-ink-200 bg-white/60 px-6 py-4 text-[13px] leading-relaxed text-ink-500">
        <strong>Arrastra un nodo hacia un espacio vacío</strong> para acomodarlo donde
        quieras: se mueve con toda su subrama y <strong>conserva sus conexiones</strong>.
        Si lo acercás a otro nodo, ves una previsualización de cómo quedaría; al soltar
        se pide confirmación antes de unirlos. El botón <strong>Reacomodar</strong>{" "}
        restaura la distribución automática. Con doble clic en el fondo creás una rama
        nueva; con <kbd className="kbd">Ctrl</kbd>+Clic sobre un vínculo, se abre la
        página. También podés <strong>importar documentos Word (.docx)</strong>: se
        convierten solos en nodos respetando la jerarquía. Y al editar un nodo aparece
        una <strong>barra de formato</strong> con 50 tipografías gratuitas.
      </div>
    </Modal>
  );
}
