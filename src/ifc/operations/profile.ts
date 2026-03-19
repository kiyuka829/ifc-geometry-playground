import type { Vec2 } from '../schema.ts';
import type { IfcRectangleProfileDef, IfcArbitraryClosedProfileDef } from '../schema.ts';

export function rectangleProfilePoints(profile: IfcRectangleProfileDef): Vec2[] {
  const hw = profile.xDim / 2;
  const hd = profile.yDim / 2;
  return [
    [-hw, -hd],
    [hw, -hd],
    [hw, hd],
    [-hw, hd],
  ];
}

export function arbitraryClosedProfilePoints(profile: IfcArbitraryClosedProfileDef): Vec2[] {
  return profile.outerCurve;
}
