export interface Camera {
  scale: number;
  tx: number;
  ty: number;
}

export interface Point {
  x: number;
  y: number;
}

/** Converts a point from the map's world coordinates to viewport pixels. */
export function worldToScreen(point: Point, camera: Camera): Point {
  return {
    x: camera.tx + point.x * camera.scale,
    y: camera.ty + point.y * camera.scale,
  };
}

/** Converts a viewport pixel coordinate back to map/world coordinates. */
export function screenToWorld(point: Point, camera: Camera): Point {
  return {
    x: (point.x - camera.tx) / camera.scale,
    y: (point.y - camera.ty) / camera.scale,
  };
}

/** Keeps the world point below the cursor fixed while changing zoom. */
export function zoomAtPoint(camera: Camera, screenPoint: Point, nextScale: number): Camera {
  const worldPoint = screenToWorld(screenPoint, camera);
  return {
    scale: nextScale,
    tx: screenPoint.x - worldPoint.x * nextScale,
    ty: screenPoint.y - worldPoint.y * nextScale,
  };
}

export function screenRectToWorld(
  rect: { left: number; top: number; right: number; bottom: number },
  camera: Camera,
) {
  const topLeft = screenToWorld({ x: rect.left, y: rect.top }, camera);
  const bottomRight = screenToWorld({ x: rect.right, y: rect.bottom }, camera);
  return { left: topLeft.x, top: topLeft.y, right: bottomRight.x, bottom: bottomRight.y };
}
