import type { ExampleEvaluation, Parameters } from '../schema'

export function evaluateExtrusion(params: Parameters): ExampleEvaluation {
  const depth = Number(params.depth)
  const direction = params.direction as [number, number, number]
  const width = Number(params.width)
  const height = Number(params.height)

  return {
    steps: [
      {
        id: 'profile',
        title: '2Dプロファイルを定義',
        description: `IfcRectangleProfileDef として ${width} x ${height} の断面を作成`,
      },
      {
        id: 'direction',
        title: '押し出し方向を設定',
        description: `ExtrudedDirection = (${direction.join(', ')})`,
      },
      {
        id: 'solid',
        title: '押し出しソリッドを生成',
        description: `Depth = ${depth} を適用して IfcExtrudedAreaSolid を構築`,
      },
    ],
    debugLines: [
      `profile: rectangle(${width}, ${height})`,
      `direction: vec3(${direction.join(', ')})`,
      `depth: ${depth}`,
    ],
  }
}
