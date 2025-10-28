// src/main.ts
import { Scene } from "./scene/Scene.js";
import { SceneRenderer } from "./scene/SceneRenderer.js";
import { InputHandler } from "./input/InputHandler.js";
import { CameraController } from "./camera/CameraController.js";
import { PolaroidUI } from "./ui/Polaroid.js";
import { Confetti } from "./ui/Confetti.js";
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
const confetti = new Confetti();
let pausedForPolaroid = false;
let isLoaded = false;
let lastTime = 0;

let isDragging = false;
let lastX = 0;
let lastY = 0;
let lastTapWorld: { x: number; y: number } | null = null;

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
    const stopConfBtn = document.getElementById('stopConfetti');
    if (stopConfBtn) {
      stopConfBtn.addEventListener('click', () => {
        confetti.stop();
        stopConfBtn.style.display = 'none';
      });
    }
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

    // populate scene picker from manifest (assets/scenes/scene-manifest.json)
    try {
      const manifestRes = await fetch(`${basePath}/assets/scenes/scene-manifest.json`);
      if (manifestRes.ok) {
        const manifest: string[] = await manifestRes.json();
        const picker = document.getElementById('sceneList');
        if (picker) {
          picker.innerHTML = '';
          for (const name of manifest) {
            const box = document.createElement('div');
            const thumb = document.createElement('img');
            thumb.src = `${basePath}/assets/scenes/${name}.jpg`;
            thumb.alt = name;
            const label = document.createElement('div');
            label.textContent = name;
            label.style.marginTop = '6px';
            label.style.textAlign = 'center';
            box.appendChild(thumb);
            box.appendChild(label);
            box.addEventListener('click', () => {
              window.location.search = `?scene=${name}`;
            });
            picker.appendChild(box);
          }
        }
      }
    } catch (e) {
      console.warn('[main] no scene manifest', e);
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
    shutter.addEventListener("click", async () => {
      console.log('[main] shutter pressed', { lastTapWorld });
      if (!cameraCtrl) {
        renderer.triggerFlash();
        return;
      }

      // Log objectives and status
      const objectives = scene.definition.objectives || [];
      console.log('[main] objectives', objectives.map(o => ({ emoji: o.emoji || o.title, tag: o.tag, found: scene.getAnimalsForObjective(o).filter(a => a.found).length })));

      // pick next unfound target for current objective
      const obj = scene.definition.objectives?.[0];
      const animals = obj ? scene.getAnimalsForObjective(obj) : scene.definition.animals;
      const target = animals.find(a => !a.found);
      if (!target) {
        console.log('[main] no target remains');
        renderer.triggerFlash();
        return;
      }

  // If target is not in view, ask controller to nudge slowly first (await completion)
  const nudged = await cameraCtrl.nudgeToTarget(target, 900);
  if (nudged) console.log('[main] nudge completed before capture');

      // Now attempt capture using lastTapWorld if available
      const tap = lastTapWorld ? [lastTapWorld.x, lastTapWorld.y] : [];
      const res = cameraCtrl.attemptCapture(...(tap as any));

      // show flash immediately
      renderer.triggerFlash();

      if (res && res.polaroid) {
        console.log('[main] captured', res.name);
        // suppress celebration until after polaroid is dismissed
        renderer.suppressCelebration = true;
        // commented out: play shutter sound here
        // const audio = new Audio('/sounds/shutter.mp3'); audio.play().catch(()=>{});
        // wait 1s so flash is visible
        setTimeout(() => {
          pausedForPolaroid = true;
          polaroidUi.show(res.polaroid as HTMLCanvasElement);
            polaroidUi['container'].addEventListener('click', () => {
            pausedForPolaroid = false;
            polaroidUi.hide();
            // un-suppress celebration so renderer may show it
            renderer.suppressCelebration = false;
            // if objectives complete, show confetti burst then continuous rain
            const objectiveAnimals = scene.getAnimalsForObjective(renderer.currentObjective);
            if (scene.allFound(objectiveAnimals)) {
              // commented out victory sound
              // const v = new Audio('/sounds/victory.mp3'); v.play().catch(()=>{});
              confetti.burst(60);
              // start continuous subtle confetti
              confetti.startContinuous(4);
              if (stopConfBtn) stopConfBtn.style.display = 'inline-block';
            }
          }, { once: true });
        }, 1000);
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

  // store for shutter usage
  lastTapWorld = { x: worldX, y: worldY };
  console.log('[main] onCanvasClick world coords', lastTapWorld);

  if (
    worldX < 0 ||
    worldY < 0 ||
    worldX >= scene.mask.width ||
    worldY >= scene.mask.height
  )
    return;

  // don't auto-sample or mark found on canvas clicks; shutter triggers capture only
  // lastTapWorld recorded above will be used by the shutter if provided
}

function loop(ts: number) {
  const dt = ts - lastTime;
  lastTime = ts;
  // occasional tick log to confirm the RAF loop is running
  if (Math.floor(ts / 1000) % 5 === 0 && ts % 1000 < 32) {
    console.log('[main] loop tick', { ts });
  }

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

  // debug log dragging deltas (backing px)
  if (Math.abs(dx) > 0 || Math.abs(dy) > 0) {
    console.log('[main] dragging delta (backing px)', { dx, dy });
  }

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
