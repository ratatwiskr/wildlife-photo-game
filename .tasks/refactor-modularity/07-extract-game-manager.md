# Task 7: Extract Game Manager & Consolidate State (Phase 3 – Architecture)

**One-liner**: Create `GameManager` class encapsulating scene, renderer, camera, UI, and game loop; reduce main.ts to thin bootstrap layer.

**Status**: Not Started

## Overview

Currently, `main.ts` (~900 lines) orchestrates everything: scene loading, rendering, input handling, game state, UI management, and the RAF loop. This task extracts the game logic into a cohesive `GameManager` class, leaving main.ts as a thin entry point.

**Benefits**:

- Game logic becomes testable and reusable
- Clear separation between initialization (main.ts) and execution (GameManager)
- Easier to add features (save/load, multiplayer, AI) later
- State management centralized and predictable

**Impact**: main.ts shrinks to ~200 lines; all game behavior in GameManager; full feature parity.

## Files to Modify

- **Create**: `src/managers/GameManager.ts` – new game orchestrator class
- **Refactor**: `src/main.ts` – use GameManager; reduce to bootstrap

## Changes Required

### Change 1: Create GameManager Service

**Location**: Create new file `src/managers/GameManager.ts`

- [ ] Create file with `GameManager` class
- [ ] Define `GameState` interface with all state fields
- [ ] Implement constructor accepting dependencies (canvas, loaders, UI)
- [ ] Implement `initializeScene(sceneName, basePath)` method
- [ ] Implement `handlePointerDown(x, y)` method
- [ ] Implement `handlePointerMove(x, y)` method
- [ ] Implement `handlePointerUp()` method
- [ ] Implement `handleCanvasClick(x, y)` method (routes to photo/wimmelbuild)
- [ ] Implement private `attemptPhotoCapture()` method
- [ ] Implement private `attemptWimmelbuildClick()` method
- [ ] Implement private `showCaptureFeedback()` method
- [ ] Implement private `advanceObjectives()` method
- [ ] Implement `update()` method for RAF loop
- [ ] Implement `getState()` read-only getter
- [ ] Implement callback registration methods (`onSceneChangeCallback`, `onErrorCallback`)
- [ ] Implement `setDebugMode(enabled)` method
- [ ] Add comprehensive JSDoc comments

  /\*\*
  - Handle pointer drag for panning viewport.
    \*/
    handlePointerDown(x: number, y: number): void {
    if (!this.state.isLoaded || this.state.pausedForPolaroid) return;


      this.state.isDragging = true;
      this.state.lastPointerX = x;
      this.state.lastPointerY = y;

  }

  /\*\*
  - Update viewport position during drag.
    \*/
    handlePointerMove(x: number, y: number): void {
    if (!this.state.isDragging || !this.renderer) return;


      const deltaX = (this.state.lastPointerX ?? x) - x;
      const deltaY = (this.state.lastPointerY ?? y) - y;

      this.renderer.viewport.pan(deltaX, deltaY);

      this.state.lastPointerX = x;
      this.state.lastPointerY = y;

  }

  /\*\*
  - End drag.
    \*/
    handlePointerUp(): void {
    this.state.isDragging = false;
    }

  /\*\*
  - Handle click/tap on canvas (both photo mode shutter and wimmelbild direct click).
    \*/
    async handleCanvasClick(x: number, y: number): Promise<void> {
    if (!this.state.isLoaded || !this.state.currentScene || this.state.pausedForPolaroid) {
    return;
    }


      const sceneType = this.state.currentScene.definition.sceneType;

      if (sceneType === "photo") {
        // Photo mode: try to capture at click coordinates
        await this.attemptPhotoCapture(x, y);
      } else if (sceneType === "wimmelbild") {
        // Wimmelbild mode: direct click to find objects
        await this.attemptWimmelbuildClick(x, y);
      }

  }

  /\*\*
  - Photo mode capture: use camera controller with aim assist.
    \*/
    private async attemptPhotoCapture(x: number, y: number): Promise<void> {
    if (!this.renderer || !this.cameraController || !this.state.currentScene) {
    return;
    }


      // Nudge toward target first
      const target = this.state.currentScene.definition.objects.find((obj) => !obj.found);
      if (target) {
        const nudgeStatus = await this.cameraController.nudgeToTarget(target, this.renderer.viewport);
        // nudgeStatus: "nudged" | "already-centered" | "skipped-too-far"
      }

      // Attempt capture at current viewport center (or click position)
      const foundObject = this.cameraController.attemptCapture(
        this.state.currentScene,
        this.renderer,
        this.renderer.viewport,
        x,
        y
      );

      if (foundObject) {
        this.showCaptureFeedback(foundObject);
        this.advanceObjectives();
      }

  }

  /\*\*
  - Wimmelbild mode: direct click on objects.
    \*/
    private async attemptWimmelbuildClick(x: number, y: number): Promise<void> {
    if (!this.renderer || !this.state.currentScene) {
    return;
    }


      // Use mask sampler to find object at click
      const canvas = this.renderer.maskCanvas;
      if (!canvas) return;

      const captureColor =
        this.maskSampler.sampleColor(canvas, x, y) ??
        this.maskSampler.findNearestColor(canvas, x, y, 16);

      if (captureColor) {
        const foundObject = this.state.currentScene.definition.objects.find(
          (obj) => obj.color.toUpperCase() === captureColor
        );

        if (foundObject && !foundObject.found) {
          foundObject.found = true;
          this.advanceObjectives();
        }
      }

  }

  /\*\*
  - Show polaroid feedback and pause input.
    \*/
    private showCaptureFeedback(foundObject: any): void {
    this.state.pausedForPolaroid = true;


      this.polaroidUI.show(() => {
        this.state.pausedForPolaroid = false;
      });

  }

  /\*\*
  - Check if objectives are complete; advance or show completion.
    \*/
    private advanceObjectives(): void {
    if (!this.state.currentScene || !this.renderer) return;


      const allObjectsFound = this.state.currentScene.definition.objects.every(
        (obj) => obj.found
      );

      if (allObjectsFound) {
        this.confetti.burst();
      }

      this.renderer.updateObjectiveProgress(this.state.currentScene);

  }

  /\*\*
  - Main game loop update (called every frame in RAF).
    \*/
    update(): void {
    if (!this.renderer || !this.state.isLoaded) return;


      this.renderer.renderFrame();

  }

  /\*\*
  - Get current game state (read-only).
    \*/
    getState(): Readonly<GameState> {
    return { ...this.state };
    }

  /\*\*
  - Register callback for scene change events.
    \*/
    onSceneChangeCallback(callback: (sceneName: string) => void): void {
    this.onSceneChange = callback;
    }

  /\*\*
  - Register callback for error events.
    \*/
    onErrorCallback(callback: (message: string) => void): void {
    this.onError = callback;
    }

  /\*\*
  - Toggle debug mode.
    \*/
    setDebugMode(enabled: boolean): void {
    if (this.renderer) {
    this.renderer.debugMode = enabled;
    }
    }
    }

