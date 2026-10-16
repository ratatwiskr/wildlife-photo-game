# Playable on GitHub Pages — Task Overview

Plan: see [README.md](./README.md) (4 phases). Branch: `feature/playable-on-github-pages` (from `main` @ `bab4922`).

## Status

| Phase | Description | Status |
|-------|-------------|--------|
| 1 | Audit — static-site readiness (read-only) | ✅ Complete — [01-audit-findings.md](./01-audit-findings.md) |
| 2 | Fixes from audit | ✅ Complete — no fixes needed, see [02-fixes.md](./02-fixes.md) |
| 3 | Single canonical build/deploy path | ✅ Complete — see [03-pipeline.md](./03-pipeline.md) |
| 4 | End-to-end verification | ⏳ Pending — needs owner (npm + push + live check) |

## Phase 1 Summary (details in 01-audit-findings.md)

- **No server-dependent behavior found.** All runtime fetches go to concrete
  filenames via `src/services/SceneLoader.ts`; scene discovery uses the committed
  `assets/scenes/scenes-manifest.json`. No directory listings, no Node APIs in
  `src/`, no WebSocket/`getUserMedia`, no SPA history routing (scene switching
  uses `?scene=` query params).
- **Live site verified**: `https://ratatwiskr.github.io/wildlife-photo-game/`
  loads; manifest + all 12 scene assets (4 scenes × `.json`/`.jpg`/`_mask.png`)
  return HTTP 200 with exact case; `scripts/main.js` and `styles/main.css` load.
- **No build drift**: all 15 compiled `scripts/*.js` files on `main` are
  byte-identical to the fresh CI build currently published on `gh-pages`
  (compared file-by-file against the live deployment); manifest identical too.
- **Remaining risk is structural, not functional**: `scripts/` and
  `scenes-manifest.json` are committed on `main` *and* rebuilt by
  `.github/workflows/deploy.yml` — two producers for the same artifacts.
  Also, the deploy publishes the whole repo minus `src/`/`node_modules`
  (`.tasks/`, `cypress/`, `tests/`, `.specify/`, … end up on `gh-pages`).

## Phase 3 — Resolved (see 03-pipeline.md)

1. **Pages source**: confirmed — Settings → Pages serves from branch `gh-pages`.
2. **Canonical build path**: source-only `main` — `scripts/` + manifest
   gitignored and untracked; CI's `npm run build` is the only producer;
   deploy stages only runtime files (`index.html`, `scripts/`, `styles/`,
   `assets/` minus `.xcf`/`template/`) into `_site/` for `gh-pages`.
3. README updated (`serve` = local-only, port fix 8080 → 8090); AGENTS.md
   "must be committed" note corrected.

## Phase 4 — Verification Checklist (owner-run, needs npm)

```bash
npm run build && npm run cy:run && npm run validate:scenes
git status   # scripts/ + scenes-manifest.json must be ignored, not untracked
```

- [ ] All green: build clean, Cypress 10/10, scenes valid
- [ ] Merge/push to `main` → `deploy.yml` runs; confirm the "Stage runtime
      files" step lists only `index.html`, `scripts/**`, `styles/**`,
      `assets/scenes/*` (no `.xcf`, no `template/`, no `.tasks/`, no `cypress/`)
- [ ] Live `https://ratatwiskr.github.io/wildlife-photo-game/` — no console
      errors, no 404s
- [ ] Scene picker populates all 4 scenes (dev, jungle_adventure,
      jungle_adventure_with_sun, wimmelbild_jungle_adventure)
- [ ] Tap-to-find gameplay works on a photo scene and a wimmelbild scene
- [ ] Mark this task fully complete

## Validation Checklist

```bash
npm run build && npm run cy:run && npm run validate:scenes
```

Expected: compiles cleanly, 10/10 Cypress tests pass, all scenes valid.
