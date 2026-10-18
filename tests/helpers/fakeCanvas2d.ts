/**
 * Minimal pixel-backed CanvasRenderingContext2D double for jsdom.
 *
 * jsdom has no canvas implementation (getContext("2d") returns null), which
 * makes mask sampling and centroid extraction — the core "color at tap matches
 * mask?" game logic — untestable. This fake stores a real RGBA buffer so tests
 * can assert on actual pixel behavior rather than stubbing the system under
 * test. Drawing methods that don't affect pixel reads are inert.
 */

const pixels = new WeakMap<object, Uint8ClampedArray>();

function bufferFor(canvas: HTMLCanvasElement): Uint8ClampedArray {
  const size = canvas.width * canvas.height * 4;
  let buf = pixels.get(canvas);
  if (!buf || buf.length !== size) {
    buf = new Uint8ClampedArray(size);
    pixels.set(canvas, buf);
  }
  return buf;
}

/** A source image carrying its own pixel data (see makeFakeImage). */
interface FakeImageLike {
  width: number;
  height: number;
  __pixels: Uint8ClampedArray;
}

function isFakeImage(img: unknown): img is FakeImageLike {
  return (
    typeof img === "object" &&
    img !== null &&
    "__pixels" in img &&
    typeof (img as FakeImageLike).width === "number"
  );
}

class FakeCanvas2D {
  // inert state properties used by renderer/polaroid code paths
  fillStyle: string | CanvasGradient | CanvasPattern = "#000";
  strokeStyle: string | CanvasGradient | CanvasPattern = "#000";
  font = "10px sans-serif";
  textAlign = "start";
  textBaseline = "alphabetic";
  globalAlpha = 1;
  lineWidth = 1;
  lineCap = "butt";
  lineJoin = "miter";

  constructor(private readonly canvas: HTMLCanvasElement) {}

  // --- pixel-affecting methods (real behavior under test) ---

  drawImage(img: CanvasImageSource, dx?: number, dy?: number): void {
    // Only the (source, 0, 0) full-image blit is needed by mask code paths;
    // scaled/cropped draws (renderer, polaroid) never feed back into reads.
    if (arguments.length === 3 && dx === 0 && dy === 0 && isFakeImage(img)) {
      const dst = bufferFor(this.canvas);
      const src = img.__pixels;
      const w = Math.min(img.width, this.canvas.width);
      const h = Math.min(img.height, this.canvas.height);
      for (let y = 0; y < h; y++) {
        const srcOff = y * img.width * 4;
        const dstOff = y * this.canvas.width * 4;
        dst.set(src.subarray(srcOff, srcOff + w * 4), dstOff);
      }
    }
  }

  getImageData(sx: number, sy: number, sw: number, sh: number): ImageData {
    if (sw < 0 || sh < 0) throw new IndexSizeError("negative ImageData size");
    const buf = bufferFor(this.canvas);
    const out = new Uint8ClampedArray(sw * sh * 4);
    for (let y = 0; y < sh; y++) {
      for (let x = 0; x < sw; x++) {
        const cx = sx + x;
        const cy = sy + y;
        if (
          cx < 0 ||
          cy < 0 ||
          cx >= this.canvas.width ||
          cy >= this.canvas.height
        ) {
          continue; // out of bounds reads yield transparent black, like browsers
        }
        const srcOff = (cy * this.canvas.width + cx) * 4;
        const dstOff = (y * sw + x) * 4;
        out[dstOff] = buf[srcOff];
        out[dstOff + 1] = buf[srcOff + 1];
        out[dstOff + 2] = buf[srcOff + 2];
        out[dstOff + 3] = buf[srcOff + 3];
      }
    }
    return { data: out, width: sw, height: sh, colorSpace: "srgb" } as ImageData;
  }

  // --- inert methods (rendering only, no reads depend on them) ---

  clearRect(): void {}
  fillRect(): void {}
  strokeRect(): void {}
  fillText(): void {}
  strokeText(): void {}
  save(): void {}
  restore(): void {}
  beginPath(): void {}
  closePath(): void {}
  moveTo(): void {}
  lineTo(): void {}
  arc(): void {}
  stroke(): void {}
  fill(): void {}
  translate(): void {}
  rotate(): void {}
  scale(): void {}
  setTransform(): void {}
  resetTransform(): void {}
  measureText(): TextMetrics {
    return { width: 0 } as TextMetrics;
  }
}

let originalGetContext:
  | ((type: string, options?: unknown) => unknown)
  | undefined;

/** Install the fake 2D context on jsdom's HTMLCanvasElement prototype. */
export function installFakeCanvas2D(): void {
  const proto = HTMLCanvasElement.prototype as unknown as {
    getContext: (type: string, options?: unknown) => unknown;
  };
  if (!originalGetContext) originalGetContext = proto.getContext;
  const cache = new WeakMap<object, FakeCanvas2D>();
  proto.getContext = function (
    this: HTMLCanvasElement,
    type: string,
    options?: unknown,
  ): unknown {
    if (type !== "2d") return null;
    let ctx = cache.get(this);
    if (!ctx) {
      ctx = new FakeCanvas2D(this);
      cache.set(this, ctx);
    }
    return ctx;
  };
}

/** Restore the original getContext (jsdom's null-returning implementation). */
export function uninstallFakeCanvas2D(): void {
  if (!originalGetContext) return;
  const proto = HTMLCanvasElement.prototype as unknown as {
    getContext: (type: string, options?: unknown) => unknown;
  };
  proto.getContext = originalGetContext;
  originalGetContext = undefined;
}

/**
 * Create an image-like object carrying a real RGBA pixel buffer, usable as
 * scene.image / scene.mask in unit tests and drawn via the fake 2D context.
 */
export function makeFakeImage(
  width: number,
  height: number,
  fill: [number, number, number, number] = [0, 0, 0, 0],
): HTMLImageElement {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = fill[0];
    data[i + 1] = fill[1];
    data[i + 2] = fill[2];
    data[i + 3] = fill[3];
  }
  return { width, height, __pixels: data } as unknown as HTMLImageElement;
}

/** Paint a filled rectangle of pixels into a fake image's buffer. */
export function paintRect(
  img: HTMLImageElement,
  x0: number,
  y0: number,
  w: number,
  h: number,
  color: [number, number, number, number],
): void {
  const buf = (img as unknown as FakeImageLike).__pixels;
  const iw = (img as unknown as FakeImageLike).width;
  for (let y = y0; y < y0 + h; y++) {
    for (let x = x0; x < x0 + w; x++) {
      if (x < 0 || y < 0 || x >= iw) continue;
      const off = (y * iw + x) * 4;
      buf[off] = color[0];
      buf[off + 1] = color[1];
      buf[off + 2] = color[2];
      buf[off + 3] = color[3];
    }
  }
}

/** Read back a single pixel as [r, g, b, a] from a fake image. */
export function getPixel(
  img: HTMLImageElement,
  x: number,
  y: number,
): [number, number, number, number] {
  const fake = img as unknown as FakeImageLike;
  const off = (y * fake.width + x) * 4;
  return [
    fake.__pixels[off],
    fake.__pixels[off + 1],
    fake.__pixels[off + 2],
    fake.__pixels[off + 3],
  ];
}
