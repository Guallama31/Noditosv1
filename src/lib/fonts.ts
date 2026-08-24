export type FontCategory = "Sans serif" | "Serif" | "Display" | "Manuscrita" | "Monoespaciada";

export interface FontDef {
  family: string;
  category: FontCategory;
}

/** 50 tipografías gratuitas (Google Fonts, licencias OFL/Apache). */
export const FONTS: FontDef[] = [
  // Sans serif
  { family: "Instrument Sans", category: "Sans serif" },
  { family: "Roboto", category: "Sans serif" },
  { family: "Open Sans", category: "Sans serif" },
  { family: "Lato", category: "Sans serif" },
  { family: "Montserrat", category: "Sans serif" },
  { family: "Raleway", category: "Sans serif" },
  { family: "Poppins", category: "Sans serif" },
  { family: "Nunito", category: "Sans serif" },
  { family: "Work Sans", category: "Sans serif" },
  { family: "Rubik", category: "Sans serif" },
  { family: "Karla", category: "Sans serif" },
  { family: "Outfit", category: "Sans serif" },
  // Serif
  { family: "Merriweather", category: "Serif" },
  { family: "Playfair Display", category: "Serif" },
  { family: "Lora", category: "Serif" },
  { family: "PT Serif", category: "Serif" },
  { family: "Libre Baskerville", category: "Serif" },
  { family: "Crimson Text", category: "Serif" },
  { family: "Bitter", category: "Serif" },
  { family: "Source Serif 4", category: "Serif" },
  { family: "Spectral", category: "Serif" },
  { family: "Vollkorn", category: "Serif" },
  // Display
  { family: "Bricolage Grotesque", category: "Display" },
  { family: "Bebas Neue", category: "Display" },
  { family: "Oswald", category: "Display" },
  { family: "Anton", category: "Display" },
  { family: "Archivo Black", category: "Display" },
  { family: "Righteous", category: "Display" },
  { family: "Lobster", category: "Display" },
  { family: "Pacifico", category: "Display" },
  { family: "Alfa Slab One", category: "Display" },
  { family: "Shrikhand", category: "Display" },
  { family: "Bungee", category: "Display" },
  { family: "Fredoka", category: "Display" },
  { family: "Comfortaa", category: "Display" },
  { family: "Abril Fatface", category: "Display" },
  { family: "Cinzel", category: "Display" },
  { family: "Space Grotesk", category: "Display" },
  // Manuscrita
  { family: "Caveat", category: "Manuscrita" },
  { family: "Patrick Hand", category: "Manuscrita" },
  { family: "Indie Flower", category: "Manuscrita" },
  { family: "Shadows Into Light", category: "Manuscrita" },
  { family: "Kalam", category: "Manuscrita" },
  { family: "Gloria Hallelujah", category: "Manuscrita" },
  { family: "Amatic SC", category: "Manuscrita" },
  // Monoespaciada
  { family: "JetBrains Mono", category: "Monoespaciada" },
  { family: "Fira Code", category: "Monoespaciada" },
  { family: "Space Mono", category: "Monoespaciada" },
  { family: "IBM Plex Mono", category: "Monoespaciada" },
  { family: "Roboto Mono", category: "Monoespaciada" },
];

export const FONT_CATEGORIES: FontCategory[] = [
  "Sans serif",
  "Serif",
  "Display",
  "Manuscrita",
  "Monoespaciada",
];

const loaded = new Set<string>();
const pending = new Map<string, Promise<void>>();

function injectFontCss(family: string): void {
  const id = `noditos-font-${family.replace(/\s+/g, "-").toLowerCase()}`;
  if (document.getElementById(id)) return;
  const link = document.createElement("link");
  link.id = id;
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${family.replace(/ /g, "+")}:wght@400;700&display=swap`;
  document.head.appendChild(link);
}

/** Carga una tipografía de Google Fonts (bajo demanda) y espera a que esté lista. */
export function ensureFont(family: string): Promise<void> {
  if (loaded.has(family)) return Promise.resolve();
  const cached = pending.get(family);
  if (cached) return cached;
  const p = new Promise<void>((resolve) => {
    injectFontCss(family);
    const done = () => {
      loaded.add(family);
      resolve();
    };
    if (document.fonts?.load) {
      Promise.race([
        document.fonts.load(`16px "${family}"`).then(() => undefined),
        new Promise<void>((r) => setTimeout(r, 3000)),
      ]).finally(done);
    } else {
      setTimeout(done, 800);
    }
  });
  pending.set(family, p);
  return p;
}

export function ensureFonts(families: string[]): Promise<void> {
  return Promise.all(families.map((f) => ensureFont(f))).then(() => undefined);
}
