import type { Scene, Mesh } from '@babylonjs/core'
import type { SampleDef, ParamValues, Vec3, SweepViewState, IfcProfileDef } from '../../types.ts'
import { getNumber } from '../../types.ts'
import { createSolidMaterial } from '../../engine/materials.ts'
import { Color3 } from '@babylonjs/core'
import {
  buildSweptDiskSolid,
  buildPathLines,
  buildPathFrames,
} from '../operations/sweep.ts'

const DEFAULT_PATH: Vec3[] = [
  { x: -4, y: 0, z: 0 },
  { x: -2, y: 2, z: 2 },
  { x:  2, y: 2, z: 4 },
  { x:  4, y: 0, z: 6 },
]

export const sweptDiskBasicSample: SampleDef = {
  id: 'swept-disk-basic',
  title: 'Swept Disk Solid (IfcSweptDiskSolid)',
  description:
    'A circular disk is swept along a polyline path to create a 3D rod or pipe. ' +
    'Edit the waypoints in the Path editor, adjust the radius sliders, and use ' +
    'the View toggles to inspect the path, local frames, and final geometry.',
  parameters: [
    {
      key: 'radius',
      label: 'Outer Radius',
      type: 'number',
      min: 0.05,
      max: 1.5,
      step: 0.05,
      defaultValue: 0.3,
    },
    {
      key: 'innerRadius',
      label: 'Inner Radius (0 = solid rod)',
      type: 'number',
      min: 0,
      max: 1.4,
      step: 0.05,
      defaultValue: 0,
    },
  ],
  steps: [
    {
      id: 'path',
      label: 'Step 1: Sweep Path',
      description:
        'Define the polyline directrix (IfcPolyline). Each waypoint is a 3-D ' +
        'cartesian point along which the disk is swept.',
    },
    {
      id: 'frames',
      label: 'Step 2: Local Frames',
      description:
        'At each waypoint the local reference frame is computed. ' +
        'The Z-axis follows the path tangent; X and Y span the cross-section plane.',
    },
    {
      id: 'solid',
      label: 'Step 3: Swept Solid',
      description:
        'The circular disk (IfcSweptDiskSolid) is extruded along the full path. ' +
        'A non-zero Inner Radius produces a hollow pipe.',
    },
  ],
  pathEditorConfig: {
    defaultPath: DEFAULT_PATH,
    minPoints: 2,
    label: 'Path (waypoints)',
  },
  sweepViewConfig: {
    defaults: { showPath: true, showFrames: false, showResult: true },
  },
  buildGeometry: (
    scene: Scene,
    params: ParamValues,
    stepIndex: number,
    _profile?: IfcProfileDef,
    path?: Vec3[],
    sweepView?: SweepViewState,
  ): Mesh[] => {
    const meshes: Mesh[] = []
    const pts = (path && path.length >= 2) ? path : DEFAULT_PATH
    const radius      = getNumber(params, 'radius')
    const innerRadius = getNumber(params, 'innerRadius')

    const showPath   = sweepView?.showPath   ?? true
    const showFrames = sweepView?.showFrames ?? false
    const showResult = sweepView?.showResult ?? true

    // Step 0+: show path
    if (stepIndex >= 0 && showPath) {
      meshes.push(buildPathLines(scene, pts, 'sweep_path'))
    }

    // Step 1+: show local frames at each waypoint
    if (stepIndex >= 1 && showFrames) {
      meshes.push(...buildPathFrames(scene, pts))
    }

    // Step 2+: show swept solid result
    if (stepIndex >= 2 && showResult) {
      const mat = createSolidMaterial(scene, new Color3(0.3, 0.5, 0.7))
      const solid = {
        type: 'IfcSweptDiskSolid' as const,
        directrix: { type: 'IfcPolyline' as const, points: pts },
        radius,
        ...(innerRadius > 0 ? { innerRadius } : {}),
      }
      meshes.push(buildSweptDiskSolid(scene, solid, mat, 'swept_disk'))
    }

    return meshes
  },
  getIFCRepresentation: (params: ParamValues) => ({
    type: 'IfcSweptDiskSolid',
    directrix: {
      type: 'IfcPolyline',
      points: DEFAULT_PATH.map(p => ({
        type: 'IfcCartesianPoint',
        coordinates: [p.x, p.y, p.z],
      })),
    },
    radius: getNumber(params, 'radius'),
    ...(getNumber(params, 'innerRadius') > 0
      ? { innerRadius: getNumber(params, 'innerRadius') }
      : {}),
  }),
}
