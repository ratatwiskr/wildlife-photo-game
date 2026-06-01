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
- Key modules: `Scene` (model), `SceneRenderer` (canvas draw), `Viewport` (pan/clamp math), `CameraController` (shutter + nudge), `InputHandler` (pointer drag).
- Two modes controlled by `sceneType` in scene JSON: `"photo"` (shutter button) or `"wimmelbild"` (direct tap-to-find).
- Press `d` to toggle debug overlays (mask, crosshair, tolerance circle).

## Scene assets (`assets/scenes/`)

Each scene is a triplet sharing the same base name: `{name}.jpg`, `{name}_mask.png`, `{name}.json`. Mask PNG uses unique `#RRGGBB` color keys matched in JSON. Run `npm run validate:scenes` before merging scene changes.

`npm run generate:scenes-manifest` produces `assets/scenes/scenes-manifest.json` — must be committed.

## Conventions

- **ES modules only** — `.js` extensions in imports, `nodenext` module resolution. No CommonJS.
- **Volta** pins Node 22.9.0.
- **kebab-case** filenames, PascalCase classes/interfaces, camelCase everything else. No `I` prefix on interfaces.
- No formatter config — rely on tsc and convention.
- `.clineignore` excludes `scripts/*` from agent context.

## Existing instruction sources

- `.clinerules/instructions.md` — high-level workflow (clarify before coding, small slices, test-first).
- `.clinerules/typescript.md` — TS style guide (read before writing new modules).
- `.specify/memory/constitution.md` — project constitution with detailed policies (testing, assets, governance).
