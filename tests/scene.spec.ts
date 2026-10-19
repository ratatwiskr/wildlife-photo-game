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

describe("Scene.loadImages", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test("falls back to placeholder images when assets do not load in time", async () => {
    const scene = makeScene();

    const loading = scene.loadImages();
    // jsdom never fires onload/onerror, so the safety timeout resolves the load
    await jest.advanceTimersByTimeAsync(1500);
    await expect(loading).resolves.toBeUndefined();

    expect(scene.image).toBeInstanceOf(HTMLImageElement);
    expect(scene.mask).toBeInstanceOf(HTMLImageElement);
  });
});

describe("Scene.markFoundByColor", () => {
  test("marks a matching object found and returns its name", () => {
    const scene = makeScene();
    expect(scene.markFoundByColor("#ff0000")).toBe("elephant");
    expect(
      scene.definition.objects.find((o) => o.color === "#ff0000")?.found,
    ).toBe(true);
  });

  test("matches colors case-insensitively and never double-marks", () => {
    const scene = makeScene();
    expect(scene.markFoundByColor("#FF0000")).toBe("elephant");
    expect(scene.markFoundByColor("#ff0000")).toBeNull();
  });

  test("returns null for colors with no object and marks nothing", () => {
    const scene = makeScene();
    expect(scene.markFoundByColor("#123456")).toBeNull();
    expect(scene.definition.objects.every((o) => o.found === undefined)).toBe(
      true,
    );
  });

  test("only matches the first unfound object when two share a color", () => {
    const scene = new Scene({
      name: "twin",
      sceneType: "photo",
      objects: [
        { name: "twin_a", color: "#ff0000", tags: [] },
        { name: "twin_b", color: "#ff0000", tags: [] },
      ],
      objectives: [],
    });
    expect(scene.markFoundByColor("#ff0000")).toBe("twin_a");
    expect(scene.markFoundByColor("#ff0000")).toBe("twin_b");
    expect(scene.markFoundByColor("#ff0000")).toBeNull();
  });
});

describe("Scene.allFound", () => {
  test("reports true only once every object is found", () => {
    const scene = makeScene();
    expect(scene.allFound()).toBe(false);
    scene.markFoundByColor("#ff0000"); // elephant
    expect(scene.allFound()).toBe(false);
    scene.markFoundByColor("#00ff00"); // lion
    expect(scene.allFound()).toBe(true);
  });
});

describe("Scene.getObjectsForObjective", () => {
  function taggedScene(): Scene {
    return new Scene({
      name: "tagged",
      sceneType: "photo",
      objects: [
        { name: "lion1", color: "#00ff00", tags: ["lion"] },
        { name: "lion2", color: "#00ff01", tags: ["lion"] },
        { name: "frog1", color: "#00ff02", tags: ["frog"] },
      ],
      objectives: [],
    });
  }

  test("filters objects by the objective's tags", () => {
    const scene = taggedScene();
    const objs = scene.getObjectsForObjective({ title: "L", tags: ["lion"] });
    expect(objs.map((o) => o.name)).toEqual(["lion1", "lion2"]);
  });

  test("supports the legacy single-tag form", () => {
    const scene = taggedScene();
    const objs = scene.getObjectsForObjective({ title: "F", tag: "frog" });
    expect(objs.map((o) => o.name)).toEqual(["frog1"]);
  });

  test("returns all objects when the objective has no tags", () => {
    const scene = taggedScene();
    expect(scene.getObjectsForObjective({ title: "everything" })).toHaveLength(
      3,
    );
  });

  test("returns all objects when called without an objective", () => {
    const scene = taggedScene();
    expect(scene.getObjectsForObjective()).toHaveLength(3);
  });

  test("returns objects with no tags only under an untagged objective", () => {
    const scene = new Scene({
      name: "mixed",
      sceneType: "photo",
      objects: [
        { name: "tagged_one", color: "#00ff00", tags: ["lion"] },
        { name: "bare_one", color: "#00ff01" },
      ],
      objectives: [],
    });
    expect(
      scene
        .getObjectsForObjective({ title: "L", tags: ["lion"] })
        .map((o) => o.name),
    ).toEqual(["tagged_one"]);
    expect(scene.getObjectsForObjective({ title: "all" })).toHaveLength(2);
  });
});

describe("Scene.fromDefinition", () => {
  test("keeps only well-formed objects and objectives", () => {
    const scene = Scene.fromDefinition({
      name: "guarded",
      sceneType: "photo",
      objects: [
        { name: "ok", color: "#ff0000", tags: ["a"] },
        { color: "#00ff00" }, // missing name
        { name: "no_color" }, // missing color
        { name: 123 }, // name is not a string
        "not-an-object",
        null,
      ],
      objectives: [{ title: "Find it" }, { tags: ["a"] }, 42],
    });
    expect(scene.definition.name).toBe("guarded");
    expect(scene.definition.objects.map((o) => o.name)).toEqual(["ok"]);
    expect(scene.definition.objectives).toHaveLength(1);
  });

  test("defaults sceneType to photo for unknown values and preserves wimmelbild", () => {
    expect(Scene.fromDefinition({ name: "x", sceneType: "bogus" }).definition.sceneType).toBe(
      "photo",
    );
    expect(
      Scene.fromDefinition({ name: "dev", sceneType: "wimmelbild" }).definition
        .sceneType,
    ).toBe("wimmelbild");
  });

  test("copies objects so caller mutation of the input does not leak in", () => {
    const inputObjects = [{ name: "ok", color: "#ff0000", tags: ["a"] }];
    const scene = Scene.fromDefinition({ name: "x", objects: inputObjects });
    inputObjects[0].name = "mutated";
    expect(scene.definition.objects[0].name).toBe("ok");
  });
});
