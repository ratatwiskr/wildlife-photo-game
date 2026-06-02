# Refactor Modularity — V3 Plan

## Overview

V3 builds on V2 (all 5 phases complete). The V2 refactor fixed architecture, dead code, type collisions, and consolidated duplicated logic into `GameManager`. V3 addresses residual issues found during a full codebase audit plus a newly discovered objective-advancement bug on the `dev` scene.

## Current State

| Metric | V2 Claimed | V3 Actual |
|--------|-----------|-----------|
| main.ts | 23 lines | **12 lines** (thin bootstrap) |
| GameManager.ts | 521 lines | **523 lines** (before V3 fixes) |
| SceneLoader.ts | 224 lines | **183 lines** (overcount in V2) |
| `as any` casts | **0** | **6 remain** in `GameManager.ts` (JSON deserialization) |
| `as string` casts | unmentioned | **3 remain** in `SceneLoader.ts` |
| Dead code removed | InputHandler.ts | Also: `loadImagesAndExtract()`, `moveCamera()`, `contains()`, unused exports, dead `config.ts` vars |
| Test suite | 8/8 passing, 2 skipped | **10/10 passing, 0 skipped** (V3 Phase 0) |
| Known bugs | None claimed | **Broken objective advancement** (V3 Phase 5 fix) |

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

## Phase 1 — Remove Dead Code

- [ ] **1.1 — Remove unused module-level code in `config.ts:8-15`**
  - `isLocalhost`, `ghMatch`, `ghProjectName` are computed but never used (the exported `getBasePath()` re-derives the same values)
- [ ] **1.2 — Remove `Scene.loadImagesAndExtract()`** (`src/scene/Scene.ts:52-55`)
  - Never called; all callers use `loadImages()` + `extractPositionsFromMask()` separately
- [ ] **1.3 — Remove `SceneRenderer.moveCamera()`** (`src/scene/SceneRenderer.ts:296-300`)
  - Never called; panning is done directly via `viewport.pan()` in `GameManager.ts`
- [ ] **1.4 — Remove `Viewport.contains()`** (`src/scene/Viewport.ts:38-45`)
  - Never called (the related check `isObjectInView` in `AimAssist` uses different intersection logic)
- [ ] **1.5 — Unexport `SceneDefinition`** (`src/scene/Scene.ts:24`)
  - Only used internally in `Scene.ts`; drop `export` keyword
- [ ] **1.6 — Unexport `SceneManifestEntry`** (`src/services/SceneLoader.ts:4`)
  - Only used internally in `SceneLoader.ts`; drop `export` keyword
- [ ] **1.7 — Remove unnecessary cast** (`src/scene/Scene.ts:117`)
  - `as CanvasRenderingContext2D | null` is redundant (TS lib already returns this type)

---

## Phase 2 — Extract Duplicated Code

- [ ] **2.1 — Extract `buildAssetPaths()` + shared `verifyAssetExists()` in SceneLoader**
  - 8-line asset URL construction + fetch HEAD check is duplicated verbatim between `verifyAssets()` (`:51-59`) and `createSceneCard()` (`:71-79`)
- [ ] **2.2 — Extract `toPrettyName()` in SceneLoader**
  - `name.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())` duplicated between `createSceneCard()` (`:86-88`) and `populateSceneSelect()` (`:166-168`)
- [ ] **2.3 — Add `getObjectiveTags(obj): string[]` to `Scene.ts`**
  - Tag-resolution logic `obj.tags?.length ? obj.tags : obj.tag ? [obj.tag] : []` appears in 5 syntactic variants across `Scene.ts`, `SceneRenderer.ts`, `GameManager.ts`
- [ ] **2.4 — Add `getObjectiveLabel(obj): string` helper**
  - `obj.emoji || obj.title || "📍"` fallback triplicated in `GameManager.ts` (`:246,449,492`)
- [ ] **2.5 — Extract DOM toggle helpers (`hidePicker()` / `showPicker()`)**
  - Hide-scene-picker / show-viewport DOM toggle appears in 3 near-verbatim copies across `GameManager.ts` and `SceneLoader.ts`
- [ ] **2.6 — Fix `SceneRenderer` inline type**
  - `currentObjective` type at `SceneRenderer.ts:30` shadows `Objective` from `Scene.ts`; should import `Objective` or use `Pick`
