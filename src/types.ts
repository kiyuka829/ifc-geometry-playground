import type { Scene } from '@babylonjs/core'
import type { Mesh } from '@babylonjs/core'
import type { IfcAreaParameterizedProfileDef, IfcProfileTypeEnum } from './ifc/generated/schema.ts'

// ── Re-export generated parameterized profile types ───────────────────────
// These are the canonical IFC-spec types. Import from here rather than from
// src/ifc/generated/schema.ts directly, or from the old src/ifc/schema.ts.
export type {
  IfcAreaParameterizedProfileDef,
  IfcParameterizedProfileDef,
  IfcProfileTypeEnum,
  IfcRectangleProfileDef,
  IfcRectangleHollowProfileDef,
  IfcCircleProfileDef,
  IfcCircleHollowProfileDef,
  IfcIShapeProfileDef,
  IfcLShapeProfileDef,
} from './ifc/generated/schema.ts'

// ── UI model coordinate types ──────────────────────────────────────────────
/** 2D coordinate used in profile editing (outerCurve / innerCurves). */
export interface Vec2 { x: number; y: number }
/** 3D coordinate used in path editing and simplified IFC placements. */
export interface Vec3 { x: number; y: number; z: number }

/** Backward-compatible alias for IfcProfileTypeEnum. */
export type IfcProfileType = IfcProfileTypeEnum

// ── Simplified IFC geometry types (UI-domain, Vec3-based) ─────────────────
// These use plain Vec3 coordinates for ease of use in the playground.
// For IFC-compliant output (IfcCartesianPoint / number[] direction ratios),
// use the types from src/ifc/generated/schema.ts.

/** Simplified extrusion direction using Vec3 (playground UI representation). */
export interface IfcDirection {
  directionRatios: Vec3
}

/** Simplified 3D placement using Vec3 (playground UI representation). */
export interface IfcAxis2Placement3D {
  location: Vec3
  axis?: Vec3
  refDirection?: Vec3
}

// ── Arbitrary profile types (UI-friendly, Vec2-based) ─────────────────────
/** Arbitrary closed profile with outer curve as Vec2 list. */
export interface IfcArbitraryClosedProfileDef {
  type: 'IfcArbitraryClosedProfileDef'
  profileType: IfcProfileTypeEnum
  outerCurve: Vec2[]
}

/** Closed profile with one or more inner voids (holes). */
export interface IfcArbitraryProfileDefWithVoids {
  type: 'IfcArbitraryProfileDefWithVoids'
  profileType: IfcProfileTypeEnum
  outerCurve: Vec2[]
  innerCurves: Vec2[][]
}

// ── Unified profile union type ─────────────────────────────────────────────
/**
 * Union of all profile types supported by the playground:
 *  - Parameterized profiles (from generated/schema.ts, IFC-compliant)
 *  - Arbitrary profiles (Vec2-based, UI-friendly representation)
 */
export type IfcProfileDef =
  | IfcAreaParameterizedProfileDef
  | IfcArbitraryClosedProfileDef
  | IfcArbitraryProfileDefWithVoids

// ── UI-domain solid and operation types ───────────────────────────────────
/**
 * Extruded area solid for the playground's old rendering path.
 * Uses simplified Vec3-based placements and accepts any IfcProfileDef.
 * For the IFC-compliant version, use src/ifc/generated/schema.ts.
 */
export interface IfcExtrudedAreaSolid {
  type: 'IfcExtrudedAreaSolid'
  sweptArea: IfcProfileDef
  position?: IfcAxis2Placement3D
  extrudedDirection: IfcDirection
  depth: number
}

/** Boolean set operation on two solids. */
export interface IfcBooleanResult {
  type: 'IfcBooleanResult'
  operator: 'DIFFERENCE' | 'UNION' | 'INTERSECTION'
  firstOperand: IfcExtrudedAreaSolid | IfcBooleanResult
  secondOperand: IfcExtrudedAreaSolid | IfcBooleanResult
}

