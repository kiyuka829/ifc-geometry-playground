import type { Scene } from '@babylonjs/core'
import type { Mesh } from '@babylonjs/core'

export interface ParameterDef {
  key: string;
  label: string;
  type: 'number';
  min: number;
  max: number;
  step: number;
  defaultValue: number;
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
  buildGeometry: (scene: Scene, params: Record<string, number>, stepIndex: number) => Mesh[];
  getIFCRepresentation: (params: Record<string, number>) => object;
}
