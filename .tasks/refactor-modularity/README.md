# Refactor Modularity & Maintainability Task Suite

## Overview

This task suite refactors the Wildlife Photo Game codebase to improve modularity, type safety, and maintainability. The plan is split across **3 phases and 8 tasks** (Step 0 + Tasks 1–7), each incremental and testable.

### Key Goals

✅ Remove dead code and unused imports  
✅ Fix type safety issues and eliminate `any` casts  
✅ Extract shared utilities (mask sampling)  
✅ Encapsulate UI components (PolaroidUI)  
✅ Create service layer (SceneLoader)  
✅ Consolidate game logic (GameManager)  
✅ Reduce main.ts from 900 lines to ~200  
✅ Maintain full feature parity with cypress validation at each step

---

## Task List

### Phase 1: Cleanup & Type Safety (Tasks 0–2)

Foundation: Remove dead code, establish test safety net, fix type collisions.

- **[00-add-cypress-test-coverage.md](./00-add-cypress-test-coverage.md)** (Step 0) ⚡ PARTIAL
  - ✅ **Aim assist nudge test added** — covers too-far, off-center nudge, already-centered (3 branches)
  - ⚠️ 6 pre-existing test failures identified (polling pattern, scene picker DOM) — see task file for details
  - ➡️ **Next: Task 1** — the nudge test provides sufficient safety net for CameraController changes

- **[01-remove-dead-code.md](./01-remove-dead-code.md)** (Task 1)
  - Remove unused InputHandler instance
  - Remove commented methods and redundant calls
  - Clean up imports

- **[02-fix-viewport-interface-collision.md](./02-fix-viewport-interface-collision.md)** (Task 2)
  - Remove duplicate Viewport interface from AimAssist
  - Import real Viewport class
  - Eliminate `any` type casts

### Phase 2: Type Safety & Utilities (Tasks 3–5)

Architecture: Extract utilities, encapsulate components, improve type safety.

- **[03-extract-mask-sampling-utility.md](./03-extract-mask-sampling-utility.md)** (Task 3)
  - Extract 100+ lines of duplicated mask sampling logic
  - Create `MaskSampler` utility class
  - Consolidate photo & wimmelbild capture logic

- **[04-encapsulate-polaroid-ui.md](./04-encapsulate-polaroid-ui.md)** (Task 4)
  - Add public `show()` and `hide()` methods to PolaroidUI
  - Move event listeners inside the class
  - Remove direct property access from main.ts

- **[05-clarify-camera-controller.md](./05-clarify-camera-controller.md)** (Task 5)
  - Add explicit return types to CameraController methods
  - Remove remaining `any` type casts
  - Add comprehensive JSDoc comments

### Phase 3: Architecture (Tasks 6–7)

Refactoring: Extract services and game manager; thin out main.ts.

- **[06-extract-scene-loader.md](./06-extract-scene-loader.md)** (Task 6)
  - Extract scene loading, manifest fetching, validation
  - Create `SceneLoader` service
  - Move scene picker UI wiring from main.ts

- **[07-extract-game-manager.md](./07-extract-game-manager.md)** (Task 7)
  - Create `GameManager` class encapsulating all game logic
  - Consolidate scene, renderer, camera, input, UI state
  - Reduce main.ts to thin bootstrap layer (~200 lines)

---

## Quick Start

### Prerequisites

- Node.js 18+ with npm
- TypeScript 5.x
- Cypress (already configured)

### Execution Order

1. **Complete all tasks in sequence** (dependencies chain each task to the next)
2. **After each task**:
   - Run: `npm run cy:run` (cypress tests pass)
   - Run: `npm run build` (TypeScript compilation succeeds)
   - Test: Open http://localhost:8090 (manual smoke test)
3. **Track progress** in this folder as you complete each task

### Recommended Pace

- **Phase 1 (Tasks 0–2)**: ~2–3 hours (foundation)
- **Phase 2 (Tasks 3–5)**: ~3–4 hours (utilities & encapsulation)
- **Phase 3 (Tasks 6–7)**: ~3–4 hours (major refactoring)
- **Total**: ~8–11 hours of focused work

---

## Validation Checklist

After **each task**, verify:

```bash
# Build TypeScript
npm run build

# Run cypress tests
npm run cy:run

# Manual smoke test (optional but recommended)
npm run dev  # or npm run serve
# Then visit http://localhost:8090 and interact with game
```

Expected outcomes:

- ✅ All cypress tests pass (no regressions)
- ✅ TypeScript compilation succeeds (no type errors)
- ✅ Game behaves identically to before refactoring
- ✅ Code metrics improve (duplication ↓, modularity ↑, main.ts size ↓)

---

## Expected Code Metrics After Completion

| Metric                 | Before           | After                         | Change        |
| ---------------------- | ---------------- | ----------------------------- | ------------- |
| **main.ts lines**      | ~900             | ~200                          | ↓ 78%         |
| **Dead code**          | 4 artifacts      | 0                             | ✅ removed    |
| **Type casts (`any`)** | 3–5 instances    | 0                             | ✅ eliminated |
| **Duplicated logic**   | 100+ lines       | 0                             | ✅ extracted  |
| **Test coverage**      | 4–5 tests        | 9 tests                       | ↑ 100%        |
| **Service classes**    | 0                | 2+ (SceneLoader, GameManager) | ✅ added      |
| **Type safety**        | Loose (implicit) | Strict (explicit)             | ✅ improved   |

---

## Notes

- **Cypress focus**: Jest is known broken; all validation via cypress (`npm run cy:run`)
- **Feature parity**: Every task maintains 100% backward compatibility
- **Rollback**: Each task is atomic; you can commit after each task if desired
- **Testing**: Task 0 adds comprehensive test coverage before major refactoring begins
- **Type safety**: Progressive improvement from Tasks 1 through 5
- **Architecture**: Solid foundation from Tasks 0–5 enables smooth Tasks 6–7 extraction

---

## Support

If you encounter issues:

1. **Check dependencies**: Ensure all prerequisite tasks are complete
2. **Run validation**: Always run `npm run cy:run` and `npm run build` after changes
3. **Review task details**: Each task.md has detailed step-by-step instructions
4. **Check git status**: Use `git diff` to compare before/after

---

**Current state**: Task 0 aim assist nudge test done. Next: **[Task 1 — Remove Dead Code](./01-remove-dead-code.md)**.

> Pre-existing failures (6 tests) documented in `00-add-cypress-test-coverage.md`. Do not fix them here.
