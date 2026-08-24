import type { NodeImage } from "../types";

const MAX_SIDE = 1400;

/** Lee un archivo de imagen, lo redimensiona y lo devuelve como data-URL. */
export function fileToNodeImage(file: File): Promise<NodeImage> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("No se pudo leer el archivo"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("El archivo no es una imagen válida"));
      img.onload = () => {
        try {
          const scale = Math.min(1, MAX_SIDE / Math.max(img.width, img.height));
          const w = Math.max(1, Math.round(img.width * scale));
          const h = Math.max(1, Math.round(img.height * scale));
          const canvas = document.createElement("canvas");
          canvas.width = w;
          canvas.height = h;
          const c = canvas.getContext("2d")!;
          c.drawImage(img, 0, 0, w, h);
          const src = canvas.toDataURL("image/jpeg", 0.85);
          resolve({ src, aspect: w / h });
        } catch {
          reject(new Error("No se pudo procesar la imagen"));
        }
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}
