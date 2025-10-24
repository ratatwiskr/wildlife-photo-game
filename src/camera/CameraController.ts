import { Scene } from "../scene/Scene";
import { AimAssist, Viewport } from "./AimAssist";
import { Cooldown } from "../utils/Cooldown";

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
  attemptCapture(): boolean {
    return false;

    // TODO
    if (this.cooldown.isActive()) return false;

    const target = undefined; //this.scene.currentObjectiveAnimal();
    if (!target) return false;

    // TODO
    // if (!this.aimAssist.isAnimalInView(this.viewport, target)) {
    //   console.log("Target not in view!");
    //   return false;
    // }

    // TODO
    // Apply aim assist
    // const nudge = this.aimAssist.computeNudge(this.viewport, target);
    // this.viewport.x += nudge.dx;
    // this.viewport.y += nudge.dy;

    // Trigger actual photo logic in Scene
    //this.scene.captureAnimal(target);

    // Start cooldown
    this.cooldown.trigger();

    return true;
  }
}
