/**
 * GameManager integration tests focused on documented historical regressions:
 *
 * - Phase 2.3: `window.__app.cameraCtrl` was always null because `__app` was
 *   exported before cameraCtrl assignment (Cypress depends on __app).
 * - Phase 5: `advanceObjective` looked up the current objective by reference
 *   (`renderer.currentObjective === objectives[i]`), which never matched
 *   because renderer.currentObjective is a fresh object literal — with 2+
 *   objectives the game could never advance.
 *
 * The suite drives the real GameManager through DOM events (canvas clicks,
 * shutter presses, polaroid dismissal) with only the seams faked: image
 * loading (jsdom never loads images) and canvas 2D (jsdom has none).
 */
import { GameManager } from "../src/core/GameManager";
import { Scene } from "../src/scene/Scene";
import type { SceneLoader } from "../src/services/SceneLoader";
import { Confetti } from "../src/ui/Confetti";
import {
  installFakeCanvas2D,
  uninstallFakeCanvas2D,
  makeFakeImage,
  paintRect,
} from "./helpers/fakeCanvas2d";

interface AppGlobal {
  __app?: {
    scene: Scene;
    renderer: unknown;
    cameraCtrl: unknown;
  };
}

/** Narrow an optional value to non-undefined or fail the test with context. */
function expectDefined<T>(value: T | undefined, label = "value"): T {
  if (value === undefined) throw new Error(`expected ${label} to be defined`);
  return value;
}

/** getElementById that fails loudly when the fixture is missing the node. */
function el(id: string): HTMLElement {
  const node = document.getElementById(id);
  if (!node) throw new Error(`#${id} is missing from the DOM`);
  return node;
}

/** querySelector that fails loudly when the selector matches nothing. */
function qs<T extends Element = Element>(selector: string): T {
  const node = document.querySelector<T>(selector);
  if (!node) throw new Error(`${selector} is missing from the DOM`);
  return node;
}

const GREEN: [number, number, number, number] = [0, 255, 0, 255];
const BLUE: [number, number, number, number] = [0, 0, 255, 255];
const CLEAR: [number, number, number, number] = [0, 0, 0, 0];

const SCENE_W = 800;
const SCENE_H = 600;

const PHOTO_DEF: Record<string, unknown> = {
  name: "photo_scene",
  sceneType: "photo",
  objects: [{ name: "lion1", color: "#00ff00", tags: ["lion"] }],
  objectives: [
    { title: "Find the lion", tags: ["lion"], emoji: "\u{1F981}" },
  ],
};

const WIMMEL_DEF: Record<string, unknown> = {
  name: "wimmel_scene",
  sceneType: "wimmelbild",
  objects: [
    { name: "lion1", color: "#00ff00", tags: ["lion"] },
    { name: "frog1", color: "#0000ff", tags: ["frog"] },
  ],
  objectives: [
    { title: "Find the lion", tags: ["lion"], emoji: "\u{1F981}" },
    { title: "Find the frog", tags: ["frog"], emoji: "\u{1F438}" },
  ],
};

interface FakeLoader {
  loader: SceneLoader;
  fetchDefinition: jest.Mock;
  capturedPicker: ((name: string) => void) | undefined;
}

function makeFakeLoader(
  defs: Record<string, Record<string, unknown>>,
): FakeLoader {
  let capturedPicker: ((name: string) => void) | undefined;
  const fetchDefinition = jest.fn(async (name: string) => defs[name] ?? null);
  const buildScenePicker = jest.fn(
    async (_list: HTMLElement, onSelect: (name: string) => void) => {
      capturedPicker = onSelect;
    },
  );
  const loader = {
    fetchManifest: jest.fn(async () => []),
    fetchDefinition,
    populateSceneSelect: jest.fn(async () => undefined),
    buildScenePicker,
  } as unknown as SceneLoader;
  return {
    loader,
    fetchDefinition,
    get capturedPicker() {
      return capturedPicker;
    },
  };
}

// Painted onto the fake mask during Scene.loadImages, i.e. before
// extractPositionsFromMask runs inside init().
let pendingMaskPaint: ((mask: HTMLImageElement) => void) | null = null;

