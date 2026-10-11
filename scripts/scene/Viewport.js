// src/scene/Viewport.ts
export class Viewport {
    x;
    y;
    width; // world pixels shown horizontally
    height; // world pixels shown vertically
    sceneWidth;
    sceneHeight;
    constructor(sceneWidth, sceneHeight, width, height) {
        this.sceneWidth = sceneWidth;
        this.sceneHeight = sceneHeight;
        // start centered-ish on top-left
        this.width = Math.min(width, sceneWidth);
        this.height = Math.min(height, sceneHeight);
        this.x = Math.max(0, Math.round((sceneWidth - this.width) / 2));
        this.y = Math.max(0, Math.round((sceneHeight - this.height) / 2));
    }
    pan(deltaXWorld, deltaYWorld) {
        this.x = Math.min(Math.max(0, this.x + deltaXWorld), Math.max(0, this.sceneWidth - this.width));
        this.y = Math.min(Math.max(0, this.y + deltaYWorld), Math.max(0, this.sceneHeight - this.height));
    }
    /** Convert a world-space point to canvas screen coordinates. */
    worldToScreen(worldX, worldY, canvasWidth, canvasHeight) {
        return {
            x: ((worldX - this.x) / this.width) * canvasWidth,
            y: ((worldY - this.y) / this.height) * canvasHeight,
        };
    }
    /** Convert a canvas screen point to world-space coordinates. */
    screenToWorld(screenX, screenY, canvasWidth, canvasHeight) {
        return {
            x: this.x + (screenX / canvasWidth) * this.width,
            y: this.y + (screenY / canvasHeight) * this.height,
        };
    }
}
