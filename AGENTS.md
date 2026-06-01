# Wildlife Photo Game — Agent Guide

## Quick start

```sh
npm run build    # generate:scenes-manifest → tsc
npm run dev      # build + http-server on port 8090
npm run dev:fast # tsc only + serve
npm run watch    # tsc --watch
npm run cy:run   # start-server-and-test → Cypress headless
npm run cy:open  # interactive Cypress
npm run validate:scenes  # gate check for scene assets (PNG/JSON color match)
```

No bundler — `tsc` compiles `src/` → `scripts/` (mirrored structure). HTML loads `./scripts/main.js` as module.

## Testing

- **Cypress** (`cypress/e2e/`) is the authoritative test suite. All UI/feature work must include Cypress coverage.
- **Jest** (`tests/`) is broken and off-limits. Do not fix or run it.
- Cypress tests expect `window.__app` (exposed by `src/main.ts`) and `data-test-id` attributes on key elements.
- Single test: `npx cypress run --spec cypress/e2e/smoketests.cy.ts`

## Architecture

- **No framework** — vanilla TS + Canvas2D + DOM. Entrypoint: `src/main.ts`.
- Key modules: `Scene` (model), `SceneRenderer` (canvas draw), `Viewport` (pan/clamp math), `CameraController` (shutter + nudge), `InputHandler` (pointer drag — **removed**, inline pointer events at `main.ts:831–866` handle drag instead).
- Two modes controlled by `sceneType` in scene JSON: `"photo"` (shutter button) or `"wimmelbild"` (direct tap-to-find).
- Press `d` to toggle debug overlays (mask, crosshair, tolerance circle).
- **Refactoring plan**: `.tasks/refactor-modularity-v2/README.md` (V2, corrected from stale V1). Current state: Phase 0–1 complete, Phase 2 (type safety) is next.

## Scene assets (`assets/scenes/`)

Each scene is a triplet sharing the same base name: `{name}.jpg`, `{name}_mask.png`, `{name}.json`. Mask PNG uses unique `#RRGGBB` color keys matched in JSON. Run `npm run validate:scenes` before merging scene changes.

`npm run generate:scenes-manifest` produces `assets/scenes/scenes-manifest.json` — must be committed.

## Conventions

- **ES modules only** — `.js` extensions in imports, `nodenext` module resolution. No CommonJS.
- **Volta** pins Node 22.9.0.
- **kebab-case** filenames, PascalCase classes/interfaces, camelCase everything else. No `I` prefix on interfaces.
- No formatter config — rely on tsc and convention.
- `.clineignore` excludes `scripts/*` from agent context.

## Known gotchas

- **`__app.cameraCtrl` is always `null`**: `main.ts:174` exports `__app` before `cameraCtrl` is assigned (line 204). Tests survive because they use `__app.renderer.viewport` for positioning and click the shutter DOM button (which uses the module-level `cameraCtrl`). Fix: move `cameraCtrl` assignment before `__app` export, or re-export after.
- **Viewport type collision**: Two separate `Viewport` types exist — interface in `src/camera/AimAssist.ts:3-8` and class in `src/scene/Viewport.ts`. CameraController imports the interface but receives the class, forcing `as unknown as Viewport` double casts.
- **Stale task files**: Always verify dead code claims in `.tasks/` against actual source before removing — the V1 plan had wrong method names and misidentified non-redundant code.
- **Cypress test patterns for reliability**:
  - Wait for centroids: `expect(app.scene.definition.objects[0].x).to.exist` in a `cy.window().should()` block
  - Find targets via `renderer.currentObjective` + `scene.getObjectsForObjective()`, not raw `objects[i]`
  - Use `{ force: true }` on polaroid overlay `.click()` calls
  - Position viewport by setting `viewport.x` / `viewport.y` directly — no drag simulation needed
- **Dead code removed (Phase 1)**: `InputHandler` instance + import from `main.ts` (redundant with inline pointer events), `AimAssist.computeNudge()` + commented predecessor (unused — `CameraController.nudgeToTarget()` does its own math), commented `filterActiveAnimals`-like block from `Scene.ts`.

## Existing instruction sources

- `.clinerules/instructions.md` — high-level workflow (clarify before coding, small slices, test-first).
- `.clinerules/typescript.md` — TS style guide (read before writing new modules).
- `.specify/memory/constitution.md` — project constitution with detailed policies (testing, assets, governance).
