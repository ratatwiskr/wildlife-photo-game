// src/core/GameManager.ts
import { Scene } from "../scene/Scene.js";
import { SceneRenderer } from "../scene/SceneRenderer.js";
import { CameraController } from "../camera/CameraController.js";
import { PolaroidUI } from "../ui/Polaroid.js";
import { Confetti } from "../ui/Confetti.js";
import { sampleMaskPixel } from "../utils/MaskSampler.js";
import { SceneLoader } from "../services/SceneLoader.js";
import { basePath } from "../config.js";

export class GameManager {
  scene!: Scene;
  renderer!: SceneRenderer;
  cameraCtrl: CameraController | null = null;

  private readonly canvas: HTMLCanvasElement;
  private readonly shutter: HTMLButtonElement;
  private readonly sceneSelect: HTMLSelectElement;
  private readonly polaroidUi = new PolaroidUI();
  private readonly confetti = new Confetti();
  private readonly sceneLoader: SceneLoader;

  private pausedForPolaroid = false;
  private isLoaded = false;
  private lastTime = 0;

  private isDragging = false;
  private lastX = 0;
  private lastY = 0;
  private lastTapWorld: { x: number; y: number } | null = null;

  constructor(
    canvas: HTMLCanvasElement,
    shutter: HTMLButtonElement,
    sceneSelect: HTMLSelectElement,
    sceneLoader: SceneLoader,
  ) {
    this.canvas = canvas;
    this.shutter = shutter;
    this.sceneSelect = sceneSelect;
    this.sceneLoader = sceneLoader;
  }

  async init(): Promise<void> {
    if (!this.canvas || !this.shutter || !this.sceneSelect) {
      console.error("Missing required DOM elements.");
      return;
    }

    this.renderer = new SceneRenderer(this.canvas);

    this.resizeCanvasToDisplaySize();
    window.addEventListener("resize", () => {
      this.resizeCanvasToDisplaySize();
      if (this.renderer && this.scene) {
        this.renderer.setScene(this.scene);
      }
    });

    // fire-and-forget: populate scene select in background (original init did not
    // await this — `populateSceneSelect` was an async IIFE inside the old `init()`)
    this.sceneLoader.populateSceneSelect(this.sceneSelect).catch(console.error);

    const params = new URLSearchParams(window.location.search);
    const sceneName = params.get("scene") || "jungle_adventure";

    try {
      await this.loadSceneByName(sceneName);

      // setup back button
      const backBtn = document.getElementById("back");
      const scenePicker = document.getElementById("scenePicker");
      const sceneList = document.getElementById("sceneList");
      if (backBtn && scenePicker && sceneList) {
        backBtn.addEventListener("click", () => {
          const vp = document.getElementById("viewport");
          console.debug("[main] back pressed, toggling scene picker");
          if (scenePicker.style.display === "block") {
            scenePicker.style.display = "none";
            if (vp) vp.style.display = "inline-block";
            return;
          }
          scenePicker.style.display = "block";
          if (vp) vp.style.display = "none";
        });

        // populate scene picker from manifest
        await this.sceneLoader.buildScenePicker(sceneList, (name) => {
          this.loadSceneByName(name)
            .then(() => {
              const scenePickerEl = document.getElementById("scenePicker");
              const vp = document.getElementById("viewport");
              if (scenePickerEl) scenePickerEl.style.display = "none";
              if (vp) vp.style.display = "inline-block";
              try {
                const newUrl = new URL(window.location.href);
                newUrl.searchParams.set("scene", name);
                window.history.pushState({}, "", newUrl.toString());
              } catch (e) {
                // ignore history failures
              }
            })
            .catch((e) => {
              console.error("Failed to load scene on card click", name, e);
            });
        });
      }

      this.canvas.addEventListener("click", (e) => this.onCanvasClick(e));
      this.initShutterListener();
    } catch (err) {
      console.error("Scene load failed:", err);
      this.drawErrorMessage(`Could not load scene: ${sceneName}`);
      return;
    }

    // drag handlers
    this.canvas.addEventListener("pointerdown", (e) => {
      this.isDragging = true;
      this.lastX = e.clientX;
      this.lastY = e.clientY;
      this.canvas.setPointerCapture(e.pointerId);
    });

    this.canvas.addEventListener("pointermove", (e) => {
      if (!this.isDragging || !this.scene || !this.renderer || !this.renderer.viewport) return;
      const rect = this.canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const dxCss = e.clientX - this.lastX;
      const dyCss = e.clientY - this.lastY;
      this.lastX = e.clientX;
      this.lastY = e.clientY;
      const dx = dxCss * dpr;
      const dy = dyCss * dpr;
      if (Math.abs(dx) > 0 || Math.abs(dy) > 0) {
        console.log("[main] dragging delta (backing px)", { dx, dy });
      }
      const worldDx = (dx / this.canvas.width) * this.renderer.viewport.width;
      const worldDy = (dy / this.canvas.height) * this.renderer.viewport.height;
      this.renderer.viewport.pan(-worldDx, -worldDy);
    });

    this.canvas.addEventListener("pointerup", (e) => {
      this.isDragging = false;
      this.canvas.releasePointerCapture(e.pointerId);
    });

    // debug toggle
    window.addEventListener("keydown", (e) => {
      if (e.key.toLowerCase() === "d") {
        if (this.renderer) {
          this.renderer.debug = !this.renderer.debug;
          const frame = document.getElementById("camera-frame");
          if (frame) {
            if (this.renderer.debug) frame.classList.add("debug-mode");
            else frame.classList.remove("debug-mode");
          }
          if (this.cameraCtrl && this.renderer.debug) {
            const tol = this.cameraCtrl.getAimTolerance?.();
            if (tol) this.renderer.debugTolerance = tol;
          } else {
            this.renderer.debugTolerance = undefined;
          }
          console.log("[main] debug mode", this.renderer.debug);
        }
      }
    });

    requestAnimationFrame((t) => this.loop(t));
  }

