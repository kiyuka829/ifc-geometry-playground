import type { Scene, Mesh } from '@babylonjs/core'
import type { SampleDef } from '../../types.ts'
import { buildBooleanVisualization } from '../operations/boolean.ts'

export const booleanDifferenceSample: SampleDef = {
  id: 'boolean-difference',
  title: 'Boolean Difference (IfcBooleanResult)',
  description: 'ブール差演算 (IfcBooleanResult) の例です。2つのソリッドの差を取って、開口部や切り欠きを持つ形状を作成します。',
  parameters: [
    { key: 'mainWidth', label: 'Main Width', type: 'number', min: 1, max: 10, step: 0.1, defaultValue: 6 },
    { key: 'mainHeight', label: 'Main Height', type: 'number', min: 1, max: 10, step: 0.1, defaultValue: 4 },
    { key: 'mainDepth', label: 'Main Depth', type: 'number', min: 1, max: 20, step: 0.1, defaultValue: 8 },
    { key: 'cutterWidth', label: 'Cutter Width', type: 'number', min: 0.5, max: 8, step: 0.1, defaultValue: 2 },
    { key: 'cutterHeight', label: 'Cutter Height', type: 'number', min: 0.5, max: 8, step: 0.1, defaultValue: 2 },
    { key: 'cutterDepth', label: 'Cutter Depth', type: 'number', min: 0.5, max: 20, step: 0.1, defaultValue: 10 },
    { key: 'cutterOffsetX', label: 'Cutter Offset X', type: 'number', min: -3, max: 3, step: 0.1, defaultValue: 0 },
  ],
  steps: [
    { id: 'first', label: 'Step 1: First Operand', description: '最初のソリッド（被演算子）を定義します。これが基本形状になります。' },
    { id: 'second', label: 'Step 2: Second Operand (Cutter)', description: '2番目のソリッド（カッター）を半透明で表示します。このソリッドで切り取ります。' },
    { id: 'result', label: 'Step 3: Boolean Result', description: 'ブール差演算の結果を表示します。カッターで切り取られた形状が生成されます。' },
  ],
  buildGeometry: (scene: Scene, params: Record<string, number>, stepIndex: number): Mesh[] => {
    const booleanResult = {
      type: 'IfcBooleanResult' as const,
      operator: 'DIFFERENCE' as const,
      firstOperand: {
        type: 'IfcExtrudedAreaSolid' as const,
        sweptArea: {
          type: 'IfcRectangleProfileDef' as const,
          profileType: 'AREA' as const,
          xDim: params.mainWidth,
          yDim: params.mainHeight,
        },
        position: { location: { x: 0, y: 0, z: 0 } },
        extrudedDirection: { directionRatios: { x: 0, y: 1, z: 0 } },
        depth: params.mainDepth,
      },
      secondOperand: {
        type: 'IfcExtrudedAreaSolid' as const,
        sweptArea: {
          type: 'IfcRectangleProfileDef' as const,
          profileType: 'AREA' as const,
          xDim: params.cutterWidth,
          yDim: params.cutterHeight,
        },
        position: { location: { x: params.cutterOffsetX, y: 0, z: 0 } },
        extrudedDirection: { directionRatios: { x: 0, y: 1, z: 0 } },
        depth: params.cutterDepth,
      },
    }

    return buildBooleanVisualization(scene, booleanResult, 'boolean', stepIndex)
  },
  getIFCRepresentation: (params: Record<string, number>) => ({
    type: 'IfcBooleanResult',
    operator: 'DIFFERENCE',
    firstOperand: {
      type: 'IfcExtrudedAreaSolid',
      sweptArea: {
        type: 'IfcRectangleProfileDef',
        profileType: 'AREA',
        xDim: params.mainWidth,
        yDim: params.mainHeight,
      },
      position: {
        type: 'IfcAxis2Placement3D',
        location: { type: 'IfcCartesianPoint', coordinates: [0, 0, 0] },
      },
      extrudedDirection: { type: 'IfcDirection', directionRatios: [0, 1, 0] },
      depth: params.mainDepth,
    },
    secondOperand: {
      type: 'IfcExtrudedAreaSolid',
      sweptArea: {
        type: 'IfcRectangleProfileDef',
        profileType: 'AREA',
        xDim: params.cutterWidth,
        yDim: params.cutterHeight,
      },
      position: {
        type: 'IfcAxis2Placement3D',
        location: { type: 'IfcCartesianPoint', coordinates: [params.cutterOffsetX, 0, 0] },
      },
      extrudedDirection: { type: 'IfcDirection', directionRatios: [0, 1, 0] },
      depth: params.cutterDepth,
    },
  }),
}
