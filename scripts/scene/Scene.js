import { basePath } from "../config.js";
/**
 * Scene
 * -----
 * Defines core data structures and logic for scenes and animals.
 *
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
    async loadImages() {
        // Use basePath for loading images
        const imageUrl = `${basePath}/assets/scenes/${this.definition.name}.jpg`;
        const maskUrl = `${basePath}/assets/scenes/${this.definition.name}_mask.png`;
        const [img, mask] = await Promise.all([
            this.loadImage(imageUrl),
            this.loadImage(maskUrl),
        ]);
        this.image = img;
        this.mask = mask;
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
