import { Scene } from "../src/scene/Scene";

function makeScene(): Scene {
  return new Scene({
    name: "jungle_adventure",
    sceneType: "photo",
    objects: [
      { name: "elephant", color: "#ff0000", tags: ["elephant"] },
      { name: "lion", color: "#00ff00", tags: ["lion"] },
    ],
    objectives: [{ title: "Find all 🐘", tags: ["elephant"] }],
  });
}

describe("Scene", () => {
  test("loads images correctly", async () => {
    const scene = makeScene();
    await expect(scene.loadImages()).resolves.toBeUndefined();
    expect(scene.image).toBeInstanceOf(HTMLImageElement);
    expect(scene.mask).toBeInstanceOf(HTMLImageElement);
  });

  test("marks an object as found by color", () => {
    const scene = makeScene();
    const foundName = scene.markFoundByColor("#ff0000");
    expect(foundName).toEqual("elephant");
    expect(
      scene.definition.objects.find((o) => o.color === "#ff0000")?.found
    ).toBe(true);
  });

  test("matches colors case-insensitively and never double-marks", () => {
    const scene = makeScene();
    expect(scene.markFoundByColor("#FF0000")).toEqual("elephant");
    expect(scene.markFoundByColor("#ff0000")).toBeNull();
  });

  test("does not mark an unknown color", () => {
    const scene = makeScene();
    const unknownColorResult = scene.markFoundByColor("#unknown");
    expect(unknownColorResult).toBeNull();
    expect(scene.definition.objects.every((o) => o.found === undefined)).toBe(
      true
    );
    expect(scene.allFound()).toBe(false);
  });

  test("detects when all objects are found", () => {
    const scene = makeScene();
    scene.markFoundByColor("#ff0000"); // elephant
    scene.markFoundByColor("#00ff00"); // lion

    expect(scene.allFound()).toBe(true);
  });

  test("fromDefinition keeps only valid objects and objectives", () => {
    const scene = Scene.fromDefinition({
      name: "dev",
      sceneType: "wimmelbild",
      objects: [
        { name: "ok", color: "#ffffff", tags: [] },
        { name: 123 }, // invalid: name is not a string
        null,
      ],
      objectives: [{ title: "ok" }, { nope: true }],
    });

    expect(scene.definition.name).toBe("dev");
    expect(scene.definition.sceneType).toBe("wimmelbild");
    expect(scene.definition.objects).toHaveLength(1);
    expect(scene.definition.objectives).toHaveLength(1);
  });
});
