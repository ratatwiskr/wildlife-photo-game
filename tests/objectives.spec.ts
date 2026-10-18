import { Scene } from "../src/scene/Scene";

function makeScene(): Scene {
  return new Scene({
    name: "test",
    sceneType: "photo",
    objects: [
      { name: "sparrow", color: "#111111", tags: ["bird"] },
      { name: "eagle", color: "#222222", tags: ["bird"] },
      { name: "lion", color: "#333333", tags: ["mammal"] },
    ],
    objectives: [
      { title: "Birds", tags: ["bird"], emoji: "🐦" },
      { title: "Mammals", tag: "mammal" }, // legacy single-tag form
    ],
  });
}

describe("Scene objectives", () => {
  test("getObjectiveTags prefers tags[] and falls back to legacy tag", () => {
    expect(Scene.getObjectiveTags({ title: "a", tags: ["bird", "fly"] })).toEqual(
      ["bird", "fly"]
    );
    expect(Scene.getObjectiveTags({ title: "b", tag: "mammal" })).toEqual([
      "mammal",
    ]);
    expect(Scene.getObjectiveTags({ title: "c" })).toEqual([]);
  });

  test("getObjectiveLabel uses emoji, then title, then fallback", () => {
    expect(Scene.getObjectiveLabel({ title: "Birds", emoji: "🐦" })).toBe("🐦");
    expect(Scene.getObjectiveLabel({ title: "Birds" })).toBe("Birds");
    expect(Scene.getObjectiveLabel({ title: "" })).toBe("📍");
  });

  test("getObjectsForObjective filters objects by tag", () => {
    const scene = makeScene();
    const birds = scene.getObjectsForObjective({
      title: "Birds",
      tags: ["bird"],
    });
    expect(birds.map((o) => o.name)).toEqual(["sparrow", "eagle"]);

    const mammals = scene.getObjectsForObjective({
      title: "Mammals",
      tag: "mammal",
    });
    expect(mammals.map((o) => o.name)).toEqual(["lion"]);
  });

  test("getObjectsForObjective without tags returns every object", () => {
    const scene = makeScene();
    expect(scene.getObjectsForObjective({ title: "All" })).toHaveLength(3);
    expect(scene.getObjectsForObjective()).toHaveLength(3);
  });

  test("an objective is complete only once all of its objects are found", () => {
    const scene = makeScene();
    const [birds, mammals] = scene.definition.objectives;

    const birdObjects = scene.getObjectsForObjective(birds);
    scene.markFoundByColor("#111111");
    expect(scene.allFound(birdObjects)).toBe(false);
    scene.markFoundByColor("#222222");
    expect(scene.allFound(birdObjects)).toBe(true);

    // completing the first objective leaves the second one open
    expect(scene.allFound(scene.getObjectsForObjective(mammals))).toBe(false);
    scene.markFoundByColor("#333333");
    expect(scene.allFound(scene.getObjectsForObjective(mammals))).toBe(true);
    expect(scene.allFound()).toBe(true);
  });
});
