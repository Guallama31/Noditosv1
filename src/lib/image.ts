import type { NodeImage } from "../types";

const MAX_SIDE = 1400;
const SOFT_INLINE_LIMIT = 850 * 1024; // mantener cada imagen lejos del límite de localStorage
const MIN_SIDE = 360;
const QUALITY_STEPS = [0.82, 0.74, 0.66, 0.58];

function dataUrlBytes(dataUrl: string): number {
  const comma = dataUrl.indexOf(",");
  const payload = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
  return Math.ceil((payload.length * 3) / 4);
}

function drawToJpeg(img: HTMLImageElement, width: number, height: number, quality: number): string {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const c = canvas.getContext("2d");
  if (!c) throw new Error("No se pudo preparar el lienzo de imagen");
  c.imageSmoothingEnabled = true;
  c.imageSmoothingQuality = "high";
  c.drawImage(img, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", quality);
}

function bestCompressedDataUrl(img: HTMLImageElement): { src: string; width: number; height: number; size: number } {
  let scale = Math.min(1, MAX_SIDE / Math.max(img.width, img.height));
  let width = Math.max(1, Math.round(img.width * scale));
  let height = Math.max(1, Math.round(img.height * scale));
  let best = "";
  let bestSize = Number.POSITIVE_INFINITY;

  for (let pass = 0; pass < 8; pass += 1) {
    for (const quality of QUALITY_STEPS) {
      const src = drawToJpeg(img, width, height, quality);
      const size = dataUrlBytes(src);
      if (size < bestSize) {
        best = src;
        bestSize = size;
      }
      if (size <= SOFT_INLINE_LIMIT) return { src, width, height, size };
    }
    if (Math.max(width, height) <= MIN_SIDE) break;
    scale *= 0.82;
    width = Math.max(1, Math.round(img.width * scale));
    height = Math.max(1, Math.round(img.height * scale));
  }

  return { src: best, width, height, size: bestSize };
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onerror = () => reject(new Error("La imagen no se pudo cargar"));
    img.onload = () => resolve(img);
    img.src = src;
  });
}

/** Lee un archivo de imagen, lo redimensiona/comprime y lo devuelve como data-URL. */
export function fileToNodeImage(file: File, alt = file.name.replace(/\.[^.]+$/, "")): Promise<NodeImage> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("No se pudo leer el archivo"));
    reader.onload = () => {
      loadImage(String(reader.result))
        .then((img) => {
          try {
            const optimized = bestCompressedDataUrl(img);
            resolve({
              src: optimized.src,
              aspect: optimized.width / optimized.height,
              alt,
              source: "local",
              size: optimized.size,
              name: file.name,
            });
          } catch {
            reject(new Error("No se pudo procesar la imagen"));
          }
        })
        .catch(() => reject(new Error("El archivo no es una imagen válida")));
    };
    reader.readAsDataURL(file);
  });
}

/** Usa una imagen remota sin incrustarla en el mapa, para evitar mapas gigantes. */
export function urlToNodeImage(url: string, alt = "Imagen por URL"): Promise<NodeImage> {
  const normalized = url.trim();
  if (!/^https?:\/\//i.test(normalized)) {
    return Promise.reject(new Error("Pegá una URL que empiece con http:// o https://"));
  }
  return loadImage(normalized).then((img) => ({
    src: normalized,
    aspect: img.width > 0 && img.height > 0 ? img.width / img.height : 16 / 9,
    alt,
    source: "url",
    size: normalized.length,
  }));
}

export function isProbablyImageUrl(value: string): boolean {
  const url = value.trim();
  return /^https?:\/\//i.test(url) && /(?:\.(?:png|jpe?g|webp|gif|bmp|svg)(?:[?#].*)?$|images?|media|photo|pic)/i.test(url);
}

export { SOFT_INLINE_LIMIT as IMAGE_INLINE_SOFT_LIMIT, dataUrlBytes };