- [ ] **2.7 — Add `Viewport.worldToScreen()` / `Viewport.screenToWorld()`**
  - World-to-screen coordinate formula duplicated at `SceneRenderer.ts:159-162`, `:230-233`, and `GameManager.ts:306-307`
- [ ] **2.8 — Extract `createOffscreenCanvas()` utility**
  - Offscreen canvas + `willReadFrequently` boilerplate duplicated at `Scene.ts:112-123` and `MaskSampler.ts:19-26`

---

## Phase 3 — Fix Type Safety

- [ ] **3.1 — Eliminate 6 `as any` casts in `GameManager.ts`**
  - All in `loadSceneByName()` (`:224,229,230,242,244,245`)
  - Root cause: `SceneLoader.fetchDefinition()` returns `Record<string, unknown>` and consumers cast instead of validating
  - Fix: add a type guard or runtime validator between JSON parse and typed consumption
- [ ] **3.2 — Eliminate 3 `as string` casts in `SceneLoader.ts`**
  - `d.image as string` (`:52`), `def.image as string` (`:72`), `def.sceneType as string` (`:99`)
  - Same root cause as 3.1
- [ ] **3.3 — Fix `captureRes.polaroid as HTMLCanvasElement`** (`GameManager.ts:417`)
  - `captureRes` is `unknown`; cast bypasses type checking

---

## Phase 4 — Documentation Hygiene

- [ ] **4.1 — Update V2 plan** (`.tasks/refactor-modularity-v2/README.md`)
  - Fix line counts: main.ts 23→12, SceneLoader.ts 224→183
  - Remove stale "0 `as any` casts" claim
  - Remove stale "Notable Items" TODO reference
- [ ] **4.2 — Archive V1 plan or add stale banner** (`.tasks/refactor-modularity/`)
  - All 10 files reference dead line numbers and "Not Started" statuses for completed work
- [ ] **4.3 — Update AGENTS.md**
  - "23-line bootstrap" → "12-line bootstrap" (or drop the number)
  - Update V2 reference to link to V3

---

## Phase 5 — Fix Objective-Advancement Bug (✅ Complete)

### Bug

On `http://127.0.0.1:8090/?scene=dev`, after capturing a target (flash animation plays), the next target is not activated and the celebration (confetti) never triggers.

### Root Cause

`advanceObjective()` at `GameManager.ts:427-429` used `findIndex` with reference equality (`===`) to locate the current objective in the array:

```ts
let currentIndex = objectives.findIndex(
  (o) => o === this.renderer.currentObjective,
);
```

`this.renderer.currentObjective` is always a **new object literal** (created at `loadSceneByName:234` and `advanceObjective:441`), so `===` against array elements **never matches**. `findIndex` always returns `-1`, then the fallback `if (currentIndex < 0) currentIndex = 0;` resets to index 0 every call.

**Consequence with ≥2 objectives:**
- Objective 0 complete → advances to objective 1 ✅ (accidentally works because index defaults to 0)
- Objective 1 complete → index resets to 0 → checks objective 0 (already complete) → re-advances to objective 1
- The `else if (celebrateOnComplete)` confetti branch **never executes** because `currentIndex + 1 < objectives.length` is always true

### Fix

Replaced `findIndex`/reference-comparison with a `currentObjectiveIndex` field tracked directly on `GameManager`:

- Added `private currentObjectiveIndex = 0;` field
- Initialized to `0` in `loadSceneByName()` (both branches of the `if (def.objectives...)` check)
- `advanceObjective()` now uses `objectives[this.currentObjectiveIndex]` directly and increments it on completion

### Validation

- Manual test: `http://127.0.0.1:8090/?scene=dev` — both objectives capture correctly, confetti triggers on completion
- `npm run cy:run` — 10/10 passing

---

## Validation Checklist (every phase)

```bash
npm run build && npm run cy:run
```

Expected: compiles cleanly, 10/10 tests pass.

## V1 / V2 plan drift notes

- V2 claimed `0 as any` casts — 6 remain in `GameManager.ts` due to JSON deserialization (not addressed in V2)
- V2 `Notable Items` referenced a TODO that was removed during Phase 4 cleanup
- V1 plan files in `.tasks/refactor-modularity/` are entirely stale (pre-refactor line numbers, "Not Started" statuses)
