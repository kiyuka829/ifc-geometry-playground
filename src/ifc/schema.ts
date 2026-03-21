export interface Vec2 { x: number; y: number }
export interface Vec3 { x: number; y: number; z: number }

export interface IfcDirection { directionRatios: Vec3 }
export interface IfcAxis2Placement3D {
  location: Vec3;
  axis?: Vec3;
  refDirection?: Vec3;
}

export type IfcProfileType = 'AREA' | 'CURVE';

export interface IfcRectangleProfileDef {
  type: 'IfcRectangleProfileDef';
  profileType: IfcProfileType;
  xDim: number;
  yDim: number;
}

export interface IfcCircleProfileDef {
  type: 'IfcCircleProfileDef';
  profileType: IfcProfileType;
  radius: number;
}

export interface IfcArbitraryClosedProfileDef {
  type: 'IfcArbitraryClosedProfileDef';
  profileType: IfcProfileType;
  outerCurve: Vec2[];
}

/** Closed profile with one or more inner voids (holes). Reserved for hollow sections. */
export interface IfcArbitraryProfileDefWithVoids {
  type: 'IfcArbitraryProfileDefWithVoids';
  profileType: IfcProfileType;
  outerCurve: Vec2[];
  innerCurves: Vec2[][];
}

export type IfcProfileDef =
  | IfcRectangleProfileDef
  | IfcCircleProfileDef
  | IfcArbitraryClosedProfileDef
  | IfcArbitraryProfileDefWithVoids;

export interface IfcExtrudedAreaSolid {
  type: 'IfcExtrudedAreaSolid';
  sweptArea: IfcProfileDef;
  position: IfcAxis2Placement3D;
  extrudedDirection: IfcDirection;
  depth: number;
}

export interface IfcBooleanResult {
  type: 'IfcBooleanResult';
  operator: 'DIFFERENCE' | 'UNION' | 'INTERSECTION';
  firstOperand: IfcExtrudedAreaSolid | IfcBooleanResult;
  secondOperand: IfcExtrudedAreaSolid | IfcBooleanResult;
}
