import { Animal } from "../scene/Scene.js";

export interface Viewport {
  x: number;
  y: number;
  width: number;
  height: number;
}

export class AimAssist {
  private tolerance: number;

  constructor(tolerancePx: number = 200) {
  // increased default tolerance to make development easier during dev
  this.tolerance = tolerancePx;
  }

  // expose tolerance for debug visuals
  public getTolerance(): number {
    return this.tolerance;
  }

  /**
   * Returns {dx, dy} to nudge the viewport toward animal center
   * If already centered within tolerance, returns {dx:0, dy:0}
   */
  // computeNudge(viewport: Viewport, animal: Animal): { dx: number; dy: number } {
  // const centerX = viewport.x + viewport.width / 2;
  // const centerY = viewport.y + viewport.height / 2;

  // TODO
  // const deltaX = animal.cx - centerX;
  // const deltaY = animal.cy - centerY;

  // Apply tolerance
  // const dx = Math.abs(deltaX) <= this.tolerance ? 0 : deltaX * 0.5;
  // const dy = Math.abs(deltaY) <= this.tolerance ? 0 : deltaY * 0.5;

  // return { dx, dy };
  // }

  /**
   * Returns true if any part of the animal is visible in viewport
   */
  isAnimalInView(viewport: Viewport, animal: Animal): boolean {
  if (animal.x == null || animal.y == null || animal.radius == null) return false;
  const ax = animal.x;
  const ay = animal.y;
  const r = animal.radius;
  // check if bounding box of animal intersects viewport
  const left = ax - r;
  const right = ax + r;
  const top = ay - r;
  const bottom = ay + r;

  return !(right < viewport.x || left > viewport.x + viewport.width || bottom < viewport.y || top > viewport.y + viewport.height);
  }

  /**
   * Compute a nudge (dx, dy) in world pixels to move viewport toward animal.
   * If animal is within tolerance of center, returns {dx:0, dy:0}.
   */
  computeNudge(viewport: Viewport, animal: Animal): { dx: number; dy: number } {
    if (animal.x == null || animal.y == null) return { dx: 0, dy: 0 };
    const centerX = viewport.x + viewport.width / 2;
    const centerY = viewport.y + viewport.height / 2;
    const deltaX = animal.x - centerX;
    const deltaY = animal.y - centerY;

    const dx = Math.abs(deltaX) <= this.tolerance ? 0 : deltaX * 0.5;
    const dy = Math.abs(deltaY) <= this.tolerance ? 0 : deltaY * 0.5;
    return { dx, dy };
  }
}
