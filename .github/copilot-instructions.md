# Copilot Instructions – Wildlife Photo Game

A tablet-friendly photo hunt game for young children (2–6). Players pan/drag or use a stylus to find animals in panoramic scenes and tap/click to capture them.

## Architecture Overview

### Core Game Loop

- **Entry**: `src/main.ts` initializes the game: loads scene definition (JSON), image assets (JPG), and mask overlay (PNG).
- **Scene System**: `src/scene/Scene.ts` defines `SceneObject` (with color-keyed mask positions) and `Objective` (grouped by tags).
- **Rendering**: `src/scene/SceneRenderer.ts` renders the scene to canvas with a fixed **viewport** (40% of scene width by default).
- **Input**: `src/input/InputHandler.ts` captures pointer drag events; deltas are converted to world pan via `Viewport.ts`.
- **Camera Control**: `src/camera/CameraController.ts` provides "aim assist" nudging toward targets with tolerance tuning and cooldown mechanics.
- **UI Layers**: `src/ui/Polaroid.ts` (capture feedback), `src/ui/Confetti.ts` (celebration), and objective tracking overlay.

**Key insight**: The game uses a **viewport-based pan model** (like a magnifying glass over a large scene), not full-screen zoom. Mask colors directly encode object positions; the mask is parsed to extract per-object centroids.

### Scene Definition Format

Scenes live in `assets/scenes/` with three required files (all must match base name):

- `scene_name.jpg` – panoramic background image
- `scene_name_mask.png` – color-coded overlay (RGB = object identity)
- `scene_name.json` – scene metadata

```json
{
  "name": "jungle_adventure",
  "sceneType": "photo" | "wimmelbild",  // "photo" = camera capture mode; "wimmelbild" = direct clicking
  "objects": [
    { "name": "elephant1", "color": "#ff0000", "tags": ["elephant"], "found": false }
  ],
  "objectives": [
    { "title": "Find all 🐘", "tags": ["elephant"], "emoji": "🐘" }
  ]
}
```

**Validation**: `npm run validate:scenes` (runs `misc/scripts/validateScenes.ts`) checks:

- All three files present, matching base names
- JSON has valid `sceneType` ("photo" or "wimmelbild")
- Colors in JSON match mask PNG colors
- No duplicate object identifiers

## Essential Developer Workflows

### Build & Run

```bash
npm run build       # TypeScript → ES2022 JS (src/ → scripts/)
npm run watch       # Continuous tsc watching
npm run dev         # build + serve on http://127.0.0.1:8090
npm run serve       # Standalone http-server (port 8090, no cache)
```

### Testing

```bash
npm test                   # Jest (jsdom environment, passWithNoTests flag)
npm run cy:devopen         # Cypress interactive (builds, runs dev server)
npm run cy:run             # Cypress headless CI mode
npm run validate:scenes    # Scene asset validation (precommit hook)
```

Focus on integration testing with cypress, as jest configuration is currently broken. Don't attempt to fix that unless explicitly asked to do so.

**Test Setup**: `jest.config.ts` runs `setupTests.ts` before tests (mocks `location` object for asset path testing).

### Critical Asset Dependencies

- Scenes are fetched relative to `config.basePath` (computed in `src/config.ts`):
  - **Localhost**: `"."` (same directory)
  - **GitHub Pages**: `"/<project-name>"` (inferred from URL pathname)
- Scene JSON, images, and masks must be in `assets/scenes/` with exact name matching.

## Project-Specific Patterns & Conventions

### TypeScript & ES Modules

- **Target**: TypeScript 5.x → ES2022 (no polyfills or CommonJS)
- **Modules**: Pure ES modules; use `.js` extensions in imports: `import { Scene } from "./scene/Scene.js"`
- **Naming**: PascalCase classes/interfaces, camelCase everything else, kebab-case file names
- **Type Guards**: Avoid `any`; use `unknown` with narrowing or type guards

**See**: `.clinerules/typescript.md` for detailed standards (naming, formatting, pure functions, immutability).

### Viewport & Pan Mechanics

- `Viewport.ts`: Encapsulates camera bounds (world x/y, viewport w/h) and scale-to-canvas math.
- Pan is **cumulative**: each drag delta updates camera position; viewport constrains to valid bounds.
- Touch/stylus: Use pointer events (not mouse/touch separately) for cross-device support.

### Mask Color Extraction

- Mask PNG is **premultiplied** alpha; `extractPositionsFromMask()` reads canvas pixel data to find centroids per color.
- Colors are stored as hex strings (`#RRGGBB`, uppercase) and matched exactly against scene JSON.
- Centroids and approximate radius are computed; stored on `SceneObject` after load.

### Camera Aim Assist

- `AimAssist.ts` provides **tolerance tuning**: nudge only if target is >tolerance pixels from center.
- `Cooldown.ts` rate-limits rapid consecutive nudges (default 1000ms).
- Nudge animation is time-based (default 900ms duration) with easing; resolves with status: `"nudged"` | `"already-centered"` | `"skipped-too-far"`.

### Scene Modes

- **"photo"**: Tap/click areas within viewport to capture. Integrates with `CameraController` for aim assist.
- **"wimmelbild"**: Direct clicking on visible objects; simpler interaction, no camera control needed.
- Toggle mode via `scene.definition.sceneType` in JSON.

## Cross-Component Data Flow

1. **Scene Load**: `Scene.loadImages()` → fetches JPG + PNG; `Scene.extractPositionsFromMask()` computes object centroids from the mask.
2. **Render**: `SceneRenderer.setScene()` → creates `Viewport` → renders visible portion to canvas → draws UI overlays.
3. **Input**: `GameManager` pointer-drag handlers → screen deltas to world deltas → `viewport.pan()`.
4. **Click/Tap**: Screen coordinates → world coordinates (via viewport math) → sample mask color → find matching object → mark found.
5. **Objectives**: Grouped by tag; render colored highlights; completion tracked across objects with matching tags.

## Quick Integration Checklist

When adding features or fixing bugs:

- ✓ Update scene JSON if adding/modifying objects or objectives
- ✓ Regenerate mask PNG with correct object colors (color picker must match JSON exactly)
- ✓ Test locally: `npm run dev`, then `npm run validate:scenes` before commit
- ✓ Add cypress test / ensure new or updated code is covered with cypress (skip jest, is broken)
- ✓ For new scenes: provide all three files (JPG, mask PNG, JSON) with matching base names
- ✓ Use kebab-case for new TypeScript files; extend existing classes before creating new ones
- ✓ Test on touch device (iPad/tablet) if modifying input or viewport math
