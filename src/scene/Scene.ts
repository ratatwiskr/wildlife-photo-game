export interface Animal {
  name: string;
  color: string; // hex code from mask
  tags: string[];
  found?: boolean;
}

export interface Objective {
  title: string;
  tag: string;
  emoji?: string;
}

export interface SceneDefinition {
  name: string;
  animals: Animal[];
  objectives?: Objective[];
}

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
  public definition: SceneDefinition;
  public image!: HTMLImageElement;
  public mask!: HTMLImageElement;

  constructor(definition: SceneDefinition) {
    this.definition = definition;
  }

  /**
   * Load background and mask images.
   * The files are automatically matched by scene name:
   *   e.g. "savanna.jpg" + "savanna_mask.png"
   */
  async loadImages(): Promise<void> {
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

  private loadImage(src: string): Promise<HTMLImageElement> {
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
  markFoundByColor(hexColor: string): string | null {
    const animal = this.definition.animals.find(
      (a) => !a.found && a.color.toLowerCase() === hexColor.toLowerCase()
    );
    if (!animal) return null;
    animal.found = true;
    return animal.name;
  }

  /**
   * Filter animals matching the provided tag.
   * Used for active objectives.
   */
  filterActiveAnimals(tag: string): Animal[] {
    return this.definition.animals.filter((a) => a.tags?.includes(tag));
  }

  /**
   * Whether all animals in the scene are found.
   */
  allFound(animals: Animal[] = this.definition.animals): boolean {
    return animals.every((a) => a.found);
  }

  /**
   * Convert RGB triplet to hex string.
   * Used internally by mask sampling logic.
   */
  static rgbToHex(r: number, g: number, b: number): string {
    const toHex = (n: number) => n.toString(16).padStart(2, "0");
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toLowerCase();
  }
}
