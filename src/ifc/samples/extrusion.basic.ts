import { evaluateExtrusion } from '../operations/extrusion'
import type { ExampleSample } from '../schema'

export const extrusionBasicSample: ExampleSample = {
  id: 'extrusion-basic',
  title: 'Extrusion: Basic Prism',
  category: 'extrusion',
  summary: '矩形プロファイルを指定方向へ押し出してソリッドを作る最小例。',
  ifcTree: [
    'IfcExtrudedAreaSolid',
    '└─ SweptArea: IfcRectangleProfileDef',
    '└─ Position: IfcAxis2Placement3D',
    '└─ ExtrudedDirection: IfcDirection',
  ],
  pseudoIfc: `#100 = IFCCARTESIANPOINT((0.,0.,0.));\n#110 = IFCAXIS2PLACEMENT3D(#100,$,$);\n#120 = IFCRECTANGLEPROFILEDEF(.AREA.,'Rect',#110,200.,120.);\n#130 = IFCEXTRUDEDAREASOLID(#120,#110,IFCDIRECTION((0.,0.,1.)),300.);`,
  parameters: [
    { key: 'width', label: 'Profile Width', type: 'number', min: 20, max: 400, step: 10 },
    { key: 'height', label: 'Profile Height', type: 'number', min: 20, max: 400, step: 10 },
    { key: 'depth', label: 'Extrusion Depth', type: 'number', min: 20, max: 600, step: 10 },
    { key: 'direction', label: 'Extruded Direction', type: 'vector3' },
  ],
  initialParams: {
    width: 200,
    height: 120,
    depth: 300,
    direction: [0, 0, 1],
  },
  evaluate: evaluateExtrusion,
}
