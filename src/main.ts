// src/main.ts
import { Scene } from "./scene/Scene.js";
import { SceneRenderer } from "./scene/SceneRenderer.js";
import { InputHandler } from "./input/InputHandler.js";
import { CameraController } from "./camera/CameraController.js";
import { PolaroidUI } from "./ui/Polaroid.js";
import { basePath } from "./config.js";

/**
 * main.ts -- viewport-based scene, mask centroid extraction,
 * click -> mask sampling, and drag-to-pan (fixed viewport).
 */

const canvas = document.getElementById("game") as HTMLCanvasElement;
const shutter = document.getElementById("shutter") as HTMLButtonElement;
const sceneSelect = document.getElementById("sceneSelect") as HTMLSelectElement;

let renderer: SceneRenderer;
let scene: Scene;
let cameraCtrl: CameraController | null = null;
const polaroidUi = new PolaroidUI();
let pausedForPolaroid = false;
let isLoaded = false;
let lastTime = 0;

let isDragging = false;
let lastX = 0;
let lastY = 0;

async function init() {
  if (!canvas) throw new Error("Canvas #game not found");

  if (!canvas || !shutter || !sceneSelect) {
    console.error("Missing required DOM elements.");
    return;
  }

  renderer = new SceneRenderer(canvas);
  // ensure canvas backing resolution matches CSS size (hi-dpi aware)
  function resizeCanvasToDisplaySize() {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const w = Math.max(1, Math.round(rect.width * dpr));
    const h = Math.max(1, Math.round(rect.height * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
  }

  // initial resize and on window resize
  resizeCanvasToDisplaySize();
  window.addEventListener("resize", () => {
    resizeCanvasToDisplaySize();
    // when display size changes, recompute renderer viewport sizing so
    // viewport.world -> canvas backing mapping stays consistent
    if (renderer && scene) {
      renderer.setScene(scene);
    }
  });
  populateSceneSelect();

  const params = new URLSearchParams(window.location.search);
  const sceneName = params.get("scene") || "jungle_adventure";

  try {
    const defUrl = `${basePath}/assets/scenes/${sceneName}.json`;
    console.log("[main] loading", defUrl);
    const res = await fetch(defUrl);
    if (!res.ok) throw new Error(`Failed to load ${defUrl}`);
    const def = await res.json();

    scene = new Scene(def);
    await scene.loadImages(); // load images
    scene.extractPositionsFromMask(); // compute centroids

  renderer.setScene(scene);
    renderer.currentObjective = def.objectives?.[0];
    // update DOM HUD objective emoji/title
    const objEl = document.getElementById("objective");
    if (objEl && def.objectives && def.objectives[0]) {
      objEl.textContent = def.objectives[0].emoji || def.objectives[0].title || "📍";
    }
    isLoaded = true;

    // hide the select now that a scene is loaded; keep shutter and objective visible
    const sceneSelectEl = document.getElementById("sceneSelect");
    if (sceneSelectEl) sceneSelectEl.style.display = "none";

    // setup back button to show a simple scene picker draft
    const backBtn = document.getElementById("back");
    const scenePicker = document.getElementById("scenePicker");
    const sceneList = document.getElementById("sceneList");
      if (backBtn && scenePicker && sceneList) {
        backBtn.addEventListener("click", () => {
          const vp = document.getElementById("viewport");
          // show full-screen picker draft and hide viewport
          if (scenePicker.style.display === "block") {
            scenePicker.style.display = "none";
            if (vp) vp.style.display = "inline-block";
            return;
          }
          scenePicker.style.display = "block";
          if (vp) vp.style.display = "none";
          sceneList.innerHTML = "";
          // populate simple preview list (we only have jungle_adventure currently)
          const s = document.createElement("div");
          s.style.margin = "8px 0";
          const thumb = document.createElement("img");
          thumb.src = `${basePath}/assets/scenes/jungle_adventure.jpg`;
          thumb.style.maxWidth = "240px";
          thumb.style.display = "block";
          const label = document.createElement("div");
          label.textContent = "jungle_adventure";
          s.appendChild(thumb);
          s.appendChild(label);
          sceneList.appendChild(s);
          // add a close button to return
          const close = document.createElement("button");
          close.textContent = "Close";
          close.style.display = "block";
          close.style.marginTop = "12px";
          close.addEventListener("click", () => {
            scenePicker.style.display = "none";
            if (vp) vp.style.display = "inline-block";
          });
          sceneList.appendChild(close);
        });
      }

  // Pointer-based pan: we receive dx/dy in screen pixels; convert to world
    new InputHandler(canvas, (dxScreen, dyScreen) => {
      if (!renderer.viewport) return;
      // world delta = (dx / canvas.width) * viewport.width
      const worldDx = (dxScreen / canvas.width) * renderer.viewport.width;
      const worldDy = (dyScreen / canvas.height) * renderer.viewport.height;
      renderer.viewport.pan(-worldDx, -worldDy); // negative because dragging direction -> world movement
    });

    canvas.addEventListener("click", onCanvasClick);
    // create camera controller wiring shutter + cooldown
    if (renderer.viewport) {
      cameraCtrl = new CameraController(scene, renderer.viewport as any);
    }
    shutter.addEventListener("click", () => {
      if (cameraCtrl) {
        const res = cameraCtrl.attemptCapture();
        if (res && res.polaroid) {
          // show polaroid and pause
          pausedForPolaroid = true;
          polaroidUi.show(res.polaroid);
          polaroidUi['container'].addEventListener('click', () => {
            pausedForPolaroid = false;
            polaroidUi.hide();
          }, { once: true });
          renderer.triggerFlash();
          const objEl = document.getElementById("objective");
          if (objEl) {
            const objectiveAnimals = scene.getAnimalsForObjective(renderer.currentObjective);
            if (scene.allFound(objectiveAnimals)) objEl.textContent = "🎉";
          }
        }
      } else {
        renderer.triggerFlash();
      }
    });

    console.log("[main] scene ready", sceneName);
  } catch (err) {
    console.error("Scene load failed:", err);
    drawErrorMessage(`Could not load scene: ${sceneName}`);
    return;
  }

  requestAnimationFrame(loop);
}

/** Draw fallback message if loading fails */
function drawErrorMessage(text: string) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "gray";
  ctx.font = "24px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, canvas.width / 2, canvas.height / 2);
}

function onCanvasClick(e: MouseEvent) {
  if (!isLoaded || !renderer || !renderer.viewport || !scene) return;

  // get click in canvas backing pixels
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const clickX = (e.clientX - rect.left) * dpr;
  const clickY = (e.clientY - rect.top) * dpr;

  // map to world coordinates
  const vx = renderer.viewport.x;
  const vy = renderer.viewport.y;
  const worldX = vx + (clickX / canvas.width) * renderer.viewport.width;
  const worldY = vy + (clickY / canvas.height) * renderer.viewport.height;

  if (
    worldX < 0 ||
    worldY < 0 ||
    worldX >= scene.mask.width ||
    worldY >= scene.mask.height
  )
    return;

  // cache an offscreen canvas on the scene instance for mask sampling to avoid
  // recreating it each click
  // @ts-ignore - allow attaching a private helper in this prototype for perf
  if (!(scene as any)._maskBuffer) {
    const tmp = document.createElement("canvas");
    tmp.width = scene.mask.width;
    tmp.height = scene.mask.height;
    const tctx = tmp.getContext("2d");
    if (tctx) tctx.drawImage(scene.mask, 0, 0);
    (scene as any)._maskBuffer = tmp;
  }
    const maskBuf: HTMLCanvasElement = (scene as any)._maskBuffer;
    const tctx = maskBuf.getContext("2d");
    if (!tctx) return;
  
    const p = tctx.getImageData(Math.floor(worldX), Math.floor(worldY), 1, 1).data;
    const hex = Scene.rgbToHex(p[0], p[1], p[2]);
    const foundName = scene.markFoundByColor(hex);
    if (foundName) {
      console.log("Found", foundName);
      renderer.triggerFlash();
      // update HUD (show celebration when objective completed)
      const objEl = document.getElementById("objective");
      if (objEl) {
        const objectiveAnimals = scene.getAnimalsForObjective(renderer.currentObjective);
        if (scene.allFound(objectiveAnimals)) {
          objEl.textContent = "🎉"; // party popper if all found
        }
      }
    }
}

function loop(ts: number) {
  const dt = ts - lastTime;
  lastTime = ts;
  if (!pausedForPolaroid) {
    renderer.update();
    renderer.draw();
  }
  requestAnimationFrame(loop);
}

function populateSceneSelect() {
  const choices = ["jungle_adventure", "savanna", "arctic"];
  for (const s of choices) {
    const o = document.createElement("option");
    o.value = s;
    o.textContent = s;
    sceneSelect.appendChild(o);
  }
  const current = new URLSearchParams(window.location.search).get("scene");
  if (current) sceneSelect.value = current;
  sceneSelect.addEventListener("change", () => {
    const v = sceneSelect.value;
    window.location.search = `?scene=${v}`;
  });
}

canvas.addEventListener("pointerdown", (e) => {
  isDragging = true;
  lastX = e.clientX;
  lastY = e.clientY;
  canvas.setPointerCapture(e.pointerId);
});

canvas.addEventListener("pointermove", (e) => {
  if (!isDragging || !scene || !renderer || !renderer.viewport) return;

  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  // movement in CSS pixels -> backing pixels
  const dxCss = e.clientX - lastX;
  const dyCss = e.clientY - lastY;
  lastX = e.clientX;
  lastY = e.clientY;

  const dx = dxCss * dpr;
  const dy = dyCss * dpr;

  // convert screen delta to world delta and pan viewport
  const worldDx = (dx / canvas.width) * renderer.viewport.width;
  const worldDy = (dy / canvas.height) * renderer.viewport.height;
  renderer.viewport.pan(-worldDx, -worldDy);
});

canvas.addEventListener("pointerup", (e) => {
  isDragging = false;
  canvas.releasePointerCapture(e.pointerId);
});

init().catch(console.error);
