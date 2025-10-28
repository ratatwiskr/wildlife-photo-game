// src/scene/Scene.ts
import { basePath } from "../config.js";

export interface Animal {
  name: string;
  color: string; // hex code from mask (e.g. "#AABBCC")
  tags: string[];
  found?: boolean;

  // computed from mask after load:
  x?: number; // centroid x in image pixel coordinates
  y?: number; // centroid y in image pixel coordinates
  radius?: number; // approximate radius in pixels
}

export interface Objective {
  title: string;
  // allow either single tag (legacy) or tags array in scene JSON
  tag?: string;
  tags?: string[];
  emoji?: string;
}

export interface SceneDefinition {
  name: string;
  // we accept either "animals" or older "objects" keys
  animals?: Animal[];
  objects?: Animal[];
  objectives?: Objective[];
}

export class Scene {
  public definition: Required<
    Pick<SceneDefinition, "name" | "animals" | "objectives">
  >;
  public image!: HTMLImageElement;
  public mask!: HTMLImageElement;

  constructor(def: SceneDefinition) {
    // Normalize input: accept animals OR objects
    const animals = def.animals ?? def.objects ?? [];
    const objectives = def.objectives ?? [];
    this.definition = {
      name: def.name,
      animals: animals.map((a) => ({ ...a })),
      objectives,
    };
  }

  /** Load scene image & mask, then extract per-animal positions from mask */
  async loadImagesAndExtract(): Promise<void> {
    await this.loadImages();
    this.extractPositionsFromMask();
  }

  async loadImages(): Promise<void> {
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
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      let resolved = false;
      const finish = () => {
        if (resolved) return;
        resolved = true;
        resolve(img);
      };

      img.onload = () => finish();
      img.onerror = () => {
        // fallback to a tiny transparent GIF data URL to avoid DOM canvas usage
        img.src =
          "data:image/gif;base64,R0lGODlhAQABAPAAAP///wAAACwAAAAAAQABAEACAkQBADs=";
        finish();
      };

      // safety timeout: if loading takes too long, fallback to tiny placeholder
      const to = setTimeout(() => {
        if (!resolved) {
          img.src = "data:image/gif;base64,R0lGODlhAQABAPAAAP///wAAACwAAAAAAQABAEACAkQBADs=";
          finish();
        }
      }, 1500);

      img.src = src;
    });
  }

  /**
   * Scan mask image pixel data to compute centroid & approximate radius per color.
   * Populates animal.x, animal.y, animal.radius.
   */
  extractPositionsFromMask(): void {
    if (!this.mask) return;
    const w = this.mask.width;
    const h = this.mask.height;

    // draw mask to an offscreen canvas
    const tmp = document.createElement("canvas");
    tmp.width = w;
    tmp.height = h;
    const tctx = tmp.getContext("2d");
    if (!tctx) {
      console.warn("Could not get 2D context for mask extraction");
      return;
    }
    tctx.drawImage(this.mask, 0, 0);
    const data = tctx.getImageData(0, 0, w, h).data;

    // prepare mapping colorHex -> accumulation
    type Acc = {
      sumX: number;
      sumY: number;
      count: number;
      minX: number;
      minY: number;
      maxX: number;
      maxY: number;
    };
    const accMap = new Map<string, Acc>();

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        const r = data[i],
          g = data[i + 1],
          b = data[i + 2],
          a = data[i + 3];
        if (a === 0) continue; // transparent -> background
        const hex = Scene.rgbToHex(r, g, b).toUpperCase();

        const acc = accMap.get(hex);
        if (!acc) {
          accMap.set(hex, {
            sumX: x,
            sumY: y,
            count: 1,
            minX: x,
            minY: y,
            maxX: x,
            maxY: y,
          });
        } else {
          acc.sumX += x;
          acc.sumY += y;
          acc.count += 1;
          acc.minX = Math.min(acc.minX, x);
          acc.minY = Math.min(acc.minY, y);
          acc.maxX = Math.max(acc.maxX, x);
          acc.maxY = Math.max(acc.maxY, y);
        }
      }
    }

    // For each animal definition, find its color in map and compute centroid
    for (const animal of this.definition.animals) {
      const color = (animal.color || "").toUpperCase();
      const acc = accMap.get(color);
      if (!acc || acc.count === 0) {
        // No pixels found for that color — leave undefined but warn
        console.warn(
          `Scene "${this.definition.name}": color ${color} not found in mask for ${animal.name}`
        );
        continue;
      }
      const cx = acc.sumX / acc.count;
      const cy = acc.sumY / acc.count;

      // approximate radius from bounding box
      const bboxW = acc.maxX - acc.minX + 1;
      const bboxH = acc.maxY - acc.minY + 1;
      const radius = Math.max(8, Math.round(Math.max(bboxW, bboxH) / 2));

      animal.x = cx;
      animal.y = cy;
      animal.radius = radius;
    }
  }

  markFoundByColor(hexColor: string): string | null {
    const animal = this.definition.animals.find(
      (a) =>
        !a.found && a.color && a.color.toLowerCase() === hexColor.toLowerCase()
    );
    if (!animal) return null;
    animal.found = true;
    return animal.name;
  }

  // filterActiveAnimals(tag: string) {
  //   return this.definition.animals
  //     ? this.definition.animals
  //     : this.definition.animals.filter((a) => a.tags?.includes(tag));
  // }

  allFound(animals = this.definition.animals): boolean {
    return animals.every((a) => a.found);
  }

  getAnimalsForObjective(obj?: Objective) {
    if (!obj) return this.definition.animals;
    const tags = obj.tags?.length ? obj.tags : obj.tag ? [obj.tag] : [];
    if (tags.length === 0) return this.definition.animals;
    return this.definition.animals.filter((a) => a.tags?.some((t) => tags.includes(t)));
  }

  static rgbToHex(r: number, g: number, b: number): string {
    const toHex = (n: number) => n.toString(16).padStart(2, "0");
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toLowerCase();
  }
}
