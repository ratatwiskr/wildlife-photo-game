export interface SceneAsset {
  id: string;
  src: string;
  x: number;
  y: number;
}

export interface SceneLayer {
  id: string;
  assets: SceneAsset[];
}

export interface SceneDefinition {
  id: string;
  name: string;
  layers: SceneLayer[];
}