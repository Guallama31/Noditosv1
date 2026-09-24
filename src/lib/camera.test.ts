import { describe, expect, it } from "vitest";
import { screenRectToWorld, screenToWorld, worldToScreen, zoomAtPoint } from "./camera";

describe("camera coordinate helpers", () => {
  const camera = { scale: 2, tx: 40, ty: -10 };

  it("converts world and screen coordinates in both directions", () => {
    const world = { x: 12, y: 8 };
    const screen = worldToScreen(world, camera);
    expect(screen).toEqual({ x: 64, y: 6 });
    expect(screenToWorld(screen, camera)).toEqual(world);
  });

  it("keeps the cursor anchor fixed while zooming", () => {
    const cursor = { x: 200, y: 100 };
    const next = zoomAtPoint(camera, cursor, 4);
    expect(worldToScreen(screenToWorld(cursor, camera), next)).toEqual(cursor);
  });

  it("converts the visible screen rectangle back to world space", () => {
    expect(screenRectToWorld({ left: 0, top: 0, right: 400, bottom: 200 }, camera)).toEqual({
      left: -20,
      top: 5,
      right: 180,
      bottom: 105,
    });
  });
});
