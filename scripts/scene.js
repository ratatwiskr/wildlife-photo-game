/**
 * scene.ts
 * ---------
 * Defines core data structures and logic for scenes and animals.
 * Pure logic — no DOM, no canvas dependency. Ideal for Jest tests.
 */
/**
 * Scene
 * -----
 * Represents one playable scene. Responsible for loading images,
 * maintaining found state, and resolving animals by color.
 */
export class Scene {
    definition;
    image;
    mask;
    constructor(definition) {
        this.definition = definition;
    }
    /**
     * Load background and mask images.
     * The files are automatically matched by scene name:
     *   e.g. "savanna.jpg" + "savanna_mask.png"
     */
    async loadImages(basePath = "./assets/scenes/") {
        const sceneName = this.definition.name;
        const bgUrl = `${basePath}${sceneName}.jpg`;
        const maskUrl = `${basePath}${sceneName}_mask.png`;
        this.image = await this.loadImage(bgUrl);
        this.mask = await this.loadImage(maskUrl);
    }
    loadImage(src) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = (err) => reject(err);
            img.src = src;
        });
    }
    /**
     * Mark an animal as found by color (e.g. from mask click).
     * Returns the animal name or null if not found.
     */
    markFoundByColor(hexColor) {
        const animal = this.definition.animals.find((a) => !a.found && a.color.toLowerCase() === hexColor.toLowerCase());
        if (!animal)
            return null;
        animal.found = true;
        return animal.name;
    }
    /**
     * Filter animals matching the provided tag.
     * Used for active objectives.
     */
    filterActiveAnimals(tag) {
        return this.definition.animals.filter((a) => a.tags?.includes(tag));
    }
    /**
     * Whether all animals in the scene are found.
     */
    allFound(animals = this.definition.animals) {
        return animals.every((a) => a.found);
    }
    /**
     * Convert RGB triplet to hex string.
     * Used internally by mask sampling logic.
     */
    static rgbToHex(r, g, b) {
        const toHex = (n) => n.toString(16).padStart(2, "0");
        return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toLowerCase();
    }
}