/** A polyline directrix used as the sweep path for swept-solid types. */
export interface IfcPolyline {
  type: 'IfcPolyline'
  points: Vec3[]
}

/**
 * Sweeps a circular disk (and optionally a hollow ring) along a polyline
 * directrix to produce a solid.
 */
export interface IfcSweptDiskSolid {
  type: 'IfcSweptDiskSolid'
  directrix: IfcPolyline
  /** Outer radius of the disk. */
  radius: number
  /** Inner radius for a hollow pipe; omit for a solid rod. */
  innerRadius?: number
}

export interface NumberParameterDef {
  key: string;
  label: string;
  type: 'number';
  min: number;
  max: number;
  step: number;
  defaultValue: number;
}

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectParameterDef {
  key: string;
  label: string;
  type: 'select';
  options: SelectOption[];
  defaultValue: string;
}

export type ParameterDef = NumberParameterDef | SelectParameterDef;

export type ParamValues = Record<string, number | string>;

export function getNumber(params: ParamValues, key: string): number {
  const value = params[key];
  if (typeof value !== 'number') {
    throw new Error(`Expected numeric param "${key}", got ${typeof value}`);
  }
  return value;
}

export function getSelect<T extends string>(
  params: ParamValues,
  key: string,
  validValues: readonly T[],
  defaultValue: T,
): T {
  const value = params[key];
  if (typeof value === 'string' && (validValues as readonly string[]).includes(value)) {
    return value as T;
  }
  return defaultValue;
}

export interface StepDef {
  id: string;
  label: string;
  description: string;
}

/** Which profile types the ProfileEditor should expose for a given sample. */
export type ProfileType =
  | 'rectangle'
  | 'circle'
  | 'rect-hollow'
  | 'circle-hollow'
  | 'i-shape'
  | 'l-shape'
  | 'arbitrary';

export interface ProfileEditorConfig {
  /** Profile types shown as selectable tabs in the editor. */
  allowedTypes: ProfileType[];
  /** Profile used when the editor is first mounted. */
  defaultProfile: IfcProfileDef;
}

/** Configuration for the path editor widget. */
export interface PathEditorConfig {
  /** Initial list of 3-D waypoints defining the sweep path. */
  defaultPath: Vec3[];
  /** Minimum number of points the user must keep (default: 2). */
  minPoints?: number;
  /** Optional label shown above the editor. */
  label?: string;
}

/** Visibility flags passed to buildGeometry for sweep-based samples. */
export interface SweepViewState {
  showPath: boolean;
  showFrames: boolean;
  showResult: boolean;
}

/** Configuration for the sweep-view toggle panel. */
export interface SweepViewConfig {
  /** Override any of the three default-on/off states. */
  defaults?: Partial<SweepViewState>;
}

export interface SampleDef {
  id: string;
  title: string;
  description: string;
  parameters: ParameterDef[];
  steps: StepDef[];
  /** Milliseconds to debounce parameter-driven geometry rebuilds. Defaults to 0 (immediate). */
  debounceMs?: number;
  /**
   * When set, ExamplePage renders a shared ProfileEditor widget above the
   * parameter sliders. The current IfcProfileDef is forwarded to buildGeometry
   * as the optional fourth argument.
   */
  profileEditorConfig?: ProfileEditorConfig;
  /**
   * When set, ExamplePage renders a PathEditor widget that lets the user edit
   * the sweep path. The current Vec3[] path is forwarded to buildGeometry as
   * the optional fifth argument.
   */
  pathEditorConfig?: PathEditorConfig;
  /**
   * When set, ExamplePage renders sweep-view toggle buttons (path / local
   * frames / result). The current SweepViewState is forwarded to buildGeometry
   * as the optional sixth argument.
   */
  sweepViewConfig?: SweepViewConfig;
  buildGeometry: (
    scene: Scene,
    params: ParamValues,
    stepIndex: number,
    profile?: IfcProfileDef,
    path?: Vec3[],
    sweepView?: SweepViewState,
  ) => Mesh[];
  getIFCRepresentation: (params: ParamValues) => object;
}
