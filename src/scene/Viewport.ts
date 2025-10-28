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

  // check if a world point is inside viewport
  contains(worldX: number, worldY: number): boolean {
    return (
      worldX >= this.x &&
      worldX <= this.x + this.width &&
      worldY >= this.y &&
      worldY <= this.y + this.height
    );
  }
}