````

**Key aspects**:
- Encapsulates all game state (scene, UI, camera, input)
- Public methods for input handling (pointer, click)
- Private methods for game logic (capture, objectives, feedback)
- RAF-ready: `update()` method called each frame
- Callback hooks for scene changes and errors
- Read-only state getter for debugging

### Change 2: Update main.ts to Use GameManager
**Location**: `src/main.ts`

- [ ] Add import: `import { GameManager } from "./managers/GameManager.js";`
- [ ] Initialize GameManager with dependencies
- [ ] Wire pointer event handlers to `gameManager.handlePointer*()` methods
- [ ] Wire click handler to `gameManager.handleCanvasClick()`
- [ ] Wire back button to show scene picker
- [ ] Wire shutter button to trigger capture (if photo mode)
- [ ] Move scene picker setup to SceneLoader callback
- [ ] Move RAF loop to call `gameManager.update()`
- [ ] Set up error/scene change callbacks
- [ ] Handle initial scene from URL params
- [ ] Expose gameManager for cypress testing

### Change 3: Expose Game Manager for Cypress Testing
**Location**: `src/main.ts` at end of file

- [ ] Add debug export: `(window as any).__app = { gameManager, scene, renderer, sceneLoader }`
- [ ] Enable cypress tests to access game state for verification

## Cypress Validation

Run after changes:
```bash
npm run cy:run
````

Expected: All tests pass; game behavior identical to before.

**Critical tests**:

- Full photo flow test (all steps: drag, shutter, polaroid, objectives)
- Wimmelbild test (direct clicks)
- Scene switching test
- Aim assist test (if present)

## Lint & Build Validation

```bash
npm run build
```

Expected:

- ✅ No TypeScript errors
- ✅ GameManager properly exported
- ✅ main.js is now ~200 lines (vs ~900 before)
- ✅ All game logic in managers/GameManager.ts

Measure code reduction:

```bash
wc -l src/main.ts src/managers/GameManager.ts
# Should show: ~200 lines main.ts, ~400 lines GameManager.ts
```

## Dependencies

- **Prerequisite**: Task 6 (scene loader extraction) must be complete
- **No blocks**: This is the final task in Phase 3

## Acceptance Criteria

- [ ] `src/managers/GameManager.ts` created with complete implementation
- [ ] GameState interface defined with all state fields
- [ ] Constructor accepts dependencies (canvas, loaders, UI components)
- [ ] `initializeScene()` loads scene and sets up renderer/camera
- [ ] Input handlers implemented: `handlePointerDown/Move/Up`, `handleCanvasClick`
- [ ] `attemptPhotoCapture()` uses camera controller with aim assist
- [ ] `attemptWimmelbuildClick()` uses mask sampler for direct clicks
- [ ] `advanceObjectives()` checks completion and triggers confetti
- [ ] `update()` calls renderer frame each frame
- [ ] `getState()` provides read-only state access
- [ ] Callback hooks for scene changes and errors
- [ ] main.ts reduced to ~200 lines (bootstrap only)
- [ ] main.ts uses GameManager for all game logic
- [ ] Input event handlers delegate to GameManager
- [ ] RAF loop calls `gameManager.update()`
- [ ] Scene picker setup delegated to SceneLoader
- [ ] Error handling flows through GameManager callbacks
- [ ] `npm run cy:run` passes all tests (full game flow, scene switching, objectives)
- [ ] `npm run build` succeeds; no errors; code significantly cleaner
- [ ] Manual smoke test: full game loop works (load scene, drag, capture, advance objectives)
- [ ] **Phase 3 Complete**: Architecture refactored; codebase modular and maintainable
