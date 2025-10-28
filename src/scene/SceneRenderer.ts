// src/scene/SceneRenderer.ts
import { Scene } from "./Scene.js";
import { Viewport } from "./Viewport.js";

export class SceneRenderer {
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private scene?: Scene;
  public viewport?: Viewport;

  private cameraX = 0;
  private cameraY = 0;

  // define how far you can move
  private maxX = 0;
  private maxY = 0;

  private flashAlpha = 0;
  private readonly flashFadeRate = 0.06;
  private flashActive = false;
  public suppressCelebration = false;

  private objectiveColors: Record<string, string> = {};
  public currentObjective?: { title: string; tag: string; emoji?: string };

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D not supported");
    this.ctx = ctx;
  }

  setScene(scene: Scene) {
    this.scene = scene;

    // create viewport that shows a fraction of the scene (e.g. 40% width)
    const canvasW = this.canvas.width;
    const canvasH = this.canvas.height;
    const sceneW = scene.image.width;
    const sceneH = scene.image.height;

    // choose viewport size: fraction of full scene width/height (keeps aspect)
    const fraction = 0.4; // show 40% of world horizontally
    const vw = Math.max(
      Math.min(Math.round(sceneW * fraction), sceneW),
      Math.round(canvasW / 2)
    );
    const vh = Math.round((vw * canvasH) / canvasW); // preserve screen aspect ratio
    this.viewport = new Viewport(sceneW, sceneH, vw, vh);

    // objective colors
    this.objectiveColors = {};
    if (scene.definition.objectives) {
      for (const o of scene.definition.objectives) {
        const tags = o.tags?.length ? o.tags : o.tag ? [o.tag] : [];
        for (const t of tags) this.objectiveColors[t] = this.randomBrightColor();
      }
    }

    // compute scrollable bounds
    this.maxX = Math.max(0, scene.image.width - this.canvas.width);
    this.maxY = Math.max(0, scene.image.height - this.canvas.height);
  }

  update() {
    if (this.flashActive) {
      this.flashAlpha -= this.flashFadeRate;
      if (this.flashAlpha <= 0) {
        this.flashAlpha = 0;
        this.flashActive = false;
      }
    }
  }

  draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    if (!this.scene || !this.viewport) {
      this.drawNoScene();
      return;
    }

  // Draw source rect (viewport.world) to full canvas.
  // The viewport stores world pixels to show; draw that region from the scene image
  // and scale it to the canvas backing resolution.
  const sx = this.viewport.x;
  const sy = this.viewport.y;
  const sWidth = this.viewport.width;
  const sHeight = this.viewport.height;
  const dx = 0;
  const dy = 0;
  const dWidth = this.canvas.width;
  const dHeight = this.canvas.height;

  ctx.drawImage(this.scene.image, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight);

    // draw outlines for found animals that are within viewport
    this.drawFoundOutlines();

    // flash overlay
    if (this.flashAlpha > 0) {
      ctx.save();
      ctx.globalAlpha = this.flashAlpha;
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      ctx.restore();
    }

  // objective HUD is rendered in DOM (side panel). Renderer only draws scene.

    // celebration overlay (can be suppressed while polaroid is shown)
  const objectiveAnimals = this.scene.getAnimalsForObjective(this.currentObjective);
  if (!this.suppressCelebration && this.scene.allFound(objectiveAnimals)) {
      this.drawCelebration();
    }
  }

  triggerFlash() {
  console.log("[renderer] triggerFlash");
  // longer flash for visual feedback
  this.flashAlpha = 1;
  this.flashActive = true;
  }

  private drawFoundOutlines() {
    if (!this.scene || !this.viewport) return;
    const ctx = this.ctx;

    for (const animal of this.scene.definition.animals) {
      if (!animal.found) continue;
      if (animal.x == null || animal.y == null) continue;

  // is centroid inside viewport?
  if (!this.viewport.contains(animal.x, animal.y)) continue;

  // convert world coords -> screen coords (account for scaling)
  const relX = (animal.x - this.viewport.x) / this.viewport.width;
  const relY = (animal.y - this.viewport.y) / this.viewport.height;
  const screenX = Math.round(relX * this.canvas.width);
  const screenY = Math.round(relY * this.canvas.height);
      const screenRadius = Math.max(
        8,
        Math.round(
          (animal.radius ?? 20) * (this.canvas.width / this.viewport.width)
        )
      );

      // color by objective tag (first tag)
      const tag = animal.tags?.[0] ?? "default";
      const color = this.objectiveColors[tag] ?? "#ff0";

      ctx.save();
      ctx.beginPath();
      ctx.lineWidth = Math.max(3, Math.round(screenRadius * 0.18));
      ctx.strokeStyle = color;
      ctx.arc(screenX, screenY, screenRadius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  private drawNoScene() {
    const ctx = this.ctx;
    ctx.fillStyle = "#444";
    ctx.font = "20px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(
      "No scene loaded",
      this.canvas.width / 2,
      this.canvas.height / 2
    );
  }

  private drawCelebration() {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    ctx.fillStyle = "white";
    ctx.font = "bold 44px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const foundCount =
      this.scene?.definition.animals.filter((a) => a.found).length ?? 0;
    ctx.fillText(
      `🎉 ${foundCount} photographed! 🎉`,
      this.canvas.width / 2,
      this.canvas.height / 2
    );

    ctx.restore();
  }

  private randomBrightColor(): string {
    const hue = Math.floor(Math.random() * 360);
    return `hsl(${hue}, 100%, 60%)`;
  }

  moveCamera(dx: number, dy: number) {
    // move the viewport in world pixels
    if (!this.viewport) return;
    this.viewport.pan(dx, dy);
  }
}
