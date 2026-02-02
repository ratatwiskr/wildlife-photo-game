# Task 4: Encapsulate PolaroidUI & Remove Type Casting (Phase 2 – Encapsulation)

**One-liner**: Add public methods to PolaroidUI; move polaroid display/hide logic inside class; stop accessing private properties from main.ts.

**Status**: Not Started

## Overview

Currently, `main.ts` directly accesses `polaroidUI.dismissButton` (a private property) to attach event listeners. This breaks encapsulation and makes the UI component harder to refactor. This task encapsulates polaroid behavior by:

1. Adding public `show()` and `hide()` methods to PolaroidUI
2. Moving event listener attachment inside the class
3. Removing direct property access from main.ts
4. Adding `isVisible(): boolean` getter for state queries

**Impact**: Cleaner separation of concerns; UI internals protected from external manipulation; easier to test and modify.

## Files to Modify

- `src/ui/Polaroid.ts` – Add public methods, encapsulate event handling
- `src/main.ts` – Use public API instead of direct property access

## Changes Required

### Change 1: Add Public Methods to PolaroidUI

**Location**: `src/ui/Polaroid.ts`

- [ ] Add `show(onDismiss?: () => void): void` method
- [ ] Add `hide(): void` method
- [ ] Add `isVisible(): boolean` getter
- [ ] Move event listener attachment inside `show()` method
- [ ] Add internal `visible` flag and `onDismissCallback` property
- [ ] Ensure listeners are only attached once

### Change 2: Update Polaroid Display Call in main.ts

**Location**: `src/main.ts` shutter button handler (around line 468–520)

- [ ] Replace direct property access with `polaroidUI.show(callback)`
- [ ] Move objective advancement logic into callback function
- [ ] Remove manual style manipulation
- [ ] Remove manual event listener attachment

### Change 3: Update Polaroid Hide Call in main.ts

**Location**: `src/main.ts` wherever polaroid is hidden

Replace direct property access:

```typescript
// OLD CODE
polaroidUI.dismissButton.style.display = "none";

// NEW CODE
polaroidUI.hide();
```

### Change 4: Update Scene Switch to Hide Polaroid

- [ ] Replace direct property access with `polaroidUI.hide()` calls
- [ ] Remove direct style manipulation
- [ ] Add `polaroidUI.hide()` at start of scene load function
- [ ] Ensure polaroid is cleaned up before switching scenespolaroidUI.dismissButton.addEventListener()` → move inside PolaroidUI.show()

## Cypress Validation

**Location**: `src/main.ts` entire file

- [ ] Search for all `polaroidUI.dismissButton.*` patterns
- [ ] Replace with public method calls (`show()`, `hide()`, `isVisible()`)
- [ ] Verify no direct property access remains

````

Expected: All tests pass; polaroid behavior identical.

**Critical tests**:
- Polaroid UI lifecycle test (Task 0) must still pass
- Full photo flow test must still work

## Lint & Build Validation

```bash
npm run build
````

Expected:

- ✅ No TypeScript errors
- ✅ No direct property access patterns in main.ts type checking
- ✅ `scripts/ui/Polaroid.js` updated
- ✅ `scripts/main.js` updated

## Dependencies

- **Prerequisite**: Task 3 (mask sampling extraction) must be complete
- **Blocks**: Task 5 (type safety improvements), Task 7 (game manager state consolidation)

## Acceptance Criteria

- [ ] `PolaroidUI.show()` method added with optional callback
- [ ] `PolaroidUI.hide()` method added
- [ ] `PolaroidUI.isVisible()` getter added
- [ ] Event listener attachment moved inside `show()` method
- [ ] main.ts updated to use `polaroidUI.show()` instead of direct property access
- [ ] main.ts updated to use `polaroidUI.hide()` instead of direct property access
- [ ] No direct `polaroidUI.dismissButton.*` access remains in main.ts
- [ ] Scene switch properly hides polaroid before loading new scene
- [ ] `npm run cy:run` passes all tests
- [ ] `npm run build` succeeds; no encapsulation violations
- [ ] Manual verification: polaroid shows on capture, dismisses cleanly, objective progresses
- [ ] Ready for Task 5
