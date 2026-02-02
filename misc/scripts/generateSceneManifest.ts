import fs from "fs";
import path from "path";
import chalk from "chalk";

const SCENES_DIR = path.resolve("assets/scenes");
const MANIFEST_PATH = path.join(SCENES_DIR, "scenes-manifest.json");

interface Scene {
  name: string;
  sceneType: "photo" | "wimmelbild";
}

function readJsonFile(filePath: string): any {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    console.error(
      chalk.red(`Error reading file ${filePath}: ${(error as Error).message}`),
    );
    process.exit(1);
  }
}

function logError(sceneName: string, filePath: string, msg: string): void {
  console.error(chalk.red(`Error: Scene "${sceneName}" (${filePath}) ${msg}`));
  process.exit(1);
}

function validateScene(
  scene: any,
  sceneName: string,
  filePath: string,
): scene is Scene {
  if (
    !scene.name ||
    typeof scene.name !== "string" ||
    scene.name.trim() === ""
  ) {
    logError(sceneName, filePath, "missing required field: name");
  }

  if (!scene.sceneType || !["photo", "wimmelbild"].includes(scene.sceneType)) {
    logError(
      sceneName,
      filePath,
      "missing or invalid required field: sceneType (must be 'photo' or 'wimmelbild')",
    );
  }

  return true;
}

function generateManifest(): void {
  const sceneFiles = fs
    .readdirSync(SCENES_DIR)
    .filter(
      (file) =>
        file.endsWith(".json") &&
        file !== "scenes-manifest.json" &&
        !file.startsWith("template"),
    );

  const scenes: Scene[] = [];

  for (const file of sceneFiles) {
    const filePath = path.join(SCENES_DIR, file);
    const sceneName = file.replace(/\.json$/, "");
    const scene = readJsonFile(filePath);

    if (validateScene(scene, sceneName, filePath)) {
      // Only extract name and sceneType, not the full scene definition
      scenes.push({
        name: scene.name,
        sceneType: scene.sceneType,
      });
    }
  }

  // Sort alphabetically by name
  scenes.sort((a, b) => a.name.localeCompare(b.name));

  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(scenes, null, 2));
  console.log(
    chalk.green(
      `✓ Manifest generated successfully: ${scenes.length} scenes at ${MANIFEST_PATH}`,
    ),
  );
}

function main(): void {
  try {
    generateManifest();
  } catch (error) {
    console.error(chalk.red(`Fatal error: ${(error as Error).message}`));
    process.exit(1);
  }
}

main();
