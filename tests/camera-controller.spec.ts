import { CameraController } from "../src/camera/CameraController";
import { Scene, type SceneObject } from "../src/scene/Scene";
import { Viewport } from "../src/scene/Viewport";

jest.mock("../src/utils/MaskSampler", () => ({
  sampleMaskPixel: jest.fn(),
}));

import { sampleMaskPixel } from "../src/utils/MaskSampler";

const mockSample = sampleMaskPixel as jest.MockedFunction<
  typeof sampleMaskPixel
>;

function makeTarget(overrides: Partial<SceneObject> = {}): SceneObject {
  return {
    name: "elephant",
    color: "#ff0000",
    tags: ["elephant"],
    // default viewport starts at (600, 200) with size 800x600,
    // so keep targets within x: 600..1400, y: 200..800 to be "in view"
    x: 1000,
    y: 500,
    radius: 50,
    ...overrides,
  };
}

function makeScene(objects: SceneObject[]): Scene {
  const scene = new Scene({
    name: "test",
    sceneType: "photo",
    objects,
    objectives: [{ title: "Find the elephant", tags: ["elephant"] }],
  });
  // Polaroid cutout reads image dimensions; assets are never loaded in unit
  // tests, so provide minimal stubs (mask is unused: sampleMaskPixel is mocked).
  scene.image = { width: 2000, height: 1000 } as HTMLImageElement;
  scene.mask = { width: 2000, height: 1000 } as HTMLImageElement;
  return scene;
}

/** 2000x1000 scene, 800x600 viewport centered at (600, 200). */
function makeViewport(): Viewport {
  return new Viewport(2000, 1000, 800, 600);
}

describe("CameraController.nudgeToTarget", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(console, "log").mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  async function runNudge(
    target: SceneObject,
    vp: Viewport,
    duration = 900,
  ): Promise<"nudged" | "skipped-too-far" | "already-centered"> {
    const cam = new CameraController(makeScene([target]), vp);
    const result = cam.nudgeToTarget(target, duration);
    // drive rAF + performance.now until the animation resolves
    for (let i = 0; i < 100 && jest.getTimerCount() > 0; i++) {
      await jest.advanceTimersByTimeAsync(50);
    }
    return result;
  }

  test("target within aim tolerance resolves 'already-centered' without moving the viewport", async () => {
    const vp = makeViewport(); // starts at (600, 200), center (1000, 500)
    const target = makeTarget({ x: 1100, y: 450 }); // delta (100, -50) < 200 tol
    const before = { x: vp.x, y: vp.y };

    const result = await runNudge(target, vp);

    expect(result).toBe("already-centered");
    expect({ x: vp.x, y: vp.y }).toEqual(before);
    expect(jest.getTimerCount()).toBe(0); // no animation was started
  });

  // boundary: delta exactly equal to tolerance (200) still counts as centered
  test("target exactly at the aim tolerance boundary counts as already-centered", async () => {
    const vp = makeViewport(); // center (1000, 500)
    const target = makeTarget({ x: 1200, y: 500 }); // delta exactly 200

    expect(await runNudge(target, vp)).toBe("already-centered");
  });

  // boundary: delta 1px past tolerance triggers the gate check instead
  test("target 1px past tolerance is evaluated by the distance gate, not by tolerance", async () => {
    const vp = makeViewport(); // center (1000, 500)
    // delta x = 201 (past tolerance 200), distance 201 <= gate (0.6*600=360)
    const target = makeTarget({ x: 1201, y: 500 });

    expect(await runNudge(target, vp)).toBe("nudged");
  });

  test("target too far from center resolves 'skipped-too-far' and does not move the viewport", async () => {
    const vp = makeViewport(); // center (1000, 500), gate = 0.6*min(800,600)=360
    const target = makeTarget({ x: 1500, y: 500 }); // distance 500 > 360
    const before = { x: vp.x, y: vp.y };

    expect(await runNudge(target, vp)).toBe("skipped-too-far");
    expect({ x: vp.x, y: vp.y }).toEqual(before);
  });

  // boundary: distance exactly at the gate (360) is allowed through (only > skips)
  test("target exactly at the distance gate is nudged (gate rejects only beyond)", async () => {
    const vp = makeViewport(); // center (1000, 500)
    const target = makeTarget({ x: 1360, y: 500 }); // distance == 360 == gate

    expect(await runNudge(target, vp)).toBe("nudged");
  });

  // boundary: 1px beyond the gate skips
  test("target 1px beyond the distance gate is skipped", async () => {
    const vp = makeViewport();
    const target = makeTarget({ x: 1361, y: 500 }); // distance 361 > 360

    expect(await runNudge(target, vp)).toBe("skipped-too-far");
  });

  test("nudge animates the viewport until the target is centered", async () => {
    const vp = makeViewport(); // (600, 200), center (1000, 500)
    const target = makeTarget({ x: 1300, y: 600 }); // delta (300, 100), dist ~316 < 360

    expect(await runNudge(target, vp, 900)).toBe("nudged");
    // after the nudge, the target must sit at the viewport center
    expect(vp.x + vp.width / 2).toBeCloseTo(target.x as number, 5);
    expect(vp.y + vp.height / 2).toBeCloseTo(target.y as number, 5);
  });

  test("nudge does not push the viewport past the right scene edge", async () => {
    // viewport near right edge: x = 2000-800 = 1200, center (1600, 500)
    const vp = makeViewport();
    vp.x = 1200;
    vp.y = 200;
    // target at 1900: distance 300 < gate 360 -> nudged, but centering it
    // would need x = 1500 > 1200 max -> must clamp instead
    const target = makeTarget({ x: 1900, y: 500 });

    expect(await runNudge(target, vp)).toBe("nudged");
    expect(vp.x).toBeLessThanOrEqual(1200); // sceneWidth - viewport.width
    expect(vp.x).toBeGreaterThanOrEqual(0);
  });

  test("nudge does not push the viewport past the left scene edge", async () => {
    const vp = makeViewport();
    vp.x = 0;
    vp.y = 200;
    // target at 100: distance from center (400,500) is 300 < 360 -> nudged,
    // centering would need x = -300 -> must clamp to 0
    const target = makeTarget({ x: 100, y: 500 });

    expect(await runNudge(target, vp)).toBe("nudged");
    expect(vp.x).toBeGreaterThanOrEqual(0);
    expect(vp.x).toBeLessThanOrEqual(1200);
  });

  test("target without extracted coordinates is treated as already-centered", async () => {
    const vp = makeViewport();
    const target = makeTarget({ x: undefined, y: undefined });

    expect(await runNudge(target, vp)).toBe("already-centered");
  });
});

