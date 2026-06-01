import { Scene } from "./scene/Scene.js";
import { SceneRenderer } from "./scene/SceneRenderer.js";
import { CameraController } from "./camera/CameraController.js";

declare global {
  interface Window {
    __app: {
      scene: Scene;
      renderer: SceneRenderer;
      cameraCtrl: CameraController | null;
    };
  }
}
