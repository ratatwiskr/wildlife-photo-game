## 🦁 Wildlife Photo Game — Context Prompt for Future Chats

**Project goal:**
A tablet-friendly *wildlife photography game* for children aged **2–6**, designed for iPad or Android tablets with a thick stylus (e.g. Edurino pen).
Players “look around” a scenic environment, find cute animals, and tap the camera button to take photos.

---

### 🧱 Current State

* Fully working **TypeScript + HTML + CSS** prototype
* Builds automatically via **GitHub Actions**
* Deployed on **GitHub Pages:**
  👉 [https://ratatwiskr.github.io/wildlife-photo-game/](https://ratatwiskr.github.io/wildlife-photo-game/)
* Code is modular, simple, and maintainable.

---

### 🗂️ Project Structure

```
.
├── index.html
├── style.css
├── src/
│   ├── main.ts
│   ├── sceneRenderer.ts
│   ├── scene.ts
│   ├── config.ts          # dynamic base paths (local vs. GitHub Pages)
│   └── input.ts           # for drag/pen camera input
├── scripts/               # compiled JS output
├── assets/
│   ├── animals/*.svg
│   ├── backgrounds/*.svg
│   └── icons/*.svg
├── scenes/*.json
├── package.json
├── tsconfig.json
└── .github/workflows/deploy.yml
```

---

### 🎮 Current Gameplay Features

* Camera UI with frame and shutter button
* Scene rendering based on JSON definition:

  * background layers
  * animals positioned by coordinates
* Dynamic `basePath` detection (via `config.ts`)
  → Works locally *and* on GitHub Pages
* Functional CI/CD via GitHub Actions

---

### 🚧 Planned / In-progress

1. ✨ **Flash effect** when taking a picture
   → white overlay fade animation
2. 📸 **Shutter button reposition** above display window
3. 🌍 **Larger scrollable/pannable scene** (horizontal + vertical)

   * likely drag-to-pan input, no scrollbars
4. 🖊️ **Input system** (`input.ts`) for stylus/touch control
5. 🦓 **Animal wiggle animations** (simple SVG motion)
6. 🔊 **Sound feedback** when taking photos
7. 🎨 **Additional scenes** (savanna, arctic, jungle…)

---

### 🛠️ Tech Notes

* Written in **TypeScript**, compiled to plain JS in `scripts/`
* Pure **HTML5 + Canvas + SVG** (no heavy frameworks)
* Scene & asset placement controlled via JSON
* Works offline and on tablets
* Uses **absolute pixel coordinates** for initial layout (may evolve)
* Clean separation of responsibilities:

  * `main.ts` → entry point
  * `sceneRenderer.ts` → drawing logic
  * `scene.ts` → data structures
  * `config.ts` → environment detection
  * `input.ts` → interaction handling (planned)

---

### ⚙️ Developer Quick Start

#### 🧩 1. Install dependencies

```bash
npm install
```

#### 🧱 2. Build TypeScript

```bash
npm run build
```

*(compiles `src/` → `scripts/`)*

#### 🧪 3. Run locally

Either:

```bash
npm run serve
```

or if not defined:

```bash
npx http-server .
```

Then open:

```
http://localhost:8080
```

To test on a tablet:

* Find your local IP (`ip a` on Linux)
* Visit `http://<your-ip>:8080` on your tablet browser (same WiFi)
* No firewall rules needed if Ubuntu UFW is disabled

#### 🚀 4. Deploy automatically

Push to `main` → GitHub Actions builds → publishes to
`gh-pages` branch → available at:

```
https://<username>.github.io/wildlife-photo-game/
```

---

### 💡 Developer Principles

* 🧩 Clean modular code (classes separated by concern)
* 🧠 Simple over abstract — this is a children’s game
* 🎨 SVGs are **static**, arranged visually (e.g. in Inkscape)
* 🧮 Positions exported to JSON and rendered via Canvas
* 🧒 Touch/stylus-first UX (no small targets, no fine motor tasks)
* 🧷 Kid-friendly performance: low animation load, few dependencies

---

### 🔜 Next Milestones

* [ ] Add white flash overlay animation
* [ ] Reposition shutter button above viewport
* [ ] Expand renderer for large vertical scenes
* [ ] Implement drag-based camera panning
* [ ] Test responsiveness on iPad + Android tablet
* [ ] Add sound and scoring feedback
* [ ] Build 2–3 themed scenes

---