function installFixture(): {
  canvas: HTMLCanvasElement;
  shutter: HTMLButtonElement;
  sceneSelect: HTMLSelectElement;
} {
  document.body.innerHTML = `
    <div id="ui">
      <button id="shutter">capture</button>
      <select id="sceneSelect"></select>
    </div>
    <div class="viewfinder">
      <canvas id="game"></canvas>
      <div id="camera-frame"></div>
    </div>
    <div id="viewport"></div>
    <button id="back"></button>
    <div id="scenePicker"><div id="sceneList"></div></div>
    <div id="objective"></div>
  `;
  const canvas = document.getElementById("game") as HTMLCanvasElement;
  const shutter = document.getElementById("shutter") as HTMLButtonElement;
  const sceneSelect = document.getElementById("sceneSelect") as HTMLSelectElement;
  // jsdom reports zero-size rects; give the canvas a realistic 800x600 box so
  // screen<->world mapping in click handling is a clean 1:1 offset:
  // world = viewport.(600,200) + screen
  jest.spyOn(canvas, "getBoundingClientRect").mockReturnValue({
    x: 0,
    y: 0,
    left: 0,
    top: 0,
    right: 800,
    bottom: 600,
    width: 800,
    height: 600,
    toJSON: () => ({}),
  } as unknown as DOMRect);
  return { canvas, shutter, sceneSelect };
}

async function boot(
  defs: Record<string, Record<string, unknown>>,
  loadName: string = Object.keys(defs)[0],
  paintMask?: (mask: HTMLImageElement) => void,
): Promise<{ manager: GameManager; fake: FakeLoader }> {
  const fake = makeFakeLoader(defs);
  // history.replaceState sets location.search without triggering jsdom
  // navigation (assigning window.location.search directly is "not implemented")
  window.history.replaceState({}, "", `/?scene=${loadName}`);
  pendingMaskPaint = paintMask ?? null;
  const { canvas, shutter, sceneSelect } = installFixture();
  const manager = new GameManager(canvas, shutter, sceneSelect, fake.loader);
  await manager.init();
  return { manager, fake };
}

/** Flush pending microtasks (async init chains resolve without timers). */
async function flushMicrotasks(rounds = 10): Promise<void> {
  for (let i = 0; i < rounds; i++) await Promise.resolve();
}

function clickCanvas(
  canvas: HTMLCanvasElement,
  clientX: number,
  clientY: number,
): void {
  canvas.dispatchEvent(
    new MouseEvent("click", { clientX, clientY, bubbles: true }),
  );
}

beforeAll(() => {
  installFakeCanvas2D();
});

afterAll(() => {
  uninstallFakeCanvas2D();
});

beforeEach(() => {
  jest.useFakeTimers();
  // deterministic Fisher-Yates in loadSceneByName: j === i, order preserved
  jest.spyOn(Math, "random").mockReturnValue(0.999999);
  jest.spyOn(console, "log").mockImplementation(() => undefined);
  jest.spyOn(console, "warn").mockImplementation(() => undefined);
  jest.spyOn(console, "error").mockImplementation(() => undefined);
  // jsdom never loads images; attach pixel-backed fakes instead so mask
  // sampling and centroid extraction see real pixels
  jest
    .spyOn(Scene.prototype, "loadImages")
    .mockImplementation(async function (this: Scene) {
      this.image = makeFakeImage(SCENE_W, SCENE_H, [50, 50, 50, 255]);
      this.mask = makeFakeImage(SCENE_W, SCENE_H, CLEAR);
      pendingMaskPaint?.(this.mask);
    });
});

afterEach(() => {
  pendingMaskPaint = null;
  window.history.replaceState({}, "", "/");
  jest.restoreAllMocks();
  jest.useRealTimers();
  document.body.innerHTML = "";
  delete (window as unknown as AppGlobal).__app;
});

