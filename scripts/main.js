// src/main.ts
import { Scene } from "./scene/Scene.js";
import { SceneRenderer } from "./scene/SceneRenderer.js";
import { InputHandler } from "./input/InputHandler.js";
import { basePath } from "./config.js";
/**
 * main.ts -- viewport-based scene, mask centroid extraction,
 * click -> mask sampling, and drag-to-pan (fixed viewport).
 */
const canvas = document.getElementById("game");
const shutter = document.getElementById("shutter");
const sceneSelect = document.getElementById("sceneSelect");
let renderer;
let scene;
let isLoaded = false;
let lastTime = 0;
async function init() {
    if (!canvas)
        throw new Error("Canvas #game not found");
    if (!canvas || !shutter || !sceneSelect) {
        console.error("Missing required DOM elements.");
        return;
    }
    renderer = new SceneRenderer(canvas);
    populateSceneSelect();
    const params = new URLSearchParams(window.location.search);
    const sceneName = params.get("scene") || "jungle_adventure";
    try {
        const defUrl = `${basePath}/assets/scenes/${sceneName}.json`;
        console.log("[main] loading", defUrl);
        const res = await fetch(defUrl);
        if (!res.ok)
            throw new Error(`Failed to load ${defUrl}`);
        const def = await res.json();
        scene = new Scene(def);
        await scene.loadImages(); // load images
        scene.extractPositionsFromMask(); // compute centroids
        renderer.setScene(scene);
        renderer.currentObjective = def.objectives?.[0];
        isLoaded = true;
        // Pointer-based pan: we receive dx/dy in screen pixels; convert to world
        new InputHandler(canvas, (dxScreen, dyScreen) => {
            if (!renderer.viewport)
                return;
            // world delta = (dx / canvas.width) * viewport.width
            const worldDx = (dxScreen / canvas.width) * renderer.viewport.width;
            const worldDy = (dyScreen / canvas.height) * renderer.viewport.height;
            renderer.viewport.pan(-worldDx, -worldDy); // negative because dragging direction -> world movement
        });
        canvas.addEventListener("click", onCanvasClick);
        shutter.addEventListener("click", () => renderer.triggerFlash());
        console.log("[main] scene ready", sceneName);
    }
    catch (err) {
        console.error("Scene load failed:", err);
        drawErrorMessage(`Could not load scene: ${sceneName}`);
        return;
    }
    requestAnimationFrame(loop);
}
/** Draw fallback message if loading fails */
function drawErrorMessage(text) {
    const ctx = canvas.getContext("2d");
    if (!ctx)
        return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "gray";
    ctx.font = "24px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);
}
function onCanvasClick(e) {
    if (!isLoaded || !renderer || !renderer.viewport || !scene)
        return;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    // convert to world coords
    const vx = renderer.viewport.x;
    const vy = renderer.viewport.y;
    const worldX = vx + (clickX / canvas.width) * renderer.viewport.width;
    const worldY = vy + (clickY / canvas.height) * renderer.viewport.height;
    if (worldX < 0 ||
        worldY < 0 ||
        worldX >= scene.mask.width ||
        worldY >= scene.mask.height)
        return;
    // sample mask at world coords
    const tmp = document.createElement("canvas");
    tmp.width = scene.mask.width;
    tmp.height = scene.mask.height;
    const tctx = tmp.getContext("2d");
    if (!tctx)
        return;
    tctx.drawImage(scene.mask, 0, 0);
    const p = tctx.getImageData(Math.floor(worldX), Math.floor(worldY), 1, 1).data;
    const hex = Scene.rgbToHex(p[0], p[1], p[2]);
    const found = scene.markFoundByColor(hex);
    if (found) {
        console.log("Found", found);
        renderer.triggerFlash();
    }
}
function loop(ts) {
    const dt = ts - lastTime;
    lastTime = ts;
    renderer.update();
    renderer.draw();
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
    if (current)
        sceneSelect.value = current;
    sceneSelect.addEventListener("change", () => {
        const v = sceneSelect.value;
        window.location.search = `?scene=${v}`;
    });
}
init().catch(console.error);