  // ---- private helpers ----

  private resizeCanvasToDisplaySize(): void {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    const w = Math.max(1, Math.round(rect.width * dpr));
    const h = Math.max(1, Math.round(rect.height * dpr));
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
  }

  private shuffleArray<T>(arr: T[]): T[] {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = a[i];
      a[i] = a[j];
      a[j] = tmp;
    }
    return a;
  }

  private drawErrorMessage(text: string): void {
    const ctx = this.canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.fillStyle = "gray";
    ctx.font = "24px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, this.canvas.width / 2, this.canvas.height / 2);
  }

  // ---- scene loading ----

  private async loadSceneByName(name: string): Promise<void> {
    const defUrl = `${basePath}/assets/scenes/${name}.json`;
    console.log("[main] loading", defUrl);
    const res = await fetch(defUrl);
    if (!res.ok) throw new Error(`Failed to load ${defUrl}`);
    const def: Record<string, unknown> = await res.json();

    if (
      def.objectives &&
      Array.isArray(def.objectives) &&
      def.objectives.length > 1
    ) {
      def.objectives = this.shuffleArray(def.objectives);
    }

    this.scene = new Scene(def as any);
    await this.scene.loadImages();
    this.scene.extractPositionsFromMask();

    this.renderer.setScene(this.scene);
    if (def.objectives && (def.objectives as any[])[0]) {
      const first = (def.objectives as any[])[0];
      const tag =
        first.tags && first.tags.length ? first.tags[0] : first.tag || "";
      this.renderer.currentObjective = {
        title: first.title,
        tag,
        emoji: first.emoji,
      };
    } else {
      this.renderer.currentObjective = undefined;
    }
    const objEl = document.getElementById("objective");
    if (objEl && def.objectives && (def.objectives as any[])[0]) {
      objEl.textContent =
        (def.objectives as any[])[0].emoji ||
        (def.objectives as any[])[0].title ||
        "📍";
    }
    this.isLoaded = true;

    const sceneSelectEl = document.getElementById("sceneSelect");
    if (sceneSelectEl) sceneSelectEl.style.display = "none";

    const uiEl = document.getElementById("ui");
    const viewfinderEl = document.querySelector(
      ".viewfinder",
    ) as HTMLElement | null;
    if (this.scene.definition.sceneType === "wimmelbild") {
      if (uiEl) uiEl.style.display = "none";
      if (viewfinderEl) viewfinderEl.style.display = "none";
    } else {
      if (uiEl) uiEl.style.display = "";
      if (viewfinderEl) viewfinderEl.style.display = "";
    }

    if (this.renderer.viewport) {
      if (this.scene.definition.sceneType === "photo") {
        this.cameraCtrl = new CameraController(
          this.scene,
          this.renderer.viewport,
        );
      } else {
        this.cameraCtrl = null;
      }
    }

    try {
      window.__app = {
        scene: this.scene,
        renderer: this.renderer,
        cameraCtrl: this.cameraCtrl,
      };
    } catch (e) {
      /* ignore */
    }

    const sceneSelectEl2 = document.getElementById(
      "sceneSelect",
    ) as HTMLSelectElement | null;
    if (sceneSelectEl2) sceneSelectEl2.value = name;

    this.updateObjectiveProgress();
  }

  // ---- click handling (canvas) ----

  private onCanvasClick(e: MouseEvent): void {
    if (!this.isLoaded || !this.renderer || !this.renderer.viewport || !this.scene) return;

    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const clickX = (e.clientX - rect.left) * dpr;
    const clickY = (e.clientY - rect.top) * dpr;

    const vx = this.renderer.viewport.x;
    const vy = this.renderer.viewport.y;
    const worldX = vx + (clickX / this.canvas.width) * this.renderer.viewport.width;
    const worldY = vy + (clickY / this.canvas.height) * this.renderer.viewport.height;

    console.log("[main] onCanvasClick world coords", { x: worldX, y: worldY });

    if (
      worldX < 0 ||
      worldY < 0 ||
      worldX >= this.scene.mask.width ||
      worldY >= this.scene.mask.height
    )
      return;

    if (this.scene.definition.sceneType === "wimmelbild") {
      try {
        const hex = sampleMaskPixel(this.scene.mask, worldX, worldY);
        const foundName: string | null = hex ? this.scene.markFoundByColor(hex) : null;

        if (foundName) {
          if (this.renderer) this.renderer.triggerFlash();
          this.updateObjectiveProgress();
          this.advanceObjective(false);
        }
      } catch (e) {
        console.error("Wimmelbild click handling failed", e);
      }
      return;
    }

    this.lastTapWorld = { x: worldX, y: worldY };
  }

  // ---- shutter ----

  private initShutterListener(): void {
    this.shutter.addEventListener("click", async () => {
      console.log("[main] shutter pressed", { lastTapWorld: this.lastTapWorld });
      if (!this.cameraCtrl) {
        this.renderer.triggerFlash();
        return;
      }

      const objectives = this.scene.definition.objectives || [];
      console.log(
        "[main] objectives",
        objectives.map((o) => ({
          emoji: o.emoji || o.title,
          tag: o.tag || (o.tags && o.tags[0]) || undefined,
          found: this.scene.getObjectsForObjective(o).filter((a) => a.found).length,
        })),
      );

      const obj = this.renderer.currentObjective;
      const fallback = this.scene.definition.objectives?.[0];
      const objects = obj
        ? this.scene.getObjectsForObjective(obj)
        : fallback
          ? this.scene.getObjectsForObjective(fallback)
          : this.scene.definition.objects;
      const target = objects.find((a) => !a.found);
      if (!target) {
        console.log("[main] no target remains");
        this.renderer.triggerFlash();
        return;
      }

      const nudgeResult = await this.cameraCtrl.nudgeToTarget(target, 2400);
      console.log("[main] nudge result", nudgeResult);

      if (nudgeResult === "skipped-too-far") {
        this.renderer.triggerFlash();
        const frame = document.getElementById("camera-frame");
        if (frame) {
          frame.classList.add("nudge-skip");
          setTimeout(() => frame.classList.remove("nudge-skip"), 800);
        }
        return;
      }

      if (nudgeResult === "already-centered" || nudgeResult === "nudged") {
        let tapX: number | undefined;
        let tapY: number | undefined;
        if (
          this.lastTapWorld &&
          this.scene &&
          this.lastTapWorld.x >= 0 &&
          this.lastTapWorld.y >= 0 &&
          this.lastTapWorld.x < this.scene.mask.width &&
          this.lastTapWorld.y < this.scene.mask.height
        ) {
          tapX = this.lastTapWorld.x;
          tapY = this.lastTapWorld.y;
        }
        const captureRes = this.cameraCtrl.attemptCapture(
          tapX,
          tapY,
          this.renderer.currentObjective,
        );

        this.renderer.triggerFlash();

        if (captureRes && captureRes.polaroid) {
          console.log("[main] captured", captureRes.name);
          this.renderer.suppressCelebration = true;
          setTimeout(() => {
            this.pausedForPolaroid = true;
            this.polaroidUi.onDismiss(() => {
              this.pausedForPolaroid = false;
              this.renderer.suppressCelebration = false;
              this.advanceObjective(true);
            });
            this.polaroidUi.show(captureRes.polaroid as HTMLCanvasElement);
          }, 1000);
        }
      }
    });
  }

  // ---- objective advancement ----

  private advanceObjective(celebrateOnComplete: boolean): void {
    const objectives = this.scene.definition.objectives || [];
    let currentIndex = objectives.findIndex(
      (o) => o === this.renderer.currentObjective,
    );
    if (currentIndex < 0) currentIndex = 0;
    const currentObj = objectives[currentIndex];
    const objectiveObjects = this.scene.getObjectsForObjective(currentObj);

    if (this.scene.allFound(objectiveObjects)) {
      if (currentIndex + 1 < objectives.length) {
        const nextObj = objectives[currentIndex + 1];
        const nextTag =
          nextObj.tags && nextObj.tags.length
            ? nextObj.tags[0]
            : nextObj.tag || "";
        this.renderer.currentObjective = {
          title: nextObj.title,
          tag: nextTag,
          emoji: nextObj.emoji,
        };
        const objEl = document.getElementById("objective");
        if (objEl && nextObj) {
          objEl.textContent = nextObj.emoji || nextObj.title || "📍";
        }
        console.log("[main] objective completed, advanced to next", nextObj);
      } else if (celebrateOnComplete) {
        this.confetti.burst(60);
        this.confetti.startContinuous(6);
        setTimeout(() => this.confetti.stop(), 2000);
      }
      this.updateObjectiveProgress();
    }
  }

  // ---- objective progress UI ----

  private updateObjectiveProgress(): void {
    const frame = document.getElementById("camera-frame");
    if (!frame || !this.scene) return;
    let prog = document.getElementById("objectiveProgress");
    if (!prog) {
      prog = document.createElement("div");
      prog.id = "objectiveProgress";
      prog.style.position = "absolute";
      prog.style.top = "8px";
      prog.style.right = "8px";
      prog.style.zIndex = "70";
      prog.style.display = "flex";
      prog.style.gap = "6px";
      prog.style.alignItems = "center";
      prog.style.padding = "6px";
      prog.style.background = "rgba(0,0,0,0.18)";
      prog.style.borderRadius = "8px";
      prog.style.backdropFilter = "blur(4px)";
      prog.style.color = "#fff";
      prog.style.fontSize = "18px";
      frame.appendChild(prog);
    }

    prog.innerHTML = "";
    const objectives = this.scene.definition.objectives || [];
    for (const obj of objectives) {
      const span = document.createElement("span");
      const objs = this.scene.getObjectsForObjective(obj);
      const done = this.scene.allFound(objs);
      span.textContent = `${done ? "✅➜ " : ""}${obj.emoji || obj.title || "📍"}`;
      span.style.opacity = done ? "1" : "0.6";
      if (
        !done &&
        this.renderer &&
        this.renderer.currentObjective &&
        this.renderer.currentObjective.title === obj.title
      ) {
        span.style.outline = "2px solid rgba(255,255,255,0.12)";
        span.style.padding = "2px 6px";
        span.style.borderRadius = "6px";
      }
      prog.appendChild(span);
    }
  }

  // ---- render loop ----

  private loop(ts: number): void {
    const dt = ts - this.lastTime;
    this.lastTime = ts;
    if (Math.floor(ts / 1000) % 5 === 0 && ts % 1000 < 32) {
      console.log("[main] loop tick", { ts });
    }

    if (!this.pausedForPolaroid) {
      this.renderer.update();
      this.renderer.draw();
    }
    requestAnimationFrame((t) => this.loop(t));
  }
}
