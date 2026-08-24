import type { ReactNode } from "react";
import {
  BookOpen, Briefcase, ClipboardList, GraduationCap, Lightbulb, Plane, Rocket, Scale, Target, LayoutDashboard,
} from "lucide-react";
import type { MindNode } from "../types";
import { createNode } from "./tree";

export interface TemplateDef {
  id: string;
  name: string;
  desc: string;
  icon: ReactNode;
  color: string;
  build: () => MindNode;
}

function n(text: string, children: MindNode[] = [], extra: Partial<Omit<MindNode, "id" | "children">> = {}): MindNode {
  return createNode(text, extra, children);
}

export const TEMPLATES: TemplateDef[] = [
  {
    id: "launch",
    name: "Lanzamiento de app",
    desc: "Plan completo: investigación, diseño, desarrollo y marketing.",
    icon: <Rocket size={18} />,
    color: "#b54a33",
    build: () =>
      n("Lanzamiento de la app", [
        n("Investigación", [n("Entrevistas a usuarios"), n("Análisis de competencia"), n("Propuesta de valor")], { color: "#4e7e76" }),
        n("Diseño", [n("Wireframes"), n("Sistema visual"), n("Prototipo navegable")], { color: "#5e7e9e" }),
        n("Desarrollo", [n("MVP"), n("Pruebas"), n("Publicación")], { color: "#b54a33" }),
        n("Marketing", [n("Landing page"), n("Redes sociales"), n("Prensa")], { color: "#c08a2e" }),
      ]),
  },
  {
    id: "book",
    name: "Escribir un libro",
    desc: "Personajes, trama, estructura y rutina de escritura.",
    icon: <BookOpen size={18} />,
    color: "#5e7e9e",
    build: () =>
      n("Mi libro", [
        n("Personajes", [n("Protagonista", [n("Motivación"), n("Arco de cambio")]), n("Antagonista"), n("Secundarios")], {
          color: "#8d5b7c",
          notes: "Cada personaje necesita un deseo y un miedo.",
        }),
        n("Trama", [n("Premisa (logline)"), n("Conflicto central"), n("Giros")], { color: "#5e7e9e" }),
        n("Estructura", [n("Inicio: mundo ordinario"), n("Nudo: escalada"), n("Desenlace: clímax y resolución")], {
          color: "#4e7e76",
          notes: "Esquema de 3 actos: planteamiento, confrontación, resolución.",
        }),
        n("Ambientación", [n("Época y lugar"), n("Atmósfera"), n("Reglas del mundo")], { color: "#69634d" }),
        n("Rutina", [n("Meta de palabras diarias"), n("Horario de escritura"), n("Revisiones")], { color: "#c08a2e" }),
      ]),
  },
  {
    id: "business",
    name: "Idea de negocio",
    desc: "Modelo Canvas: propuesta de valor, clientes, ingresos y costos.",
    icon: <Briefcase size={18} />,
    color: "#69634d",
    build: () =>
      n("Mi idea de negocio", [
        n("Propuesta de valor", [n("Problema que resuelve"), n("Qué la hace única")], {
          color: "#b54a33",
          notes: "Una frase: para [quién], que necesita [qué], ofrecemos [cómo].",
        }),
        n("Segmentos de clientes", [n("Cliente ideal"), n("Early adopters")], { color: "#5e7e9e" }),
        n("Canales", [n("Cómo llego al cliente"), n("Venta y distribución")], { color: "#4e7e76" }),
        n("Relación con clientes", [n("Fidelización"), n("Soporte")], { color: "#8d5b7c" }),
        n("Fuentes de ingresos", [n("Precio y modelo"), n("Recurrencia")], { color: "#c08a2e" }),
        n("Costos", [n("Fijos"), n("Variables")], { color: "#5e5e6e" }),
      ]),
  },
  {
    id: "action",
    name: "Plan de acción",
    desc: "Meta central con objetivos SMART, acciones y obstáculos.",
    icon: <ClipboardList size={18} />,
    color: "#4e7e76",
    build: () =>
      n("Mi objetivo", [
        n("Meta SMART", [n("Específica"), n("Medible"), n("Alcanzable"), n("Relevante"), n("Con plazo")], {
          color: "#4e7e76",
          notes: "SMART: cada meta debe poder medirse y tener fecha límite.",
        }),
        n("Acciones", [n("Paso 1"), n("Paso 2"), n("Paso 3")], { color: "#b54a33" }),
        n("Recursos necesarios", [n("Tiempo"), n("Dinero"), n("Personas")], { color: "#5e7e9e" }),
        n("Obstáculos previsibles", [n("Riesgo principal", [n("Plan B")])], { color: "#c08a2e" }),
        n("Revisión", [n("Checkpoint semanal"), n("Ajustes")], { color: "#8d5b7c" }),
      ]),
  },
  {
    id: "swot",
    name: "Análisis FODA",
    desc: "Fortalezas, debilidades, oportunidades y amenazas + estrategias.",
    icon: <Target size={18} />,
    color: "#5e5e6e",
    build: () =>
      n("Análisis FODA", [
        n("Fortalezas (interno)", [n("¿En qué somos buenos?"), n("Ventajas actuales")], {
          color: "#4e7e76",
          notes: "El valor está en cruzar los cuadrantes, no solo en listarlos.",
        }),
        n("Debilidades (interno)", [n("Carencias"), n("Qué mejorar")], { color: "#b54a33" }),
        n("Oportunidades (externo)", [n("Tendencias a favor"), n("Huecos de mercado")], { color: "#5e7e9e" }),
        n("Amenazas (externo)", [n("Competencia"), n("Riesgos del entorno")], { color: "#c08a2e" }),
        n("Estrategias", [n("FO: potenciar fortalezas con oportunidades"), n("DA: reducir debilidades ante amenazas")], {
          color: "#8d5b7c",
        }),
      ]),
  },
  {
    id: "decision",
    name: "Toma de decisiones",
    desc: "Opciones, criterios y matriz para decidir con claridad.",
    icon: <Scale size={18} />,
    color: "#8d5b7c",
    build: () =>
      n("¿Qué decisión tomar?", [
        n("Contexto", [n("Qué hay que decidir"), n("Plazo para decidir")], {
          color: "#5e5e6e",
          notes: "Incluí siempre la opción de no hacer nada.",
        }),
        n("Opciones", [n("Opción A", [n("A favor"), n("En contra")]), n("Opción B", [n("A favor"), n("En contra")])], {
          color: "#b54a33",
        }),
        n("Criterios", [n("Costo"), n("Tiempo"), n("Riesgo"), n("Alineación con metas")], { color: "#4e7e76" }),
        n("Matriz de decisión", [n("Puntuar cada opción por criterio"), n("Sumar y comparar")], { color: "#5e7e9e" }),
        n("Decisión final", [n("Elegida"), n("Por qué"), n("Primer paso")], { color: "#c08a2e" }),
      ]),
  },
  {
    id: "project",
    name: "Gestión de proyecto",
    desc: "Fases del proyecto: inicio, planificación, ejecución y cierre.",
    icon: <LayoutDashboard size={18} />,
    color: "#4e7e76",
    build: () =>
      n("Proyecto", [
        n("Inicio", [n("Alcance"), n("Objetivos"), n("Stakeholders")], { color: "#5e7e9e" }),
        n("Planificación", [n("Cronograma"), n("Presupuesto"), n("Hitos")], {
          color: "#b54a33",
          notes: "Definí hitos medibles: fechas + entregables concretos.",
        }),
        n("Ejecución", [n("Tareas"), n("Responsables")], { color: "#4e7e76" }),
        n("Monitoreo", [n("Avance vs. plan"), n("Riesgos activos")], { color: "#c08a2e" }),
        n("Cierre", [n("Entrega"), n("Lecciones aprendidas")], { color: "#8d5b7c" }),
        n("Equipo", [n("Roles"), n("Comunicación")], { color: "#69634d" }),
      ]),
  },
  {
    id: "study",
    name: "Plan de estudio",
    desc: "Objetivo, temario, cronograma y técnicas de estudio.",
    icon: <GraduationCap size={18} />,
    color: "#c08a2e",
    build: () =>
      n("Plan de estudio", [
        n("Objetivo", [n("Qué quiero dominar"), n("Fecha del examen/meta")], { color: "#c08a2e" }),
        n("Temario", [n("Unidad 1", [n("Temas"), n("Recursos")]), n("Unidad 2", [n("Temas"), n("Recursos")])], {
          color: "#5e7e9e",
        }),
        n("Cronograma", [n("Bloques semanales"), n("Repasos espaciados")], {
          color: "#4e7e76",
          notes: "Repasá a los 1, 3 y 7 días para fijar la memoria.",
        }),
        n("Técnicas", [n("Pomodoro (25/5)"), n("Feynman: explicarlo simple"), n("Flashcards")], { color: "#8d5b7c" }),
        n("Autoevaluación", [n("Simulacros"), n("Preguntas de estudio")], { color: "#b54a33" }),
      ]),
  },
  {
    id: "travel",
    name: "Plan de viaje",
    desc: "Destino, itinerario, presupuesto y equipaje.",
    icon: <Plane size={18} />,
    color: "#5e7e9e",
    build: () =>
      n("Viaje a…", [
        n("Destino", [n("Fechas"), n("Clima esperado"), n("Documentación")], { color: "#5e7e9e" }),
        n("Itinerario", [n("Día 1"), n("Día 2"), n("Día 3")], { color: "#b54a33" }),
        n("Presupuesto", [n("Transporte"), n("Alojamiento"), n("Comidas"), n("Actividades")], {
          color: "#4e7e76",
          notes: "Reservá un 15% para imprevistos.",
        }),
        n("Equipaje", [n("Documentos"), n("Ropa"), n("Tecnología")], { color: "#69634d" }),
        n("Referencias", [], { kind: "image", color: "#c08a2e" }),
      ]),
  },
  {
    id: "brainstorm",
    name: "Lluvia de ideas",
    desc: "Captura libre, agrupación por afinidad y priorización.",
    icon: <Lightbulb size={18} />,
    color: "#b54a33",
    build: () =>
      n("Lluvia de ideas", [
        n("Captura libre", [n("Idea 1"), n("Idea 2"), n("Idea 3")], {
          color: "#c08a2e",
          notes: "Primero cantidad, después calidad: sin juzgar ninguna idea.",
        }),
        n("Agrupación", [n("Tema A"), n("Tema B")], { color: "#5e7e9e" }),
        n("Priorización", [n("Impacto vs. esfuerzo"), n("Top 3")], { color: "#b54a33" }),
        n("Próximos pasos", [n("Validar la elegida"), n("Prototipar")], { color: "#4e7e76" }),
      ]),
  },
];

export function getTemplate(id: string): TemplateDef | undefined {
  return TEMPLATES.find((t) => t.id === id);
}
