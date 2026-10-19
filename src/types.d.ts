import type { Scene } from "./scene/Scene.js";
import type { SceneRenderer } from "./scene/SceneRenderer.js";
import type { CameraController } from "./camera/CameraController.js";

declare global {
  interface Window {
    __app: {
      scene: Scene;
      renderer: SceneRenderer;
      cameraCtrl: CameraController | null;
    };
  }
}
