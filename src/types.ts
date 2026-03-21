import type { Scene } from '@babylonjs/core'
import type { Mesh } from '@babylonjs/core'

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

export interface SampleDef {
  id: string;
  title: string;
  description: string;
  parameters: ParameterDef[];
  steps: StepDef[];
  buildGeometry: (scene: Scene, params: ParamValues, stepIndex: number) => Mesh[];
  getIFCRepresentation: (params: ParamValues) => object;
}
