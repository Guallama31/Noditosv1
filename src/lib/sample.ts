import type { MapSnapshot, MindNode } from "../types";
import { createNode } from "./tree";

function n(
  text: string,
  children: MindNode[] = [],
  extra: Partial<Omit<MindNode, "id" | "children">> = {},
): MindNode {
  return createNode(text, extra, children);
}

export function sampleMap(): MapSnapshot {
  const root = n("Lanzamiento de la app", [
    n("Investigación", [
      n("Entrevistas a usuarios", [n("Reclutamiento (12 personas)"), n("Síntesis de hallazgos")], {
        notes: "Guion de 8 preguntas centrado en cómo organizan sus ideas hoy.\nDuración objetivo: 30 minutos.",
      }),
      n("Análisis de competencia", [n("Freeplane"), n("Obsidian Canvas"), n("MindMeister")]),
      n("Definir propuesta de valor", [], {
        notes: "Idea fuerza: exportación fiel de la jerarquía, sin perder notas ni asociaciones.",
      }),
    ], { color: "#4e7e76" }),
    n("Diseño", [
      n("Wireframes de baja fidelidad"),
      n("Sistema visual", [n("Tipografías"), n("Paleta por ramas")], {
        notes: "Cada rama principal hereda su color a todos los subnodos.",
      }),
      n("Prototipo navegable"),
    ], { color: "#5e7e9e" }),
    n("Desarrollo", [
      n("Motor del lienzo", [n("Pan y zoom"), n("Layout de ramas"), n("Arrastrar y reasignar")]),
      n("Exportadores", [n("Freeplane .mm"), n("Word .docx"), n("Markdown"), n("JSON / OPML")], {
        notes: "Clave: conservar el orden, la relación padre–hijo y todo el contenido asociado.",
      }),
      n("Persistencia local"),
    ], { color: "#b54a33" }),
    n("Marketing", [
      n("Landing page"),
      n("Demo en vídeo", [n("Guion"), n("Grabación"), n("Edición")], { collapsed: true }),
      n("Nota de prensa"),
    ], { color: "#c08a2e" }),
    n("Lanzamiento", [
      n("Beta privada"),
      n("Product Hunt"),
      n("Métricas iniciales", [], { notes: "Activación: crear 10 nodos. Retención: volver a los 7 días." }),
    ], { color: "#8d5b7c" }),
  ]);
  return { root, title: "Plan de lanzamiento" };
}
