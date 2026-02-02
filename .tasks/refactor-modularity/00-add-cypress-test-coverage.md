# Task 0: Add Cypress Test Coverage (Pre-Refactoring Foundation)

**One-liner**: Add 5 high-priority cypress test cases covering aim assist, polaroid UI lifecycle, cooldown, multi-objective progression, and error handling; replace brittle `cy.wait()` with deterministic waits.

**Status**: Not Started

## Overview

Current Cypress tests (~140 lines across 2 files) cover happy-path scene loading and basic input but miss critical camera behavior, UI lifecycle, and error recovery. This task adds ~200–250 lines of robust test cases across 5 new test suites to establish a safety net before refactoring Tasks 1–7.

## Files to Modify

- `cypress/e2e/smoketests.cy.ts` – Add 5 new test cases; replace `cy.wait()` with deterministic waits

## Changes Required

### 1. Add "Aim Assist Nudge Behavior" Test

Test that `CameraController.nudgeToTarget()` completes with proper state and animations:

- [ ] Verify nudge animation starts and finishes
- [ ] Test tolerance logic: target already centered (no nudge needed)
- [ ] Test distance gate: target too far (skip nudge)
- [ ] Check that `attemptCapture()` only triggers after nudge completes

**Cypress pattern**:

```typescript
it("should execute aim assist nudge with tolerance & distance checks", () => {
  cy.visit("/?scene=jungle_adventure");
  cy.get('[data-test-id="game-canvas"]').should("be.visible");

  // Drag to position viewport far from any object
  // Click shutter → should nudge toward nearest target
  // Wait for nudge to complete (animation + callback)
  // Verify polaroid appears after nudge done
});
```

### 2. Add "Polaroid UI Lifecycle" Test

Test that polaroid modal shows, blocks input, and dismisses correctly:

- [ ] Verify polaroid appears after shutter click
- [ ] Verify clicking polaroid dismisses it
- [ ] Verify objective progress updates after dismiss
- [ ] Verify multiple rapid shutter clicks don't break state (cooldown respected)

**Cypress pattern**:

```typescript
it("should show polaroid on capture, block input, and dismiss cleanly", () => {
  cy.visit("/?scene=jungle_adventure");
  cy.get('[data-test-id="shutter-button"]').click();

  // Wait for polaroid modal to appear (z-index: 9999)
  cy.get("div[style*='z-index: 9999']").should("be.visible");

  // Click to dismiss
  cy.get("div[style*='z-index: 9999']").click();

  // Verify objective updated
  cy.get("#objectiveProgress").should("contain.text", "✅");
});
```

### 3. Add "Cooldown Rate-Limiting" Test

Test that rapid shutter clicks are rate-limited (default 1000ms):

- [ ] Click shutter twice in quick succession
- [ ] Verify only first capture is processed
- [ ] Verify second click is ignored during cooldown
- [ ] After cooldown expires, verify next click works

**Cypress pattern**:

```typescript
it("should prevent rapid consecutive captures (cooldown mechanics)", () => {
  cy.visit("/?scene=jungle_adventure");

  // Drag to position first object
  // Click shutter
  cy.get('[data-test-id="shutter-button"]').click();

  // Immediately click again (should be ignored)
  cy.get('[data-test-id="shutter-button"]').click();

  // Wait for cooldown + polaroid dismiss
  cy.wait(1200);

  // Verify only 1 objective marked complete (not 2)
  cy.get("#objectiveProgress").should("contain.text", "✅");
});
```

### 4. Add "Multi-Objective Progression" Test

Test that scenes with multiple objectives advance correctly:

- [ ] Load scene with ≥2 objectives
- [ ] Capture first objective → verify it completes, UI advances to second objective
- [ ] Capture second objective → verify all objectives complete
- [ ] Verify final confetti/completion state

**Cypress pattern**:

```typescript
it("should progress through multiple objectives in sequence", () => {
  cy.visit("/?scene=jungle_adventure"); // or multi-objective variant

  // Find first objective object position
  // Drag viewport + click shutter → complete first
  cy.get("#objectiveProgress").should("contain.text", "🐘");

  // Find second objective
  // Drag viewport + click shutter → complete second
  cy.get("#objectiveProgress").should("contain.text", "✅✅");
});
```

### 5. Add "Error Handling & Recovery" Test

Test that image load failures don't crash game:

- [ ] Mock canvas `getImageData()` to fail during scene load
- [ ] Verify game shows user-facing error alert (not silent fallback)
- [ ] Verify player can recover by selecting a different scene
- [ ] Verify new scene loads without leftover error state

**Cypress pattern**:

```typescript
it("should handle image load failures gracefully with user feedback", () => {
  cy.visit("/?scene=broken_image_scene"); // or mock failure

  // Verify error alert appears
  cy.get("body").should("contain.text", "Error loading scene"); // or similar

  // Click back to scene picker
  cy.get('[data-test-id="back-to-scene-selection-button"]').click();

  // Load working scene
  cy.get(".scene-grid .scene-card:first").click();
  cy.get('[data-test-id="game-canvas"]').should("be.visible");
});
```

### 6. Replace Brittle `cy.wait()` with Deterministic Waits

In existing tests, replace timing-based waits with element visibility checks:

- [ ] Replace old: `cy.wait(500); cy.get('[data-test-id="game-canvas"]').should("be.visible");`
- [ ] With new: `cy.get('[data-test-id="game-canvas"]').should("be.visible");`
- [ ] Replace old: `cy.wait(500)` before scene picker check
- [ ] With new: `cy.get(".scene-grid .scene-card").should("have.length.gte", 2);`
- [ ] Apply changes throughout smoketests.cy.ts
- [ ] Apply changes throughout wimmel.cy.ts

## Cypress Validation

Run after changes:

```bash
npm run cy:run
```

Expected outcome: **8–9 tests pass** (4 existing + 5 new):

- ✅ Smoketests: 4 existing tests + 5 new tests
- ✅ Wimmel: 1 wimmelbild test
- ✅ No flaky timeouts (all waits deterministic)

## Lint & Build Validation

```bash
npm run build
```

Expected: TypeScript compilation succeeds; no type errors in test files.

## Dependencies

- None; this is a foundation task

## Acceptance Criteria

- [ ] All 5 new cypress test cases added to `smoketests.cy.ts`
- [ ] Test cases cover: aim assist, polaroid UI, cooldown, multi-objective, error handling
- [ ] All brittle `cy.wait()` calls replaced with deterministic waits
- [ ] `npm run cy:run` passes all 9 tests without flakiness
- [ ] `npm run build` succeeds with no new errors
- [ ] Test file is well-commented and maintainable
- [ ] Ready to serve as safety net for Tasks 1–7
