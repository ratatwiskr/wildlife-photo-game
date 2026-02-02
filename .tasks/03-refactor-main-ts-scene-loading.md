# Task 03: Refactor Scene Loading in main.ts

## Objective

Replace two directory-listing fetch blocks with a single, clean manifest fetch that works on both localhost and GitHub Pages. Consolidate duplicate logic.

## Implementation Details

### Current Code Issues

- **Line 245**: Directory listing fetch to populate scene selector
- **Line 777**: Nearly identical directory listing fetch after scene selection
- **Problem**: Both assume `fetch('assets/scenes/')` returns HTML with `href` attributes—fails on GitHub Pages (no directory listing)

### Refactoring Strategy

1. **Create new async function** `loadAvailableScenes()` that:
   - Fetches `${basePath}/assets/scenes/scenes-manifest.json`
   - Parses JSON array: `[{ "name": "...", "sceneType": "..." }, ...]`
   - Returns array of scene objects
   - **Error handling**: Fail if fetch fails or JSON is invalid (console.error, user alert)

2. **Replace line 245 block**:
   - Call `loadAvailableScenes()`
   - Use returned array to populate selector (instead of regex parsing HTML)

3. **Replace line 777 block**:
   - Remove or refactor—if this loads a specific scene by name, it should just use the manifest to verify existence, not re-fetch directory listing

4. **Use `config.basePath`** in manifest URL:
   ```typescript
   const manifestUrl = `${basePath}/assets/scenes/scenes-manifest.json`;
   ```

### Code Structure

```typescript
async function loadAvailableScenes(): Promise<
  Array<{ name: string; sceneType: string }>
> {
  const basePath = getBasePath();
  const manifestUrl = `${basePath}/assets/scenes/scenes-manifest.json`;
  const res = await fetch(manifestUrl);
  if (!res.ok) throw new Error(`Failed to load scenes manifest: ${res.status}`);
  return await res.json();
}
```

### Selector Population

Instead of:

```typescript
const re = /href\s*=\s*"([^"]+\.json)"/g;
// parse HTML...
```

Use:

```typescript
const scenes = await loadAvailableScenes();
scenes.forEach((scene) => {
  // Create selector option for scene.name, grouping by scene.sceneType
});
```

## Definition of Done

- Scene selector populates from manifest JSON (not directory HTML)
- Selector groups scenes by `sceneType` ("photo" vs "wimmelbild")
- Duplicate code at lines 245 & 777 is consolidated
- `config.basePath` is used in manifest fetch URL
- Works locally: `npm run dev` → scene selector populates correctly
- Console shows no fetch errors when manifest is present
