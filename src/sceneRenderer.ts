import { SceneDefinition, SceneLayer, SceneAsset } from "./scene.js";

export class SceneRenderer {
  private scene: SceneDefinition;
  private container: HTMLElement;

  constructor(container: HTMLElement, scene: SceneDefinition) {
    this.container = container;
    this.scene = scene;
  }

  render() {
    this.container.innerHTML = "";
    this.scene.layers.forEach((layer: SceneLayer) => {
      layer.assets.forEach((asset: SceneAsset) => {
        const img = document.createElement("img");
        img.src = asset.src;
        img.alt = asset.id;
        img.style.position = "absolute";
        img.style.left = `${asset.x}px`;
        img.style.top = `${asset.y}px`;
        img.style.width = "150px";
        img.draggable = false;
        this.container.appendChild(img);
      });
    });
  }

  enableAutoScale(_viewport: HTMLElement) {
    console.log("Auto-scaling not yet implemented");
  }
}