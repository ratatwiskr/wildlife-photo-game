## Kurzantwort

Nach Durchsicht des Repos (Stand `main`, per `codeload.github.com`-Tarball geladen und lokal ausgewertet) sieht es so aus, als sei die eigentliche Server-Abhängigkeit – dynamisches Auflisten des `assets/scenes/`-Verzeichnisses – **bereits behoben**: Es gibt ein committetes `assets/scenes/scenes-manifest.json`, `src/main.ts` lädt Szenen darüber (`loadAvailableScenes()`), und `src/config.ts` berechnet den GitHub-Pages-Unterpfad korrekt. Das Repo hat sogar eigene `.tasks/`-Dateien, die genau diese Migration als „done“ dokumentieren. Ich konnte die **live** GitHub-Pages-URL wegen meiner Netzwerk-Sandbox nicht direkt prüfen (`github.io` ist dort nicht freigegeben) – das solltest du/dein Agent als erstes verifizieren.

Der eigentlich offene Punkt, den ich im Code gefunden habe, ist eher eine **Aufräum-/Risikofrage** als ein fehlendes Feature: Der kompilierte Output (`scripts/*.js`) und `scenes-manifest.json` liegen **direkt committet auf `main`** *und* werden zusätzlich per `.github/workflows/deploy.yml` neu gebaut und auf einen `gh-pages`-Branch deployt. Zwei Quellen für denselben Build-Output können auseinanderlaufen (jemand vergisst `npm run build` vor einem Commit). Das solltest du vereinheitlichen.

---

## Belegte Kernaussagen (mit Quelle im Repo)

- **Manifest statt Directory-Listing**: `assets/scenes/scenes-manifest.json` existiert und ist committet; `misc/scripts/generateSceneManifest.ts` erzeugt es; `package.json` hängt es vor `tsc` in `build`. → *Belegt* (Dateien direkt eingesehen).
- **Szenen-Ladung nutzt das Manifest**: `src/main.ts`, Funktion `loadAvailableScenes()` (~Zeile 574), fetched `${basePath}/assets/scenes/scenes-manifest.json`; wird sowohl für die Szenenauswahl-Liste (`sceneSelect`) als auch für den Szenen-Picker verwendet. → *Belegt*.
- **Kein Directory-Listing mehr im Code**: Alle übrigen `fetch()`-Aufrufe in `src/` zielen auf konkrete Dateinamen (`<name>.json`, `<name>.jpg`, `<name>_mask.png`), nie auf ein Verzeichnis. → *Belegt* (grep über `src/`).
- **GitHub-Pages-Unterpfad wird erkannt**: `src/config.ts` liest `location.pathname`, um bei `*.github.io/<repo>/` den Präfix `/repo` zu setzen, bei `localhost` `.`. → *Belegt*.
- **Kein Backend-/API-Call, kein Web-Socket, keine echte Kamera (`getUserMedia`)**: grep über `src/` findet nichts dergleichen; `CameraController.ts` ist reine Canvas-Viewport-Animation. → *Belegt*.
- **CI baut & deployt bereits statisch**: `.github/workflows/deploy.yml` läuft `npm run build` (Manifest + `tsc`), entfernt `src`/`node_modules` und pusht den Rest via `peaceiris/actions-gh-pages` auf einen Branch (Standard: `gh-pages`). → *Belegt*.
- **Doppelte Build-Artefakte**: `scripts/` (kompiliertes JS) und `assets/scenes/scenes-manifest.json` sind sowohl auf `main` committet als auch Ergebnis des CI-Builds für `gh-pages`. `.gitignore` ignoriert `dist/`, nicht `scripts/`. → *Belegt*.
- **Ob GitHub Pages aktuell wirklich auf den richtigen Branch zeigt und die Live-Seite fehlerfrei lädt**: → *Unsicher/offen* – konnte ich nicht prüfen (Netzwerk-Sandbox blockiert `github.io`; GitHub-API-Rate-Limit erschöpft für unauth. Zugriff auf die Pages-Konfiguration).
- **Ob es einen neueren, ungepushten oder abweichenden lokalen Stand bei dir gibt** (z. B. Branch, der von `main` abweicht) → *Unsicher/offen*, da ich nur den öffentlichen `main`-Branch gesehen habe.

---

## Der englische Prompt für deinen Coding Agenten

