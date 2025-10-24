import { basePath } from "../src/config";

describe("config.ts", () => {
  test("detects GitHub Pages path", () => {
    const oldLocation = globalThis.location;
    // @ts-ignore
    globalThis.location = {
      href: "https://ratatwiskr.github.io/wildlife-photo-game/index.html",
    };

    expect(basePath).toContain("wildlife-photo-game");

    // restore
    globalThis.location = oldLocation;
  });

  test("detects local environment", () => {
    const oldLocation = globalThis.location;
    // @ts-ignore
    globalThis.location = { href: "http://localhost:8080/index.html" };

    expect(basePath).toBe("./");

    globalThis.location = oldLocation;
  });
});
