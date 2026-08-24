export type NodeKind = "idea" | "title" | "text" | "image";

export type LayoutMode = "auto" | "right" | "left" | "split" | "alternate" | "top";

export interface NodeImage {
  src: string;
  aspect: number;
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
