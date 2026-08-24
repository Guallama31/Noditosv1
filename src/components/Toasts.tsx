import { AlertTriangle, CheckCircle2, Info } from "lucide-react";
import type { ToastItem } from "../types";

const ICONS = {
  success: <CheckCircle2 size={16} className="text-[#4cc38a]" />,
  info: <Info size={16} className="text-[#f0c069]" />,
  error: <AlertTriangle size={16} className="text-[#ff8585]" />,
};

export function Toasts({
  toasts,
  onDismiss,
}: {
  toasts: ToastItem[];
  onDismiss: (id: number) => void;
}) {
  return (
    <div className="pointer-events-none fixed bottom-6 left-1/2 z-[70] flex w-full max-w-md -translate-x-1/2 flex-col items-center gap-2 px-4">
      {toasts.map((toast) => (
        <button
          key={toast.id}
          onClick={() => onDismiss(toast.id)}
          className="toast-in pointer-events-auto flex w-auto max-w-full items-center gap-2.5 rounded-lg border border-white/10 bg-ink-900 px-4 py-2.5 text-left text-[13px] font-medium text-ink-100 shadow-xl shadow-ink-950/30"
        >
          <span className="shrink-0">{ICONS[toast.kind]}</span>
          <span className="truncate">{toast.message}</span>
        </button>
      ))}
    </div>
  );
}
