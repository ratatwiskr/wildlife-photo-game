# Task 3: Extract Mask-Sampling Utility (Phase 2 – Architecture)

**One-liner**: Extract 100+ lines of duplicated mask color sampling logic into reusable `MaskSampler` utility class; consolidate photo & wimmelbild capture logic.

**Status**: Not Started

## Overview

Mask color sampling logic (~100 lines) is duplicated in two places:

1. `CameraController.attemptCapture()` (lines 120–230) — photo mode capture
2. `main.ts` wimmelbild click handler (lines 783–820) — direct click detection

This creates:

- Maintenance burden: bug fixes must be applied twice
- Risk of divergence: logic can drift between the two copies
- Low testability: tied to UI event handlers

This task extracts the logic into a pure utility class `MaskSampler` for reuse, improving reliability and testability.

## Files to Modify

- **Create**: `src/utils/MaskSampler.ts` — new utility class
- **Refactor**: `src/camera/CameraController.ts` — use MaskSampler
- **Refactor**: `src/main.ts` — use MaskSampler for wimmelbild clicks

## Changes Required

### Change 1: Create MaskSampler.ts Utility Class

**Location**: Create new file `src/utils/MaskSampler.ts`

- [ ] Create file with `MaskSampler` class
- [ ] Implement `sampleColor(canvas, x, y): string | null` method
- [ ] Implement `findNearestColor(canvas, x, y, radius): string | null` method
- [ ] Add comprehensive JSDoc comments
- [ ] Handle premultiplied alpha PNG correctly
- [ ] Return hex colors in uppercase (#RRGGBB format)
- [ ] Export class properly

### Change 2: Update CameraController.ts to Use MaskSampler

**Location**: `src/camera/CameraController.ts`

- [ ] Add import: `import { MaskSampler } from "../utils/MaskSampler.js";`
- [ ] Create MaskSampler instance in `attemptCapture()` method
- [ ] Replace inline mask sampling logic with `maskSampler.sampleColor()` call
- [ ] Replace inline color search with `maskSampler.findNearestColor()` call
- [ ] Remove old inline mask sampling code (~100 lines)
- [ ] Verify capture logic still works correctly

### Change 3: Update main.ts Wimmelbild Click Handler

**Location**: `src/main.ts` wimmelbild click handler (around lines 783–820)

1. Import MaskSampler:

```typescript
import { MaskSampler } from "./utils/MaskSampler.js";
```

2. Replace wimmelbild click detection logic:

```typescript
canvas.addEventListener("pointerdown", async (evt) => {
  if (currentScene?.definition.sceneType !== "wimmelbild") {
    return; // only in wimmelbild mode
  }

  const rect = canvas.getBoundingClientRect();
  const x = evt.clientX - rect.left;
  const y = evt.clientY - rect.top;

  // Use MaskSampler (same logic as photo mode)
  const maskSampler = new MaskSampler();
  const captureColor = maskSampler.sampleColor(maskCanvas, x, y)
    ?? maskSampler.findNearestColor(maskCanvas, x, y, 16);

  if (captureColor) {
    const foundObject = currentScene.definition.objects.find(
      (obj) => obj.color.toUpperCase() === captureColor
    );

    if (foundObject) {
      foundObject.found = true;
      // ... objective progression logic ...
    }
  }
});
- [ ] Add import: `import { MaskSampler } from "./utils/MaskSampler.js";`
- [ ] Replace inline mask sampling with `maskSampler.sampleColor()` call
- [ ] Replace inline color search with `maskSampler.findNearestColor()` call
- [ ] Remove old duplicated mask sampling code (~40 lines)
- [ ] Verify wimmelbild click detection still works
- [ ] Test photo mode capture: same color matching logic
- [ ] Test wimmelbild click: same color matching logic
- [ ] Verify color matching results are identical between both paths
- [ ] Confirm no behavior regressionss) must be complete
- **Blocks**: Task 4 (encapsulation depends on clean separation of concerns)

## Acceptance Criteria

- [ ] `src/utils/MaskSampler.ts` created with `sampleColor()` and `findNearestColor()` methods
- [ ] MaskSampler imported and used in CameraController.ts
- [ ] MaskSampler imported and used in main.ts wimmelbild handler
- [ ] Old duplicated code removed from both CameraController and main.ts
- [ ] Photo mode capture still works (same color matching logic)
- [ ] Wimmelbild click still works (same color matching logic)
- [ ] `npm run cy:run` passes all tests
- [ ] `npm run build` succeeds; no type errors
- [ ] Code duplication metrics: ~100 lines reduced
- [ ] Ready for Task 4
```
