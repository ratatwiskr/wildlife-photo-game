/**
 * config.ts
 * ----------
 * Dynamically determines the correct base path for asset loading.
 * This allows the game to work both locally (localhost) and on GitHub Pages.
 */
const isLocalhost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
// When hosted under a GitHub Pages project, infer path from URL
// Example: https://ratatwiskr.github.io/wildlife-photo-game/
const ghMatch = window.location.pathname.match(/^\/([^/]+)\//);
const ghProjectName = ghMatch ? `/${ghMatch[1]}` : "";
// Local builds: assets in the same directory
// GitHub Pages: prefix with the project folder name
export const basePath = isLocalhost ? "." : ghProjectName;
// Optional helper for debugging:
console.log(`[config] basePath = "${basePath}"`);
