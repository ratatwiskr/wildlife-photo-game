import { Scene, Animal } from "../src/scene/Scene";

describe("Scene", () => {
  const testDefinition = {
    name: "test-scene",
    animals: [
      { name: "elephant", color: "#ff0000", tags: ["elephant"], found: false },
      { name: "lion", color: "#00ff00", tags: ["lion"], found: false },
    ],
  };

  const scene = new Scene(testDefinition);

  test("loads images correctly", async () => {
    // Assuming loadImages should load two images
    await expect(scene.loadImages()).resolves.toBeUndefined();
    expect(scene.image).toBeInstanceOf(HTMLImageElement);
    expect(scene.mask).toBeInstanceOf(HTMLImageElement);
  });

  test("marks an animal as found by color", () => {
    const foundAnimalName = scene.markFoundByColor("#ff0000");
    expect(foundAnimalName).toEqual("elephant");
    // Check if the animal is actually marked as found
    expect(
      scene.definition.animals.find((a) => a.color === "#ff0000")?.found
    ).toBe(true);
  });

  test("does not mark an unknown color", () => {
    const unknownColorResult = scene.markFoundByColor("#unknown");
    expect(unknownColorResult).toBeNull();
    // Ensure no animal was marked as found
    expect(scene.definition.animals.every((a) => a.found === false)).toBe(true);
  });

  test("detects when all animals are found", () => {
    scene.markFoundByColor("#ff0000"); // elephant
    scene.markFoundByColor("#00ff00"); // lion

    expect(scene.allFound()).toBe(true);
  });
});
