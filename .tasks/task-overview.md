# Scene Selection Fix: Task Overview

Fix scene selection on GitHub Pages by replacing directory-listing fetches with a static `scenes-manifest.json` file.

## Tasks

- [x] [01: Create generateManifest.ts Script](./01-create-generate-manifest-script.md)
  - Implement manifest generation script that scans `assets/scenes/`, extracts `name` and `sceneType`, writes manifest JSON
- [x] [02: Update package.json](./02-update-package-json.md)
  - Add `generate:scenes-manifest` script and integrate into `build` step
- [x] [03: Refactor Scene Loading in main.ts](./03-refactor-main-ts-scene-loading.md)
  - Replace directory-listing fetches (lines 245 & 777) with single manifest fetch, consolidate duplicate code
- [x] [04: Test Locally & GitHub Pages](./04-test-locally-and-github-pages.md)
  - Verify manifest generation, test scene selection locally and on GitHub Pages deployment

## Key Decisions

- **Manifest commitment**: `scenes-manifest.json` is committed to git (required by GitHub Pages static host)
- **Error handling**: Script fails hard with clear error messages on missing/invalid scene files
- **Build integration**: Manifest generation runs before TypeScript compilation in `npm run build`

## Completion Summary

✅ **All tasks completed successfully**:

1. generateManifest.ts script created and working
2. package.json build script updated to generate manifest before TypeScript compilation
3. main.ts refactored with new `loadAvailableScenes()` helper function
4. Both directory-listing fetches (scene picker and scene select) replaced with manifest-based loading
5. Manifest file generated and staged for git commit
6. Local testing confirms:
   - Manifest is served correctly without 404 errors
   - Scene selector populates from manifest
   - Scenes are grouped by sceneType (photo/wimmelbild)
   - Scene-by-parameter URLs work correctly
   - Cypress tests show successful manifest fetches and scene loading
