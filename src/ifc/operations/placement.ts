export interface Placement3D {
  origin: [number, number, number]
  axis: [number, number, number]
  refDirection: [number, number, number]
}

export const defaultPlacement: Placement3D = {
  origin: [0, 0, 0],
  axis: [0, 0, 1],
  refDirection: [1, 0, 0],
}
