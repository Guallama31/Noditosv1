import type { MindNode } from "../types";
import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  Briefcase,
  FolderKanban,
  GraduationCap,
  Lightbulb,
  ListChecks,
  Plane,
  Rocket,
  Scale,
  Target,
} from "lucide-react";
import { createNode } from "./tree";
import { sampleMap } from "./sample";

export interface MapTemplate {
  id: string;
  /** Nombre que se muestra en la tarjeta. */
  name: string;
  /** Descripción breve de la tarjeta. */
  tagline: string;
  /** Título sugerido para el mapa nuevo. */
  title: string;
  /** Color de acento de la tarjeta y la vista previa. */
  accent: string;
  icon: LucideIcon;
  /** Construye el árbol raíz de la plantilla. */
  build: () => MindNode;
}

/** Atajo para armar nodos con hijos. */
function n(
  text: string,
  children: MindNode[] = [],
  extra: Partial<Omit<MindNode, "id" | "children">> = {},
): MindNode {
  return createNode(text, extra, children);
}

export const TEMPLATES: MapTemplate[] = [
  {
    id: "launch",
    name: "Lanzamiento de app",
    tagline: "El plan completo del ejemplo: investigación, diseño, desarrollo y marketing.",
    title: "Plan de lanzamiento",
    accent: "#b54a33",
    icon: Rocket,
    build: () => sampleMap().root,
  },
  {
    id: "book",
    name: "Escribir un libro",
    tagline: "Organizá personajes, trama, estructura y ambientación de tu próxima historia.",
    title: "Mi próxima novela",
    accent: "#8d5b7c",
    icon: BookOpen,
    build: () =>
      n("Mi libro", [
        n("Personajes", [
          n("Protagonista", [n("Motivación"), n("Arco de cambio")], {
            notes: "¿Qué quiere y qué le impide conseguirlo?",
          }),
          n("Antagonista", [n("Motivación"), n("Punto de vista")]),
          n("Secundarios", [n("Aliados"), n("Mentor"), n("Figura cómica")]),
        ]),
        n("Trama", [
          n("Idea central (logline)", [], {
            notes: "Una sola frase: quién, qué quiere y qué se lo impide.",
          }),
          n("Conflicto principal"),
          n("Giros argumentales"),
          n("Subtramas"),
        ]),
        n("Estructura", [
          n("Inicio", [n("Planteamiento"), n("Incidente disparador")]),
          n("Nudo", [n("Punto medio"), n("Crisis")]),
          n("Desenlace", [n("Clímax"), n("Resolución")]),
        ]),
        n("Ambientación", [n("Época"), n("Lugares"), n("Atmósfera y tono")]),
        n("Rutina de escritura", [
          n("Meta diaria (palabras)"),
          n("Horario fijo"),
          n("Fuentes de inspiración"),
        ]),
      ]),
  },
  {
    id: "business",
    name: "Idea de negocio",
    tagline: "Los 9 bloques del modelo Canvas para darle forma a tu emprendimiento.",
    title: "Plan de negocio canvas",
    accent: "#c08a2e",
    icon: Briefcase,
    build: () =>
      n("Mi idea de negocio", [
        n("Propuesta de valor", [
          n("¿Qué problema resuelvo?"),
          n("¿Qué me hace único?"),
        ]),
        n("Segmentos de clientes", [
          n("¿A quién le vendo?"),
          n("Perfil del cliente ideal"),
        ]),
        n("Canales", [n("Cómo llego a mis clientes")]),
        n("Relación con clientes", [n("Cómo los fidelizo")]),
        n("Fuentes de ingresos", [n("Cómo gano dinero"), n("Estrategia de precios")]),
        n("Recursos clave", [n("Equipo"), n("Tecnología"), n("Capital")]),
        n("Actividades clave", [n("Qué debo hacer muy bien")]),
        n("Socios clave", [n("Alianzas estratégicas"), n("Proveedores")]),
        n("Estructura de costos", [n("Costos fijos"), n("Costos variables")], {
          notes: "Separá lo que pagás sí o sí de lo que escala con las ventas.",
        }),
      ]),
  },
  {
    id: "action",
    name: "Plan de acción",
    tagline: "Convertí una meta en pasos concretos usando el método SMART.",
    title: "Plan de acción",
    accent: "#4e7e76",
    icon: ListChecks,
    build: () =>
      n("Mi meta principal", [
        n("Específico", [
          n("¿Qué quiero lograr exactamente?"),
          n("¿Por qué es importante?"),
        ]),
        n("Medible", [n("¿Cómo sabré que avancé?"), n("Indicadores y números")]),
        n("Alcanzable", [n("¿Qué recursos tengo?"), n("¿Qué me falta conseguir?")]),
        n("Relevante", [n("¿Se alinea con mis planes mayores?")]),
        n("Temporal", [n("Fecha límite"), n("Hitos intermedios")]),
        n("Acciones concretas", [n("Paso 1"), n("Paso 2"), n("Paso 3")], {
          notes: "Cada paso debe ser tan pequeño que no puedas poner excusas.",
        }),
        n("Obstáculos", [n("Posibles dificultades"), n("Plan B")]),
      ]),
  },
  {
    id: "swot",
    name: "Análisis FODA",
    tagline: "Fortalezas, oportunidades, debilidades y amenazas de cualquier situación.",
    title: "Análisis FODA",
    accent: "#5e7e9e",
    icon: Target,
    build: () =>
      n("Mi análisis FODA", [
        n("Fortalezas (interno)", [
          n("¿Qué hago mejor que los demás?"),
          n("Recursos y ventajas propias"),
          n("Logros y experiencia"),
        ], { kind: "title", notes: "Mirada hacia adentro: lo que te favorece y controlás." }),
        n("Debilidades (interno)", [
          n("¿Qué me limita?"),
          n("Carencias de recursos o habilidades"),
          n("Lo que otros hacen mejor"),
        ], { kind: "title" }),
        n("Oportunidades (externo)", [
          n("Tendencias del mercado"),
          n("Alianzas y contactos posibles"),
          n("Vacíos que puedo ocupar"),
        ], { kind: "title", notes: "Mirada hacia afuera: lo que el entorno te ofrece." }),
        n("Amenazas (externo)", [
          n("Competencia"),
          n("Cambios regulatorios o económicos"),
          n("Riesgos fuera de mi control"),
        ], { kind: "title" }),
        n("Estrategias cruzadas", [
          n("F+O: potenciar fortalezas con oportunidades"),
          n("D+O: corregir debilidades para aprovecharlas"),
          n("F+A: usar fortalezas para defenderme"),
          n("D+A: plan de contingencia"),
        ], { notes: "El valor del FODA está en cruzar los cuadrantes, no solo en listarlos." }),
      ]),
  },
  {
    id: "decision",
    name: "Toma de decisiones",
    tagline: "Compará opciones con criterios y una matriz para elegir con claridad.",
    title: "Decisión pendiente",
    accent: "#6e5b8e",
    icon: Scale,
    build: () =>
      n("¿Qué debo decidir?", [
        n("Contexto", [
          n("¿Por qué surge esta decisión ahora?"),
          n("¿Qué pasa si no decido?"),
        ], { kind: "title" }),
        n("Opciones", [
          n("Opción A", [n("A favor"), n("En contra")]),
          n("Opción B", [n("A favor"), n("En contra")]),
          n("Opción C", [n("A favor"), n("En contra")]),
        ], { kind: "title", notes: "Incluí siempre la opción de 'no hacer nada' como una alternativa más." }),
        n("Criterios", [
          n("Costo"),
          n("Tiempo"),
          n("Riesgo"),
          n("Alineación con mis objetivos"),
        ], { kind: "title", notes: "Asigná un peso a cada criterio según su importancia." }),
        n("Matriz de decisión", [
          n("Puntuar cada opción por criterio (1-5)"),
          n("Multiplicar por el peso del criterio"),
          n("Sumar y comparar totales"),
        ], { notes: "La matriz no decide por vos: ordena la información para que decidas mejor." }),
        n("Decisión final", [
          n("Elección y motivos"),
          n("Qué haré si sale mal"),
        ], { kind: "title" }),
      ]),
  },
  {
    id: "project",
    name: "Gestión de proyecto",
    tagline: "Fases, hitos, equipo y riesgos organizados de inicio a cierre.",
    title: "Proyecto nuevo",
    accent: "#2e7e6e",
    icon: FolderKanban,
    build: () =>
      n("Mi proyecto", [
        n("Inicio", [
          n("Objetivo y alcance"),
          n("Acta de constitución"),
          n("Interesados (stakeholders)"),
        ], { kind: "title" }),
        n("Planificación", [
          n("Cronograma e hitos"),
          n("Presupuesto"),
          n("Recursos y responsables"),
          n("Criterios de calidad"),
        ], { kind: "title", notes: "Un hito es un punto de control: entregable verificable con fecha." }),
        n("Ejecución", [
          n("Tareas en curso"),
          n("Reuniones de seguimiento"),
          n("Gestión de cambios"),
        ], { kind: "title" }),
        n("Monitoreo y riesgos", [
          n("Riesgos identificados", [n("Probabilidad"), n("Impacto"), n("Plan de mitigación")]),
          n("Indicadores de avance"),
        ]),
        n("Cierre", [
          n("Entregable final"),
          n("Lecciones aprendidas"),
          n("Documento de cierre"),
        ], { kind: "title" }),
        n("Equipo", [
          n("Roles y responsabilidades"),
          n("Canales de comunicación"),
        ]),
      ]),
  },
  {
    id: "study",
    name: "Plan de estudio",
    tagline: "Dominá un tema con objetivos, cronograma y técnicas de aprendizaje.",
    title: "Plan de estudio",
    accent: "#557e3e",
    icon: GraduationCap,
    build: () =>
      n("Tema a dominar", [
        n("Objetivo de aprendizaje", [
          n("¿Qué quiero saber al final?"),
          n("¿Para qué lo necesito?"),
        ], { kind: "title" }),
        n("Temario", [
          n("Unidad 1", [n("Conceptos clave"), n("Ejercicios")]),
          n("Unidad 2", [n("Conceptos clave"), n("Ejercicios")]),
          n("Unidad 3", [n("Conceptos clave"), n("Ejercicios")]),
        ], { kind: "title", notes: "Dividí el tema en bloques que puedas abarcar en una sesión." }),
        n("Cronograma", [
          n("Fechas de evaluación"),
          n("Sesiones semanales"),
          n("Repasos espaciados"),
        ]),
        n("Técnicas", [
          n("Pomodoro (25 min + pausa)"),
          n("Feynman: explicalo simple"),
          n("Active recall: autoevaluación"),
        ], { notes: "Explicar el tema con tus palabras revela lo que aún no entendés." }),
        n("Recursos", [
          n("Libros y apuntes"),
          n("Cursos y videos"),
          n("Grupo de estudio"),
        ]),
      ]),
  },
  {
    id: "trip",
    name: "Plan de viaje",
    tagline: "Destino, itinerario día a día, presupuesto y equipaje sin olvidar nada.",
    title: "Próximo viaje",
    accent: "#3e8e9e",
    icon: Plane,
    build: () =>
      n("Mi viaje", [
        n("Destino", [
          n("Lugar y fechas"),
          n("Clima esperado"),
          n("Documentos y visas"),
        ], { kind: "title" }),
        n("Itinerario", [
          n("Día 1", [n("Mañana"), n("Tarde"), n("Noche")]),
          n("Día 2", [n("Mañana"), n("Tarde"), n("Noche")]),
          n("Día 3", [n("Mañana"), n("Tarde"), n("Noche")]),
        ], { kind: "title", notes: "Dejá al menos un bloque libre por día para imprevistos." }),
        n("Presupuesto", [
          n("Transporte"),
          n("Alojamiento"),
          n("Comidas"),
          n("Actividades"),
          n("Fondo de emergencia"),
        ]),
        n("Equipaje", [
          n("Ropa"),
          n("Tecnología y cargadores"),
          n("Botiquín y medicamentos"),
          n("Documentos"),
        ], { kind: "title" }),
        n("Referencias", [n("Mapa del destino"), n("Fotos inspiración")], {
          kind: "image",
          notes: "Agregá imágenes reales a estos nodos con doble clic.",
        }),
      ]),
  },
  {
    id: "brainstorm",
    name: "Lluvia de ideas",
    tagline: "Capturá sin filtro, agrupá por afinidad y priorizá por impacto.",
    title: "Lluvia de ideas",
    accent: "#d9a83e",
    icon: Lightbulb,
    build: () =>
      n("¿Cómo podríamos…?", [
        n("Captura libre", [
          n("Idea 1"),
          n("Idea 2"),
          n("Idea 3"),
          n("Idea 4"),
        ], { kind: "title", notes: "Regla de oro: cero juicio en esta etapa. Cantidad antes que calidad." }),
        n("Agrupación por afinidad", [
          n("Tema común A"),
          n("Tema común B"),
          n("Ideas sueltas"),
        ], { kind: "title" }),
        n("Priorización", [
          n("Matriz impacto vs esfuerzo"),
          n("Votación del equipo"),
          n("Quick wins (impacto alto, esfuerzo bajo)"),
        ], { notes: "Empezá por los quick wins para ganar impulso rápido." }),
        n("Próximos pasos", [
          n("Idea ganadora"),
          n("Responsable y fecha"),
          n("Primer experimento"),
        ], { kind: "title" }),
      ]),
  },
];

export function getTemplate(id: string): MapTemplate | undefined {
  return TEMPLATES.find((t) => t.id === id);
}
