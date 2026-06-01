import { Scene } from "../scene/Scene.js";

/**
 * Sample a pixel from a mask image at world coordinates.
 * If the pixel is fully transparent or black (#000000), search the
 * surrounding square (within searchRadius) and return the most common
 * non-transparent color via majority vote.
 * Returns the hex color string, or null if nothing could be determined.
 */
export function sampleMaskPixel(
  mask: HTMLImageElement,
  worldX: number,
  worldY: number,
  searchRadius = 12,
): string | null {
  const x = Math.round(worldX);
  const y = Math.round(worldY);

  const tmp = document.createElement("canvas");
  tmp.width = mask.width;
  tmp.height = mask.height;
  const tctx = tmp.getContext("2d", { willReadFrequently: true });
  if (!tctx) return null;

  tctx.drawImage(mask, 0, 0);
  const imgData = tctx.getImageData(x, y, 1, 1);
  const p = imgData?.data;
  if (!p) return null;

  const hex = Scene.rgbToHex(p[0], p[1], p[2]);
  const alpha = p[3] ?? 255;

  if (alpha === 0 || hex === "#000000") {
    return searchNearby(tctx, x, y, searchRadius, tmp.width, tmp.height);
  }

  return hex;
}

function searchNearby(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  w: number,
  h: number,
): string | null {
  const counts = new Map<string, number>();
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const sx = x + dx;
      const sy = y + dy;
      if (sx < 0 || sy < 0 || sx >= w || sy >= h) continue;
      const d = ctx.getImageData(sx, sy, 1, 1).data;
      if (!d) continue;
      if ((d[3] ?? 255) === 0) continue;
      const hcol = Scene.rgbToHex(d[0], d[1], d[2]);
      if (hcol === "#000000") continue;
      counts.set(hcol, (counts.get(hcol) || 0) + 1);
    }
  }

  if (counts.size === 0) return null;

  let best = "";
  let bestCount = 0;
  for (const [k, v] of counts) {
    if (v > bestCount) {
      best = k;
      bestCount = v;
    }
  }
  return best;
}
