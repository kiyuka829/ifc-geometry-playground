import { Vector3 } from "@babylonjs/core";
import type { Vec2, Vec3 } from "../types.ts";

export type CoordinateLike3 = Vec3;
export type CoordinateLike2 = Vec2;

// IFC/UX space: X = right, Y = depth, Z = up (right-handed)
// Babylon space: X = right, Y = up, Z = depth (left-handed scene)
// Swapping Y/Z gives us the expected UX axes while moving into Babylon space.
export function ifcToBabylonVector(v: CoordinateLike3): Vector3 {
  return new Vector3(v.x, v.z, v.y);
}

export function babylonToIfcVector(v: CoordinateLike3): CoordinateLike3 {
  return { x: v.x, y: v.z, z: v.y };
}

export function ifcProfileToBabylonVector(v: CoordinateLike2): Vector3 {
  return new Vector3(v.x, 0, v.y);
}

export function toIfcMathVector(v: CoordinateLike3): Vector3 {
  return new Vector3(v.x, v.y, v.z);
}

export const IFC_X_AXIS = new Vector3(1, 0, 0);
export const IFC_Y_AXIS = new Vector3(0, 1, 0);
export const IFC_Z_AXIS = new Vector3(0, 0, 1);
