# Task 04: Test Locally & GitHub Pages

## Objective

Verify the fix works end-to-end: manifest generation, local scene selection, and GitHub Pages deployment.

## Testing Steps

### 1. Local Testing

- [ ] Run `npm run build`
  - Verify `misc/scripts/generateManifest.ts` runs without errors
  - Verify `assets/scenes/scenes-manifest.json` is created with correct structure (has all scenes, includes `name` and `sceneType`)
- [ ] Run `npm run dev` (or `npm run serve`)
  - Open browser to `http://127.0.0.1:8090`
  - Verify scene selector dropdown appears and populates
  - Verify scenes are grouped by type (photo / wimmelbild)
  - Select a scene and verify it loads correctly
  - No 404 errors in console for `scenes-manifest.json`

### 2. Scene-by-Parameter Testing

- [ ] Navigate to `http://127.0.0.1:8090/?scene=jungle_adventure`
  - Scene should load directly without selector
- [ ] Navigate to `http://127.0.0.1:8090/?scene=wimmelbild_jungle_adventure`
  - Scene should load (wimmelbild mode)
- [ ] Navigate to `http://127.0.0.1:8090/?scene=nonexistent`
  - Should show error or fallback to default scene gracefully

### 3. GitHub Pages Testing

- [ ] Commit `assets/scenes/scenes-manifest.json` to git and push to `main`
- [ ] GitHub Pages builds automatically; visit `https://ratatwiskr.github.io/wildlife-photo-game/`
- [ ] Verify scene selector populates (no 404 errors in browser DevTools Network tab)
- [ ] Select a scene and verify it loads
- [ ] Test scene-by-parameter: `https://ratatwiskr.github.io/wildlife-photo-game/?scene=jungle_adventure`

### 4. Build Artifacts

- [ ] Verify `scripts/main.js` contains the new `loadAvailableScenes()` function (compiled from TypeScript)
- [ ] Verify no console warnings about missing files

## Definition of Done

- ✅ Scene selector works locally
- ✅ Scene selector works on GitHub Pages (no 404 for manifest)
- ✅ Scene-by-parameter URLs work on both
- ✅ No console errors
- ✅ Manifest is committed to git

## Troubleshooting

- **Manifest not generated**: Run `npm run generate:scenes-manifest` directly to check for errors
- **GitHub Pages still showing 404**: Verify `.gitignore` doesn't exclude `scenes-manifest.json` or `assets/scenes/`
- **Selector not populating**: Check Network tab in DevTools for manifest fetch; if 404, verify path construction in `loadAvailableScenes()`
