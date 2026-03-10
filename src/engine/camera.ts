export interface CameraPreset {
  alpha: number
  beta: number
  radius: number
}

export const defaultCameraPreset: CameraPreset = {
  alpha: Math.PI / 4,
  beta: Math.PI / 3,
  radius: 12,
}