describe("GameManager boot", () => {
  it("exposes a non-null cameraCtrl on window.__app for photo scenes (Phase 2.3 regression)", async () => {
    const { manager } = await boot({ photo_scene: PHOTO_DEF });
    const app = expectDefined(
      (window as unknown as AppGlobal).__app,
      "window.__app",
    );
    expect(app.cameraCtrl).not.toBeNull();
    expect(app.cameraCtrl).toBe(manager.cameraCtrl);
  });

  it("exposes a null cameraCtrl on window.__app for wimmelbild scenes", async () => {
    await boot({ wimmel_scene: WIMMEL_DEF });
    const app = expectDefined(
      (window as unknown as AppGlobal).__app,
      "window.__app",
    );
    expect(app.cameraCtrl).toBeNull();
  });

  it("sets the first objective as current and labels the HUD", async () => {
    const { manager } = await boot({ wimmel_scene: WIMMEL_DEF });
    expect(manager.renderer.currentObjective?.title).toBe("Find the lion");
    expect(el("objective").textContent).toBe("\u{1F981}");
  });

  it("hides the shutter UI for wimmelbild scenes", async () => {
    await boot({ wimmel_scene: WIMMEL_DEF });
    expect(el("ui").style.display).toBe("none");
    expect(qs<HTMLDivElement>(".viewfinder").style.display).toBe("none");
  });

  it("resolves init and reports the failure when a scene cannot be loaded", async () => {
    await boot({ photo_scene: PHOTO_DEF }, "does_not_exist");
    const errSpy = console.error as jest.Mock;
    expect(errSpy).toHaveBeenCalledWith(
      "Scene load failed:",
      expect.any(Error),
    );
    // init must not reject even when the scene is missing
    expect((window as unknown as AppGlobal).__app).toBeUndefined();
  });

  it("bails out early with an error log when required DOM elements are missing", async () => {
    const fake = makeFakeLoader({ photo_scene: PHOTO_DEF });
    const manager = new GameManager(
      null as unknown as HTMLCanvasElement,
      null as unknown as HTMLButtonElement,
      null as unknown as HTMLSelectElement,
      fake.loader,
    );
    await expect(manager.init()).resolves.toBeUndefined();
    expect(console.error).toHaveBeenCalledWith(
      "Missing required DOM elements.",
    );
    expect(fake.fetchDefinition).not.toHaveBeenCalled();
  });
});

describe("wimmelbild tap-to-find flow", () => {
  it("marks the tapped animal found and advances to the next objective (Phase 5 regression)", async () => {
    const { manager } = await boot(
      { wimmel_scene: WIMMEL_DEF },
      "wimmel_scene",
      // viewport starts at world (200,150) showing 400x300 across the 800x600
      // canvas; screen (100,100) maps to world (250,200)
      (mask) => paintRect(mask, 230, 180, 40, 40, GREEN),
    );
    const canvas = document.getElementById("game") as HTMLCanvasElement;

    clickCanvas(canvas, 100, 100);

    expect(manager.scene.definition.objects[0].found).toBe(true);
    // old code never advanced here: reference lookup of renderer.currentObjective
    expect(manager.renderer.currentObjective?.title).toBe("Find the frog");
    expect(el("objective").textContent).toBe("\u{1F438}");
  });

  it("completes the final objective without advancing and without celebration", async () => {
    const burstSpy = jest.spyOn(Confetti.prototype, "burst");
    const { manager } = await boot(
      { wimmel_scene: WIMMEL_DEF },
      "wimmel_scene",
      (mask) => {
        paintRect(mask, 230, 180, 40, 40, GREEN); // lion → screen (100,100)
        paintRect(mask, 430, 330, 40, 40, BLUE); // frog → screen (500,400)
      },
    );
    const canvas = document.getElementById("game") as HTMLCanvasElement;

    clickCanvas(canvas, 100, 100); // lion
    clickCanvas(canvas, 500, 400); // frog — completes the last objective

    expect(manager.scene.definition.objects.every((o) => o.found)).toBe(true);
    // celebration only fires via the polaroid dismissal path (celebrate=true)
    expect(burstSpy).not.toHaveBeenCalled();
    expect(manager.renderer.currentObjective?.title).toBe("Find the frog");
  });

  it("updates the objective progress strip as objectives complete", async () => {
    await boot(
      { wimmel_scene: WIMMEL_DEF },
      "wimmel_scene",
      (mask) => paintRect(mask, 230, 180, 40, 40, GREEN),
    );
    const canvas = document.getElementById("game") as HTMLCanvasElement;

    clickCanvas(canvas, 100, 100);

    const spans = document.querySelectorAll("#objectiveProgress span");
    expect(spans).toHaveLength(2);
    expect(spans[0].textContent).toContain("\u{2705}\u{279C}"); // done
    expect(spans[1].textContent).not.toContain("\u{2705}"); // pending
  });

  it("ignores taps on empty mask areas without marking or advancing", async () => {
    const { manager } = await boot({ wimmel_scene: WIMMEL_DEF });
    const canvas = document.getElementById("game") as HTMLCanvasElement;
    // mask left fully transparent — no animal anywhere near the tap

    clickCanvas(canvas, 100, 100);

    expect(manager.scene.definition.objects.some((o) => o.found)).toBe(false);
    expect(manager.renderer.currentObjective?.title).toBe("Find the lion");
  });
});

