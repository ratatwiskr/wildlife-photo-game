import { Scene } from "../scene/Scene.js";
import { AimAssist, Viewport } from "./AimAssist.js";
import { Cooldown } from "../utils/Cooldown.js";

export class CameraController {
  private viewport: Viewport;
  private scene: Scene;
  private aimAssist: AimAssist;
  private cooldown: Cooldown;

  constructor(scene: Scene, viewport: Viewport, cooldownMs = 1000) {
    this.scene = scene;
    this.viewport = viewport;
    this.aimAssist = new AimAssist();
    this.cooldown = new Cooldown(cooldownMs);
  }

  // expose aimAssist tolerance for debug rendering
  public getAimTolerance(): number {
    return this.aimAssist.getTolerance();
  }

  /**
   * Animate a slow nudge toward the next target and resolve when complete.
   * Returns true if a nudge was performed, false if target already in view.
   */
  // returns 'nudged' | 'skipped-too-far' | 'already-centered'
  nudgeToTarget(
    target: any,
    duration = 900
  ): Promise<"nudged" | "skipped-too-far" | "already-centered"> {
    return new Promise((resolve) => {
      // compute full delta required to center the animal in the viewport
      const centerX = this.viewport.x + this.viewport.width / 2;
      const centerY = this.viewport.y + this.viewport.height / 2;
      const deltaX = (target.x ?? centerX) - centerX;
      const deltaY = (target.y ?? centerY) - centerY;
      // if animal is already within aim tolerance, do nothing
      const tol = this.aimAssist.getTolerance();
      if (Math.abs(deltaX) <= tol && Math.abs(deltaY) <= tol) {
        console.log("[camera] nudge not needed (already within tolerance)");
        resolve("already-centered");
        return;
      }

      // enforce that the animal must be reasonably near the center before nudging
      // compute euclidean distance from viewport center to animal
      const dist = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      // allow nudges only when within a fraction of the smaller viewport dimension
      // lower values (0.4–0.5) make the gate stricter, higher values more permissive
      const triggerFraction = 0.6; // change this to tune strictness (0.6 = 60%)
      const maxTrigger =
        Math.min(this.viewport.width, this.viewport.height) * triggerFraction;
      if (dist > maxTrigger) {
        console.log("[camera] nudge skipped - target too far from center", {
          dist,
          maxTrigger,
        });
        resolve("skipped-too-far");
        return;
      }

      console.log("[camera] starting slow nudge to center", {
        deltaX,
        deltaY,
        duration,
        tol,
      });
      const startX = this.viewport.x;
      const startY = this.viewport.y;
      // move by full delta so the animal becomes centered
      const endX = startX + deltaX;
      const endY = startY + deltaY;
      const start = performance.now();

      const step = (now: number) => {
        const t = Math.min(1, (now - start) / duration);
        const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
        this.viewport.x = startX + (endX - startX) * ease;
        this.viewport.y = startY + (endY - startY) * ease;
        if (t < 1) requestAnimationFrame(step);
        else {
          console.log("[camera] slow nudge complete");
          resolve("nudged");
        }
      };

      requestAnimationFrame(step);
    });
  }

