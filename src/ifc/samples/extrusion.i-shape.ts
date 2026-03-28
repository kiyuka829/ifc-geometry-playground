import { Vector3 } from '@babylonjs/core'
import type { Scene, Mesh } from '@babylonjs/core'
import type { SampleDef, ParamValues, IfcProfileDef } from '../../types.ts'
import { getNumber } from '../../types.ts'
import { buildExtrusionMesh } from '../operations/extrusion.ts'
import { createExtrusionMaterial } from '../../engine/materials.ts'
import { buildProfileOverlay, buildExtrusionDirectionOverlay } from '../../engine/overlays.ts'

const DEFAULT_PROFILE: IfcProfileDef = {
  type: 'IfcIShapeProfileDef',
  profileType: 'AREA',
  overallWidth: 3,
  overallDepth: 5,
  webThickness: 0.2,
  flangeThickness: 0.3,
}

export const extrusionIShapeSample: SampleDef = {
  id: 'extrusion-i-shape',
  title: 'I-Shape / H-Beam Profile (IfcIShapeProfileDef)',
  description:
    'The most common structural steel section: an I-beam or H-column. ' +
    'Adjust the flange width, overall depth, web thickness, and flange thickness in the profile editor.',
  parameters: [
    { key: 'depth', label: 'Extrusion Depth', type: 'number', min: 0.5, max: 20, step: 0.1, defaultValue: 6 },
  ],
  steps: [
    {
      id: 'profile',
      label: 'Step 1: I-Shape Cross-Section',
      description:
        'IfcIShapeProfileDef defines an I-beam (H-column) by overall width, overall depth, ' +
        'web thickness, and flange thickness. The section is symmetric about both axes.',
    },
    {
      id: 'solid',
      label: 'Step 2: Extruded Beam',
      description:
        'The I-section is extruded along the Z-axis to produce a structural beam or column. ' +
        'This is the most widely used profile in structural steel construction.',
    },
  ],
  profileEditorConfig: {
    allowedTypes: ['i-shape'],
    defaultProfile: DEFAULT_PROFILE,
  },
  buildGeometry: (scene: Scene, params: ParamValues, stepIndex: number, profile?: IfcProfileDef): Mesh[] => {
    const meshes: Mesh[] = []
    const depth = getNumber(params, 'depth')
    const activeProfile: IfcProfileDef = profile ?? DEFAULT_PROFILE

    const solid = {
      type: 'IfcExtrudedAreaSolid' as const,
      sweptArea: activeProfile,
      position: { location: { x: 0, y: 0, z: 0 } },
      extrudedDirection: { directionRatios: { x: 0, y: 1, z: 0 } },
      depth,
    }

    if (stepIndex >= 0) {
      meshes.push(...buildProfileOverlay(scene, activeProfile, 'ishape_outline'))
    }

    if (stepIndex >= 1) {
      const dir = new Vector3(0, 1, 0)
      const arrow = buildExtrusionDirectionOverlay(scene, Vector3.Zero(), dir, depth, 'dir_arrow')
      if (arrow) meshes.push(arrow)
      meshes.push(buildExtrusionMesh(scene, solid, createExtrusionMaterial(scene), 'extrusion_solid'))
    }

    return meshes
  },
  getIFCRepresentation: (params: ParamValues) => ({
    type: 'IfcExtrudedAreaSolid',
    sweptArea: {
      type: 'IfcIShapeProfileDef',
      profileType: 'AREA',
      overallWidth: '(see profile editor)',
      overallDepth: '(see profile editor)',
      webThickness: '(see profile editor)',
      flangeThickness: '(see profile editor)',
    },
    position: { type: 'IfcAxis2Placement3D', location: { type: 'IfcCartesianPoint', coordinates: [0, 0, 0] } },
    extrudedDirection: { type: 'IfcDirection', directionRatios: [0, 1, 0] },
    depth: getNumber(params, 'depth'),
  }),
}
