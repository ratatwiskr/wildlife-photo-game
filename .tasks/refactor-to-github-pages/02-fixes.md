# Phase 2 — Fixes from Audit (✅ Complete)

Date: 2026-10-16. Branch: `feature/playable-on-github-pages`.

## Result: no code changes required

The audit ([01-audit-findings.md](./01-audit-findings.md)) found **no
server-dependent behavior**, so there was nothing to fix in application code.
Issues A–C are pipeline/docs topics and are deferred to Phase 3.

## Per-card existence check — verified equivalent on a static host

Per the plan, the scene-picker's existence probe
(`SceneLoader.verifyAssetExists()`, `src/services/SceneLoader.ts:59–69`) was
verified to behave identically on a plain static host:

- It issues same-origin `GET` fetches for `<name>.jpg` + `<name>_mask.png` and
  keeps the card only when both return `res.ok`.
- On the live GitHub Pages host (a plain static file server, no SPA fallback,
  case-sensitive paths, no custom headers) every existing asset returns
  **HTTP 200** and every checked URL was confirmed reachable with exact case
  (12/12 assets, see Phase 1 evidence §5).
- A missing asset would return GitHub Pages' default **404** page → `res.ok`
  is `false` → the card is silently skipped, exactly as with `http-server`
  locally. No CORS involvement (same origin), no custom-header dependence.

No behavioral difference between `http-server` and GitHub Pages for this code path.

## Files changed

None (application code). Only `.tasks/refactor-to-github-pages/*` docs added.
