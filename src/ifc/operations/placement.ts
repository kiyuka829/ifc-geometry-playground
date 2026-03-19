import type { IfcAxis2Placement3D } from '../schema.ts';

export function defaultPlacement(): IfcAxis2Placement3D {
  return {
    location: [0, 0, 0],
    axis: [0, 0, 1],
    refDirection: [1, 0, 0],
  };
}
