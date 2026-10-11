// src/scene/Viewport.ts
export class Viewport {
  public x: number;
  public y: number;
  public width: number; // world pixels shown horizontally
  public height: number; // world pixels shown vertically
  public readonly sceneWidth: number;
  public readonly sceneHeight: number;

  constructor(
    sceneWidth: number,
    sceneHeight: number,
    width: number,
    height: number
  ) {
    this.sceneWidth = sceneWidth;
    this.sceneHeight = sceneHeight;

    // start centered-ish on top-left
    this.width = Math.min(width, sceneWidth);
    this.height = Math.min(height, sceneHeight);
    this.x = Math.max(0, Math.round((sceneWidth - this.width) / 2));
    this.y = Math.max(0, Math.round((sceneHeight - this.height) / 2));
  }

  pan(deltaXWorld: number, deltaYWorld: number) {
    this.x = Math.min(
      Math.max(0, this.x + deltaXWorld),
      Math.max(0, this.sceneWidth - this.width)
    );
    this.y = Math.min(
      Math.max(0, this.y + deltaYWorld),
      Math.max(0, this.sceneHeight - this.height)
    );
  }

  /** Convert a world-space point to canvas screen coordinates. */
  worldToScreen(
    worldX: number,
    worldY: number,
    canvasWidth: number,
    canvasHeight: number
  ): { x: number; y: number } {
    return {
      x: ((worldX - this.x) / this.width) * canvasWidth,
      y: ((worldY - this.y) / this.height) * canvasHeight,
    };
  }

  /** Convert a canvas screen point to world-space coordinates. */
  screenToWorld(
    screenX: number,
    screenY: number,
    canvasWidth: number,
    canvasHeight: number
  ): { x: number; y: number } {
    return {
      x: this.x + (screenX / canvasWidth) * this.width,
      y: this.y + (screenY / canvasHeight) * this.height,
    };
  }
}
