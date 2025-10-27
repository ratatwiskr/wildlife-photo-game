export class Viewport {
  public x = 0;
  public y = 0;
  public zoom = 1;

  constructor(public width: number, public height: number) {}

  apply(ctx: CanvasRenderingContext2D) {
    ctx.translate(-this.x, -this.y);
    ctx.scale(this.zoom, this.zoom);
  }
}
