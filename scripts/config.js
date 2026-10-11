/**
 * config.ts
 * ----------
 * Dynamically determines the correct base path for asset loading.
 * This allows the game to work both locally (localhost) and on GitHub Pages.
 */
// Local builds: assets in the same directory
// GitHub Pages: prefix with the project folder name
export function getBasePath(location = globalThis.location) {
    const isLocal = location.hostname === "localhost" || location.hostname === "127.0.0.1";
    const match = location.pathname.match(/^\/([^/]+)\//);
    const project = match ? `/${match[1]}` : ".";
    return isLocal ? "." : project;
}
export const basePath = getBasePath();
// Optional helper for debugging:
console.log(`[config] basePath = "${basePath}"`);
