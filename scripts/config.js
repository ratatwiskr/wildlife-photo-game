/**
 * config.ts
 * ----------
 * Dynamically determines the correct base path for asset loading.
 * This allows the game to work both locally (localhost) and on GitHub Pages.
 */
export function getBasePath(location = globalThis.location) {
    const isLocal = location.hostname === "localhost" || location.hostname === "127.0.0.1";
    const match = location.pathname.match(/^\/([^/]+)\//);
    const project = match ? `/${match[1]}` : ".";
    return isLocal ? "." : project;
}
export const basePath = getBasePath();
