import { AimAssist } from "../src/camera/AimAssist";
import { Viewport } from "../src/scene/Viewport";
import type { SceneObject } from "../src/scene/Scene";

function obj(x: number, y: number, radius: number): SceneObject {
  return { name: "t", color: "#ffffff", tags: [], x, y, radius };
}

function viewportAt(x: number, y: number): Viewport {
  // scene 2000x1000, viewport 800x600, then position manually
  const vp = new Viewport(2000, 1000, 800, 600);
  vp.x = x;
  vp.y = y;
  return vp;
}

describe("AimAssist.isObjectInView", () => {
  const assist = new AimAssist();

  test("object fully inside the viewport is in view", () => {
    const vp = viewportAt(0, 0);
    expect(assist.isObjectInView(vp, obj(400, 300, 50))).toBe(true);
  });

  test("object centered exactly on the viewport center is in view", () => {
    const vp = viewportAt(100, 100);
    expect(assist.isObjectInView(vp, obj(100 + 400, 100 + 300, 50))).toBe(
      true
    );
  });

  // boundary value analysis around the left edge (viewport.x = 100)
  test("object whose right edge reaches into the viewport (1px overlap) is in view", () => {
    const vp = viewportAt(100, 0);
    // right edge = 80 + 21 = 101 -> viewport starts at 100 -> 1px visible
    expect(assist.isObjectInView(vp, obj(80, 300, 21))).toBe(true);
  });

  test("object ending just before the viewport edge (1px gap) is NOT in view", () => {
    const vp = viewportAt(100, 0);
    // right edge = 80 + 19 = 99 -> viewport starts at 100 -> no overlap
    expect(assist.isObjectInView(vp, obj(80, 300, 19))).toBe(false);
  });

  test("object exactly touching the viewport edge counts as in view (inclusive boundary)", () => {
    const vp = viewportAt(100, 0);
    // right edge = 80 + 20 = 100 == viewport.x: boundary is inclusive
    expect(assist.isObjectInView(vp, obj(80, 300, 20))).toBe(true);
  });

  test("object fully past the right edge of the viewport is NOT in view", () => {
    const vp = viewportAt(0, 0);
    expect(assist.isObjectInView(vp, obj(900, 300, 50))).toBe(false);
  });

  test("object vertically above the viewport (no y overlap) is NOT in view", () => {
    const vp = viewportAt(0, 200);
    expect(assist.isObjectInView(vp, obj(400, 100, 50))).toBe(false);
  });

  test("object overlapping the bottom edge is in view", () => {
    const vp = viewportAt(0, 0);
    // top = 600 - 20 = 580 < 600 -> visible part inside viewport
    expect(assist.isObjectInView(vp, obj(400, 600, 20))).toBe(true);
  });

  // regression: an object whose mask position could not be extracted
  // (color missing from mask) must never count as capturable
  test("object without extracted coordinates is NOT in view", () => {
    const vp = viewportAt(0, 0);
    expect(assist.isObjectInView(vp, { name: "t", color: "#fff", tags: [] })).toBe(
      false
    );
    expect(
      assist.isObjectInView(vp, {
        name: "t",
        color: "#fff",
        tags: [],
        x: 400,
        y: 300,
        radius: undefined,
      })
    ).toBe(false);
  });

  test("exposes its tolerance for debug overlay", () => {
    expect(new AimAssist().getTolerance()).toBe(200);
    expect(new AimAssist(150).getTolerance()).toBe(150);
  });
});
