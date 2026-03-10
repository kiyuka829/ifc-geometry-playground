import { StandardMaterial, Color3 } from '@babylonjs/core'
import type { Scene } from '@babylonjs/core'

export function createSolidMaterial(scene: Scene, color: Color3, alpha = 1): StandardMaterial {
  const mat = new StandardMaterial(`solid_${Math.random()}`, scene)
  mat.diffuseColor = color
  mat.alpha = alpha
  return mat
}

export function createWireframeMaterial(scene: Scene, color: Color3): StandardMaterial {
  const mat = new StandardMaterial(`wire_${Math.random()}`, scene)
  mat.diffuseColor = color
  mat.wireframe = true
  return mat
}

export function createGhostMaterial(scene: Scene, color: Color3): StandardMaterial {
  const mat = new StandardMaterial(`ghost_${Math.random()}`, scene)
  mat.diffuseColor = color
  mat.alpha = 0.3
  return mat
}

export function createProfileMaterial(scene: Scene): StandardMaterial {
  return createSolidMaterial(scene, new Color3(1, 0.5, 0.1))
}

export function createExtrusionMaterial(scene: Scene): StandardMaterial {
  return createSolidMaterial(scene, new Color3(0.3, 0.5, 0.7))
}
