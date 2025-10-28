export class AimAssist {
    tolerance;
    constructor(tolerancePx = 50) {
        this.tolerance = tolerancePx;
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
    isAnimalInView(viewport, animal) {
        if (animal.x == null || animal.y == null || animal.radius == null)
            return false;
        const ax = animal.x;
        const ay = animal.y;
        const r = animal.radius;
        // check if bounding box of animal intersects viewport
        const left = ax - r;
        const right = ax + r;
        const top = ay - r;
        const bottom = ay + r;
        return !(right < viewport.x || left > viewport.x + viewport.width || bottom < viewport.y || top > viewport.y + viewport.height);
        // TODO
        // return !(
        //   animal.cx + animal.radius < viewport.x ||
        //   animal.cx - animal.radius > viewport.x + viewport.width ||
        //   animal.cy + animal.radius < viewport.y ||
        //   animal.cy - animal.radius > viewport.y + viewport.height
        // );
    }
}