Da im Repo bereits eine eigene Konvention existiert (`.tasks/NN-name.md` + `task-overview.md`, siehe die abgeschlossene Manifest-Migration), lässt der Prompt den Agenten genau daran anknüpfen. Vier Phasen, jede für eine eigene Session gedacht — jede Phase ist so geschrieben, dass der Agent sich den nötigen Kontext selbst aus dem Repo holt (er hat ja Repo-Zugriff), du musst also nicht den ganzen Verlauf mitschicken.

### Phase 1 — Audit (read-only, keine Codeänderungen)

```
You are working in the repo github.com/ratatwiskr/wildlife-photo-game.

GOAL: Determine, with evidence, whether this project already runs correctly
as a purely static site (deployable on GitHub Pages with zero server-side
logic at runtime), or whether anything still implicitly depends on a
server (directory listings, Node APIs at runtime, SPA history-mode
fallback, custom response headers, etc.).

Context you should read first:
- README.MD
- .tasks/task-overview.md and .tasks/01-04-*.md (a previous session already
  migrated scene loading from directory-listing to a static
  assets/scenes/scenes-manifest.json — read this so you don't redo it)
- src/main.ts (scene loading, scene picker)
- src/config.ts (basePath resolution for GitHub Pages subpaths)
- .github/workflows/deploy.yml (current build+deploy pipeline)
- package.json (scripts: build, serve, dev)

DO:
1. Serve the repo with a minimal static file server that does NOT provide
   directory listings, SPA fallback, or any custom routing — e.g.
   `python3 -m http.server` from the repo root, or `npx serve -s` with
   single-page fallback explicitly OFF — to emulate GitHub Pages behavior
   as closely as possible. Note: this is different from the project's own
   `npm run serve` (http-server), which may behave more permissively than
   GitHub Pages.
2. Load the app in a real or headless browser against that server and
   inspect the network tab / console for any 404s, CORS errors, or failed
   fetches.
3. Grep the codebase (src/, scripts/) for anything that could implicitly
   assume a server: directory-style fetch calls without a filename, any
   use of `fs`, `path`, `process.env`, `localhost`/absolute origins,
   WebSocket or getUserMedia usage, or reliance on custom HTTP headers.
4. Verify every asset reference (scene .json "image" field, `_mask.png`,
   `.jpg`) matches the committed filename's exact case — GitHub Pages'
   filesystem is case-sensitive, some local dev machines are not.
5. Compare the compiled output currently committed on `main`
   (`scripts/*.js`, `assets/scenes/scenes-manifest.json`) against what
   `npm run build` produces from current `src/` and current scene files.
   Flag any drift.
6. Do NOT modify application code in this phase.

DELIVERABLE:
Create `.tasks/gh-pages-only/task-overview.md` plus
`.tasks/gh-pages-only/01-audit-findings.md`, following the exact same
format/style as the existing `.tasks/task-overview.md` and
`.tasks/01-create-generate-manifest-script.md`. List every concrete
problem found, with file and line references, or explicitly state
"no server-dependent behavior found" if that's the case. Commit this
as a small PR/branch. No functional code changes.
```

### Phase 2 — Fixes aus dem Audit

```
You are working in the repo github.com/ratatwiskr/wildlife-photo-game.

Read `.tasks/gh-pages-only/01-audit-findings.md` from the previous
session (Phase 1 audit). For every issue listed there:

1. Fix it with the smallest change that removes the server dependency
   (e.g. consolidate any remaining duplicate/legacy scene-loading code
   path in src/main.ts that doesn't go through the existing
   `loadAvailableScenes()` manifest-based function; fix any case-sensitive
   filename mismatch; remove any assumption about custom server headers
   or SPA fallback routing).
2. If the audit found no issues, state that explicitly and skip to
   verifying that the existing scene-picker's per-card existence check
   (fetching each scene's image/mask with a plain GET just to see if it
   exists) behaves identically on a plain static host as it does with
   `http-server` locally.
3. Keep changes minimal and scoped — do not refactor unrelated code.

DELIVERABLE:
`.tasks/gh-pages-only/02-fixes.md` documenting what was changed and why,
in the same style as the existing `.tasks/` files. Update
`.tasks/gh-pages-only/task-overview.md` checklist accordingly.
```

### Phase 3 — Einen Build-/Deploy-Pfad festlegen (aktuell zwei parallele Quellen)

```
You are working in the repo github.com/ratatwiskr/wildlife-photo-game.

CONTEXT (verified by direct inspection): the compiled JS output
(`scripts/*.js`) and `assets/scenes/scenes-manifest.json` are currently
committed directly on `main`, AND `.github/workflows/deploy.yml` also
rebuilds them fresh and publishes to a `gh-pages` branch via
`peaceiris/actions-gh-pages`. Having two places produce the same build
artifact risks them silently diverging if someone edits `src/` or adds a
scene but forgets to run `npm run build` before committing to `main`.

GOAL: Pick ONE canonical deployment path and make drift structurally
impossible, without breaking local development.

DO:
1. Ask me (or check if determinable from repo/CI history) which branch
   GitHub Pages' repository settings currently serve from
   (Settings → Pages → Build and deployment). If you cannot determine
   this, state clearly that it needs manual confirmation and proceed
   under the assumption that `gh-pages` (the branch the existing
   workflow publishes to) is correct, since that matches
   `peaceiris/actions-gh-pages`'s default target.
2. Recommended approach: treat `main` as source-only.
   - Add the compiled output directory and `assets/scenes/scenes-manifest.json`
     to `.gitignore`.
   - Remove the currently committed copies from `main` (git rm --cached).
   - Let `.github/workflows/deploy.yml`'s `npm run build` step be the
     only producer of these files, published to `gh-pages`.
   - `npm run dev`/`npm run serve` must still work locally — they already
     run `npm run build` first, so local generation is unaffected.
3. Update `index.html`'s script path only if the output directory name
   changes.
4. Update the README's "Developer Quick Start" section to clarify that
   `npm run serve` (http-server) is a LOCAL DEVELOPMENT CONVENIENCE ONLY —
   needed because browsers block `fetch()` against `file://` URLs — and
   is NOT required in production. GitHub Pages itself serves the static
   files; no Node process runs there.

DELIVERABLE:
Updated `.gitignore`, `package.json` if paths changed, `index.html` if
needed, README.MD, and `.github/workflows/deploy.yml` if needed, plus
`.tasks/gh-pages-only/03-pipeline.md` documenting the decision and why.
```

### Phase 4 — End-to-End-Verifikation

```
You are working in the repo github.com/ratatwiskr/wildlife-photo-game.

GOAL: Prove, not assume, that the site works with zero server-side logic,
end to end.

DO:
1. Run the existing Cypress suite (cypress/e2e/smoketests.cy.ts,
   cypress/e2e/wimmel.cy.ts) against a plain static server that mimics
   GitHub Pages behavior (no directory listing, no SPA fallback, correct
   MIME types, case-sensitive paths) — not just against the project's own
   `npm run serve` if that behaves more permissively.
2. Trigger (or ask me to trigger) the `deploy.yml` workflow, then load
   the resulting `https://<owner>.github.io/wildlife-photo-game/` URL in
   a real browser. Confirm: scene picker populates from the manifest, all
   committed scenes (dev, jungle_adventure, jungle_adventure_with_sun,
   wimmelbild_jungle_adventure) load, and tap-to-find gameplay works with
   no console errors or 404s.
3. Confirm GitHub repository Settings → Pages source branch matches
   whatever `deploy.yml` actually publishes to (Phase 3 decision).
4. Record results in `.tasks/gh-pages-only/04-verification.md` and mark
   `.tasks/gh-pages-only/task-overview.md` as fully verified/complete,
   in the same style as the existing `.tasks/task-overview.md`.

If anything fails, do not guess a fix blind — document the exact error
(console message, failed request URL, HTTP status) before proposing a
change.
```

---

## Prüfhinweise

- **Gut belegt** (direkt aus dem Code/den Dateien verifiziert): Manifest-basiertes Laden statt Verzeichnis-Listing, korrekte `basePath`-Logik für GitHub-Pages-Unterpfade, keine Backend-/Socket-/Kamera-API-Aufrufe im Client-Code, bestehende CI-Pipeline, die bereits statisch baut und deployt.
- **Solltest du/dein Agent selbst im Original prüfen**: (1) ob Repo-Settings → Pages tatsächlich auf den vom Workflow bespielten Branch zeigt, (2) ob die Live-URL fehlerfrei lädt (Konsole/Netzwerk-Tab), (3) ob dein lokaler Arbeitsstand von dem `main`-Branch abweicht, den ich per Tarball geladen habe (Zeitstempel der Dateien: Feb 2026).
- **Fehlt/nicht prüfbar von mir**: Der Live-Zustand der GitHub-Pages-Seite selbst (meine Sandbox durfte `github.io` nicht kontaktieren) und die aktuelle Pages-Konfiguration im Repo (GitHub-API-Rate-Limit ohne Authentifizierung erschöpft).