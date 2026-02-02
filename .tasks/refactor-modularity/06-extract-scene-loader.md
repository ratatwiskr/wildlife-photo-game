# Task 6: Extract Scene Loader Service (Phase 3 – Architecture)

**One-liner**: Extract scene loading, manifest fetching, and validation logic into `SceneLoader` service; move scene picker UI wiring from main.ts.

**Status**: Not Started

## Overview

Currently, `main.ts` contains scattered scene loading logic:

1. Scene manifest fetch (lines ~50–70)
2. Scene card creation and picker population (lines ~150–200)
3. Scene selection event wiring (lines ~210–250)

This task creates a `SceneLoader` service to encapsulate all scene-related operations, keeping main.ts focused on initialization and event wiring.

**Impact**: Cleaner separation; scene logic testable independently; easier to add features (save/load, caching, etc.) later.

## Files to Modify

- **Create**: `src/services/SceneLoader.ts` – new service class
- **Refactor**: `src/main.ts` – use SceneLoader, remove inline scene logic

## Changes Required

### Change 1: Create SceneLoader Service

**Location**: Create new file `src/services/SceneLoader.ts`

- [ ] Create file with `SceneLoader` class
- [ ] Define `SceneManifest` interface
- [ ] Implement `loadManifest(basePath)` method with error handling
- [ ] Implement `loadScene(sceneName, basePath)` method with error handling
- [ ] Implement `getCurrentSceneName()` getter
- [ ] Implement `getManifest()` getter
- [ ] Implement `populateScenePicker(container, onSceneSelect)` method
- [ ] Implement `validateScene(sceneDef)` method
- [ ] Add comprehensive JSDoc comments

### Change 2: Update main.ts to Use SceneLoader

**Location**: `src/main.ts`

- [ ] Add import: `import { SceneLoader } from "./services/SceneLoader.js";`
- [ ] Initialize SceneLoader in main()
- [ ] Replace manifest fetch logic with `sceneLoader.loadManifest(basePath)`
- [ ] Replace scene card creation with `sceneLoader.populateScenePicker(container, callback)`
- [ ] Replace scene loading in loadScene() with `sceneLoader.loadScene(sceneName, basePath)`
- [ ] Update error handling to use SceneLoader messages

### Change 3: Update Scene Picker Show/Hide

**Location**: `src/main.ts` scene selection UI

Simplify back button and scene picker logic:

```typescript
// Clicking back button shows scene picker
document.getElementById("back")!.addEventListener("click", () => {
  scenePicker.style.display = "block";
  // Camera UI hides automatically via CSS
});

// Scene selection happens via sceneLoader.populateScenePicker callback
```

## Cypress Validation

Run after changes:

```bash
npm run cy:run
```

Expected: All tests pass; scene loading behavior identical.

**Critical tests**:

- Scene switching test must still work
- Scene picker population must still work
- Error handling must gracefully show alerts

## Lint & Build Validation

```bash
npm run build
```

Expected:

- ✅ No TypeScript errors
- ✅ SceneLoader properly exported and imported
- ✅ `scripts/services/SceneLoader.js` created
- ✅ `scripts/main.js` updated and smaller

## Dependencies

- **Prerequisite**: Task 5 (camera controller type safety) must be complete
- **Blocks**: Task 7 (game manager extraction depends on clean scene loading)

## Acceptance Criteria

- [ ] `src/services/SceneLoader.ts` created with complete implementation
- [ ] `loadManifest()` method fetches and caches manifest
- [ ] `loadScene()` method loads individual scenes with error handling
- [ ] `populateScenePicker()` creates scene cards and wires callbacks
- [ ] `validateScene()` method validates scene definitions
- [ ] Simplify back button handler to show scene picker
- [ ] Move scene picker wiring into SceneLoader.populateScenePicker callback
- [ ] Remove manual scene selection event wiring
