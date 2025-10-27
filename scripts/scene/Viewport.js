export class Viewport {
    width;
    height;
    x = 0;
    y = 0;
    zoom = 1;
    constructor(width, height) {
        this.width = width;
        this.height = height;
    }
    apply(ctx) {
        ctx.translate(-this.x, -this.y);
        ctx.scale(this.zoom, this.zoom);
    }
}
