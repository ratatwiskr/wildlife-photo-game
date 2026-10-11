// src/main.ts — thin bootstrap
import { GameManager } from "./core/GameManager.js";
import { SceneLoader } from "./services/SceneLoader.js";
const canvas = document.getElementById("game");
const shutter = document.getElementById("shutter");
const sceneSelect = document.getElementById("sceneSelect");
const sceneLoader = new SceneLoader();
const game = new GameManager(canvas, shutter, sceneSelect, sceneLoader);
game.init().catch(console.error);
