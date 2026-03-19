import { StandardMaterial, Color3 } from '@babylonjs/core';
import type { Scene } from '@babylonjs/core';

export function createSolidMaterial(scene: Scene, name: string, color: Color3): StandardMaterial {
  const mat = new StandardMaterial(name, scene);
  mat.diffuseColor = color;
  mat.specularColor = new Color3(0.3, 0.3, 0.3);
  mat.backFaceCulling = false;
  return mat;
}

export function createWireframeMaterial(scene: Scene, name: string, color: Color3): StandardMaterial {
  const mat = new StandardMaterial(name, scene);
  mat.diffuseColor = color;
  mat.wireframe = true;
  return mat;
}

export function createTransparentMaterial(scene: Scene, name: string, color: Color3, alpha: number): StandardMaterial {
  const mat = createSolidMaterial(scene, name, color);
  mat.alpha = alpha;
  return mat;
}
