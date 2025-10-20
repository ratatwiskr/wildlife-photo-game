import { SceneRenderer } from "./sceneRenderer.js";
import { InputHandler } from "./input.js";
async function loadScene(path) {
    const res = await fetch(path);
    return await res.json();
}
window.addEventListener("DOMContentLoaded", async () => {
    const viewport = document.getElementById("viewport");
    const container = document.getElementById("scene-container");
    const shutter = document.getElementById("shutter-button");
    const scene = await loadScene("./assets/scenes/dummyScene.json");
    const renderer = new SceneRenderer(container, scene);
    renderer.render();
    let offset = 0;
    const maxOffset = -container.scrollWidth / 4;
    const minOffset = 0;
    new InputHandler(viewport, dx => {
        offset += dx;
        offset = Math.min(minOffset, Math.max(maxOffset, offset));
        container.style.transform = `translateX(${offset}px)`;
    });
    shutter.addEventListener("click", () => {
        shutter.animate([{ transform: "scale(1)" }, { transform: "scale(0.9)" }, { transform: "scale(1)" }], { duration: 150 });
        console.log("📸 Picture taken!");
    });
});
