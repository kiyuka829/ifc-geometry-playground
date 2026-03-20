import { ArcRotateCamera, Vector3 } from '@babylonjs/core'
import type { Scene } from '@babylonjs/core'

export function createArcRotateCamera(scene: Scene, canvas: HTMLCanvasElement): ArcRotateCamera {
  const camera = new ArcRotateCamera('camera', -Math.PI / 4, Math.PI / 3, 10, Vector3.Zero(), scene)
  camera.attachControl(canvas, true)
  camera.lowerRadiusLimit = 2
  camera.upperRadiusLimit = 50
  return camera
}
