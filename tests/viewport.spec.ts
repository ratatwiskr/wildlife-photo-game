import { Viewport } from "../src/scene/Viewport";

describe("Viewport", () => {
  test("clamps its size and start position to the scene bounds", () => {
    const viewport = new Viewport(1000, 500, 200, 400);
    expect(viewport.width).toBe(200);
    expect(viewport.height).toBe(400);
    expect(viewport.x).toBe(400);
    expect(viewport.y).toBe(50);
  });

  test("panning is clamped to the scene bounds", () => {
    const viewport = new Viewport(1000, 500, 200, 400);

    viewport.pan(-9999, -9999);
    expect(viewport.x).toBe(0);
    expect(viewport.y).toBe(0);

    viewport.pan(9999, 9999);
    expect(viewport.x).toBe(800); // sceneWidth - viewport.width
    expect(viewport.y).toBe(100); // sceneHeight - viewport.height
  });

  test("worldToScreen and screenToWorld are inverses", () => {
    // Viewport starts at x=400, y=50 for a 1000x500 scene.
    const viewport = new Viewport(1000, 500, 200, 400);

    const screen = viewport.worldToScreen(500, 250, 400, 800);
    expect(screen).toEqual({ x: 200, y: 400 });

    const world = viewport.screenToWorld(screen.x, screen.y, 400, 800);
    expect(world.x).toBeCloseTo(500);
    expect(world.y).toBeCloseTo(250);
  });
});
