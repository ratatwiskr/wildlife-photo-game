// src/services/SceneLoader.ts
import { getBasePath } from "../config.js";

export interface SceneManifestEntry {
  name: string;
  sceneType: string;
}

export class SceneLoader {
  private basePath: string;

  constructor(basePath?: string) {
    this.basePath = basePath ?? getBasePath();
  }

  async fetchManifest(): Promise<SceneManifestEntry[]> {
    const url = `${this.basePath}/assets/scenes/scenes-manifest.json`;
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Failed to load manifest: ${res.status}`);
      return res.json();
    } catch (error) {
      console.error(
        "[SceneLoader] fetchManifest error:",
        error instanceof Error ? error.message : error,
      );
      alert("Failed to load scenes. Please refresh the page.");
      return [];
    }
  }

  async fetchDefinition(
    name: string,
  ): Promise<Record<string, unknown> | null> {
    const url = `${this.basePath}/assets/scenes/${name}.json`;
    try {
      const res = await fetch(url);
      if (!res.ok) return null;
      return res.json();
    } catch {
      return null;
    }
  }

  async verifyAssets(
    name: string,
    def?: Record<string, unknown>,
  ): Promise<boolean> {
    const d = def ?? (await this.fetchDefinition(name));
    if (!d) return false;
    const imgPath = d.image
      ? `${this.basePath}/assets/scenes/${d.image as string}`
      : `${this.basePath}/assets/scenes/${name}.jpg`;
    const maskPath = `${this.basePath}/assets/scenes/${name}_mask.png`;
    const [imgRes, maskRes] = await Promise.all([
      fetch(imgPath, { method: "GET" }),
      fetch(maskPath, { method: "GET" }),
    ]);
    return imgRes.ok && maskRes.ok;
  }

  async createSceneCard(
    name: string,
    photoGroup: HTMLElement,
    wimmelGroup: HTMLElement,
    onSelect: (name: string) => void,
  ): Promise<void> {
    try {
      const def = await this.fetchDefinition(name);
      if (!def) return;
      const imgPath = def.image
        ? `${this.basePath}/assets/scenes/${def.image as string}`
        : `${this.basePath}/assets/scenes/${name}.jpg`;
      const maskPath = `${this.basePath}/assets/scenes/${name}_mask.png`;
      const [imgRes, maskRes] = await Promise.all([
        fetch(imgPath, { method: "GET" }),
        fetch(maskPath, { method: "GET" }),
      ]);
      if (!imgRes.ok || !maskRes.ok) return;

      const card = document.createElement("div");
      card.className = "scene-card";
      const title = document.createElement("div");
      title.className = "scene-title";
      const pretty = name
        .replaceAll("_", " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());
      title.textContent = pretty;
      const thumbWrap = document.createElement("div");
      thumbWrap.className = "thumb-wrap";
      const thumb = document.createElement("img");
      thumb.src = imgPath;
      thumb.alt = name;
      thumb.className = "scene-thumb blurred";
      thumbWrap.appendChild(thumb);
      card.appendChild(title);
      card.appendChild(thumbWrap);
      card.addEventListener("click", () => onSelect(name));
      const st = (def.sceneType as string) || "photo";
      if (st === "wimmelbild") wimmelGroup.appendChild(card);
      else photoGroup.appendChild(card);
    } catch (e) {
      console.debug("[SceneLoader] error creating scene card for", name, e);
    }
  }

  async buildScenePicker(
    sceneList: HTMLElement,
    onSelect: (name: string) => void,
  ): Promise<void> {
    try {
      const scenes = await this.fetchManifest();
      if (!scenes || scenes.length === 0) return;
      sceneList.innerHTML = "";
      const photoGroup = document.createElement("div");
      const wimmelGroup = document.createElement("div");
      const photoHeader = document.createElement("h3");
      photoHeader.textContent = "Photo scenes";
      const wimmelHeader = document.createElement("h3");
      wimmelHeader.textContent = "Wimmelbild scenes";
      photoGroup.appendChild(photoHeader);
      wimmelGroup.appendChild(wimmelHeader);

      for (const sceneData of scenes) {
        await this.createSceneCard(
          sceneData.name,
          photoGroup,
          wimmelGroup,
          onSelect,
        );
      }

      if (photoGroup.childElementCount > 1) sceneList.appendChild(photoGroup);
      if (wimmelGroup.childElementCount > 1) sceneList.appendChild(wimmelGroup);

      const close = document.createElement("button");
      close.textContent = "Close";
      close.style.display = "block";
      close.style.marginTop = "12px";
      close.addEventListener("click", () => {
        const vp = document.getElementById("viewport");
        const scenePickerEl = document.getElementById("scenePicker");
        if (scenePickerEl) scenePickerEl.style.display = "none";
        if (vp) vp.style.display = "inline-block";
      });
      sceneList.appendChild(close);
    } catch (e) {
      console.warn("[SceneLoader] buildScenePicker error", e);
    }
  }

  async populateSceneSelect(select: HTMLSelectElement): Promise<void> {
    select.innerHTML = "";
    const current = new URLSearchParams(globalThis.location.search).get(
      "scene",
    );
    try {
      const scenes = await this.fetchManifest();
      for (const sceneData of scenes) {
        try {
          const name = sceneData.name;
          const def = await this.fetchDefinition(name);
          if (!def || !(await this.verifyAssets(name, def))) continue;
          const o = document.createElement("option");
          o.value = name;
          o.textContent = name
            .replaceAll("_", " ")
            .replace(/\b\w/g, (c) => c.toUpperCase());
          select.appendChild(o);
        } catch {
          continue;
        }
      }
      if (current) select.value = current;
      select.addEventListener("change", () => {
        const v = select.value;
        globalThis.location.search = `?scene=${v}`;
      });
    } catch (e) {
      console.warn("[SceneLoader] populateSceneSelect failed", e);
    }
  }
}
