import type { Scene } from '@babylonjs/core'
import type { Mesh } from '@babylonjs/core'
import type { IfcProfileDef, Vec3 } from './ifc/schema.ts'

export type { IfcProfileDef, Vec3 }

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
