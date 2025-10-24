/**
 * config.ts
 * ----------
 * Dynamically determines the correct base path for asset loading.
 * This allows the game to work both locally (localhost) and on GitHub Pages.
 */
const isLocalhost = globalThis.location.hostname === "localhost" ||
    globalThis.location.hostname === "127.0.0.1";
// When hosted under a GitHub Pages project, infer path from URL
// Example: https://ratatwiskr.github.io/wildlife-photo-game/
const ghMatch = globalThis.location.pathname.match(/^\/([^/]+)\//);
const ghProjectName = ghMatch ? `/${ghMatch[1]}` : "";
// Local builds: assets in the same directory
// GitHub Pages: prefix with the project folder name
export const basePath = isLocalhost ? "." : ghProjectName;
// Optional helper for debugging:
console.log(`[config] basePath = "${basePath}"`);
