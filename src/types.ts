export type NodeKind = "idea" | "title" | "text" | "image";

export type LayoutMode = "auto" | "right" | "left" | "split" | "alternate" | "top";

export type ImageSource = "local" | "url";

export interface NodeImage {
  src: string;
  aspect: number;
  /** Texto alternativo específico para accesibilidad/exportación. */
  alt?: string;
  /** Origen de la imagen: incrustada en localStorage o referenciada por URL externa. */
  source?: ImageSource;
  /** Tamaño aproximado en bytes del recurso guardado/referenciado. */
  size?: number;
  /** Nombre original del archivo, cuando proviene de una carga local. */
  name?: string;
}

export interface NodePos {
  x: number;
  y: number;
}

export interface NodeFont {
  family: string;
  size: number;
  lineHeight: number;
  bold: boolean;
  italic: boolean;
}

export type NodePriority = "none" | "low" | "medium" | "high" | "urgent";
export type NodeStatus = "none" | "todo" | "doing" | "blocked" | "done";
export type NodeRisk = "none" | "low" | "medium" | "high";
export type NodeReviewStatus = "none" | "pending" | "approved" | "changes";

export interface NodeMeta {
  /** Etiquetas sin #, normalizadas pero preservando acentos. */
  tags?: string[];
  priority?: NodePriority;
  status?: NodeStatus;
  startDate?: string;
  dueDate?: string;
  reminderAt?: string;
  assignee?: string;
  progress?: number;
  category?: string;
  risk?: NodeRisk;
  review?: NodeReviewStatus;
  taskDone?: boolean;
  repeat?: string;
}

export interface MindNode {
  id: string;
  kind: NodeKind;
  text: string;
  notes: string;
  /** Color propio (null = hereda el de su rama). */
  color: string | null;
  /** Disposición propia (null = hereda la de su rama). */
  layout: LayoutMode | null;
  collapsed: boolean;
  children: MindNode[];
  image?: NodeImage | null;
  /** Posición manual (null = la decide el layout automático). */
  pos?: NodePos | null;
  /** Tipografía personalizada (null = estilo automático por nivel). */
  font?: NodeFont | null;
  /** Metadatos opcionales para gestión de tareas/proyectos. */
  meta?: NodeMeta | null;
}

export interface MapSnapshot {
  root: MindNode;
  title: string;
}

export type ToastKind = "success" | "info" | "error";

export interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
}

export type NotifyFn = (message: string, kind?: ToastKind) => void;
