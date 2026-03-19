import type { Scene } from '@babylonjs/core';

export type Vec2 = [number, number];
export type Vec3 = [number, number, number];

export interface IfcAxis2Placement3D {
  location: Vec3;
  axis: Vec3;
  refDirection: Vec3;
}

export interface IfcDirection {
  directionRatios: Vec3;
}

export type IfcProfileType = 'AREA' | 'CURVE';

export interface IfcRectangleProfileDef {
  profileType: IfcProfileType;
  xDim: number;
  yDim: number;
}

export interface IfcArbitraryClosedProfileDef {
  profileType: IfcProfileType;
  outerCurve: Vec2[];
}

export type IfcProfile = IfcRectangleProfileDef | IfcArbitraryClosedProfileDef;

export interface IfcExtrudedAreaSolid {
  sweptArea: IfcProfile;
  position: IfcAxis2Placement3D;
  extrudedDirection: Vec3;
  depth: number;
}

export interface IfcRevolvedAreaSolid {
  sweptArea: IfcProfile;
  position: IfcAxis2Placement3D;
  axis: { location: Vec3; z: Vec3 };
  angle: number;
}

export type IfcBooleanOperator = 'UNION' | 'DIFFERENCE' | 'INTERSECTION';

export interface IfcBooleanResult {
  operator: IfcBooleanOperator;
  firstOperand: IfcExtrudedAreaSolid;
  secondOperand: IfcExtrudedAreaSolid;
}

export interface SampleParameter {
  id: string;
  label: string;
  type: 'number' | 'vec3';
  min?: number;
  max?: number;
  step?: number;
  value: number | Vec3;
}

export interface SampleStep {
  title: string;
  description: string;
}

export interface Sample {
  id: string;
  name: string;
  description: string;
  ifcType: string;
  parameters: SampleParameter[];
  steps: SampleStep[];
  ifcSnippet: string;
  buildScene: (scene: Scene, params: Record<string, number | Vec3>) => void;
}
