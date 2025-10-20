import { SceneRenderer } from "../src/sceneRenderer";
import { Scene } from "../src/scene";

// Create reusable mock for CanvasRenderingContext2D
function createMockContext() {
  const ctx = {
    clearRect: jest.fn(),
    drawImage: jest.fn(),
    fillRect: jest.fn(),
    fillStyle: "",
    save: jest.fn(),
    restore: jest.fn(),
    globalAlpha: 1,
    fillText: jest.fn(),
    font: "",
    textAlign: "",
    textBaseline: "",
    beginPath: jest.fn(),
    arc: jest.fn(),
    stroke: jest.fn(),
    lineWidth: 0,
    strokeStyle: "",
  } as unknown as CanvasRenderingContext2D;
  return ctx;
}

// helper to create a fake scene
function createFakeScene(): Scene {
  const scene = Object.create(Scene.prototype);
  scene.definition = {
    name: "test",
    animals: [
      { name: "Elephant", color: "#ff0000", tags: ["elephant"], found: false },
      { name: "Lion", color: "#00ff00", tags: ["lion"], found: true },
    ],
    objectives: [{ title: "Find animals", tag: "any" }],
  };
  scene.image = Object.assign(new Image(), { width: 200, height: 100 });
  scene.mask = Object.assign(new Image(), { width: 200, height: 100 });
  return scene;
}

describe("SceneRenderer", () => {
  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D;
  let renderer: SceneRenderer;
  let scene: Scene;

  beforeEach(() => {
    canvas = Object.assign(document.createElement("canvas"), {
      width: 800,
      height: 400,
    });
    ctx = createMockContext();
    scene = createFakeScene();

    renderer = new SceneRenderer(canvas);
    (renderer as any).ctx = ctx; // replace real ctx with mock
    renderer.setScene(scene);
  });

  describe("initialization", () => {
    it("creates renderer with correct canvas dimensions", () => {
      expect(renderer).toBeDefined();
      expect(canvas.width).toBe(800);
      expect(canvas.height).toBe(400);
    });

    it("assigns the given scene", () => {
      expect((renderer as any).scene).toBe(scene);
    });
  });

  describe("draw()", () => {
    it("clears the canvas before drawing", () => {
      renderer.draw();
      expect(ctx.clearRect).toHaveBeenCalledWith(0, 0, 800, 400);
    });

    it("draws the scene image when a scene is active", () => {
      renderer.draw();
      expect(ctx.drawImage).toHaveBeenCalledWith(scene.image, 0, 0, 800, 400);
    });

    it("draws overlays for found animals", () => {
      renderer.draw();
      // we should see stroke/outline for the lion (found = true)
      expect(ctx.stroke).toHaveBeenCalled();
    });
  });

  describe("flash()", () => {
    jest.useFakeTimers();

    it("triggers flash effect and fades out", () => {
      renderer.triggerFlash();
      expect((renderer as any).flashAlpha).toBe(1);

      // simulate animation fading
      jest.advanceTimersByTime(500);
      expect((renderer as any).flashAlpha).toBeLessThan(1);
    });
  });

  describe("celebration()", () => {
    it("draws victory overlay when all animals are found", () => {
      scene.definition.animals.forEach(a => (a.found = true));
      renderer.draw();
      expect(ctx.fillText).toHaveBeenCalledWith(
        expect.stringMatching(/Bravo|All found/i),
        expect.any(Number),
        expect.any(Number)
      );
    });
  });

  describe("task display", () => {
    it("renders current objective text or emoji overlay", () => {
      renderer.currentObjective = {
        title: "Find 🐘",
        tag: "elephant",
        emoji: "🐘",
      };
      renderer.draw();
      expect(ctx.fillText).toHaveBeenCalledWith(
        expect.stringMatching(/🐘/),
        expect.any(Number),
        expect.any(Number)
      );
    });
  });
});
