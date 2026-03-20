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

export interface IfcArbitraryClosedProfileDef {
  type: 'IfcArbitraryClosedProfileDef';
  profileType: IfcProfileType;
  outerCurve: Vec2[];
}

export type IfcProfileDef = IfcRectangleProfileDef | IfcArbitraryClosedProfileDef;

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
