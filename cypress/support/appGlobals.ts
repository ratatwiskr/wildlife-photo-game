/**
 * Structural view of the runtime handles the app exposes on `window.__app`
 * (see src/types.d.ts). Kept local to Cypress so e2e specs stay decoupled
 * from the app's module graph while still being fully typed.
 */

export interface ObjectiveLike {
  title?: string;
  tags?: string[];
  emoji?: string;
}

export interface SceneObjectLike {
  name: string;
  x?: number;
  y?: number;
  radius?: number;
  found?: boolean;
}

export interface ViewportLike {
  x: number;
  y: number;
  width: number;
  height: number;
  sceneWidth: number;
  sceneHeight: number;
}

export interface SceneLike {
  definition: {
    name: string;
    objects: SceneObjectLike[];
  };
  image: { width: number; height: number };
  getObjectsForObjective(objective: ObjectiveLike): SceneObjectLike[];
}

export interface RendererLike {
  viewport: ViewportLike;
  currentObjective: ObjectiveLike;
}

export interface AppLike {
  scene: SceneLike;
  renderer: RendererLike;
  cameraCtrl?: unknown;
}

export type AppWindow = Window & { __app?: AppLike };

/** The app's runtime handles, or undefined until the app has booted. */
export function appOf(win: Window): AppLike | undefined {
  return (win as AppWindow).__app;
}

/** Like appOf, but throws when the app has not booted (for .then() callbacks). */
export function requireApp(win: Window): AppLike {
  const app = appOf(win);
  if (!app) throw new Error("window.__app is not available");
  return app;
}
