import { Color3, Vector3 } from '@babylonjs/core'
import type { Scene, Mesh } from '@babylonjs/core'
import type { SampleDef } from '../../types.ts'
import { buildExtrusionMesh, buildProfileOutline } from '../operations/extrusion.ts'
import { createExtrusionMaterial } from '../../engine/materials.ts'
import { createArrow, createAxisGizmo } from '../../engine/gizmos.ts'

export const extrusionBasicSample: SampleDef = {
  id: 'extrusion-basic',
  title: 'Basic Extrusion (IfcExtrudedAreaSolid)',
  description: 'A basic example of extrusion (IfcExtrudedAreaSolid). A 2D profile is extruded in a specified direction to create a 3D solid.',
  parameters: [
    { key: 'width', label: 'Width (xDim)', type: 'number', min: 0.5, max: 10, step: 0.1, defaultValue: 4 },
    { key: 'height', label: 'Height (yDim)', type: 'number', min: 0.5, max: 10, step: 0.1, defaultValue: 3 },
    { key: 'depth', label: 'Extrusion Depth', type: 'number', min: 0.5, max: 20, step: 0.1, defaultValue: 5 },
    { key: 'dirX', label: 'Direction X', type: 'number', min: -1, max: 1, step: 0.1, defaultValue: 0 },
    { key: 'dirY', label: 'Direction Y', type: 'number', min: -1, max: 1, step: 0.1, defaultValue: 1 },
    { key: 'dirZ', label: 'Direction Z', type: 'number', min: -1, max: 1, step: 0.1, defaultValue: 0 },
  ],
  steps: [
    { id: 'profile', label: 'Step 1: 2D Profile', description: 'Define the 2D profile (cross-section). Specify width and height using IfcRectangleProfileDef.' },
    { id: 'direction', label: 'Step 2: Extrusion Direction', description: 'Set the extrusion direction vector. Specify direction ratios using IfcDirection.' },
    { id: 'solid', label: 'Step 3: Extruded Solid', description: 'Apply extrusion to generate a 3D solid. Specify depth using IfcExtrudedAreaSolid.' },
  ],
  buildGeometry: (scene: Scene, params: Record<string, number>, stepIndex: number): Mesh[] => {
    const meshes: Mesh[] = []

    const solid = {
      type: 'IfcExtrudedAreaSolid' as const,
      sweptArea: {
        type: 'IfcRectangleProfileDef' as const,
        profileType: 'AREA' as const,
        xDim: params.width,
        yDim: params.height,
      },
      position: { location: { x: 0, y: 0, z: 0 } },
      extrudedDirection: { directionRatios: { x: params.dirX, y: params.dirY, z: params.dirZ } },
      depth: params.depth,
    }

    if (stepIndex >= 0) {
      const outline = buildProfileOutline(scene, solid.sweptArea, 'profile_outline')
      meshes.push(outline as unknown as Mesh)

      const axis = createAxisGizmo(scene, Vector3.Zero(), 2)
      meshes.push(axis)
    }

    if (stepIndex >= 1) {
      const dir = new Vector3(params.dirX, params.dirY, params.dirZ)
      if (dir.length() > 0.01) {
        const arrow = createArrow(scene, Vector3.Zero(), dir, params.depth, new Color3(0.2, 0.9, 0.2), 'dir_arrow')
        meshes.push(arrow)
      }
    }

    if (stepIndex >= 2) {
      const mat = createExtrusionMaterial(scene)
      const mesh = buildExtrusionMesh(scene, solid, mat, 'extrusion_solid')
      meshes.push(mesh)
    }

    return meshes
  },
  getIFCRepresentation: (params: Record<string, number>) => ({
    type: 'IfcExtrudedAreaSolid',
    sweptArea: {
      type: 'IfcRectangleProfileDef',
      profileType: 'AREA',
      xDim: params.width,
      yDim: params.height,
    },
    position: {
      type: 'IfcAxis2Placement3D',
      location: { type: 'IfcCartesianPoint', coordinates: [0, 0, 0] },
    },
    extrudedDirection: {
      type: 'IfcDirection',
      directionRatios: [params.dirX, params.dirY, params.dirZ],
    },
    depth: params.depth,
  }),
}
