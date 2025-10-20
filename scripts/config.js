/**
 * Global configuration for the Wildlife Photo Game
 * Ensures consistent paths across local dev, LAN testing, and GitHub Pages.
 */
export const Config = {
    /**
     * Detects base path dynamically depending on environment
     * e.g.
     *  - "/" on localhost or local web server
     *  - "/wildlife-photo-game/" on GitHub Pages
     */
    get basePath() {
        const path = window.location.pathname;
        const repoName = "wildlife-photo-game";
        if (path.includes(`/${repoName}/`)) {
            return `/${repoName}/`;
        }
        return "/";
    },
    /** Convenience path helpers */
    get assetPath() {
        return this.basePath + "assets/";
    },
    get scenePath() {
        return this.basePath + "scenes/";
    },
    /** General metadata */
    title: "Wildlife Photo Game",
    version: "0.1.0",
};
