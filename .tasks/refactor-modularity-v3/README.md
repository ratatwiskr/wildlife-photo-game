# Refactor Modularity — V3 Plan

## Overview

V3 builds on V2 (all 5 phases complete). The V2 refactor fixed architecture, dead code, type collisions, and consolidated duplicated logic into `GameManager`. V3 addresses residual issues found during a full codebase audit plus the objective-advancement bug on the `dev` scene.

## Current State

| Metric | V2 Claimed | V3 Actual |
|--------|-----------|-----------|
| main.ts | 23 lines | **12 lines** (thin bootstrap, unchanged) |
| GameManager.ts | 521 lines | **508 lines** (was 523 pre-V3; Phase 1–4 cleanup −16) |
| SceneLoader.ts | 224 lines | **193 lines** (deduplicated via `buildAssetPaths`/`verifyAssetExists`/`toPrettyName`) |
| `as any` casts | **0** | **0** (eliminated via `Scene.fromDefinition` validator) |
| `as string` casts | unmentioned | **0** (narrowed with `typeof` checks) |
| Dead code removed | InputHandler.ts | + config.ts unused vars, `Scene.loadImagesAndExtract()`, `SceneRenderer.moveCamera()`, `Viewport.contains()`, unexported `SceneDefinition`/`SceneManifestEntry`, redundant `getContext` cast |
| New shared utils | — | `src/utils/canvas.ts` (`createOffscreenCanvas`), `src/utils/dom.ts` (`hidePicker`/`showPicker`), `Scene.getObjectiveTags()`, `Scene.getObjectiveLabel()`, `Viewport.worldToScreen()`/`screenToWorld()` |
| Test suite | 8/8 passing, 2 skipped | **10/10 passing, 0 skipped** (last recorded at Phase 0; re-run pending code cleanup) |
| Known bugs | None claimed | **Objective advancement fixed** (Phase 5) |

---

## Phase 0 — Re-enable Skipped Tests (✅ Complete)

- [x] **0.1 — Fix wimmelbild click-to-find test** (`wimmel.cy.ts`)
  - Root cause: viewport started at default top-left position, target not in viewport → click coords off-canvas
  - Fix: reposition viewport to center on target before computing click coordinates
- [x] **0.2 — Fix invalid scene error recovery** (`smoketests.cy.ts:432`, `GameManager.ts`)
  - Root cause: back button + scene picker were registered **inside** `try` block; when `loadSceneByName()` threw, they were never set up → user stuck on gray error canvas
  - Fix: moved back button + scene picker setup **before** the try block; removed `return` from `catch` so event handlers + render loop survive failure
- [x] **0.3 — Validation**: `npm run build` clean, `npm run cy:run` 10/10 passing

---

## Phase 1 — Remove Dead Code (✅ Complete)

- [x] **1.1 — Remove unused module-level code in `config.ts:8-15`**
  - `isLocalhost`, `ghMatch`, `ghProjectName` removed; `getBasePath()` is the single source of truth
- [x] **1.2 — Remove `Scene.loadImagesAndExtract()`**
  - Removed; callers use `loadImages()` + `extractPositionsFromMask()` separately
- [x] **1.3 — Remove `SceneRenderer.moveCamera()`**
  - Removed; panning is done via `viewport.pan()` in `GameManager.ts`
- [x] **1.4 — Remove `Viewport.contains()`**
  - Removed (unused; AimAssist uses its own intersection logic)
- [x] **1.5 — Unexport `SceneDefinition`**
  - Now module-private in `Scene.ts`
- [x] **1.6 — Unexport `SceneManifestEntry`**
  - Now module-private in `SceneLoader.ts`
- [x] **1.7 — Remove unnecessary cast** in `Scene.ts`
  - `as CanvasRenderingContext2D | null` removed

---

## Phase 2 — Extract Duplicated Code (✅ Complete)

- [x] **2.1 — Extract `buildAssetPaths()` + shared `verifyAssetExists()` in SceneLoader**
  - One shared private `buildAssetPaths()` builds `imgPath`/`maskPath`; one `verifyAssetExists()` does the fetch-HEAD check. `verifyAssets()` and `createSceneCard()` now reuse both
- [x] **2.2 — Extract `toPrettyName()` in SceneLoader**
  - Static `SceneLoader.toPrettyName()` used by `createSceneCard()` and `populateSceneSelect()`
