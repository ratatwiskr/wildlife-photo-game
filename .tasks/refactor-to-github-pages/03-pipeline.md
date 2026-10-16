# Phase 3 — Single Canonical Build/Deploy Path (✅ Complete)

Date: 2026-10-16. Branch: `feature/playable-on-github-pages`.

## Decision

**`main` is source-only. CI is the only producer of deployable build output.**

Confirmed with the repo owner:

- GitHub Settings → Pages serves from branch **`gh-pages`** (matches what
  `deploy.yml` publishes via `peaceiris/actions-gh-pages@v4`).
- Consolidation strategy: **source-only `main`** — gitignore + untrack the
  generated artifacts, let CI's `npm run build` produce them fresh on every
  push to `main`. (Alternatives considered: keeping artifacts committed with a
  CI drift-check — rejected as more moving parts for the same guarantee.)
- Deploy slimming: **stage only runtime files** instead of publishing the whole
  repo minus `src/`/`node_modules/`.

## Why

`scripts/` (15 compiled `.js` files) and `assets/scenes/scenes-manifest.json`
were committed on `main` **and** rebuilt by CI — two producers for the same
artifacts. Drift was verified to be zero at audit time
([01-audit-findings.md](./01-audit-findings.md) §6), but only a convention
("run `npm run build` before committing") prevented it. With this change,
drift is structurally impossible: the committed tree contains only sources,
and every deployment is built from those sources by CI.

Additionally, the old pipeline published the entire repository (minus
`src/`/`node_modules/`) to `gh-pages`: `.tasks/`, `cypress/`, `tests/`,
`misc/`, `.github/`, configs, and the large GIMP `.xcf` sources all shipped to
the public Pages branch. The deploy now stages only what the game loads at
runtime.

## Changes

1. **`.gitignore`** — added generated-output section:
   `scripts/`, `assets/scenes/scenes-manifest.json`, `_site/`.
2. **Untracked build output**: `git rm -r --cached scripts/
   assets/scenes/scenes-manifest.json` (working copies stay on disk, so the
   locally served game keeps working until the next rebuild).
3. **`.github/workflows/deploy.yml`** — replaced "remove `src`/`node_modules`,
   publish repo root" with an explicit staging step:
   - `mkdir _site && cp index.html _site/`
   - `cp -r scripts styles _site/` (freshly built by the preceding
     `npm run build` step)
   - `rsync -a --exclude='*.xcf' --exclude='template/' assets _site/`
     (scene `.xcf` GIMP sources and the authoring `template/` dir are not
     runtime assets)
   - `publish_dir: ./_site`
4. **`README.MD`** — "Developer Quick Start" now states that
   `npm run serve` is a local development convenience only (browsers block
   `fetch()` on `file://`); no Node process runs in production. Fixed stale
   port `8080` → `8090`. Documents that `scripts/` + manifest are generated,
   not committed.
5. **`AGENTS.md`** — the manifest is no longer "must be committed"; same note
   added for `scripts/`.

## Local development — unaffected

All local workflows already regenerate the output themselves:

- `npm run dev` / `npm run build` → `generate:scenes-manifest` + `tsc` →
  recreates the (now gitignored) files.
- `npm run watch` / `dev:watch` → `tsc --watch` keeps `scripts/` fresh.
- `npm run cy:devopen` → builds before opening Cypress.
- `npm run clean` (`rm -rf scripts/`) still works and is now genuinely clean.

## Deployment flow (after this change)

```
push to main
  → deploy.yml: npm ci && npm run build   (manifest + tsc, fresh)
  → stage index.html + scripts/ + styles/ + assets/ (minus .xcf, template/) into _site/
  → peaceiris/actions-gh-pages publishes _site/ to branch gh-pages
  → GitHub Pages serves branch gh-pages
```

`main` can no longer serve stale build output because it contains none.

## Verification (Phase 4, requires npm — left to the repo owner)

```bash
npm run build && npm run cy:run && npm run validate:scenes
git status   # scripts/ + scenes-manifest.json must show as ignored, not untracked
```

then push the branch, merge to `main` to trigger `deploy.yml`, and confirm the
live site (see [task-overview.md](./task-overview.md) Phase 4 checklist).
