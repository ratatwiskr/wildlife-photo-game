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
const canvas = document.getElementById("game");
const shutter = document.getElementById("shutter");
const sceneSelect = document.getElementById("sceneSelect");
let renderer;
let scene;
let cameraCtrl = null;
const polaroidUi = new PolaroidUI();
const confetti = new Confetti();
let pausedForPolaroid = false;
let isLoaded = false;
let lastTime = 0;
let isDragging = false;
let lastX = 0;
let lastY = 0;
let lastTapWorld = null;
// objective progress UI updater (top-right of camera frame)
function updateObjectiveProgress() {
    const frame = document.getElementById("camera-frame");
    if (!frame || !scene)
        return;
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
    const objectives = scene.definition.objectives || [];
    for (const obj of objectives) {
        const span = document.createElement("span");
        const objs = scene.getObjectsForObjective(obj);
        const done = scene.allFound(objs);
        span.textContent = `${done ? "✅➜ " : ""}${obj.emoji || obj.title || "📍"}`;
        span.style.opacity = done ? "1" : "0.6";
        if (!done &&
            renderer &&
            renderer.currentObjective &&
            renderer.currentObjective.title === obj.title) {
            span.style.outline = "2px solid rgba(255,255,255,0.12)";
            span.style.padding = "2px 6px";
            span.style.borderRadius = "6px";
        }
        prog.appendChild(span);
    }
}
async function init() {
    if (!canvas)
        throw new Error("Canvas #game not found");
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
    // helper: Fisher-Yates shuffle (keep in outer scope to satisfy linter)
    function shuffleArray(arr) {
        const a = arr.slice();
        for (let i = a.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            const tmp = a[i];
            a[i] = a[j];
            a[j] = tmp;
        }
        return a;
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
    // get scene from param 'https://ratatwiskr.github.io/wildlife-photo-game/?scene=jungle_adventure' or load default scene 'jungle_adventure'
    const params = new URLSearchParams(window.location.search);
    const sceneName = params.get("scene") || "jungle_adventure";
    // centralized scene loader so we can load without a full page reload
    async function loadSceneByName(name) {
        const defUrl = `${basePath}/assets/scenes/${name}.json`;
        console.log("[main] loading", defUrl);
        const res = await fetch(defUrl);
        if (!res.ok)
            throw new Error(`Failed to load ${defUrl}`);
        const def = await res.json();
        if (def.objectives &&
            Array.isArray(def.objectives) &&
            def.objectives.length > 1) {
            def.objectives = shuffleArray(def.objectives);
        }
        // instantiate and initialize scene
        scene = new Scene(def);
        await scene.loadImages(); // load images
        scene.extractPositionsFromMask(); // compute centroids
        renderer.setScene(scene);
        // renderer.currentObjective expects a single-tag shape; map the scene definition
        // objective (which may have `tags[]`) to the renderer's expected form.
        if (def.objectives && def.objectives[0]) {
            const first = def.objectives[0];
            const tag = first.tags && first.tags.length ? first.tags[0] : first.tag || "";
            renderer.currentObjective = {
                title: first.title,
                tag,
                emoji: first.emoji,
            };
        }
        else {
            renderer.currentObjective = undefined;
        }
        // update DOM HUD objective emoji/title
        const objEl = document.getElementById("objective");
        if (objEl && def.objectives && def.objectives[0]) {
            objEl.textContent =
                def.objectives[0].emoji || def.objectives[0].title || "📍";
        }
        isLoaded = true;
        // Expose useful handles for end-to-end tests/debugging
        try {
            globalThis.__app = {
                scene,
                renderer,
                cameraCtrl,
            };
        }
        catch (e) {
            /* ignore */
        }
        // hide the select now that a scene is loaded; keep shutter and objective visible
        const sceneSelectEl = document.getElementById("sceneSelect");
        if (sceneSelectEl)
            sceneSelectEl.style.display = "none";
        // Adjust UI for scene type: for `wimmelbild` mode hide camera controls
        // (shutter and scene selector) but keep the objective emoji visible.
        const uiEl = document.getElementById("ui");
        const viewfinderEl = document.querySelector(".viewfinder");
        if (scene.definition.sceneType === "wimmelbild") {
            if (uiEl)
                uiEl.style.display = "none";
            if (viewfinderEl)
                viewfinderEl.style.display = "none";
        }
        else {
            if (uiEl)
                uiEl.style.display = "";
            if (viewfinderEl)
                viewfinderEl.style.display = "";
        }
        // wire camera controller for the newly loaded scene (only for photo mode)
        if (renderer.viewport) {
            if (scene.definition.sceneType === "photo") {
                cameraCtrl = new CameraController(scene, renderer.viewport);
            }
            else {
                cameraCtrl = null;
            }
        }
        // update select value so UI reflects current scene
        const sceneSelectEl2 = document.getElementById("sceneSelect");
        if (sceneSelectEl2)
            sceneSelectEl2.value = name;
        // update progress immediately
        updateObjectiveProgress();
    }
    try {
        await loadSceneByName(sceneName);
        // setup back button to show a simple scene picker draft
        const backBtn = document.getElementById("back");
        const scenePicker = document.getElementById("scenePicker");
        const sceneList = document.getElementById("sceneList");
        if (backBtn && scenePicker && sceneList) {
            backBtn.addEventListener("click", () => {
                const vp = document.getElementById("viewport");
                console.debug("[main] back pressed, toggling scene picker");
                // show/hide full-screen picker and toggle viewport visibility
                if (scenePicker.style.display === "block") {
                    scenePicker.style.display = "none";
                    if (vp)
                        vp.style.display = "inline-block";
                    return;
                }
                scenePicker.style.display = "block";
                if (vp)
                    vp.style.display = "none";
            });
        }
        // populate scene picker from manifest (assets/scenes/scene-manifest.json)
        // Populate scene picker by scanning the scenes directory for .json files
        try {
            const dirRes = await fetch(`${basePath}/assets/scenes/`);
            if (dirRes.ok) {
                const text = await dirRes.text();
                // find hrefs that end with .json
                const re = /href\s*=\s*"([^"]+\.json)"/g;
                const names = new Set();
                let m;
                while ((m = re.exec(text))) {
                    const href = m[1];
                    // skip any entries inside a `template/` directory
                    if (/\/template\//i.test(href) || /^template\//i.test(href)) {
                        console.debug("[main] skipping template folder entry", href);
                        continue;
                    }
                    const base = href.replace(/\.json$/, "").replace(/.*\//, "");
                    names.add(base);
                }
                const list = Array.from(names);
                console.debug("[main] scanned scene directory, found", list);
                const picker = document.getElementById("sceneList");
                if (picker) {
                    picker.innerHTML = "";
                    // create grouping containers for scene types
                    const photoGroup = document.createElement("div");
                    const wimmelGroup = document.createElement("div");
                    const photoHeader = document.createElement("h3");
                    photoHeader.textContent = "Photo scenes";
                    const wimmelHeader = document.createElement("h3");
                    wimmelHeader.textContent = "Wimmelbild scenes";
                    photoGroup.appendChild(photoHeader);
                    wimmelGroup.appendChild(wimmelHeader);
                    for (const name of list) {
                        // each createSceneCard will decide whether to append to photo or wimmel group
                        await createSceneCard(picker, name, photoGroup, wimmelGroup);
                    }
                    // append groups if they have items (beyond the headers)
                    if (photoGroup.childElementCount > 1)
                        picker.appendChild(photoGroup);
                    if (wimmelGroup.childElementCount > 1)
                        picker.appendChild(wimmelGroup);
                    // add a close button to return to current scene without changing it
                    const close = document.createElement("button");
                    close.textContent = "Close";
                    close.style.display = "block";
                    close.style.marginTop = "12px";
                    close.addEventListener("click", () => {
                        const vp = document.getElementById("viewport");
                        const scenePickerEl = document.getElementById("scenePicker");
                        if (scenePickerEl)
                            scenePickerEl.style.display = "none";
                        if (vp)
                            vp.style.display = "inline-block";
                    });
                    picker.appendChild(close);
                }
            }
            else {
                console.warn("[main] directory scan failed", dirRes.status);
            }
        }
        catch (e) {
            console.warn("[main] directory scan error", e);
        }
        // helper to create a card DOM node
        async function createSceneCard(picker, name, photoGroup, wimmelGroup) {
            const card = document.createElement("div");
            card.className = "scene-card";
            const title = document.createElement("div");
            title.className = "scene-title";
            const pretty = name
                .replaceAll("_", " ")
                .replace(/\b\w/g, (c) => c.toUpperCase());
            title.textContent = pretty;
            const thumbWrap = document.createElement("div");
            thumbWrap.className = "thumb-wrap";
            // try to fetch the scene json to get an explicit preview image path
            try {
                const jres = await fetch(`${basePath}/assets/scenes/${name}.json`);
                if (!jres.ok) {
                    console.debug("[main] scene json fetch failed for", name, jres.status);
                    return;
                }
                const def = await jres.json();
                // determine image and mask paths
                const imgPath = def.image
                    ? `${basePath}/assets/scenes/${def.image}`
                    : `${basePath}/assets/scenes/${name}.jpg`;
                const maskPath = `${basePath}/assets/scenes/${name}_mask.png`;
                // check that image and mask actually exist on the server
                const [imgRes, maskRes] = await Promise.all([
                    fetch(imgPath, { method: "GET" }),
                    fetch(maskPath, { method: "GET" }),
                ]);
                if (!imgRes.ok || !maskRes.ok) {
                    console.debug("[main] skipping scene because image/mask missing", name, { img: imgRes.status, mask: maskRes.status });
                    return;
                }
                const thumb = document.createElement("img");
                thumb.src = imgPath;
                thumb.alt = name;
                thumb.className = "scene-thumb blurred"; // blurred so previews don't spoil
                thumbWrap.appendChild(thumb);
                // append title/thumb to the card
                card.appendChild(title);
                card.appendChild(thumbWrap);
                // clicking anywhere on the card should load that scene (resetting state)
                card.addEventListener("click", async () => {
                    try {
                        await loadSceneByName(name);
                        // hide picker and show viewport again
                        const scenePickerEl = document.getElementById("scenePicker");
                        const vp = document.getElementById("viewport");
                        if (scenePickerEl)
                            scenePickerEl.style.display = "none";
                        if (vp)
                            vp.style.display = "inline-block";
                        // push state to URL so deep links work
                        try {
                            const newUrl = new URL(window.location.href);
                            newUrl.searchParams.set("scene", name);
                            window.history.pushState({}, "", newUrl.toString());
                        }
                        catch (e) {
                            // ignore history failures
                        }
                    }
                    catch (e) {
                        console.error("Failed to load scene on card click", name, e);
                        // leave picker visible so user can choose another
                    }
                });
                // group by sceneType
                const st = def.sceneType || "photo";
                if (st === "wimmelbild")
                    wimmelGroup.appendChild(card);
                else
                    photoGroup.appendChild(card);
                console.debug("[main] created scene card", name, "type", st);
            }
            catch (e) {
                console.debug("[main] error fetching scene json for", name, e);
            }
        }
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
        // create camera controller wiring shutter + cooldown
        if (renderer.viewport) {
            cameraCtrl = new CameraController(scene, renderer.viewport);
        }
        shutter.addEventListener("click", async () => {
            console.log("[main] shutter pressed", { lastTapWorld });
            if (!cameraCtrl) {
                renderer.triggerFlash();
                return;
            }
            // Log objectives and status (support both `tag` and `tags[]` fields)
            const objectives = scene.definition.objectives || [];
            console.log("[main] objectives", objectives.map((o) => ({
                emoji: o.emoji || o.title,
                tag: o.tag || (o.tags && o.tags[0]) || undefined,
                found: scene.getObjectsForObjective(o).filter((a) => a.found).length,
            })));
            // pick next unfound target for current objective
            // Use the renderer's currentObjective when present (reflects progression),
            // otherwise fall back to the first defined objective.
            const obj = (renderer && renderer.currentObjective);
            const fallback = scene.definition.objectives?.[0];
            const objects = obj
                ? scene.getObjectsForObjective(obj)
                : fallback
                    ? scene.getObjectsForObjective(fallback)
                    : scene.definition.objects;
            const target = objects.find((a) => !a.found);
            if (!target) {
                console.log("[main] no target remains");
                renderer.triggerFlash();
                return;
            }
            // If target is not in view, ask controller to nudge slowly first (await completion)
            // use a longer duration for a gentle slow nudge suitable for children
            const nudgeResult = await cameraCtrl.nudgeToTarget(target, 2400);
            console.log("[main] nudge result", nudgeResult);
            // If nudge was skipped because the target was too far, still show a friendly flash
            // to provide feedback, but do not attempt capture or mark success.
            if (nudgeResult === "skipped-too-far") {
                renderer.triggerFlash();
                // short visual hint: add nudge-skip class to camera-frame for the duration of the animation
                const frame = document.getElementById("camera-frame");
                if (frame) {
                    frame.classList.add("nudge-skip");
                    setTimeout(() => frame.classList.remove("nudge-skip"), 800);
                }
                return;
            }
            // If already centered, proceed to attempt capture. If we actually nudged, we also
            // proceed — the nudge should have centered the animal.
            if (nudgeResult === "already-centered" || nudgeResult === "nudged") {
                // Now attempt capture using lastTapWorld if available and valid; otherwise
                // let the controller sample from the viewport center by passing undefined.
                let tapX = undefined;
                let tapY = undefined;
                if (lastTapWorld &&
                    scene &&
                    lastTapWorld.x >= 0 &&
                    lastTapWorld.y >= 0 &&
                    lastTapWorld.x < scene.mask.width &&
                    lastTapWorld.y < scene.mask.height) {
                    tapX = lastTapWorld.x;
                    tapY = lastTapWorld.y;
                }
                const captureRes = cameraCtrl.attemptCapture(tapX, tapY, renderer.currentObjective);
                // show flash immediately
                renderer.triggerFlash();
                if (captureRes && captureRes.polaroid) {
                    console.log("[main] captured", captureRes.name);
                    // suppress celebration until after polaroid is dismissed
                    renderer.suppressCelebration = true;
                    // ... rest of polaroid handling unchanged ...
                    setTimeout(() => {
                        pausedForPolaroid = true;
                        polaroidUi.show(captureRes.polaroid);
                        polaroidUi["container"].addEventListener("click", () => {
                            pausedForPolaroid = false;
                            polaroidUi.hide();
                            renderer.suppressCelebration = false;
                            // After a successful capture, check whether the current objective
                            // is now complete. If so, advance to the next objective (if any).
                            // Only when all objectives are complete do we show confetti.
                            try {
                                const objectives = scene.definition.objectives || [];
                                // Determine index of current objective in the scene definition
                                let currentIndex = objectives.findIndex((o) => o === renderer.currentObjective);
                                if (currentIndex < 0)
                                    currentIndex = 0;
                                const currentObj = objectives[currentIndex];
                                const objectiveObjects = scene.getObjectsForObjective(currentObj);
                                if (scene.allFound(objectiveObjects)) {
                                    // If there is another objective after this one, advance to it
                                    if (currentIndex + 1 < objectives.length) {
                                        const nextObj = objectives[currentIndex + 1];
                                        const nextTag = nextObj.tags && nextObj.tags.length
                                            ? nextObj.tags[0]
                                            : nextObj.tag || "";
                                        renderer.currentObjective = {
                                            title: nextObj.title,
                                            tag: nextTag,
                                            emoji: nextObj.emoji,
                                        };
                                        // update HUD objective emoji/title
                                        const objEl = document.getElementById("objective");
                                        if (objEl && nextObj) {
                                            objEl.textContent =
                                                nextObj.emoji || nextObj.title || "📍";
                                        }
                                        // don't celebrate yet; wait until final objective completed
                                        console.log("[main] objective completed, advanced to next", nextObj);
                                        // refresh top-right progress UI
                                        updateObjectiveProgress();
                                    }
                                    else {
                                        // last objective completed — celebrate
                                        confetti.burst(60);
                                        confetti.startContinuous(6);
                                        setTimeout(() => confetti.stop(), 2000);
                                        // final update of progress UI
                                        updateObjectiveProgress();
                                    }
                                }
                            }
                            catch (e) {
                                console.error("Error advancing objectives", e);
                            }
                        }, { once: true });
                    }, 1000);
                }
                return;
            }
        });
        console.log("[main] scene ready", sceneName);
    }
    catch (err) {
        console.error("Scene load failed:", err);
        drawErrorMessage(`Could not load scene: ${sceneName}`);
        return;
    }
    requestAnimationFrame(loop);
}
// Toggle visual debug overlays with 'd' key: crosshair, mask, and transparent camera body
window.addEventListener("keydown", (e) => {
    if (e.key.toLowerCase() === "d") {
        if (renderer) {
            renderer.debug = !renderer.debug;
            const frame = document.getElementById("camera-frame");
            if (frame) {
                if (renderer.debug)
                    frame.classList.add("debug-mode");
                else
                    frame.classList.remove("debug-mode");
            }
            // if we have a camera controller, expose its aim tolerance for rendering
            if (cameraCtrl && renderer.debug) {
                const tol = cameraCtrl.getAimTolerance?.();
                if (tol)
                    renderer.debugTolerance = tol;
            }
            else {
                renderer.debugTolerance = undefined;
            }
            console.log("[main] debug mode", renderer.debug);
        }
    }
});
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
    // For photo mode, store last tap for the shutter to use. For wimmelbild mode
    // we perform an immediate sample against the mask and mark found if hit.
    console.log("[main] onCanvasClick world coords", { x: worldX, y: worldY });
    if (worldX < 0 ||
        worldY < 0 ||
        worldX >= scene.mask.width ||
        worldY >= scene.mask.height)
        return;
    if (scene.definition.sceneType === "wimmelbild") {
        // immediate sample on mask and mark found
        try {
            const tmp = document.createElement("canvas");
            tmp.width = scene.mask.width;
            tmp.height = scene.mask.height;
            const tctx = tmp.getContext("2d", { willReadFrequently: true });
            if (!tctx)
                return;
            tctx.drawImage(scene.mask, 0, 0);
            const sampleX = Math.round(worldX);
            const sampleY = Math.round(worldY);
            const imgData = tctx.getImageData(sampleX, sampleY, 1, 1);
            const p = imgData?.data;
            if (!p)
                return;
            const tryHex = (r, g, b) => scene.constructor.rgbToHex(r, g, b);
            let hex = tryHex(p[0], p[1], p[2]);
            const alpha = p[3] ?? 255;
            let foundName = null;
            if (alpha === 0 || hex === "#000000") {
                // search nearby pixels for most common non-transparent color
                const radius = 12;
                const w = tmp.width;
                const h = tmp.height;
                const counts = new Map();
                for (let dy = -radius; dy <= radius; dy++) {
                    for (let dx = -radius; dx <= radius; dx++) {
                        const sx = sampleX + dx;
                        const sy = sampleY + dy;
                        if (sx < 0 || sy < 0 || sx >= w || sy >= h)
                            continue;
                        const d = tctx.getImageData(sx, sy, 1, 1).data;
                        if (!d)
                            continue;
                        if ((d[3] ?? 255) === 0)
                            continue;
                        const hcol = tryHex(d[0], d[1], d[2]);
                        if (hcol === "#000000")
                            continue;
                        counts.set(hcol, (counts.get(hcol) || 0) + 1);
                    }
                }
                if (counts.size > 0) {
                    let best = "";
                    let bestCount = 0;
                    for (const [k, v] of counts) {
                        if (v > bestCount) {
                            best = k;
                            bestCount = v;
                        }
                    }
                    hex = best;
                    foundName = scene.markFoundByColor(hex);
                }
            }
            else {
                foundName = scene.markFoundByColor(hex);
            }
            if (foundName) {
                // visual feedback, persist found state and update objectives
                if (renderer)
                    renderer.triggerFlash();
                updateObjectiveProgress();
                // advance objective if completed (same logic as shutter flow)
                try {
                    const objectives = scene.definition.objectives || [];
                    let currentIndex = objectives.findIndex((o) => o === renderer.currentObjective);
                    if (currentIndex < 0)
                        currentIndex = 0;
                    const currentObj = objectives[currentIndex];
                    const objectiveObjects = scene.getObjectsForObjective(currentObj);
                    if (scene.allFound(objectiveObjects)) {
                        if (currentIndex + 1 < objectives.length) {
                            const nextObj = objectives[currentIndex + 1];
                            const nextTag = nextObj.tags && nextObj.tags.length
                                ? nextObj.tags[0]
                                : nextObj.tag || "";
                            renderer.currentObjective = {
                                title: nextObj.title,
                                tag: nextTag,
                                emoji: nextObj.emoji,
                            };
                            const objEl2 = document.getElementById("objective");
                            if (objEl2 && nextObj) {
                                objEl2.textContent = nextObj.emoji || nextObj.title || "📍";
                            }
                            updateObjectiveProgress();
                        }
                        else {
                            // final objective complete — renderer will show celebration
                            updateObjectiveProgress();
                        }
                    }
                }
                catch (e) {
                    console.error("Error advancing objectives (wimmelbild)", e);
                }
            }
        }
        catch (e) {
            console.error("Wimmelbild click handling failed", e);
        }
        return;
    }
    // store for shutter usage (photo mode)
    lastTapWorld = { x: worldX, y: worldY };
}
function loop(ts) {
    const dt = ts - lastTime;
    lastTime = ts;
    // occasional tick log to confirm the RAF loop is running
    if (Math.floor(ts / 1000) % 5 === 0 && ts % 1000 < 32) {
        console.log("[main] loop tick", { ts });
    }
    if (!pausedForPolaroid) {
        renderer.update();
        renderer.draw();
    }
    requestAnimationFrame(loop);
}
function populateSceneSelect() {
    // Dynamically populate the HUD select with available scenes found in
    // assets/scenes/ (skips templates and incomplete scenes missing image/mask).
    (async () => {
        sceneSelect.innerHTML = "";
        const current = new URLSearchParams(globalThis.location.search).get("scene");
        try {
            const dirRes = await fetch(`${basePath}/assets/scenes/`);
            if (!dirRes.ok)
                return;
            const text = await dirRes.text();
            const re = /href\s*=\s*"([^"]+\.json)"/g;
            const names = new Set();
            let m;
            while ((m = re.exec(text))) {
                const href = m[1];
                if (/\/template\//i.test(href) || /^template\//i.test(href))
                    continue;
                const base = href.replace(/\.json$/, "").replace(/.*\//, "");
                names.add(base);
            }
            for (const name of names) {
                try {
                    const jres = await fetch(`${basePath}/assets/scenes/${name}.json`);
                    if (!jres.ok)
                        continue;
                    const def = await jres.json();
                    const imgPath = def.image
                        ? `${basePath}/assets/scenes/${def.image}`
                        : `${basePath}/assets/scenes/${name}.jpg`;
                    const maskPath = `${basePath}/assets/scenes/${name}_mask.png`;
                    const [imgRes, maskRes] = await Promise.all([
                        fetch(imgPath, { method: "GET" }),
                        fetch(maskPath, { method: "GET" }),
                    ]);
                    if (!imgRes.ok || !maskRes.ok)
                        continue;
                    const o = document.createElement("option");
                    o.value = name;
                    // prettify label (Jungle Adventure instead of jungle_adventure)
                    o.textContent = name
                        .replaceAll("_", " ")
                        .replace(/\b\w/g, (c) => c.toUpperCase());
                    sceneSelect.appendChild(o);
                }
                catch (e) {
                    // skip problematic entries
                    continue;
                }
            }
            if (current)
                sceneSelect.value = current;
            sceneSelect.addEventListener("change", () => {
                const v = sceneSelect.value;
                globalThis.location.search = `?scene=${v}`;
            });
        }
        catch (e) {
            console.warn("[main] populateSceneSelect failed", e);
        }
    })();
}
canvas.addEventListener("pointerdown", (e) => {
    isDragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
    canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener("pointermove", (e) => {
    if (!isDragging || !scene || !renderer || !renderer.viewport)
        return;
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
        console.log("[main] dragging delta (backing px)", { dx, dy });
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
