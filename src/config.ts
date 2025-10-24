/**
 * config.ts
 * ----------
 * Dynamically determines the correct base path for asset loading.
 * This allows the game to work both locally (localhost) and on GitHub Pages.
 */

const isLocalhost =
  globalThis.location.hostname === "localhost" ||
  globalThis.location.hostname === "127.0.0.1";

// When hosted under a GitHub Pages project, infer path from URL
// Example: https://ratatwiskr.github.io/wildlife-photo-game/
const ghMatch = globalThis.location.pathname.match(/^\/([^/]+)\//);
const ghProjectName = ghMatch ? `/${ghMatch[1]}` : "";

// Local builds: assets in the same directory
// GitHub Pages: prefix with the project folder name

export function getBasePath(location: Location = globalThis.location): string {
  const isLocal =
    location.hostname === "localhost" || location.hostname === "127.0.0.1";
  const match = location.pathname.match(/^\/([^/]+)\//);
  const project = match ? `/${match[1]}` : ".";
  return isLocal ? "." : project;
}

export const basePath = getBasePath();

// Optional helper for debugging:
console.log(`[config] basePath = "${basePath}"`);
