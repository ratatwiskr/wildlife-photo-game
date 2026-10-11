// src/scene/Scene.ts
import { basePath } from "../config.js";
import { createOffscreenCanvas } from "../utils/canvas.js";

// ---- runtime validation guards (bridge untyped scene JSON -> typed model) ----

function isSceneObject(value: unknown): value is SceneObject {
  if (typeof value !== "object" || value === null) return false;
  const o = value as Record<string, unknown>;
  return typeof o.name === "string" && typeof o.color === "string";
}

function isObjective(value: unknown): value is Objective {
  if (typeof value !== "object" || value === null) return false;
  const o = value as Record<string, unknown>;
  return typeof o.title === "string";
}

export interface SceneObject {
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

interface SceneDefinition {
  name: string;
  sceneType: "photo" | "wimmelbild";
  objects?: SceneObject[]; // canonical key now
  objectives?: Objective[];
}

export class Scene {
  public definition: Required<
    Pick<SceneDefinition, "name" | "objects" | "objectives" | "sceneType">
  >;
  public image!: HTMLImageElement;
  public mask!: HTMLImageElement;

  /**
   * Build a Scene from an unvalidated scene JSON definition, keeping only
   * entries that match the typed model. Use this instead of casting raw JSON.
   */
  static fromDefinition(def: Record<string, unknown>): Scene {
    const name = typeof def.name === "string" ? def.name : "unknown";
    const sceneType = def.sceneType === "wimmelbild" ? "wimmelbild" : "photo";
    const objects: SceneObject[] = Array.isArray(def.objects)
      ? def.objects.filter(isSceneObject)
      : [];
    const objectives: Objective[] = Array.isArray(def.objectives)
      ? def.objectives.filter(isObjective)
      : [];
    return new Scene({ name, sceneType, objects, objectives });
  }

  constructor(def: SceneDefinition) {
    // Require canonical "objects" key (no legacy support)
    const objects = def.objects ?? [];
    const objectives = def.objectives ?? [];
    const sceneType = def.sceneType ?? "photo";
    this.definition = {
      name: def.name,
      objects: objects.map((o) => ({ ...o })),
      objectives,
      sceneType,
    };
  }

  /** Load scene image & mask from assets. */
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
          img.src =
            "data:image/gif;base64,R0lGODlhAQABAPAAAP///wAAACwAAAAAAQABAEACAkQBADs=";
          finish();
        }
      }, 1500);

      img.src = src;
    });
  }

  /**
   * Scan mask image pixel data to compute centroid & approximate radius per color.
   * Populates object.x, object.y, object.radius.
   */
  extractPositionsFromMask(): void {
    if (!this.mask) return;
    const w = this.mask.width;
    const h = this.mask.height;

    // draw mask to an offscreen canvas
    const { ctx: tctx } = createOffscreenCanvas(w, h);
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

    // For each object definition, find its color in map and compute centroid
    for (const obj of this.definition.objects) {
      const color = (obj.color || "").toUpperCase();
      const acc = accMap.get(color);
      if (!acc || acc.count === 0) {
        console.warn(
          `Scene "${this.definition.name}": color ${color} not found in mask for ${obj.name}`
        );
        continue;
      }
      const cx = acc.sumX / acc.count;
      const cy = acc.sumY / acc.count;

      // approximate radius from bounding box
      const bboxW = acc.maxX - acc.minX + 1;
      const bboxH = acc.maxY - acc.minY + 1;
      const radius = Math.max(8, Math.round(Math.max(bboxW, bboxH) / 2));

      obj.x = cx;
      obj.y = cy;
      obj.radius = radius;
    }
  }

  markFoundByColor(hexColor: string): string | null {
    const obj = this.definition.objects.find(
      (o) =>
        !o.found && o.color && o.color.toLowerCase() === hexColor.toLowerCase()
    );
    if (!obj) return null;
    obj.found = true;
    return obj.name;
  }

  allFound(objects = this.definition.objects): boolean {
    return objects.every((a) => a.found);
  }

  getObjectsForObjective(obj?: Objective) {
    if (!obj) return this.definition.objects;
    const tags = Scene.getObjectiveTags(obj);
    if (tags.length === 0) return this.definition.objects;
    return this.definition.objects.filter((a) =>
      a.tags?.some((t) => tags.includes(t))
    );
  }

  /** Resolve an objective's tag list, accepting either `tags[]` or legacy `tag`. */
  static getObjectiveTags(obj: Objective): string[] {
    return obj.tags?.length ? obj.tags : obj.tag ? [obj.tag] : [];
  }

  /** Fallback display label for an objective. */
  static getObjectiveLabel(obj: Pick<Objective, "title" | "emoji">): string {
    return obj.emoji || obj.title || "📍";
  }

  static rgbToHex(r: number, g: number, b: number): string {
    const toHex = (n: number) => n.toString(16).padStart(2, "0");
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toLowerCase();
  }
}