describe("photo shutter flow", () => {
  it("captures the centered animal, shows the polaroid, and celebrates on dismissal", async () => {
    const burstSpy = jest.spyOn(Confetti.prototype, "burst");
    const { manager } = await boot(
      { photo_scene: PHOTO_DEF },
      "photo_scene",
      // lion block centered at world (400,300) = initial viewport center, so
      // nudge resolves "already-centered" and capture samples the center
      (mask) => paintRect(mask, 380, 280, 40, 40, GREEN),
    );
    const shutter = document.getElementById("shutter") as HTMLButtonElement;

    shutter.click();
    await flushMicrotasks();
    jest.advanceTimersByTime(1000); // polaroid show delay

    expect(manager.scene.definition.objects[0].found).toBe(true);
    expect(manager.renderer.suppressCelebration).toBe(true);
    const overlay = document.querySelector('[data-test-id="polaroid-overlay"]');
    expect(overlay).not.toBeNull();

    // dismissing the polaroid triggers the celebrate=true advancement path
    (overlay as HTMLElement).click();
    expect(manager.renderer.suppressCelebration).toBe(false);
    expect(burstSpy).toHaveBeenCalledWith(60);
    // hide() runs synchronously in the dismiss handler
    expect(
      document.querySelector('[data-test-id="polaroid-overlay"]'),
    ).toBeNull();
    // confetti's stop() timer is left pending; fake timers are discarded
  });

  it("finds nothing when the shutter samples an empty area, even with the animal in view", async () => {
    const { manager } = await boot(
      { photo_scene: PHOTO_DEF },
      "photo_scene",
      // lion at world (300..340, 200..240): inside the viewport (200..600,
      // 150..450) so capture is attempted and nudge says already-centered,
      // but >12px from the center sample point (400,300) → sampling misses
      (mask) => paintRect(mask, 300, 200, 40, 40, GREEN),
    );
    const shutter = document.getElementById("shutter") as HTMLButtonElement;

    shutter.click();
    await flushMicrotasks();

    expect(manager.scene.definition.objects[0].found).toBeFalsy();
    expect(
      document.querySelector('[data-test-id="polaroid-overlay"]'),
    ).toBeNull();
  });
});

describe("scene picker flow", () => {
  it("loads the picked scene, hides the picker, and updates the URL", async () => {
    const oceanDef: Record<string, unknown> = {
      name: "ocean",
      sceneType: "photo",
      objects: [{ name: "shark1", color: "#ff0000", tags: ["shark"] }],
      objectives: [
        { title: "Find the shark", tags: ["shark"], emoji: "\u{1F988}" },
      ],
    };
    const pushSpy = jest
      .spyOn(window.history, "pushState")
      .mockImplementation(() => undefined);
    const { fake } = await boot(
      { photo_scene: PHOTO_DEF, ocean: oceanDef },
      "photo_scene",
    );

    expect(fake.capturedPicker).toBeDefined();
    expectDefined(fake.capturedPicker, "capturedPicker")("ocean");
    await flushMicrotasks();

    const app = expectDefined(
      (window as unknown as AppGlobal).__app,
      "window.__app",
    );
    expect(app.scene.definition.name).toBe("ocean");
    expect(el("scenePicker").style.display).toBe("none");
    expect(el("viewport").style.display).toBe("inline-block");
    expect(pushSpy).toHaveBeenCalledWith(
      {},
      "",
      expect.stringContaining("scene=ocean"),
    );
  });
});
