# Phase 1 — Audit Findings (✅ Complete)

Read-only audit of `feature/playable-on-github-pages` (= `main` @ `bab4922`),
performed 2026-10-16. No application code was modified.

## Verdict

**No server-dependent behavior found.** The site is a purely static bundle and
the live GitHub Pages deployment already works. The only open issue is the
dual build-artifact setup (Phase 3).

## Evidence

### 1. Runtime fetches all target concrete filenames — ✅

The only `fetch()` calls in `src/` are in `src/services/SceneLoader.ts`:

- `fetchManifest()` → `${basePath}/assets/scenes/scenes-manifest.json` (L18–20)
- `fetchDefinition()` → `${basePath}/assets/scenes/${name}.json` (L36–38)
- `verifyAssetExists()` → `${basePath}/assets/scenes/${name}.jpg` (or the
  `image` field from the scene JSON) + `${basePath}/assets/scenes/${name}_mask.png`
  as plain `GET`s (L64–66)

Scene discovery goes through the committed manifest, not a directory listing.
`src/main.ts` is a 12-line bootstrap that delegates to `SceneLoader` (L3, L9) —
no leftover legacy scene-loading path from the pre-refactor code.

### 2. No Node/server APIs in client code — ✅

Grep over `src/` for `getUserMedia`, `WebSocket`, `process.env`, `require(`,
`from "fs"|"path"|"http"` → no matches. `fs`/`path` are used only in
`misc/scripts/generateSceneManifest.ts` (build-time, Node-side, correct).

Scene switching uses `?scene=` query parameters (`SceneLoader.ts:186–188`),
which works on any static host — no SPA history-mode fallback needed.

### 3. Base-path resolution for the Pages subpath — ✅

`src/config.ts:11–17`: non-local hostnames match `/^\/([^/]+)\//` on
`location.pathname`, producing `/wildlife-photo-game` for
`https://ratatwiskr.github.io/wildlife-photo-game/`; localhost/127.0.0.1 get `.`.
Compiled `scripts/config.js` matches the source exactly.

`index.html` uses relative URLs throughout (`<base href="./">`, `./scripts/main.js`,
`./styles/main.css`) — subpath-safe.

### 4. Case-sensitive asset references — ✅

Manifest names: `dev`, `jungle_adventure`, `jungle_adventure_with_sun`,
`wimmelbild_jungle_adventure` — each matches committed filenames exactly, and
each has `<name>.json`, `<name>.jpg`, `<name>_mask.png` present. No scene JSON
defines an `image` field, so the `<name>.jpg` fallback applies consistently.

### 5. Live deployment (previously unverifiable) — ✅

Checked 2026-10-16 against `https://ratatwiskr.github.io/wildlife-photo-game/`:

- `/` serves the game shell (200)
- `/assets/scenes/scenes-manifest.json` serves the 4-entry manifest (200)
- all 12 scene assets (`4 scenes × .json/.jpg/_mask.png`) → HTTP 200 with exact case
- `/scripts/main.js`, `/styles/main.css` → 200

### 6. Build-drift check — ✅ (currently zero drift)

All 15 compiled `scripts/**/*.js` files committed on `main` are **byte-identical**
to the fresh CI build published from `deploy.yml` (compared file-by-file against
the live deployment); `scenes-manifest.json` identical as well. The compiled
output on `main` is in sync with `src/` as of `bab4922`.

### 7. CI pipeline — ✅ functional, structurally redundant

`.github/workflows/deploy.yml`: on push to `main` → `npm run build` (manifest +
`tsc`) → removes `src/` + `node_modules` → publishes the **repo root** via
`peaceiris/actions-gh-pages@v4` to the `gh-pages` branch. The `gh-pages` branch
exists and its content matches the live site.

## Issues Found

### Issue A (Phase 3) — Two producers for the same build artifacts

`scripts/` (compiled JS) and `assets/scenes/scenes-manifest.json` are committed
on `main` **and** rebuilt by CI. `npm run build` before every commit is a
convention, not a guarantee — drift can accumulate silently. `.gitignore`
ignores `dist/` but not the actual output locations.

*Mitigation today*: CI always rebuilds from source, so **production cannot go
stale** — only a locally served copy could. Verified zero drift at audit time.

### Issue B (Phase 3, optional) — Deploy publishes the whole repo

`deploy.yml` publishes everything except `src/` and `node_modules/`: `.tasks/`,
`cypress/`, `tests/`, `misc/`, `.specify/`, `.github/`, `package.json`,
`tsconfig.json` etc. all ship to `gh-pages`. Harmless but bloats the deployed
branch and exposes dev-only files. A `cp`-based staging step or explicit exclude
list would slim it to runtime assets (`index.html`, `scripts/`, `assets/`,
`styles/`).

### Issue C (cosmetic) — Stale README port

`README.MD:175` says "Open on tablet: `http://<local-ip>:8080`" but
`npm run serve` runs on port **8090** (`package.json:15`). Fix alongside the
Phase 3 README update.

## Explicitly Not Found (checked per plan)

- Directory-style fetch calls, SPA history routing, custom-header reliance,
  WebSocket, `getUserMedia`, absolute/`localhost` origins in `src/`.
