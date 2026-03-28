import { Vector3 } from '@babylonjs/core'
import type { Scene, Mesh } from '@babylonjs/core'
import type { SampleDef, ParamValues } from '../../types.ts'
import { getNumber } from '../../types.ts'
import type { IfcArbitraryProfileDefWithVoids } from '../../types.ts'
import { buildExtrusionMesh } from '../operations/extrusion.ts'
import { createExtrusionMaterial } from '../../engine/materials.ts'
import { buildProfileOverlay, buildExtrusionDirectionOverlay } from '../../engine/overlays.ts'

export const extrusionVoidSample: SampleDef = {
  id: 'extrusion-void',
  title: 'Profile with Void (IfcArbitraryProfileDefWithVoids)',
  description:
    'A flat slab with a rectangular opening, demonstrating IfcArbitraryProfileDefWithVoids. ' +
    'The outer boundary and void can be resized independently.',
  parameters: [
    { key: 'outerWidth',  label: 'Slab Width',   type: 'number', min: 2, max: 12, step: 0.1, defaultValue: 6 },
    { key: 'outerHeight', label: 'Slab Height',  type: 'number', min: 2, max: 8,  step: 0.1, defaultValue: 4 },
    { key: 'voidWidth',   label: 'Void Width',   type: 'number', min: 0.5, max: 6, step: 0.1, defaultValue: 2 },
    { key: 'voidHeight',  label: 'Void Height',  type: 'number', min: 0.5, max: 4, step: 0.1, defaultValue: 1.5 },
    { key: 'depth',       label: 'Slab Depth',   type: 'number', min: 0.1, max: 2,  step: 0.05, defaultValue: 0.3 },
  ],
  steps: [
    {
      id: 'outer',
      label: 'Step 1: Outer Boundary',
      description:
        'IfcArbitraryProfileDefWithVoids starts with an outer closed curve (outerCurve) ' +
        'that defines the full extents of the section. Here it is a simple rectangle representing a slab.',
    },
    {
      id: 'void',
      label: 'Step 2: Inner Void',
      description:
        'One or more innerCurves define openings cut from the outer boundary. ' +
        'The inner curve is wound in the opposite direction to the outer curve.',
    },
    {
      id: 'solid',
      label: 'Step 3: Extruded Slab with Opening',
      description:
        'The profile with its void is extruded into a 3D solid with a rectangular opening (IfcExtrudedAreaSolid).',
    },
  ],
  buildGeometry: (scene: Scene, params: ParamValues, stepIndex: number): Mesh[] => {
    const meshes: Mesh[] = []
    const ow = getNumber(params, 'outerWidth')
    const oh = getNumber(params, 'outerHeight')
    const vw = Math.min(getNumber(params, 'voidWidth'), ow - 0.4)
    const vh = Math.min(getNumber(params, 'voidHeight'), oh - 0.4)
    const depth = getNumber(params, 'depth')

    const outerCurve = [
      { x: -ow / 2, y: -oh / 2 },
      { x:  ow / 2, y: -oh / 2 },
      { x:  ow / 2, y:  oh / 2 },
      { x: -ow / 2, y:  oh / 2 },
    ]
    // Inner curve winds opposite to outer so earcut treats it as a hole
    const innerCurve = [
      { x: -vw / 2, y: -vh / 2 },
      { x: -vw / 2, y:  vh / 2 },
      { x:  vw / 2, y:  vh / 2 },
      { x:  vw / 2, y: -vh / 2 },
    ]

    const profile: IfcArbitraryProfileDefWithVoids = {
      type: 'IfcArbitraryProfileDefWithVoids',
      profileType: 'AREA',
      outerCurve,
      innerCurves: stepIndex >= 1 ? [innerCurve] : [],
    }

    const solid = {
      type: 'IfcExtrudedAreaSolid' as const,
      sweptArea: profile,
      position: { location: { x: 0, y: 0, z: 0 } },
      extrudedDirection: { directionRatios: { x: 0, y: 1, z: 0 } },
      depth,
    }

    if (stepIndex >= 0) {
      meshes.push(...buildProfileOverlay(scene, profile, 'void_outline'))
    }

    if (stepIndex >= 2) {
      const dir = new Vector3(0, 1, 0)
      const arrow = buildExtrusionDirectionOverlay(scene, Vector3.Zero(), dir, depth, 'dir_arrow')
      if (arrow) meshes.push(arrow)
      meshes.push(buildExtrusionMesh(scene, solid, createExtrusionMaterial(scene), 'extrusion_solid'))
    }

    return meshes
  },
  getIFCRepresentation: (params: ParamValues) => {
    const ow = getNumber(params, 'outerWidth')
    const oh = getNumber(params, 'outerHeight')
    const vw = Math.min(getNumber(params, 'voidWidth'), ow - 0.4)
    const vh = Math.min(getNumber(params, 'voidHeight'), oh - 0.4)
    return {
      type: 'IfcExtrudedAreaSolid',
      sweptArea: {
        type: 'IfcArbitraryProfileDefWithVoids',
        profileType: 'AREA',
        outerCurve: [[-ow/2, -oh/2], [ow/2, -oh/2], [ow/2, oh/2], [-ow/2, oh/2]],
        innerCurves: [[[-vw/2, -vh/2], [-vw/2, vh/2], [vw/2, vh/2], [vw/2, -vh/2]]],
      },
      position: { type: 'IfcAxis2Placement3D', location: { type: 'IfcCartesianPoint', coordinates: [0, 0, 0] } },
      extrudedDirection: { type: 'IfcDirection', directionRatios: [0, 1, 0] },
      depth: getNumber(params, 'depth'),
    }
  },
}
