# Task 1: Remove Dead Code & Unused Imports (Phase 1 – Cleanup)

**One-liner**: Remove 4 dead code artifacts (unused InputHandler instance, commented methods, redundant calls) and clean up imports.

**Status**: Not Started

## Overview

Dead code clutters the codebase and creates maintenance burden. This task removes:

1. Unused `InputHandler` instance from `main.ts` (line ~390)
2. Commented-out `filterActiveAnimals()` method from `Scene.ts` (line 204)
3. Unused `nudge()` method from `AimAssist.ts` (line 68)
4. Redundant `scene.extractPositions()` call in `main.ts` (line 147)

**Why safe**: No behavior changes; all removed code is provably unused (verified by codebase analysis). Drag input continues to work via inline pointer events.

## Files to Modify

- `src/main.ts` – Remove InputHandler instance, redundant extractPositions() call
- `src/scene/Scene.ts` – Remove commented-out filterActiveAnimals()
- `src/camera/AimAssist.ts` – Remove unused nudge() method

## Changes Required

### Change 1: Remove InputHandler Instance from main.ts

**Location**: `src/main.ts` around line 390

- [ ] Remove unused `InputHandler` instance declaration
- [ ] Confirm drag input still works via inline pointer event handlers (lines 835–860)

### Change 2: Remove Redundant extractPositions() Call in main.ts

**Location**: `src/main.ts` around line 147

- [ ] Remove redundant `scene.extractPositions()` call
- [ ] Keep the `loadImagesAndExtract()` call (it already calls extractPositions internally)

### Change 3: Remove filterActiveAnimals() Comment from Scene.ts

**Location**: `src/scene/Scene.ts` around line 204

Remove the commented-out method block:

````typescript
  // filterActiveAnimals(): SceneObject[] {
  //   return this.definition.objects.filter((obj) => obj.found === false);
- [ ] Remove the entire commented-out `filterActiveAnimals()` method block
Remove the unused `nudge()` method (nudging logic is inlined in `CameraController.nudgeToTarget()`):
```typescript
nudge(target: Viewport, x: number, y: number, radius: number): void {
  // ...method body...
}
````

- [ ] Remove the unused `nudge()` method (nudging logic is inlined in `CameraController.nudgeToTarget()`)
- [ ] Keep `shouldNudge()` and `canSee()` methods (they are actively used)
      Verify with `npm run build` — TypeScript will flag unused imports.
- [ ] Check main.ts for unused InputHandler import; remove if present
- [ ] Run `npm run build` to identify any other unused imports
- [ ] Remove flagged unused imports

````

Expected: All tests pass; drag input still works smoothly.

**Critical test**: `smoketests.cy.ts` → "full photo flow: navigate, capture and win" should pass without InputHandler.

## Lint & Build Validation

```bash
npm run build
````

Expected:

- ✅ No TypeScript errors
- ✅ No unused import warnings
- ✅ `scripts/main.js` regenerated correctly

Optionally run linter (if configured):

```bash
npm run lint
```

## Dependencies

- **Prerequisite**: Task 0 (Cypress test coverage) must be complete and passing to establish safety net
- **Blocks**: Task 2 (type safety fixes depend on clean dead code removal)

## Acceptance Criteria

- [ ] InputHandler instance removed from main.ts
- [ ] Redundant extractPositions() call removed from main.ts
- [ ] filterActiveAnimals() comment removed from Scene.ts
- [ ] nudge() method removed from AimAssist.ts
- [ ] Unused imports cleaned up
- [ ] `npm run cy:run` passes all tests (8–9 tests, including drag behavior)
- [ ] `npm run build` succeeds with no errors or warnings
- [ ] Manual smoke test: drag input works smoothly; scene loads correctly
- [ ] Ready for Task 2
