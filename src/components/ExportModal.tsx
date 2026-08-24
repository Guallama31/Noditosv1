import { useEffect, useMemo, useState } from "react";
import {
  Braces,
  Check,
  Copy,
  Download,
  FileCode,
  FileJson,
  FileText,
  List,
  ListTree,
  Wand2,
  X,
} from "lucide-react";
import type { MindNode, NotifyFn } from "../types";
import {
  buildDocxBlob,
  copyText,
  download,
  downloadBlob,
  FORMATS,
  serialize,
  slugify,
  type ExportFormat,
} from "../lib/formats";
import { Modal } from "./Modals";

const FORMAT_ICONS: Record<ExportFormat, React.ReactNode> = {
  mm: <FileCode size={15} />,
  md: <FileText size={15} />,
  json: <FileJson size={15} />,
  opml: <List size={15} />,
  txt: <ListTree size={15} />,
  docx: <Wand2 size={15} />,
};

export function ExportModal({
  root,
  title,
  onClose,
  notify,
}: {
  root: MindNode;
  title: string;
  onClose: () => void;
  notify: NotifyFn;
}) {
  const [format, setFormat] = useState<ExportFormat>("mm");
  const [copied, setCopied] = useState(false);

  const content = useMemo(() => serialize(format, root, title), [format, root, title]);
  const def = FORMATS.find((f) => f.id === format)!;
  const filename = `${slugify(title)}${def.ext}`;
  const sizeKb = useMemo(() => Math.max(1, Math.round(new Blob([content]).size / 1024)), [content]);

  useEffect(() => setCopied(false), [format, content]);

  const doCopy = async () => {
    const ok = await copyText(content);
    setCopied(ok);
    notify(ok ? "Copiado al portapapeles" : "No se pudo copiar", ok ? "success" : "error");
  };

  const doDownload = async () => {
    if (format === "docx") {
      try {
        const blob = await buildDocxBlob(root, title);
        downloadBlob(filename, blob);
        notify("Documento Word descargado");
      } catch {
        notify("No se pudo generar el documento Word", "error");
      }
      return;
    }
    download(filename, content, def.mime);
    notify(`${def.label} descargado`);
  };

  return (
    <Modal onClose={onClose} width={820}>
      <div className="flex items-center justify-between border-b border-ink-200 px-6 py-4">
        <div>
          <h2 className="font-display text-lg font-bold text-ink-900">Exportar mapa</h2>
          <p className="mt-0.5 text-[12.5px] text-ink-400">Exporta tu trabajo a tu PC</p>
        </div>
        <button
          onClick={onClose}
          className="rounded-md p-1.5 text-ink-400 transition hover:bg-ink-100 hover:text-ink-700"
          aria-label="Cerrar"
        >
          <X size={17} />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[240px_1fr]">
        <div className="border-b border-ink-200 bg-white/60 p-3 md:border-b-0 md:border-r">
          {FORMATS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFormat(f.id)}
              className={`mb-1 flex w-full items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left transition ${
                format === f.id
                  ? "border-ink-800 bg-ink-800 text-white shadow-md"
                  : "border-transparent text-ink-600 hover:bg-white hover:shadow-sm"
              }`}
            >
              <span className={format === f.id ? "text-brand-soft" : "text-ink-400"}>{FORMAT_ICONS[f.id]}</span>
              <span className="flex-1">
                <span className="block text-[13px] font-bold">{f.label}</span>
                <span className={`block text-[10.5px] ${format === f.id ? "text-ink-300" : "text-ink-400"}`}>{f.ext}</span>
              </span>
              {format === f.id && <Check size={14} className="text-brand-soft" />}
            </button>
          ))}
        </div>

        <div className="flex min-h-[380px] flex-col p-5">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <h3 className="font-display text-[15px] font-bold text-ink-900">{def.label}</h3>
            <span className="rounded-md bg-ink-100 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-ink-500">{filename}</span>
            <span className="text-[11px] font-semibold text-ink-400">~{sizeKb} KB</span>
          </div>
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-500">{def.desc}</p>

          <pre className="mt-3 min-h-0 flex-1 overflow-auto rounded-lg border border-ink-200 bg-ink-900 p-3 font-mono text-[11px] leading-relaxed text-ink-100">
            {format === "docx" ? content.slice(0, 1200) + "\n…\n\n(vista previa del esquema; el archivo es un Word real)" : content.slice(0, 4000)}
          </pre>

          <div className="mt-4 flex items-center justify-end gap-2">
            {format !== "docx" && (
              <button
                onClick={doCopy}
                className="flex items-center gap-1.5 rounded-lg border border-ink-200 bg-white px-3.5 py-2 text-[13px] font-semibold text-ink-600 transition hover:bg-ink-50"
              >
                {copied ? <Check size={14} className="text-ok" /> : <Copy size={14} />}
                {copied ? "Copiado" : "Copiar"}
              </button>
            )}
            <button
              onClick={doDownload}
              className="flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-[13px] font-bold text-white shadow-md shadow-brand/25 transition hover:brightness-110 active:translate-y-px"
            >
              <Download size={14} />
              Descargar {def.ext}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