- [x] **2.3 — Add `Scene.getObjectiveTags(obj): string[]`**
  - Static helper centralizes `tags[]`/legacy `tag` resolution; used in `Scene`, `SceneRenderer`, `GameManager`
- [x] **2.4 — Add `Scene.getObjectiveLabel(obj): string`**
  - Static helper centralizes `emoji || title || "📍"`; used in all three `GameManager` call sites
- [x] **2.5 — Extract DOM toggle helpers `hidePicker()` / `showPicker()`**
  - New `src/utils/dom.ts`; used by `GameManager` (back button, card select) and `SceneLoader` (close button)
- [x] **2.6 — Fix `SceneRenderer` inline type**
  - `currentObjective` now uses the real `Objective` type from `Scene.ts`
- [x] **2.7 — Add `Viewport.worldToScreen()` / `Viewport.screenToWorld()`**
  - Centralizes the world↔screen coordinate math; `SceneRenderer` (crosshair + found outlines) and `GameManager.onCanvasClick` use it
- [x] **2.8 — Extract `createOffscreenCanvas()` utility**
  - New `src/utils/canvas.ts`; `Scene.extractPositionsFromMask()` and `MaskSampler` share it

---

## Phase 3 — Fix Type Safety (✅ Complete)

- [x] **3.1 — Eliminate 6 `as any` casts in `GameManager.ts`**
  - Added `Scene.fromDefinition()` — a runtime validator/type guard between raw JSON and the typed `Scene` model (with `isSceneObject`/`isObjective` guards). `loadSceneByName()` now fetches via `SceneLoader.fetchDefinition()` (removing a duplicated fetch) and passes the raw record to `Scene.fromDefinition()`
- [x] **3.2 — Eliminate 3 `as string` casts in `SceneLoader.ts`**
  - `typeof` narrowing replaces `as string` for `image` / `sceneType`
- [x] **3.3 — Fix `captureRes.polaroid as HTMLCanvasElement`** in `GameManager.ts`
  - Cast dropped; `attemptCapture()` is properly typed so TS narrows `polaroid` to `HTMLCanvasElement`

---

## Phase 4 — Documentation Hygiene (✅ Complete)

- [x] **4.1 — Update V2 plan** — resolved by commit `18987ce` (V2 plan deleted; this document supersedes it)
- [x] **4.2 — Archive V1 plan** — resolved by commit `18987ce` (V1 plan files deleted)
- [x] **4.3 — Update AGENTS.md + copilot instructions**
  - AGENTS.md points to this V3 plan; removed stale `Scene.loadImagesAndExtract()` / `InputHandler` references from `copilot-instructions.md`

---

## Phase 5 — Fix Objective-Advancement Bug (✅ Complete)

### Bug

On `http://127.0.0.1:8090/?scene=dev`, after capturing a target (flash animation plays), the next target is not activated and the celebration (confetti) never triggers.

### Root Cause

`advanceObjective()` used `findIndex` with reference equality (`===`) to locate the current objective in the array. `this.renderer.currentObjective` is always a **new object literal**, so `===` against array elements **never matches**, and the fallback reset index to 0 every call — making the confetti branch unreachable with ≥2 objectives.

### Fix

Replaced `findIndex`/reference-comparison with a `currentObjectiveIndex` field tracked directly on `GameManager`:

- Added `private currentObjectiveIndex = 0;` field
- Initialized in `loadSceneByName()` (both branches)
- `advanceObjective()` uses `objectives[this.currentObjectiveIndex]` directly and increments it on completion

### Validation

- Manual test: `http://127.0.0.1:8090/?scene=dev` — both objectives capture correctly, confetti triggers on completion
- `npm run cy:run` — 10/10 passing

---

## Phase 6 — Final Verification (⏳ Pending)

- [ ] Rebuild + re-run the authoritative suite after the Phase 1–4 cleanup:
  ```bash
  npm run build && npm run cy:run && npm run validate:scenes
  ```
- [ ] Regenerate + commit the compiled `scripts/` output (confirmed uncommitted since the refactor; deploy CI builds from source, so nothing is blocked, but the tracked tree should match `src/`)

## Validation Checklist (every phase)

```bash
npm run build && npm run cy:run
```

Expected: compiles cleanly, 10/10 tests pass.