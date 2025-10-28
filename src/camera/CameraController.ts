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

  /**
   * Triggered when shutter button is pressed
   */
  /**
   * Attempt capture. Returns an object when an animal was photographed:
   * { name, imageCanvas } where imageCanvas is a cutout polaroid-like canvas.
   */
  attemptCapture(tapWorldX?: number, tapWorldY?: number): { name: string; polaroid?: HTMLCanvasElement } | null {
    if (this.cooldown.isActive()) return null;

    const obj = (this.scene.definition.objectives || [])[0];
    const animals = obj ? this.scene.getAnimalsForObjective(obj) : this.scene.definition.animals;
    const target = animals.find((a) => !a.found);
    if (!target) return null;

    // If not in view, nudge viewport toward target
    if (!this.aimAssist.isAnimalInView(this.viewport as unknown as Viewport, target)) {
      const nudge = this.aimAssist.computeNudge(this.viewport as unknown as Viewport, target);
      this.viewport.x += nudge.dx;
      this.viewport.y += nudge.dy;
      // don't capture immediately, require second press when centered
      this.cooldown.trigger();
      return null;
    }

    // sample at tap coords if provided, otherwise use viewport center
    const sampleX = Math.round(tapWorldX ?? (this.viewport.x + this.viewport.width / 2));
    const sampleY = Math.round(tapWorldY ?? (this.viewport.y + this.viewport.height / 2));

    try {
  const tmp = document.createElement('canvas');
  tmp.width = this.scene.mask.width;
  tmp.height = this.scene.mask.height;
  const tctx = tmp.getContext('2d', { willReadFrequently: true }) as CanvasRenderingContext2D | null;
  if (tctx) tctx.drawImage(this.scene.mask, 0, 0);
  const p = tctx?.getImageData(sampleX, sampleY, 1, 1).data;
      if (!p) {
        this.cooldown.trigger();
        return null;
      }
      const hex = (this.scene.constructor as any).rgbToHex(p[0], p[1], p[2]);
      const foundName = this.scene.markFoundByColor(hex);
      if (!foundName) {
        this.cooldown.trigger();
        return null;
      }

      // build polaroid canvas: cut bounding box from scene.image using mask
      const animal = this.scene.definition.animals.find((a) => a.name === foundName)!;
      const pad = 12;
      const left = Math.max(0, Math.floor((animal.x ?? 0) - (animal.radius ?? 30) - pad));
      const top = Math.max(0, Math.floor((animal.y ?? 0) - (animal.radius ?? 30) - pad));
      const w = Math.min(this.scene.image.width - left, Math.floor((animal.radius ?? 30) * 2 + pad * 2));
      const h = Math.min(this.scene.image.height - top, Math.floor((animal.radius ?? 30) * 2 + pad * 3));

      const pol = document.createElement('canvas');
      pol.width = w + 40; // white border
      pol.height = h + 80; // larger bottom border
      const pctx = pol.getContext('2d');
      if (pctx) {
        // white polaroid background
        pctx.fillStyle = '#fff';
        pctx.fillRect(0, 0, pol.width, pol.height);
        // draw image cutout centered with small inner margin
        pctx.drawImage(this.scene.image, left, top, w, h, 20, 20, w, h);
        // optional: add subtle shadow
        pctx.strokeStyle = 'rgba(0,0,0,0.08)';
        pctx.strokeRect(10, 10, w + 20, h + 20);
      }

  this.cooldown.trigger();
  // return polaroid but consumer should show it after flash; we return it now
  return { name: foundName, polaroid: pol };
    } catch (e) {
      this.cooldown.trigger();
      return null;
    }
  }
}
