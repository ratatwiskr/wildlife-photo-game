#!/usr/bin/env ts-node

import fs from "fs";
import path from "path";
import chalk from "chalk";
import { PNG } from "pngjs";

const scenesDir = path.resolve("assets/scenes");
let hasErrors = false;

function logError(msg: string) {
  console.error(chalk.red("✖ " + msg));
  hasErrors = true;
}

function logOk(msg: string) {
  console.log(chalk.green("✔ " + msg));
}

function listSceneBases(): string[] {
  const files = fs.readdirSync(scenesDir);
  const bases = new Set<string>();
  for (const file of files) {
    if (
      file.endsWith(".jpg") ||
      file.endsWith(".png") ||
      file.endsWith(".json")
    ) {
      const base = file.replace(/(_mask)?\.(png|jpg|json)$/i, "");
      bases.add(base);
    }
  }
  return [...bases];
}

function loadMaskColors(maskPath: string): Set<string> {
  const buffer = fs.readFileSync(maskPath);
  const png = PNG.sync.read(buffer);
  const colors = new Set<string>();

  for (let i = 0; i < png.data.length; i += 4) {
    const [r, g, b, a] = png.data.slice(i, i + 4);
    if (a > 0) {
      const hex = `#${r.toString(16).padStart(2, "0")}${g
        .toString(16)
        .padStart(2, "0")}${b.toString(16).padStart(2, "0")}`.toUpperCase();
      colors.add(hex);
    }
  }

  return colors;
}

for (const base of listSceneBases()) {
  const jpg = path.join(scenesDir, `${base}.jpg`);
  const mask = path.join(scenesDir, `${base}_mask.png`);
  const json = path.join(scenesDir, `${base}.json`);

  if (!fs.existsSync(json)) logError(`${base}: Missing .json`);
  if (!fs.existsSync(mask)) logError(`${base}: Missing _mask.png`);
  if (
    !fs.existsSync(jpg) &&
    !fs.existsSync(path.join(scenesDir, `${base}.png`))
  )
    logError(`${base}: Missing .jpg or .png base image`);

  if (!fs.existsSync(json) || !fs.existsSync(mask)) continue;

  const data = JSON.parse(fs.readFileSync(json, "utf8"));

  // Validate presence of sceneType
  if (!data.sceneType || !["photo", "wimmelbild"].includes(data.sceneType)) {
    logError(
      `${base}: Missing or invalid "sceneType" (expected "photo" or "wimmelbild")`
    );
    continue;
  }

  const colorsFromMask: Set<string> = loadMaskColors(mask);
  // Use canonical "objects" key
  const items = Array.isArray(data.objects) ? data.objects : [];

  const colorsFromJson: Set<string> = new Set(
    items
      .map((a: { color: string }) =>
        a.color ? String(a.color).toUpperCase() : ""
      )
      .filter((c: string) => !!c)
  );

  for (const c of colorsFromJson.values()) {
    if (!colorsFromMask.has(c)) {
      logError(`${base}: Color ${c} from JSON not found in mask`);
    }
  }

  logOk(
    `${base}: validated (${colorsFromJson.size} entities, type=${data.sceneType})`
  );
}

if (hasErrors) {
  console.error(chalk.red("\nValidation failed.\n"));
  process.exit(1);
} else {
  console.log(chalk.green("\nAll scenes validated successfully.\n"));
}
