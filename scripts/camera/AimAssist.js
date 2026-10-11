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
}
