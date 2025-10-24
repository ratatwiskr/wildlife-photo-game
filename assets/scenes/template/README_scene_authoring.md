# 🎨 Scene Authoring Guide

This document explains how to create, name, and validate new scenes for **Wildlife Photo Game**.

---

## 🧩 Scene Triplets

Each scene consists of three files with the **same base name**:

| Type | Extension | Example |
|------|------------|----------|
| Base image | `.jpg` or `.png` | `savanna.jpg` |
| Mask layer | `_mask.png` | `savanna_mask.png` |
| Definition | `.json` | `savanna.json` |

All files must be lowercase, use underscores, and reside in the same folder (e.g., `assets/scenes/`).

```text
assets/
  scenes/
    savanna.jpg
    savanna_mask.png
    savanna.json
````

---

## 🐘 JSON Definition

```json
{
  "name": "savanna",
  "animals": [
    { "name": "elephant_1", "tags": ["elephant"], "color": "#FF00FF" },
    { "name": "elephant_2", "tags": ["elephant"], "color": "#00FFFF" },
    { "name": "lion_1", "tags": ["lion"], "color": "#00FF00" }
  ],
  "objectives": [
    { "title": "Find 🐘", "tag": "elephant", "emoji": "🐘" },
    { "title": "Find 🦁", "tag": "lion", "emoji": "🦁" }
  ]
}
```

---

## 🧱 Naming and Uniqueness Rules

* Every **entity name** (animal, object) must be **unique within the scene**.
* Use a clear naming scheme:
  `animaltype_index` (e.g., `zebra_1`, `zebra_2`)
  or for objects: `car_blue`, `plane_small`, etc.
* Each entity has a **unique hex color code** in the `_mask.png` file.

---

## 🎯 Objectives

Objectives reference **tags**, not names.
This allows groups like “find all elephants” or “find all vehicles”.

✅ Example:

```json
{ "title": "Find all 🐘", "tag": "elephant", "emoji": "🐘" }
```

---

## 🧰 Scene Validation

Run validation anytime:

```bash
npm run validate:scenes
```

This checks:

* Matching `jpg`, `_mask.png`, and `json` triplets
* Consistent naming conventions
* Unique color values in the mask
* Color codes in JSON matching those in the mask

---

## 🧠 Tips for Designers

* Keep color-coded blobs in `_mask.png` distinct and saturated (avoid anti-aliasing)
* Avoid more than 15 interactive entities per scene
* Use transparent background in masks
* Preview your scene with `npm start` before committing

---

## 🐾 Future Scene Formats

Wimmelbild scenes (non-photo) can reuse this system by replacing the “camera viewfinder” with click-based exploration.