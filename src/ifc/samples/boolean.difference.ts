import { evaluateBooleanDifference } from '../operations/boolean'
import type { ExampleSample } from '../schema'

export const booleanDifferenceSample: ExampleSample = {
  id: 'boolean-difference',
  title: 'Boolean: Difference (Hole)',
  category: 'boolean',
  summary: 'ベースソリッドから円柱ツールを差し引く穴あけの例。',
  ifcTree: [
    'IfcBooleanClippingResult',
    '├─ FirstOperand: IfcExtrudedAreaSolid',
    '└─ SecondOperand: IfcRightCircularCylinder',
  ],
  pseudoIfc: `#200 = IFCEXTRUDEDAREASOLID(..., 200.);\n#210 = IFCRIGHTCIRCULARCYLINDER(...,40.,220.);\n#220 = IFCBOOLEANCLIPPINGRESULT(.DIFFERENCE.,#200,#210);`,
  parameters: [
    { key: 'baseDepth', label: 'Base Depth', type: 'number', min: 60, max: 500, step: 10 },
    { key: 'cutDepth', label: 'Cut Depth', type: 'number', min: 40, max: 500, step: 10 },
    { key: 'cutRadius', label: 'Cut Radius', type: 'number', min: 10, max: 120, step: 5 },
  ],
  initialParams: {
    baseDepth: 200,
    cutDepth: 240,
    cutRadius: 40,
  },
  evaluate: evaluateBooleanDifference,
}
