import { Vector3 } from '@babylonjs/core'
import type { Scene, Mesh } from '@babylonjs/core'
import type { SampleDef, ParamValues, IfcProfileDef } from '../../types.ts'
import { getNumber } from '../../types.ts'
import { buildExtrusionMesh, buildProfileOutline } from '../operations/extrusion.ts'
import { createExtrusionMaterial } from '../../engine/materials.ts'
import { createAxisGizmo } from '../../engine/gizmos.ts'

export const profileEditorSample: SampleDef = {
  id: 'profile-editor',
  title: 'Profile Editor',
  description:
    'An interactive 2D profile editor. Choose a standard profile type (Rectangle or Circle) or define a custom closed polygon (Arbitrary). The selected profile is extruded into a 3D solid so you can see the result immediately.',
  parameters: [
    {
      key: 'depth',
      label: 'Extrusion Depth',
      type: 'number',
      min: 0.5,
      max: 20,
      step: 0.1,
      defaultValue: 5,
    },
  ],
  steps: [
    {
      id: 'profile',
      label: 'Step 1: 2D Profile',
      description:
        'Edit the 2D cross-section using the Profile editor above. Switch between Rectangle, Circle, and Arbitrary types using the tabs.',
    },
    {
      id: 'solid',
      label: 'Step 2: Extruded Solid',
      description:
        'The profile is extruded upward by the given depth using IfcExtrudedAreaSolid. Try adjusting the depth slider or switching profile types.',
    },
  ],
  profileEditorConfig: {
    allowedTypes: ['rectangle', 'circle', 'arbitrary'],
    defaultProfile: {
      type: 'IfcRectangleProfileDef',
      profileType: 'AREA',
      xDim: 4,
      yDim: 3,
    },
  },
  buildGeometry: (
    scene: Scene,
    params: ParamValues,
    stepIndex: number,
    profile?: IfcProfileDef,
  ): Mesh[] => {
    const meshes: Mesh[] = []

    const depth = getNumber(params, 'depth')

    // Resolve the active profile – fall back to a rectangle if none provided
    const activeProfile: IfcProfileDef = profile ?? {
      type: 'IfcRectangleProfileDef',
      profileType: 'AREA',
      xDim: 4,
      yDim: 3,
    }

    const solid = {
      type: 'IfcExtrudedAreaSolid' as const,
      sweptArea: activeProfile,
      position: { location: { x: 0, y: 0, z: 0 } },
      extrudedDirection: { directionRatios: { x: 0, y: 1, z: 0 } },
      depth,
    }

    // Always show profile outline + axes (Step 0+)
    if (stepIndex >= 0) {
      const outline = buildProfileOutline(scene, activeProfile, 'profile_outline')
      meshes.push(outline as unknown as Mesh)

      const axis = createAxisGizmo(scene, Vector3.Zero(), 2)
      meshes.push(axis)
    }

    // Show extrusion solid (Step 1+)
    if (stepIndex >= 1) {
      const mat = createExtrusionMaterial(scene)
      const mesh = buildExtrusionMesh(scene, solid, mat, 'extrusion_solid')
      meshes.push(mesh)
    }

    return meshes
  },
  getIFCRepresentation: (params: ParamValues) => ({
    type: 'IfcExtrudedAreaSolid',
    sweptArea: '(see profile editor)',
    position: {
      type: 'IfcAxis2Placement3D',
      location: { type: 'IfcCartesianPoint', coordinates: [0, 0, 0] },
    },
    extrudedDirection: {
      type: 'IfcDirection',
      directionRatios: [0, 1, 0],
    },
    depth: getNumber(params, 'depth'),
  }),
}
