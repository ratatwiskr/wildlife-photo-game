import { getBasePath } from "@/config";

describe("config.ts", () => {
  test("detects GitHub Pages path", () => {
    const oldLocation = global.location;
    // @ts-ignore
    global.location = { href: "https://ratatwiskr.github.io/wildlife-photo-game/index.html" };

    expect(getBasePath()).toContain("wildlife-photo-game");

    // restore
    global.location = oldLocation;
  });

  test("detects local environment", () => {
    const oldLocation = global.location;
    // @ts-ignore
    global.location = { href: "http://localhost:8080/index.html" };

    expect(getBasePath()).toBe("./");

    global.location = oldLocation;
  });
});
