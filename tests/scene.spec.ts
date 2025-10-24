import { Scene, Animal } from "@/scene";

describe("Scene logic", () => {
  const scene = new Scene("test-scene", [
    new Animal("elephant", "#ff0000"),
    new Animal("lion", "#00ff00"),
  ]);

  test("marks animals as found", () => {
    scene.markAnimalFound("#ff0000");
    expect(scene.animals.find((a) => a.color === "#ff0000")?.found).toBe(true);
  });

  test("does not mark unknown color", () => {
    scene.markAnimalFound("#000000");
    expect(scene.animals.every((a) => !a.color.startsWith("#000000"))).toBe(
      true
    );
  });

  test("detects when all animals found", () => {
    scene.markAnimalFound("#ff0000");
    scene.markAnimalFound("#00ff00");
    expect(scene.allFound()).toBe(true);
  });
});
