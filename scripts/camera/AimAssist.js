export class AimAssist {
    tolerance;
    constructor(tolerancePx = 200) {
        // increased default tolerance to make development easier during dev
        this.tolerance = tolerancePx;
    }
    // expose tolerance for debug visuals
    getTolerance() {
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
     * Returns true if any part of the object is visible in viewport
     */
    isObjectInView(viewport, obj) {
        if (obj.x == null || obj.y == null || obj.radius == null)
            return false;
        const ax = obj.x;
        const ay = obj.y;
        const r = obj.radius;
        // check if bounding box of object intersects viewport
        const left = ax - r;
        const right = ax + r;
        const top = ay - r;
        const bottom = ay + r;
        return !(right < viewport.x ||
            left > viewport.x + viewport.width ||
            bottom < viewport.y ||
            top > viewport.y + viewport.height);
    }
    /**
     * Compute a nudge (dx, dy) in world pixels to move viewport toward animal.
     * If animal is within tolerance of center, returns {dx:0, dy:0}.
     */
    computeNudge(viewport, obj) {
        if (obj.x == null || obj.y == null)
            return { dx: 0, dy: 0 };
        const centerX = viewport.x + viewport.width / 2;
        const centerY = viewport.y + viewport.height / 2;
        const deltaX = obj.x - centerX;
        const deltaY = obj.y - centerY;
        const dx = Math.abs(deltaX) <= this.tolerance ? 0 : deltaX * 0.5;
        const dy = Math.abs(deltaY) <= this.tolerance ? 0 : deltaY * 0.5;
        return { dx, dy };
    }
}