  /**
   * Triggered when shutter button is pressed
   */
  /**
   * Attempt capture. Returns an object when an animal was photographed:
   * { name, imageCanvas } where imageCanvas is a cutout polaroid-like canvas.
   */
  attemptCapture(
    tapWorldX?: number,
    tapWorldY?: number,
    objective?: any
  ): { name: string; polaroid?: HTMLCanvasElement } | null {
    console.log("[camera] attemptCapture", { tapWorldX, tapWorldY, objective });
    if (this.cooldown.isActive()) {
      console.log("[camera] cooldown active");
      return null;
    }

    // Use provided objective if available (main may pass renderer.currentObjective)
    const obj = objective ?? (this.scene.definition.objectives || [])[0];
    const objects = obj
      ? this.scene.getObjectsForObjective(obj)
      : this.scene.definition.objects;
    const target = objects.find((a) => !a.found);
    if (!target) return null;

    // If not in view, don't auto-nudge here; caller should call nudgeToTarget()
    if (
      !this.aimAssist.isObjectInView(
        this.viewport as unknown as Viewport,
        target
      )
    ) {
      console.log("[camera] target not in view; require nudge before capture");
      return null;
    }

    // sample at tap coords if provided, otherwise use viewport center
    const sampleX = Math.round(
      tapWorldX ?? this.viewport.x + this.viewport.width / 2
    );
    const sampleY = Math.round(
      tapWorldY ?? this.viewport.y + this.viewport.height / 2
    );

    try {
      const tmp = document.createElement("canvas");
      tmp.width = this.scene.mask.width;
      tmp.height = this.scene.mask.height;
      const tctx = tmp.getContext("2d", { willReadFrequently: true });
      if (!tctx) {
        console.log("[camera] no 2d context for mask");
        this.cooldown.trigger();
        return null;
      }
      tctx.drawImage(this.scene.mask, 0, 0);
      const imgData = tctx.getImageData(sampleX, sampleY, 1, 1);
      const p = imgData?.data;
      if (!p) {
        console.log("[camera] no pixel data at sample", { sampleX, sampleY });
        this.cooldown.trigger();
        return null;
      }
      // if pixel is fully transparent or black, attempt a small local search
      const tryHex = (r: number, g: number, b: number) =>
        (this.scene.constructor as any).rgbToHex(r, g, b);

      let hex = tryHex(p[0], p[1], p[2]);
      const alpha = p[3] ?? 255;
      console.log("[camera] sampled", {
        sampleX,
        sampleY,
        rgba: [p[0], p[1], p[2], alpha],
      });

      let foundName = null as string | null;
      if (alpha === 0 || hex === "#000000") {
        // search nearby pixels in an expanding square for a non-transparent color
        const radius = 12; // pixels
        const w = tmp.width;
        const h = tmp.height;
        const counts = new Map<string, number>();
        for (let dy = -radius; dy <= radius; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            const sx = sampleX + dx;
            const sy = sampleY + dy;
            if (sx < 0 || sy < 0 || sx >= w || sy >= h) continue;
            const d = tctx.getImageData(sx, sy, 1, 1).data;
            if (!d) continue;
            if ((d[3] ?? 255) === 0) continue;
            const hcol = tryHex(d[0], d[1], d[2]);
            if (hcol === "#000000") continue;
            counts.set(hcol, (counts.get(hcol) || 0) + 1);
          }
        }
        if (counts.size > 0) {
          // pick the most common nearby color
          let best = "";
          let bestCount = 0;
          for (const [k, v] of counts) {
            if (v > bestCount) {
              best = k;
              bestCount = v;
            }
          }
          hex = best;
          console.log("[camera] nearby color found", hex, bestCount);
          foundName = this.scene.markFoundByColor(hex);
        }
      } else {
        console.log("[camera] sampled hex", hex);
        foundName = this.scene.markFoundByColor(hex);
      }

      // TODO: update / review following method code, does this work with above additions about provided objective?

      if (!foundName) {
        console.log("[camera] nothing found for hex", hex);
        this.cooldown.trigger();
        return null;
      }

      // build polaroid canvas: cut bounding box from scene.image using mask
      const objDef = this.scene.definition.objects.find(
        (a) => a.name === foundName
      )!;
      const pad = 12;
      const left = Math.max(
        0,
        Math.floor((objDef.x ?? 0) - (objDef.radius ?? 30) - pad)
      );
      const top = Math.max(
        0,
        Math.floor((objDef.y ?? 0) - (objDef.radius ?? 30) - pad)
      );
      const w = Math.min(
        this.scene.image.width - left,
        Math.floor((objDef.radius ?? 30) * 2 + pad * 2)
      );
      const h = Math.min(
        this.scene.image.height - top,
        Math.floor((objDef.radius ?? 30) * 2 + pad * 3)
      );

      const pol = document.createElement("canvas");
      pol.width = w + 40; // white border
      pol.height = h + 80; // larger bottom border
      const pctx = pol.getContext("2d");
      if (pctx) {
        // white polaroid background
        pctx.fillStyle = "#fff";
        pctx.fillRect(0, 0, pol.width, pol.height);
        // draw image cutout centered with small inner margin
        pctx.drawImage(this.scene.image, left, top, w, h, 20, 20, w, h);
        // optional: add subtle shadow
        pctx.strokeStyle = "rgba(0,0,0,0.08)";
        pctx.strokeRect(10, 10, w + 20, h + 20);
      }

      this.cooldown.trigger();
      // return polaroid but consumer should show it after flash; we return it now
      return { name: foundName, polaroid: pol };
    } catch (e) {
      console.error("[camera] capture failed", e);
      this.cooldown.trigger();
      return null;
    }
  }
}
