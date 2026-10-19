import { Scene } from "../src/scene/Scene";
import {
  installFakeCanvas2D,
  makeFakeImage,
  paintRect,
} from "./helpers/fakeCanvas2d";

const RED: [number, number, number, number] = [255, 0, 0, 255];
const BLUE: [number, number, number, number] = [0, 0, 255, 255];
const BLACK: [number, number, number, number] = [0, 0, 0, 255];
const CLEAR: [number, number, number, number] = [0, 0, 0, 0];

function makeScene(objects: { name: string; color: string }[]): Scene {
  return new Scene({
    name: "test_scene",
    sceneType: "photo",
    objects: objects.map((o) => ({ ...o, tags: ["test"] })),
    objectives: [],
  });
}

/** Attach a fake mask of the given size to a scene and run extraction. */
function extractWithMask(
  scene: Scene,
  w: number,
  h: number,
  paint: (mask: HTMLImageElement) => void,
): void {
  const mask = makeFakeImage(w, h, CLEAR);
  paint(mask);
  scene.mask = mask;
  scene.extractPositionsFromMask();
}

describe("Scene.extractPositionsFromMask", () => {
  beforeAll(() => {
    installFakeCanvas2D();
  });

  describe("centroid computation", () => {
    it("computes the centroid of a rectangular color block", () => {
      const scene = makeScene([{ name: "red_block", color: "#ff0000" }]);
      extractWithMask(scene, 100, 100, (m) => paintRect(m, 10, 10, 20, 20, RED));
      const obj = scene.definition.objects[0];
      // block spans x 10..29, y 10..29 -> centroid (19.5, 19.5)
      expect(obj.x).toBeCloseTo(19.5, 5);
      expect(obj.y).toBeCloseTo(19.5, 5);
    });

    it("computes the centroid of an L-shaped region over all its pixels", () => {
      const scene = makeScene([{ name: "l_shape", color: "#ff0000" }]);
      extractWithMask(scene, 100, 100, (m) => {
        paintRect(m, 0, 0, 30, 10, RED); // horizontal bar: 300 px
        paintRect(m, 0, 10, 10, 30, RED); // vertical bar: 300 px
      });
      const obj = scene.definition.objects[0];
      // sumX = 300 * 14.5 + 300 * 4.5 -> cx = 9.5
      // sumY = 300 * 4.5 + 300 * 24.5 -> cy = 14.5
      expect(obj.x).toBeCloseTo(9.5, 5);
      expect(obj.y).toBeCloseTo(14.5, 5);
    });

    it("ignores transparent pixels when accumulating the centroid", () => {
      const scene = makeScene([{ name: "red_block", color: "#ff0000" }]);
      extractWithMask(scene, 100, 100, (m) => {
        paintRect(m, 10, 10, 10, 10, RED);
        // transparent noise outside the block must not shift the centroid
        paintRect(m, 60, 60, 5, 5, CLEAR);
      });
      const obj = scene.definition.objects[0];
      expect(obj.x).toBeCloseTo(14.5, 5);
      expect(obj.y).toBeCloseTo(14.5, 5);
    });
  });

  describe("radius approximation", () => {
    it("derives radius from the larger bbox dimension, halved", () => {
      const scene = makeScene([{ name: "red_block", color: "#ff0000" }]);
      // 40x20 block: max dim 40 -> radius 20
      extractWithMask(scene, 100, 100, (m) => paintRect(m, 10, 10, 40, 20, RED));
      expect(scene.definition.objects[0].radius).toBe(20);
    });

    it("applies the minimum radius floor for tiny blobs", () => {
      const scene = makeScene([{ name: "tiny", color: "#ff0000" }]);
      // 2x2 blob: max dim 2 -> 1, but floor is 8
      extractWithMask(scene, 100, 100, (m) => paintRect(m, 50, 50, 2, 2, RED));
      expect(scene.definition.objects[0].radius).toBe(8);
    });
  });

  describe("color matching", () => {
    it("matches object colors regardless of hex letter case", () => {
      const scene = makeScene([{ name: "red_block", color: "#FF0000" }]);
      extractWithMask(scene, 100, 100, (m) => paintRect(m, 10, 10, 20, 20, RED));
      const obj = scene.definition.objects[0];
      expect(obj.x).toBeDefined();
      expect(obj.y).toBeDefined();
    });

    it("assigns each object its own color's centroid", () => {
      const scene = makeScene([
        { name: "red_fish", color: "#ff0000" },
        { name: "blue_frog", color: "#0000ff" },
      ]);
      extractWithMask(scene, 100, 100, (m) => {
        paintRect(m, 10, 10, 10, 10, RED);
        paintRect(m, 60, 60, 10, 10, BLUE);
      });
      const [red, blue] = scene.definition.objects;
      expect(red.x).toBeCloseTo(14.5, 5);
      expect(red.y).toBeCloseTo(14.5, 5);
      expect(blue.x).toBeCloseTo(64.5, 5);
      expect(blue.y).toBeCloseTo(64.5, 5);
    });

    it("leaves objects without a mask match unpositioned", () => {
      const scene = makeScene([{ name: "ghost", color: "#00ff00" }]);
      extractWithMask(scene, 100, 100, (m) => paintRect(m, 10, 10, 20, 20, RED));
      const obj = scene.definition.objects[0];
      expect(obj.x).toBeUndefined();
      expect(obj.y).toBeUndefined();
      expect(obj.radius).toBeUndefined();
    });

    it("still positions black-masked objects (extraction counts black, unlike sampling)", () => {
      // extraction and sampleMaskPixel disagree on black: extraction counts
      // black pixels, so a black object gets a position — but the tap sampler
      // can never return "#000000", so a black object is unfindable by tap.
      // This test pins the current (inconsistent) behavior.
      const scene = makeScene([{ name: "shadow", color: "#000000" }]);
      extractWithMask(scene, 100, 100, (m) => paintRect(m, 40, 40, 10, 10, BLACK));
      const obj = scene.definition.objects[0];
      expect(obj.x).toBeCloseTo(44.5, 5);
      expect(obj.y).toBeCloseTo(44.5, 5);
    });
  });

  describe("degenerate inputs", () => {
    it("is a no-op when no mask is attached", () => {
      const scene = makeScene([{ name: "red_block", color: "#ff0000" }]);
      expect(() => scene.extractPositionsFromMask()).not.toThrow();
      expect(scene.definition.objects[0].x).toBeUndefined();
    });

    it("extracts nothing from an empty mask", () => {
      const scene = makeScene([{ name: "red_block", color: "#ff0000" }]);
      extractWithMask(scene, 100, 100, () => undefined);
      expect(scene.definition.objects[0].x).toBeUndefined();
    });
  });
});
