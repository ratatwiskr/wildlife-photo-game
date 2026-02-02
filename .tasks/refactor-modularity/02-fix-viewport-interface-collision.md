# Task 2: Fix Viewport Interface Collision (Phase 1 – Type Safety)

**One-liner**: Remove duplicate Viewport interface from AimAssist.ts; import real Viewport class; eliminate `any` type casts.

**Status**: Not Started

## Overview

`AimAssist.ts` defines a local `Viewport` interface (line 5) instead of importing the real `Viewport` class from `Viewport.ts`. This creates type ambiguity and forces `any` type casts in `CameraController.ts`. This task fixes the collision by using the real class.

**Impact**: Improves type safety; enables stricter TypeScript checking; reduces hidden bugs from type casting.

## Files to Modify

- `src/camera/AimAssist.ts` – Remove duplicate Viewport interface; import real class
- `src/camera/CameraController.ts` – Remove `any` type casts; use proper Viewport type

## Changes Required

### Change 1: Remove Duplicate Viewport Interface from AimAssist.ts

**Location**: `src/camera/AimAssist.ts` lines 1–10

- [ ] Remove local Viewport interface definition
- [ ] Add import: `import { Viewport } from "../scene/Viewport.js";`

### Change 2: Update AimAssist Constructor & Method Signatures

**Location**: `src/camera/AimAssist.ts` method signatures

- [ ] Verify all method parameter types use imported `Viewport` class
- [ ] Update type annotations where local interface was used
- [ ] Confirm TypeScript compilation passes

### Change 3: Remove `any` Type Casts in CameraController.ts

**Location**: `src/camera/CameraController.ts`

Find lines with `as any` casts related to Viewport (likely around line 47 or similar). Remove casts like:

```typescript
const aimAssist = new AimAssist(viewport as any);
```

- [ ] Find and remove `as any` casts related to Viewport
- [ ] Replace casts like `new AimAssist(viewport as any)` with `new AimAssist(viewport)`
- [ ] Verify TypeScript can infer types without casting

```typescript
private getViewportBounds(): Viewport {
  // ...
}
```

- [ ] Run `npm run build` and check for remaining `as any` casts
- [ ] Add explicit return types to methods if needed
- [ ] Confirm strict type checking passes
      Expected: All tests pass; aim assist nudging behavior identical to before.

**Critical test**: Camera/aim assist nudge behavior must still work (covered by Task 0's aim assist test).

## Lint & Build Validation

```bash
npm run build
```

Expected:

- ✅ No TypeScript errors
- ✅ No `as any` type casts for Viewport
- ✅ Strict type checking passes
- ✅ `scripts/camera/AimAssist.js` and `scripts/camera/CameraController.js` regenerated correctly

## Dependencies

- **Prerequisite**: Task 1 (dead code removal) must be complete
- **Blocks**: Task 5 (type safety across CameraController depends on clean types here)

## Acceptance Criteria

- [ ] Duplicate Viewport interface removed from AimAssist.ts
- [ ] Real Viewport class imported in AimAssist.ts
- [ ] All `as any` casts related to Viewport removed from CameraController.ts
- [ ] All method signatures use real Viewport class type
- [ ] `npm run cy:run` passes all tests
- [ ] `npm run build` succeeds with no errors or type casting
- [ ] Manual verification: aim assist nudge animation still works smoothly
- [ ] Ready for Task 3
