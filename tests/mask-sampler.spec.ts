import { sampleMaskPixel } from "../src/utils/MaskSampler";
import {
  installFakeCanvas2D,
  makeFakeImage,
  paintRect,
} from "./helpers/fakeCanvas2d";

const RED: [number, number, number, number] = [255, 0, 0, 255];
const BLUE: [number, number, number, number] = [0, 0, 255, 255];
const BLACK: [number, number, number, number] = [0, 0, 0, 255];
const CLEAR: [number, number, number, number] = [0, 0, 0, 0];

function makeMask(w: number, h: number): HTMLImageElement {
  return makeFakeImage(w, h, CLEAR);
}

describe("sampleMaskPixel", () => {
  beforeAll(() => {
    installFakeCanvas2D();
  });

  describe("direct hit", () => {
    it("returns the color of the sampled pixel", () => {
      const mask = makeMask(100, 100);
      paintRect(mask, 10, 10, 20, 20, RED);
      expect(sampleMaskPixel(mask, 15, 15)).toBe("#ff0000");
    });

    it("rounds fractional world coordinates to the nearest pixel", () => {
      const mask = makeMask(100, 100);
      paintRect(mask, 10, 10, 20, 20, RED);
      // 15.4 rounds to 15, still inside the red block
      expect(sampleMaskPixel(mask, 15.4, 15.4)).toBe("#ff0000");
    });
  });

  describe("fallback search on transparent / black pixels", () => {
    it("falls back to nearby majority when the pixel is transparent", () => {
      const mask = makeMask(100, 100);
      paintRect(mask, 0, 0, 30, 30, RED);
      // click just outside the block, within default searchRadius (12)
      expect(sampleMaskPixel(mask, 35, 15)).toBe("#ff0000");
    });

    it("falls back to nearby majority when the pixel is black (void color)", () => {
      const mask = makeMask(100, 100);
      paintRect(mask, 0, 0, 100, 100, RED);
      paintRect(mask, 40, 40, 10, 10, BLACK); // black hole inside red region
      expect(sampleMaskPixel(mask, 45, 45)).toBe("#ff0000");
    });

    it("returns null when nothing non-transparent is within the search radius", () => {
      const mask = makeMask(100, 100);
      paintRect(mask, 80, 80, 5, 5, RED);
      // 30px away from the red block, default radius 12
      expect(sampleMaskPixel(mask, 50, 50)).toBeNull();
    });

    it("respects an explicit searchRadius", () => {
      const mask = makeMask(100, 100);
      paintRect(mask, 80, 80, 5, 5, RED);
      expect(sampleMaskPixel(mask, 65, 65, 30)).toBe("#ff0000");
    });

    it("votes among competing colors instead of returning the nearest", () => {
      const mask = makeMask(50, 50);
      // click point at (25,25) transparent; blue outvotes red in the window
      paintRect(mask, 14, 14, 4, 4, RED); // 16 red px
      paintRect(mask, 20, 20, 8, 8, BLUE); // 64 blue px
      expect(sampleMaskPixel(mask, 25, 25, 12)).toBe("#0000ff");
    });

    it("excludes black pixels from the vote (black is void, not a color)", () => {
      const mask = makeMask(50, 50);
      paintRect(mask, 13, 13, 25, 25, BLACK); // black majority in window
      paintRect(mask, 30, 30, 3, 3, RED); // small red minority
      expect(sampleMaskPixel(mask, 25, 25, 12)).toBe("#ff0000");
    });

    it("is deterministic on ties: topmost-leftmost color in scan order wins", () => {
      const mask = makeMask(50, 50);
      // exactly one red (upper-left) and one blue (lower-right) pixel in range
      // of a transparent center; scan order goes dy ascending, then dx ascending
      paintRect(mask, 20, 20, 1, 1, RED); // dy=-5, dx=-5 — scanned first
      paintRect(mask, 30, 30, 1, 1, BLUE); // dy=+5, dx=+5 — scanned last
      expect(sampleMaskPixel(mask, 25, 25, 10)).toBe("#ff0000");
      // paint order is irrelevant — only scan position decides the tie
      const mask2 = makeMask(50, 50);
      paintRect(mask2, 30, 30, 1, 1, BLUE); // lower-right, scanned second
      paintRect(mask2, 20, 20, 1, 1, RED); // upper-left, scanned first
      expect(sampleMaskPixel(mask2, 25, 25, 10)).toBe("#ff0000");
      // blue wins only when it is the upper-left pixel
      const mask3 = makeMask(50, 50);
      paintRect(mask3, 20, 20, 1, 1, BLUE); // upper-left
      paintRect(mask3, 30, 30, 1, 1, RED); // lower-right
      expect(sampleMaskPixel(mask3, 25, 25, 10)).toBe("#0000ff");
    });
  });

  describe("degenerate inputs", () => {
    it("returns null for an entirely empty mask", () => {
      const mask = makeMask(50, 50);
      expect(sampleMaskPixel(mask, 25, 25)).toBeNull();
    });

    it("returns null for an all-black mask (black never matches an object)", () => {
      const mask = makeMask(50, 50, BLACK);
      expect(sampleMaskPixel(mask, 25, 25)).toBeNull();
    });

    it("treats pixels beyond the right/bottom edge as outside, searching inward only", () => {
      const mask = makeMask(20, 20);
      paintRect(mask, 15, 15, 5, 5, RED);
      // (25,25) is outside the 20x20 mask; the search window still sees
      // the red block at (15..19, 15..19) because out-of-range reads are
      // skipped rather than clamped
      expect(sampleMaskPixel(mask, 22, 22, 10)).toBe("#ff0000");
    });
  });
});
