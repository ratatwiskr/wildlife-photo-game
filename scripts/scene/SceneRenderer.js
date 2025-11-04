import { Viewport } from "./Viewport.js";
export class SceneRenderer {
    canvas;
    ctx;
    scene;
    viewport;
    // when true, render overlay helpful for debugging: mask, crosshair, target
    debug = false;
    cameraX = 0;
    cameraY = 0;
    // define how far you can move
    maxX = 0;
    maxY = 0;
    flashAlpha = 0;
    flashFadeRate = 0.06;
    flashActive = false;
    suppressCelebration = false;
    objectiveColors = {};
    currentObjective;
    constructor(canvas) {
        this.canvas = canvas;
        const ctx = canvas.getContext("2d");
        if (!ctx)
            throw new Error("Canvas 2D not supported");
        this.ctx = ctx;
    }
    setScene(scene) {
        this.scene = scene;
        // create viewport that shows a fraction of the scene (e.g. 40% width)
        const canvasW = this.canvas.width;
        const canvasH = this.canvas.height;
        const sceneW = scene.image.width;
        const sceneH = scene.image.height;
        // choose viewport size: fraction of full scene width/height (keeps aspect)
        const fraction = 0.4; // show 40% of world horizontally
        const vw = Math.max(Math.min(Math.round(sceneW * fraction), sceneW), Math.round(canvasW / 2));
        const vh = Math.round((vw * canvasH) / canvasW); // preserve screen aspect ratio
        this.viewport = new Viewport(sceneW, sceneH, vw, vh);
        // objective colors
        this.objectiveColors = {};
        if (scene.definition.objectives) {
            for (const o of scene.definition.objectives) {
                const tags = o.tags?.length ? o.tags : o.tag ? [o.tag] : [];
                for (const t of tags)
                    this.objectiveColors[t] = this.randomBrightColor();
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
        // draw outlines for found objects that are within viewport
        this.drawFoundOutlines();
        // flash overlay
        if (this.flashAlpha > 0) {
            ctx.save();
            ctx.globalAlpha = this.flashAlpha;
            ctx.fillStyle = "#fff";
            ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            ctx.restore();
        }
        // debug: draw mask overlay on top of the scene (but under crosshair)
        if (this.debug && this.scene.mask) {
            ctx.save();
            ctx.globalAlpha = 0.45;
            try {
                ctx.drawImage(this.scene.mask, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight);
            }
            catch (err) {
                // ignore draw failures in debug mode
            }
            ctx.restore();
        }
        // objective HUD is rendered in DOM (side panel). Renderer only draws scene.
        // debug: draw crosshair / circle for the next unfound target
        if (this.debug && this.scene) {
            const objectiveObjects = this.scene.getObjectsForObjective(this.currentObjective);
            const target = objectiveObjects.find((o) => !o.found && o.x != null && o.y != null);
            if (target && target.x != null && target.y != null) {
                const relX = (target.x - this.viewport.x) / this.viewport.width;
                const relY = (target.y - this.viewport.y) / this.viewport.height;
                const screenX = Math.round(relX * this.canvas.width);
                const screenY = Math.round(relY * this.canvas.height);
                // If the renderer has access to an external tolerance (via camera controller),
                // draw the capture radius in world pixels translated to screen pixels.
                // Note: SceneRenderer doesn't directly own camera controller; main.ts can
                // set a helper value on renderer.debugTolerance when toggling debug.
                if (this.debugTolerance) {
                    const tolWorld = this.debugTolerance;
                    const screenRadius = Math.round(tolWorld * (this.canvas.width / this.viewport.width));
                    ctx.save();
                    ctx.strokeStyle = "rgba(0,255,136,0.4)";
                    ctx.lineWidth = 2;
                    ctx.beginPath();
                    ctx.arc(screenX, screenY, screenRadius, 0, Math.PI * 2);
                    ctx.stroke();
                    ctx.restore();
                }
                ctx.save();
                ctx.strokeStyle = "#00FF88";
                ctx.lineWidth = 3;
                // crosshair lines
                ctx.beginPath();
                ctx.moveTo(screenX - 20, screenY);
                ctx.lineTo(screenX + 20, screenY);
                ctx.moveTo(screenX, screenY - 20);
                ctx.lineTo(screenX, screenY + 20);
                ctx.stroke();
                // target circle
                ctx.beginPath();
                ctx.arc(screenX, screenY, 14, 0, Math.PI * 2);
                ctx.stroke();
                // label
                ctx.fillStyle = "rgba(0,0,0,0.6)";
                ctx.font = "14px sans-serif";
                ctx.textAlign = "center";
                ctx.fillRect(screenX - 40, screenY + 18, 80, 20);
                ctx.fillStyle = "#fff";
                ctx.fillText(target.name || "target", screenX, screenY + 33);
                ctx.restore();
            }
        }
        // celebration overlay (can be suppressed while polaroid is shown)
        const objectiveObjects = this.scene.getObjectsForObjective(this.currentObjective);
        if (!this.suppressCelebration && this.scene.allFound(objectiveObjects)) {
            this.drawCelebration();
        }
    }
    triggerFlash() {
        console.log("[renderer] triggerFlash");
        // longer flash for visual feedback
        this.flashAlpha = 1;
        this.flashActive = true;
    }
    drawFoundOutlines() {
        if (!this.scene || !this.viewport)
            return;
        const ctx = this.ctx;
        for (const obj of this.scene.definition.objects) {
            if (!obj.found)
                continue;
            if (obj.x == null || obj.y == null)
                continue;
            // convert world coords -> screen coords (account for scaling)
            const relX = (obj.x - this.viewport.x) / this.viewport.width;
            const relY = (obj.y - this.viewport.y) / this.viewport.height;
            const screenX = Math.round(relX * this.canvas.width);
            const screenY = Math.round(relY * this.canvas.height);
            const screenRadius = Math.max(8, Math.round((obj.radius ?? 20) * (this.canvas.width / this.viewport.width)));
            // if the circle would be fully off-screen, skip drawing
            if (screenX + screenRadius < 0 ||
                screenX - screenRadius > this.canvas.width ||
                screenY + screenRadius < 0 ||
                screenY - screenRadius > this.canvas.height)
                continue;
            // color by objective tag (first tag)
            const tag = obj.tags?.[0] ?? "default";
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
    drawNoScene() {
        const ctx = this.ctx;
        ctx.fillStyle = "#444";
        ctx.font = "20px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("No scene loaded", this.canvas.width / 2, this.canvas.height / 2);
    }
    drawCelebration() {
        const ctx = this.ctx;
        ctx.save();
        ctx.fillStyle = "rgba(255,255,255,0.9)";
        ctx.font = "bold 28px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const foundCount = this.scene?.definition.objects.filter((a) => a.found).length ?? 0;
        // subtle celebration text near top
        ctx.fillText(`🎉 ${foundCount}`, this.canvas.width - 60, 40);
        ctx.restore();
    }
    randomBrightColor() {
        const hue = Math.floor(Math.random() * 360);
        return `hsl(${hue}, 100%, 60%)`;
    }
    moveCamera(dx, dy) {
        // move the viewport in world pixels
        if (!this.viewport)
            return;
        this.viewport.pan(dx, dy);
    }
}
