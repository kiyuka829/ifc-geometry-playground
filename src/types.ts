import type { Scene } from "@babylonjs/core";
import type { Mesh } from "@babylonjs/core";
import type {
  IfcAreaParameterizedProfileDef,
  IfcProfileTypeEnum,
} from "./ifc/generated/schema.ts";

// ── Re-export generated parameterized profile types ───────────────────────
// These are the canonical IFC-spec types. Import from here rather than from
// src/ifc/generated/schema.ts directly, or from the old src/ifc/schema.ts.
export type {
  IfcAreaParameterizedProfileDef,
  IfcParameterizedProfileDef,
  IfcProfileTypeEnum,
  IfcAsymmetricIShapeProfileDef,
  IfcCShapeProfileDef,
  IfcRectangleProfileDef,
  IfcRoundedRectangleProfileDef,
  IfcRectangleHollowProfileDef,
  IfcCircleProfileDef,
  IfcCircleHollowProfileDef,
  IfcEllipseProfileDef,
  IfcIShapeProfileDef,
  IfcLShapeProfileDef,
  IfcTShapeProfileDef,
  IfcUShapeProfileDef,
  IfcZShapeProfileDef,
} from "./ifc/generated/schema.ts";

// ── UI model coordinate types ──────────────────────────────────────────────
/** 2D coordinate used in profile editing (outerCurve / innerCurves). */
export interface Vec2 {
  x: number;
  y: number;
}
/**
 * 3D coordinate used in UI/state/IFC-domain code.
 * Axis convention: X = right, Y = depth, Z = up.
 */
export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/**
 * Simplified 3D placement (similar to IFC's IfcAxis2Placement3D).
 * Includes location and optional local Z-axis / X-axis directions.
 */
export interface IfcAxis2Placement3D {
  type: "IfcAxis2Placement3D";
  /** Origin point of the placement. */
  location: Vec3;
  /** Local Z-axis direction (normalized). Defaults to [0, 0, 1] if not provided. */
  axis?: Vec3;
  /** Local X-axis direction. Orthogonalization is handled downstream. */
  refDirection?: Vec3;
}

/** Backward-compatible alias for IfcProfileTypeEnum. */
export type IfcProfileType = IfcProfileTypeEnum;

// ── Arbitrary profile types (UI-friendly, Vec2-based) ─────────────────────
/** Arbitrary closed profile with outer curve as Vec2 list. */
export interface IfcArbitraryClosedProfileDef {
  type: "IfcArbitraryClosedProfileDef";
  profileType: IfcProfileTypeEnum;
  outerCurve: Vec2[];
}

/** Closed profile with one or more inner voids (holes). */
export interface IfcArbitraryProfileDefWithVoids {
  type: "IfcArbitraryProfileDefWithVoids";
  profileType: IfcProfileTypeEnum;
  outerCurve: Vec2[];
  innerCurves: Vec2[][];
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
  | IfcArbitraryProfileDefWithVoids;

/** A polyline directrix used as the sweep path for swept-solid types. */
export interface IfcPolyline {
  type: "IfcPolyline";
  points: Vec3[];
}

/**
 * Sweeps a circular disk (and optionally a hollow ring) along a polyline
 * directrix to produce a solid.
 */
export interface IfcSweptDiskSolid {
  type: "IfcSweptDiskSolid";
  directrix: IfcPolyline;
  /** Outer radius of the disk. */
  radius: number;
  /** Inner radius for a hollow pipe; omit for a solid rod. */
  innerRadius?: number;
}

export interface NumberParameterDef {
  key: string;
  label: string;
  type: "number";
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
  type: "select";
  options: SelectOption[];
  defaultValue: string;
}

export type ParameterDef = NumberParameterDef | SelectParameterDef;

export type ParamValues = Record<string, number | string>;

export function getNumber(params: ParamValues, key: string): number {
  const value = params[key];
  if (typeof value !== "number") {
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
  if (
    typeof value === "string" &&
    (validValues as readonly string[]).includes(value)
  ) {
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
  | "rectangle"
  | "rounded-rectangle"
  | "circle"
  | "ellipse"
  | "rect-hollow"
  | "circle-hollow"
  | "c-shape"
  | "asymmetric-i-shape"
  | "i-shape"
  | "l-shape"
  | "t-shape"
  | "u-shape"
  | "z-shape"
  | "arbitrary";

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

/** Extrusion parameters edited as a single reusable unit. */
export interface ExtrusionParams {
  /** Positive distance to extrude along extrudedDirection. */
  depth: number;
  /** Local extrusion axis direction (normalized). */
  extrudedDirection: Vec3;
}

/** Configuration for the extrusion editor widget. */
export interface ExtrusionEditorConfig {
  /** Initial depth and extrusion direction. */
  defaultExtrusion: ExtrusionParams;
  /** Optional label shown above the editor. */
  label?: string;
}

/** Configuration for the placement editor widget. */
export interface PlacementEditorConfig {
  /** Initial placement (location and optional axis / refDirection). */
  defaultPlacement: IfcAxis2Placement3D;
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
   * When set, ExamplePage renders an ExtrusionEditor widget that lets the user
   * edit depth and extrudedDirection. The current ExtrusionParams is forwarded
   * to buildGeometry as the optional sixth argument.
   */
  extrusionEditorConfig?: ExtrusionEditorConfig;
  /**
   * When set, ExamplePage renders a PlacementEditor widget that lets the user
   * edit the placement location and axis. The current IfcAxis2Placement3D is
   * forwarded to buildGeometry as the optional seventh argument.
   */
  placementEditorConfig?: PlacementEditorConfig;
  /**
   * When set, ExamplePage renders sweep-view toggle buttons (path / local
   * frames / result). The current SweepViewState is forwarded to buildGeometry
   * as the optional eighth argument.
   */
  sweepViewConfig?: SweepViewConfig;
  buildGeometry: (
    scene: Scene,
    params: ParamValues,
    stepIndex: number,
    profile?: IfcProfileDef,
    path?: Vec3[],
    extrusion?: ExtrusionParams,
    placement?: IfcAxis2Placement3D,
    sweepView?: SweepViewState,
  ) => Mesh[];
  getIFCRepresentation: (params: ParamValues) => object;
}
