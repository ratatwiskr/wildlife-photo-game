# Task 5: Clarify CameraController Usage & Remove Type Casts (Phase 2 – Type Safety)

**One-liner**: Add explicit return types to CameraController methods; remove remaining `any` type casts; add JSDoc comments for public API clarity.

**Status**: Not Started

## Overview

`CameraController.ts` lacks explicit return types and contains implicit type conversions. This task:

1. Adds explicit return type annotations to all public methods
2. Removes `any` type casts from CameraController and its callers
3. Adds comprehensive JSDoc comments
4. Improves type safety for future refactoring (especially Task 7 GameManager extraction)

**Impact**: Type-safe public API; easier to reason about data flow; better IDE autocomplete; fewer hidden type bugs.

## Files to Modify

- `src/camera/CameraController.ts` – Add explicit return types, JSDoc
- `src/main.ts` – Remove `any` casts related to CameraController

## Changes Required

### Change 1: Add Explicit Return Types to CameraController Methods

**Location**: `src/camera/CameraController.ts`

- [ ] Add return type `SceneObject | null` to `attemptCapture()`
- [ ] Add return type `Promise<NudgeStatus>` to `nudgeToTarget()`
- [ ] Add return type `boolean` to visibility check methods
- [ ] Add explicit return types to all other public methods
- [ ] Verify JSDoc comments match return types

### Change 2: Define CameraController Return Type Alias

**Location**: `src/camera/CameraController.ts` at top

- [ ] Add `export type NudgeStatus = "nudged" | "already-centered" | "skipped-too-far";`
- [ ] Place before CameraController class definition
- [ ] Export the type for use in other modules

### Change 3: Update main.ts to Use Proper Types

**Location**: `src/main.ts` wherever CameraController is called

Remove `any` casts:

````typescript
// OLD CODE (with any cast)
const result = (await cameraController.nudgeToTarget(target, viewport)) as any;

- [ ] Import `NudgeStatus` type: `import { CameraController, NudgeStatus } from "./camera/CameraController.js";`
- [ ] Remove `any` casts in nudge handling
- [ ] Use proper `NudgeStatus` type for nudge result
- [ ] Add type guards for nudge status cases JSDoc for each public method and property:

```typescript
export class CameraController {
  /**
   * Initialize camera controller with a viewport.
   *
   * @param viewport The viewport bounds and pan constraints
   */
  constructor(viewport: Viewport) {
    // ...
  }

- [ ] Add JSDoc to constructor with parameter descriptions
- [ ] Add JSDoc to `attemptCapture()` explaining behavior and assumptions
- [ ] Add JSDoc to `nudgeToTarget()` explaining tolerance and distance rules
- [ ] Add JSDoc to all other public methods
- [ ] Include @param and @returns descriptions
- [ ] Document side effects and state changes
}
````

If not already enabled, enable it (this forces all types to be explicit).

## Cypress Validation

Run after changes:

```bash
npm run cy:run
```

Expected: All tests pass; camera behavior identical.

**Critical tests**:

- Aim assist nudge test (Task 0) must still pass
- Full photo flow test must still work

## Lint & Build Validation

```bash
npm run build
```

Expected:

- ✅ No TypeScript errors
- ✅ No `any` type casts in CameraController or callers
- ✅ Strict type checking passes
- ✅ `scripts/camera/CameraController.js` updated

## Dependencies

- **Prerequisite**: Task 4 (polaroid UI encapsulation) must be complete
- **Blocks**: Task 6 (scene loader extraction), Task 7 (game manager extraction)

## Acceptance Criteria

- [ ] All public methods in CameraController have explicit return types
- [ ] `NudgeStatus` type alias defined and exported
- [ ] All JSDoc comments added for public methods
- [ ] Comprehensive JSDoc explains camera behavior and assumptions
- [ ] Verify TypeScript strict mode is enabled
- [ ] Check `noImplicitAny: true`
- [ ] Check `strictNullChecks: true`
- [ ] Check `strictPropertyInitialization: true`
- [ ] Run `npm run build` with strict settings
