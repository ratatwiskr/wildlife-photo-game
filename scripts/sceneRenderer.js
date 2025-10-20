export class SceneRenderer {
    scene;
    container;
    constructor(container, scene) {
        this.container = container;
        this.scene = scene;
    }
    render() {
        this.container.innerHTML = "";
        this.scene.layers.forEach((layer) => {
            layer.assets.forEach((asset) => {
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
    enableAutoScale(_viewport) {
        console.log("Auto-scaling not yet implemented");
    }
}
