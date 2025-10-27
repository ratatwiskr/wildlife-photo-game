import { Viewport } from "./Viewport.js";
/**
 * SceneRenderer
 * --------------
 * Responsible for drawing the scene, overlays, flash, and celebration screen.
 * Keeps logic decoupled from input and scene state.
 */
export class SceneRenderer {
    canvas;
    ctx;
    scene;
    viewport;
    // Overlay / UI
    flashAlpha = 0;
    flashFadeRate = 0.05;
    flashActive = false;
    // Objective / UI text
    currentObjective;
    // Colors assigned per objective for outlines
    objectiveColors = {};
    constructor(canvas) {
        this.canvas = canvas;
        const ctx = canvas.getContext("2d");
        if (!ctx)
            throw new Error("Canvas 2D context not supported");
        this.ctx = ctx;
        this.viewport = new Viewport(canvas.width, canvas.height);
    }
    /** Bind a scene to be rendered */
    setScene(scene) {
        this.scene = scene;
        this.objectiveColors = {};
        // assign random color per objective tag
        scene.definition.objectives?.forEach((obj) => {
            this.objectiveColors[obj.tag] = this.randomBrightColor();
        });
    }
    setViewport(v) {
        this.viewport = v;
    }
    /** Trigger a white flash overlay (photo capture) */
    triggerFlash() {
        this.flashAlpha = 1;
        this.flashActive = true;
    }
    /** Main draw method – can be called from animation loop or input handler */
    draw() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        if (!this.scene) {
            this.drawNoScene(ctx);
            return;
        }
        ctx.save();
        this.viewport.apply(ctx);
        ctx.drawImage(this.scene.image, 0, 0);
        ctx.restore();
        // Draw base scene image
        ctx.drawImage(this.scene.image, 0, 0, this.canvas.width, this.canvas.height);
        // Draw overlays for found animals
        this.drawFoundOutlines(ctx);
        // Draw flash overlay if active
        this.drawFlash(ctx);
        // Draw objective text / emoji
        this.drawObjectiveUI(ctx);
        // Draw celebration if all found
        if (this.scene.allFound(this.scene.definition.animals)) {
            this.drawCelebration(ctx);
        }
    }
    /** Called periodically (e.g., requestAnimationFrame) to update transitions */
    update() {
        if (this.flashActive) {
            this.flashAlpha -= this.flashFadeRate;
            if (this.flashAlpha <= 0) {
                this.flashAlpha = 0;
                this.flashActive = false;
            }
        }
    }
    /** Draw “no scene selected” message */
    drawNoScene(ctx) {
        ctx.fillStyle = "#888";
        ctx.font = "24px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("No scene selected", this.canvas.width / 2, this.canvas.height / 2);
    }
    /** Draw outline or highlight for each found animal */
    drawFoundOutlines(ctx) {
        if (!this.scene)
            return;
        const animals = this.scene.definition.animals;
        animals.forEach((animal) => {
            if (!animal.found)
                return;
            // pick outline color by first matching objective tag, fallback white
            const tag = animal.tags?.[0] ?? "default";
            const color = this.objectiveColors[tag] ?? "#ffffff";
            // Draw random location placeholder (in real game you'd have coords)
            const randX = (animal.name.charCodeAt(0) * 37) % this.canvas.width;
            const randY = (animal.name.charCodeAt(0) * 59) % this.canvas.height;
            const radius = 30;
            ctx.save();
            ctx.beginPath();
            ctx.lineWidth = 5;
            ctx.strokeStyle = color;
            ctx.arc(randX, randY, radius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        });
    }
    /** White flash overlay */
    drawFlash(ctx) {
        if (this.flashAlpha <= 0)
            return;
        ctx.save();
        ctx.globalAlpha = this.flashAlpha;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        ctx.restore();
    }
    /** Objective UI text or emoji */
    drawObjectiveUI(ctx) {
        if (!this.currentObjective)
            return;
        const { title, emoji } = this.currentObjective;
        ctx.save();
        ctx.font = "bold 32px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillStyle = "white";
        const text = emoji ? `${emoji}` : title;
        ctx.fillText(text, this.canvas.width / 2, 10);
        ctx.restore();
    }
    /** Celebration overlay when all animals found */
    drawCelebration(ctx) {
        ctx.save();
        ctx.fillStyle = "rgba(0,0,0,0.6)";
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        ctx.fillStyle = "yellow";
        ctx.font = "bold 48px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("🎉 All Animals Found! 🎉", this.canvas.width / 2, this.canvas.height / 2 - 20);
        const foundCount = this.scene?.definition.animals.filter((a) => a.found).length ?? 0;
        ctx.font = "32px sans-serif";
        ctx.fillText(`${foundCount} animals photographed`, this.canvas.width / 2, this.canvas.height / 2 + 40);
        ctx.restore();
    }
    /** Helper to generate bright random outline colors */
    randomBrightColor() {
        const hue = Math.floor(Math.random() * 360);
        return `hsl(${hue}, 100%, 60%)`;
    }
}
