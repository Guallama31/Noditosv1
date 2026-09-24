import type { CSSProperties, ReactNode } from "react";

/** Decorative layer that never participates in map hit testing. */
export function CanvasBackground() {
  return (
    <>
      <div
        className="wash wash-a"
        style={{ width: 640, height: 640, left: "-10%", top: "-15%", background: "rgba(120,124,138,0.10)" }}
      />
      <div
        className="wash wash-b"
        style={{ width: 700, height: 700, right: "-12%", bottom: "-20%", background: "rgba(140,136,150,0.08)" }}
      />
    </>
  );
}

/** Stable layer boundary for viewport content. */
export function CanvasViewportLayer({ children, className, style }: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return <div className={className} style={style}>{children}</div>;
}

/** UI mounted above the transformed scene, never affected by camera zoom. */
export function CanvasInteractionOverlay({ children }: { children: ReactNode }) {
  return <div className="pointer-events-none absolute inset-0 z-10">{children}</div>;
}
