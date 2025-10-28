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
    /**
     * Triggered when shutter button is pressed
     */
    attemptCapture() {
        if (this.cooldown.isActive())
            return false;
        // find first objective-related animal that is not yet found
        const obj = (this.scene.definition.objectives || [])[0];
        const animals = obj ? this.scene.getAnimalsForObjective(obj) : this.scene.definition.animals;
        const target = animals.find((a) => !a.found);
        if (!target)
            return false;
        // require target to be at least partially visible
        if (!this.aimAssist.isAnimalInView(this.viewport, target)) {
            return false;
        }
        // simulate taking a photo by sampling the mask at the viewport center
        const centerX = Math.round(this.viewport.x + this.viewport.width / 2);
        const centerY = Math.round(this.viewport.y + this.viewport.height / 2);
        // The Scene API expects markFoundByColor(hex)
        // We'll attempt to read pixel color from the scene mask by drawing it to a temp canvas
        try {
            const tmp = document.createElement("canvas");
            tmp.width = this.scene.mask.width;
            tmp.height = this.scene.mask.height;
            const tctx = tmp.getContext("2d");
            if (tctx) {
                tctx.drawImage(this.scene.mask, 0, 0);
                const p = tctx.getImageData(centerX, centerY, 1, 1).data;
                const hex = this.scene.constructor.rgbToHex(p[0], p[1], p[2]);
                const found = this.scene.markFoundByColor(hex);
                if (found) {
                    this.cooldown.trigger();
                    return true;
                }
            }
        }
        catch (e) {
            // ignore in environments without canvas
        }
        // still trigger cooldown to provide feedback
        this.cooldown.trigger();
        return false;
    }
}
