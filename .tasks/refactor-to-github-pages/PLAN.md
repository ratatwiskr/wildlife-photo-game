# Plan: Runnable directly from GitHub Pages

Status: **ready for execution** — decisions confirmed, research verified 2026-10-16.
Predecessor research: [`README.md`](./README.md) in this folder (audit against public `main`, Feb 2026 state).

Decisions made:
- **Build artifacts: source-only.** `scripts/` and `assets/scenes/scenes-manifest.json` stop being
  committed; `.github/workflows/deploy.yml`'s `npm run build` becomes the only producer.
- **Merge:** handled manually by the repo owner as a fast-forward merge `refactoring` → `main`
  (verified: `origin/main` @ `ba4b5be` is a strict ancestor of `refactoring`, 14 commits ahead).

---

## Research summary (verified 2026-10-16)

Already working, no action needed:

- Live site up: `https://ratatwiskr.github.io/wildlife-photo-game/` serves the app; `scripts/main.js`,
  `styles/main.css`, `assets/scenes/scenes-manifest.json`, `assets/scenes/dev.jpg` all HTTP 200.
- Scene loading is manifest-based everywhere (`src/services/SceneLoader.ts`); all `fetch()` calls target
  concrete filenames. No directory listings, no server-only APIs (no WebSocket/`getUserMedia`/`fs`),
  no SPA history routing (uses `?scene=` query params — GitHub-Pages-safe).
- `src/config.ts` basePath logic correct for project pages; the `refactoring`-branch diff is a pure
  refactor into `getBasePath()` (same behavior).
- `.nojekyll` present on `gh-pages`; scene filenames match case exactly (no `image` fields in scene
  JSONs; `<name>.jpg` fallback matches committed files on a case-sensitive FS).
- CI already builds fresh and publishes to `gh-pages` on push to `main`
  (`.github/workflows/deploy.yml` + `peaceiris/actions-gh-pages@v4`). Live deploy = `origin/main` HEAD.

Gaps this plan closes:

1. Refactored code (this branch) is not live — deploy only triggers on push to `main`.
2. Dual build-artifact producers (committed `scripts/` + manifest vs. CI rebuild) → drift risk.
3. Deploy publishes junk (`.tasks/`, `cypress/`, `tests/`, `misc/`, dotfiles, `package*.json`).
4. `cy:run`/`cy:open` assume committed `scripts/` exist — must build first once artifacts are un-committed.
5. README: wrong port (`:8080` vs. actual `:8090`); `npm run serve` purpose underspecified.
6. `deploy.yml` has `npm test` and scene validation commented out (`validate-scenes.yml` covers scene
   validation separately on pushes/PRs).

---

## Phase 0 — Environment prerequisite (owner, before Phase 1 verification)

Node.js is blocked in the nono sandbox (`/home/toast/.volta` not readable), which blocks build, tests,
and the drift check. Owner is handling this; for reference:

```bash
# Quick
nono run --allow /home/toast/.volta -- opencode --standalone

# Persistent: draft /home/toast/.config/nono/profile-drafts/<name>.json extending "opencode",
# add "/home/toast/.volta" under "allow", then:
nono profile promote <name>
nono run --profile <name> -- opencode --standalone
```

Allow the whole `~/.volta` directory — Volta shims in `~/.volta/bin` exec into real binaries under
`~/.volta/tools/...`, so allowing only `bin` is not enough.

## Phase 1 — Verify the `refactoring` branch (no behavior changes)

- [ ] **No merge needed on this branch** — `main` is already an ancestor; the owner fast-forward-merges
      to `main` manually after Phase 2 is committed.
- [ ] Drift check (informational): `rm -rf scripts && npm run build && git diff scripts/` — records
      whether the previously committed output had drifted. Under the source-only decision the result is
      not committed; it only proves the branch compiles.
- [ ] Verify: `npm test` (jest).
- [ ] Run Cypress (`cy:run`) against a **strict static server** that emulates GitHub Pages —
      e.g. `python3 -m http.server 8090` from the repo root (no SPA fallback, no directory listing),
      not the project's own `npm run serve` (`http-server` is more permissive). Adjust the
      `start-test` target accordingly for this check.
- [ ] Fix anything that only passes under `http-server`'s permissive behavior (document first, fix minimal).
- [ ] Push `refactoring` to origin.

## Phase 2 — Go source-only (the drift fix)

- [ ] `.gitignore`: add `scripts/` and `assets/scenes/scenes-manifest.json`.
- [ ] `git rm -r --cached scripts/` and `git rm --cached assets/scenes/scenes-manifest.json`
      (files stay on disk; `npm run build` / `npm run dev` regenerate them locally).
- [ ] `package.json`: make `cy:run` / `cy:open` run `npm run build` first (chain or pre-hook — avoid
      double-building via the existing `cy:devopen`). `dev` / `dev:watch` already generate everything.
- [ ] `.github/workflows/deploy.yml`:
  - keep `npm run build` as the sole artifact producer (already the case),
  - add `exclude_assets` to the peaceiris step so only `index.html`, `styles/`, `scripts/`,
    `assets/` are published (currently `.tasks/`, `cypress/`, `tests/`, `misc/`, dotfiles,
    `package*.json`, `tsconfig.json` all ship),
  - optionally re-enable the cheap `npm test` step; leave Cypress out of CI.
- [ ] No mid-transition breakage: CI rebuilds fresh on every deploy regardless, so the published site
      never used the committed artifacts anyway.
- [ ] Commit; owner fast-forward-merges `refactoring` → `main` manually (pushes `main` → triggers deploy).

## Phase 3 — Post-merge deploy verification (after owner's ff merge)

- [ ] `git fetch origin gh-pages` — confirm a new `deploy: <sha>` commit pointing at the merged `main`.
- [ ] Confirm the `gh-pages` tree contains only the trimmed payload (no `.tasks/`, `cypress/`, etc.).
- [ ] Confirm repo Settings → Pages serves the `gh-pages` branch (one-time manual check; the
      unauthenticated Pages API returns 404, so this could not be verified from the sandbox).

## Phase 4 — Live end-to-end verification + docs

- [ ] Load `https://ratatwiskr.github.io/wildlife-photo-game/`:
  - [ ] scene picker populates from the manifest,
  - [ ] all 4 scenes load (dev, jungle_adventure, jungle_adventure_with_sun, wimmelbild_jungle_adventure),
  - [ ] tap-to-find gameplay works,
  - [ ] zero console errors / 404s.
  - On failure: capture the exact request URL, HTTP status, and console message before proposing any fix.
- [ ] Document results in `.tasks/gh-pages-only/` per repo convention (task-overview + phase files),
      marking each phase verified.
- [ ] README fixes: port `:8080` → `:8090`; clarify `npm run serve` is a **local development
      convenience only** (browsers block `fetch()` against `file://`; GitHub Pages serves the static
      files — no Node process runs in production).
- [ ] Housekeeping: decide whether the untracked `.tasks/refactor-to-github-pages/` folder (scene
      sources incl. `.xcf` files) gets committed or ignored.

## Known low-risk leftovers (document, don't fix unless they bite)

- `getBasePath()` returns `"."` for a slash-less `/repo` URL — GitHub 301-redirects `/repo` → `/repo/`,
  so it is unreachable in practice. Would matter only for a user-pages site (`owner.github.io` root).
- `populateSceneSelect` fetches each scene's full JPG + mask just to check existence (2 requests per
      scene on load) — wasteful but behaves identically on any static host.
