import type { ExampleEvaluation, Parameters } from '../schema'

export function evaluateBooleanDifference(params: Parameters): ExampleEvaluation {
  const baseDepth = Number(params.baseDepth)
  const cutDepth = Number(params.cutDepth)
  const cutRadius = Number(params.cutRadius)

  return {
    steps: [
      {
        id: 'base',
        title: 'ベースソリッドを作成',
        description: `押し出し深さ ${baseDepth} のプリズムを作成`,
      },
      {
        id: 'tool',
        title: 'ブーリアン用ツールを準備',
        description: `半径 ${cutRadius}, 深さ ${cutDepth} の円柱を準備`,
      },
      {
        id: 'difference',
        title: 'Boolean Difference を適用',
        description: 'IfcBooleanClippingResult で穴あけ形状を構築',
      },
    ],
    debugLines: [
      `baseDepth: ${baseDepth}`,
      `cutDepth: ${cutDepth}`,
      `cutRadius: ${cutRadius}`,
      'operator: DIFFERENCE',
    ],
  }
}
