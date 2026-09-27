export type FontCategory = "Sans serif" | "Serif" | "Display" | "Monoespaciada";

export interface FontDef {
  family: string;
  category: FontCategory;
}

/**
 * Fuentes incluidas en Noditos o disponibles normalmente en el sistema.
 * No se inyectan hojas de estilo remotas: abrir el selector no genera tráfico.
 */
export const FONTS: FontDef[] = [
  { family: "Instrument Sans", category: "Sans serif" },
  { family: "Segoe UI", category: "Sans serif" },
  { family: "Arial", category: "Sans serif" },
  { family: "Verdana", category: "Sans serif" },
  { family: "Trebuchet MS", category: "Sans serif" },
  { family: "Georgia", category: "Serif" },
  { family: "Times New Roman", category: "Serif" },
  { family: "Bricolage Grotesque", category: "Display" },
  { family: "Courier New", category: "Monoespaciada" },
  { family: "Consolas", category: "Monoespaciada" },
];

export const FONT_CATEGORIES: FontCategory[] = ["Sans serif", "Serif", "Display", "Monoespaciada"];

const loaded = new Set<string>();
const pending = new Map<string, Promise<void>>();

/** Espera la fuente local/del sistema sin descargar recursos de terceros. */
export function ensureFont(family: string): Promise<void> {
  if (loaded.has(family)) return Promise.resolve();
  const cached = pending.get(family);
  if (cached) return cached;
  const promise = document.fonts?.load
    ? Promise.race([
        document.fonts.load(`16px "${family}"`).then(() => undefined),
        new Promise<void>((resolve) => setTimeout(resolve, 1500)),
      ]).then(() => { loaded.add(family); })
    : Promise.resolve().then(() => { loaded.add(family); });
  pending.set(family, promise);
  return promise;
}

export function ensureFonts(families: string[]): Promise<void> {
  return Promise.all(families.map((family) => ensureFont(family))).then(() => undefined);
}
