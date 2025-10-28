import { AimAssist } from "./AimAssist.js";
import { Cooldown } from "../utils/Cooldown.js";
export class CameraController {
    viewport;
    scene;
    aimAssist;
    cooldown;
    constructor(scene, viewport, cooldownMs = 1000) {
        this.scene = scene;
        this.viewport = viewport;
        this.aimAssist = new AimAssist();
        this.cooldown = new Cooldown(cooldownMs);
    }
    // expose aimAssist tolerance for debug rendering
    getAimTolerance() {
        return this.aimAssist.getTolerance();
    }
    /**
     * Animate a slow nudge toward the next target and resolve when complete.
     * Returns true if a nudge was performed, false if target already in view.
     */
    // returns 'nudged' | 'skipped-too-far' | 'already-centered'
    nudgeToTarget(target, duration = 900) {
        return new Promise((resolve) => {
            // compute full delta required to center the animal in the viewport
            const centerX = this.viewport.x + this.viewport.width / 2;
            const centerY = this.viewport.y + this.viewport.height / 2;
            const deltaX = (target.x ?? centerX) - centerX;
            const deltaY = (target.y ?? centerY) - centerY;
            // if animal is already within aim tolerance, do nothing
            const tol = this.aimAssist.getTolerance();
            if (Math.abs(deltaX) <= tol && Math.abs(deltaY) <= tol) {
                console.log('[camera] nudge not needed (already within tolerance)');
                resolve('already-centered');
                return;
            }
            // enforce that the animal must be reasonably near the center before nudging
            // compute euclidean distance from viewport center to animal
            const dist = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
            // allow nudges only when within a fraction of the smaller viewport dimension
            // lower values (0.4–0.5) make the gate stricter, higher values more permissive
            const triggerFraction = 0.6; // change this to tune strictness (0.6 = 60%)
            const maxTrigger = Math.min(this.viewport.width, this.viewport.height) * triggerFraction;
            if (dist > maxTrigger) {
                console.log('[camera] nudge skipped - target too far from center', { dist, maxTrigger });
                resolve('skipped-too-far');
                return;
            }
            console.log('[camera] starting slow nudge to center', { deltaX, deltaY, duration, tol });
            const startX = this.viewport.x;
            const startY = this.viewport.y;
            // move by full delta so the animal becomes centered
            const endX = startX + deltaX;
            const endY = startY + deltaY;
            const start = performance.now();
            const step = (now) => {
                const t = Math.min(1, (now - start) / duration);
                const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
                this.viewport.x = startX + (endX - startX) * ease;
                this.viewport.y = startY + (endY - startY) * ease;
                if (t < 1)
                    requestAnimationFrame(step);
                else {
                    console.log('[camera] slow nudge complete');
                    resolve('nudged');
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
    attemptCapture(tapWorldX, tapWorldY) {
        console.log("[camera] attemptCapture", { tapWorldX, tapWorldY });
        if (this.cooldown.isActive()) {
            console.log("[camera] cooldown active");
            return null;
        }
        const obj = (this.scene.definition.objectives || [])[0];
        const animals = obj ? this.scene.getAnimalsForObjective(obj) : this.scene.definition.animals;
        const target = animals.find((a) => !a.found);
        if (!target)
            return null;
        // If not in view, don't auto-nudge here; caller should call nudgeToTarget()
        if (!this.aimAssist.isAnimalInView(this.viewport, target)) {
            console.log('[camera] target not in view; require nudge before capture');
            return null;
        }
        // sample at tap coords if provided, otherwise use viewport center
        const sampleX = Math.round(tapWorldX ?? (this.viewport.x + this.viewport.width / 2));
        const sampleY = Math.round(tapWorldY ?? (this.viewport.y + this.viewport.height / 2));
        try {
            const tmp = document.createElement('canvas');
            tmp.width = this.scene.mask.width;
            tmp.height = this.scene.mask.height;
            const tctx = tmp.getContext('2d', { willReadFrequently: true });
            if (!tctx) {
                console.log('[camera] no 2d context for mask');
                this.cooldown.trigger();
                return null;
            }
            tctx.drawImage(this.scene.mask, 0, 0);
            const imgData = tctx.getImageData(sampleX, sampleY, 1, 1);
            const p = imgData?.data;
            if (!p) {
                console.log("[camera] no pixel data at sample");
                this.cooldown.trigger();
                return null;
            }
            const hex = this.scene.constructor.rgbToHex(p[0], p[1], p[2]);
            console.log("[camera] sampled hex", hex);
            const foundName = this.scene.markFoundByColor(hex);
            if (!foundName) {
                console.log("[camera] nothing found for hex", hex);
                this.cooldown.trigger();
                return null;
            }
            // build polaroid canvas: cut bounding box from scene.image using mask
            const animal = this.scene.definition.animals.find((a) => a.name === foundName);
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
        }
        catch (e) {
            console.error('[camera] capture failed', e);
            this.cooldown.trigger();
            return null;
        }
    }
}
