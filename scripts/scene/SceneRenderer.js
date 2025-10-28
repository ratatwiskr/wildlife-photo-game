import { Viewport } from "./Viewport.js";
export class SceneRenderer {
    canvas;
    ctx;
    scene;
    viewport;
    flashAlpha = 0;
    flashFadeRate = 0.06;
    flashActive = false;
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
        scene.definition.objectives?.forEach((o) => {
            this.objectiveColors[o.tag] = this.randomBrightColor();
        });
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
        // Draw source rect (viewport) to full canvas
        // drawImage(image, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight)
        ctx.drawImage(this.scene.image, Math.round(this.viewport.x), Math.round(this.viewport.y), Math.round(this.viewport.width), Math.round(this.viewport.height), 0, 0, this.canvas.width, this.canvas.height);
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
        // draw current objective (emoji / title) top center
        if (this.currentObjective) {
            ctx.save();
            ctx.font = "bold 28px sans-serif";
            ctx.textAlign = "center";
            ctx.textBaseline = "top";
            ctx.fillStyle = "white";
            ctx.fillText(this.currentObjective.emoji ?? this.currentObjective.title, this.canvas.width / 2, 8);
            ctx.restore();
        }
        // celebration overlay
        if (this.scene.allFound(this.scene.definition.animals)) {
            this.drawCelebration();
        }
    }
    triggerFlash() {
        this.flashAlpha = 1;
        this.flashActive = true;
    }
    drawFoundOutlines() {
        if (!this.scene || !this.viewport)
            return;
        const ctx = this.ctx;
        for (const animal of this.scene.definition.animals) {
            if (!animal.found)
                continue;
            if (animal.x == null || animal.y == null)
                continue;
            // is centroid inside viewport?
            if (!this.viewport.contains(animal.x, animal.y))
                continue;
            // convert world coords -> screen coords
            const relX = (animal.x - this.viewport.x) / this.viewport.width;
            const relY = (animal.y - this.viewport.y) / this.viewport.height;
            const screenX = Math.round(relX * this.canvas.width);
            const screenY = Math.round(relY * this.canvas.height);
            const screenRadius = Math.max(8, Math.round((animal.radius ?? 20) * (this.canvas.width / this.viewport.width)));
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
        ctx.fillStyle = "rgba(0,0,0,0.6)";
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        ctx.fillStyle = "white";
        ctx.font = "bold 44px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const foundCount = this.scene?.definition.animals.filter((a) => a.found).length ?? 0;
        ctx.fillText(`🎉 ${foundCount} photographed! 🎉`, this.canvas.width / 2, this.canvas.height / 2);
        ctx.restore();
    }
    randomBrightColor() {
        const hue = Math.floor(Math.random() * 360);
        return `hsl(${hue}, 100%, 60%)`;
    }
}
