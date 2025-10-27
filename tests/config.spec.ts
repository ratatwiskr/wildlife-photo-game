import { getBasePath } from "../src/config";

test("returns '.' for localhost", () => {
  const mockLoc = { hostname: "localhost", pathname: "/" } as Location;
  expect(getBasePath(mockLoc)).toBe(".");
});

test("returns /project for GitHub Pages", () => {
  const mockLoc = {
    hostname: "ratatwiskr.github.io",
    pathname: "/wildlife-photo-game/",
  } as Location;
  expect(getBasePath(mockLoc)).toBe("/wildlife-photo-game");
});
