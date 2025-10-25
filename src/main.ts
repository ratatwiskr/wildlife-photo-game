import { Scene } from "./scene/Scene";
import { SceneRenderer } from "./scene/SceneRenderer";
import { basePath } from "./config";

/**
 * main.ts
 * --------
 * Wildlife Photo Game main entry point.
 * Loads scene definitions from JSON and handles user input, camera flash,
 * and continuous rendering.
 */

const canvas = document.getElementById("game") as HTMLCanvasElement;
const shutterButton = document.getElementById("shutter") as HTMLButtonElement;
const sceneSelect = document.getElementById("sceneSelect") as HTMLSelectElement;

let renderer: SceneRenderer;
let scene: Scene;
let lastTime = 0;
let isLoaded = false;

/** Initialize game */
async function init() {
  renderer = new SceneRenderer(canvas);
  populateSceneSelect();

  const params = new URLSearchParams(window.location.search);
  const sceneName = params.get("scene") || "jungle_adventure";

  try {
    // ✅ Corrected path to include /assets/scenes/
    const sceneDefUrl = `${basePath}/assets/scenes/${sceneName}.json`;
    console.log(`[main] Loading scene definition: ${sceneDefUrl}`);

    const response = await fetch(sceneDefUrl);
    if (!response.ok) throw new Error(`Failed to load ${sceneDefUrl}`);
    const definition = await response.json();

    scene = new Scene(definition);
    await scene.loadImages();

    renderer.setScene(scene);
    renderer.currentObjective = definition.objectives?.[0];
    isLoaded = true;

    console.log(`[main] Scene loaded successfully: ${sceneName}`);
  } catch (err) {
    console.error("Scene load failed:", err);
    drawErrorMessage(`Could not load scene: ${sceneName}`);
    return;
  }

  shutterButton.addEventListener("click", onShutter);
  canvas.addEventListener("click", onCanvasClick);

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

/** Handle shutter click */
function onShutter() {
  if (!isLoaded) return;
  renderer.triggerFlash();
}

/** Handle player tapping or clicking the scene */
function onCanvasClick(event: MouseEvent) {
  if (!scene.mask) return;

  const rect = canvas.getBoundingClientRect();
  const x = Math.floor(
    ((event.clientX - rect.left) / rect.width) * scene.mask.width
  );
  const y = Math.floor(
    ((event.clientY - rect.top) / rect.height) * scene.mask.height
  );

  const temp = document.createElement("canvas");
  temp.width = scene.mask.width;
  temp.height = scene.mask.height;
  const tempCtx = temp.getContext("2d");
  if (!tempCtx) return;

  tempCtx.drawImage(scene.mask, 0, 0);
  const pixel = tempCtx.getImageData(x, y, 1, 1).data;
  const hex = Scene.rgbToHex(pixel[0], pixel[1], pixel[2]);

  const found = scene.markFoundByColor(hex);
  if (found) {
    console.log(`📸 Found: ${found}`);
    renderer.triggerFlash();
  }
}

/** Animation + render loop */
function loop(timestamp: number) {
  const delta = timestamp - lastTime;
  lastTime = timestamp;

  renderer.update();
  renderer.draw();

  requestAnimationFrame(loop);
}

/** Populate simple scene selector dropdown */
function populateSceneSelect() {
  const scenes = ["jungle_adventure", "savanna", "arctic", "jungle"]; // add more JSONs as you create them
  for (const name of scenes) {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    sceneSelect.appendChild(option);
  }

  const current = new URLSearchParams(window.location.search).get("scene");
  if (current) sceneSelect.value = current;

  sceneSelect.addEventListener("change", () => {
    const name = sceneSelect.value;
    window.location.search = `?scene=${name}`;
  });
}

init().catch(console.error);