describe("CameraController.attemptCapture", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.spyOn(console, "log").mockImplementation(() => undefined);
    mockSample.mockReset();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  function makeController(scene: Scene, vp: Viewport): CameraController {
    return new CameraController(scene, vp, 1000);
  }

  test("capture with target in view and matching mask color succeeds and marks found", () => {
    const target = makeTarget();
    const scene = makeScene([target]);
    const cam = makeController(scene, makeViewport());
    mockSample.mockReturnValue("#ff0000");

    const result = cam.attemptCapture();

    expect(result).not.toBeNull();
    expect(result?.name).toBe("elephant");
    // Scene copies its object list on construction: assert on the scene's copy
    expect(scene.definition.objects[0].found).toBe(true);
    expect(result?.polaroid).toBeInstanceOf(HTMLCanvasElement);
  });

  test("capture returns null when cooldown is active (rapid shutter)", () => {
    const target = makeTarget();
    const scene = makeScene([target]);
    const cam = makeController(scene, makeViewport());
    mockSample.mockReturnValue("#ff0000");

    expect(cam.attemptCapture()).not.toBeNull();
    // immediately press again: cooldown must block it
    expect(cam.attemptCapture()).toBeNull();
    expect(mockSample).toHaveBeenCalledTimes(1); // second shot never sampled
  });

  test("capture succeeds again after the cooldown expires", () => {
    const a = makeTarget({ name: "a", color: "#ff0000", x: 800, y: 500 });
    const b = makeTarget({ name: "b", color: "#00ff00", x: 1100, y: 500 });
    const scene = makeScene([a, b]);
    const cam = makeController(scene, makeViewport());
    mockSample.mockReturnValueOnce("#ff0000").mockReturnValueOnce("#00ff00");

    expect(cam.attemptCapture()?.name).toBe("a");
    expect(cam.attemptCapture()).toBeNull(); // in cooldown

    jest.advanceTimersByTime(1000);

    expect(cam.attemptCapture()?.name).toBe("b");
    expect(scene.definition.objects.map((o) => o.found)).toEqual([true, true]);
  });

  test("capture returns null when the target is outside the viewport", () => {
    const target = makeTarget({ x: 1900, y: 900 }); // way outside 800x600 view
    const scene = makeScene([target]);
    const cam = makeController(scene, makeViewport());
    mockSample.mockReturnValue("#ff0000");

    expect(cam.attemptCapture()).toBeNull();
    expect(scene.definition.objects[0].found).toBeUndefined();
  });

  test("capture returns null when sampled mask color matches no object", () => {
    const target = makeTarget();
    const scene = makeScene([target]);
    const cam = makeController(scene, makeViewport());
    mockSample.mockReturnValue("#123456"); // nothing in the scene has this color

    expect(cam.attemptCapture()).toBeNull();
    expect(scene.definition.objects[0].found).toBeUndefined();
  });

  test("missed shot still consumes the cooldown (spamming shutter is rate-limited)", () => {
    const target = makeTarget();
    const scene = makeScene([target]);
    const cam = makeController(scene, makeViewport());
    mockSample.mockReturnValueOnce(null).mockReturnValueOnce("#ff0000");

    expect(cam.attemptCapture()).toBeNull(); // miss: nothing at sample point
    expect(cam.attemptCapture()).toBeNull(); // blocked by cooldown, not sampled

    jest.advanceTimersByTime(1000);

    expect(cam.attemptCapture()?.name).toBe("elephant"); // recovered
  });

  test("capture with no unfound target returns null (scene already complete)", () => {
    const target = makeTarget({ found: true });
    const scene = makeScene([target]);
    const cam = makeController(scene, makeViewport());
    mockSample.mockReturnValue("#ff0000");

    expect(cam.attemptCapture()).toBeNull();
  });

  test("capture without tap coordinates samples at the viewport center", () => {
    const vp = makeViewport();
    const target = makeTarget();
    const scene = makeScene([target]);
    const cam = makeController(scene, vp);
    mockSample.mockReturnValue("#ff0000");

    cam.attemptCapture();

    expect(mockSample).toHaveBeenCalledWith(
      scene.mask,
      Math.round(vp.x + vp.width / 2),
      Math.round(vp.y + vp.height / 2),
    );
  });

  test("capture with tap coordinates samples exactly at the tap", () => {
    const vp = makeViewport();
    const target = makeTarget();
    const scene = makeScene([target]);
    const cam = makeController(scene, vp);
    mockSample.mockReturnValue("#ff0000");

    cam.attemptCapture(451.6, 399.2);

    expect(mockSample).toHaveBeenCalledWith(scene.mask, 452, 399);
  });

  test("exposes aim tolerance for the debug overlay", () => {
    const cam = makeController(makeScene([makeTarget()]), makeViewport());
    expect(cam.getAimTolerance()).toBe(200);
  });
});
