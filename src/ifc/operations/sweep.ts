import { MeshBuilder, Vector3, Color3, Mesh } from '@babylonjs/core'
import type { Scene, StandardMaterial } from '@babylonjs/core'
import type { IfcSweptDiskSolid, Vec3 } from '../../types.ts'
import {
  IFC_Y_AXIS,
  IFC_Z_AXIS,
  ifcToBabylonVector,
  toIfcMathVector,
} from '../../engine/ifc-coordinates.ts'

const TUBE_TESSELLATION = 16
const INNER_RADIUS_EPS = 0.001

// ── Builders ─────────────────────────────────────────────────────────────

/**
 * Creates a Babylon.js tube mesh from an IfcSweptDiskSolid.
 * When `innerRadius` is set, two tubes are created (outer and inner) as
 * children of a parent Mesh so that disposal is handled with a single call.
 * `innerRadius` is clamped to `[0, radius - INNER_RADIUS_EPS]` so that
 * invalid configurations (inner >= outer) are silently treated as solid.
 */
export function buildSweptDiskSolid(
  scene: Scene,
  solid: IfcSweptDiskSolid,
  material: StandardMaterial,
  name: string,
): Mesh {
  const path = solid.directrix.points.map((p) => ifcToBabylonVector(p))

  if (path.length < 2) {
    // Degenerate: return an invisible empty mesh
    return new Mesh(`${name}_empty`, scene)
  }

  const parent = new Mesh(name, scene)

  const outerTube = MeshBuilder.CreateTube(`${name}_outer`, {
    path,
    radius: solid.radius,
    tessellation: TUBE_TESSELLATION,
    cap: 3,
    updatable: false,
  }, scene)
  outerTube.material = material
  outerTube.parent = parent

  const clampedInner = solid.innerRadius !== undefined
    ? Math.max(0, Math.min(solid.innerRadius, solid.radius - INNER_RADIUS_EPS))
    : 0

  if (clampedInner > 0) {
    const innerTube = MeshBuilder.CreateTube(`${name}_inner`, {
      path,
      radius: clampedInner,
      tessellation: TUBE_TESSELLATION,
      cap: 3,
      updatable: false,
      sideOrientation: Mesh.BACKSIDE,
    }, scene)
    innerTube.material = material
    innerTube.parent = parent
  }

  return parent
}

/**
 * Creates a LinesMesh visualising the sweep path.
 */
export function buildPathLines(scene: Scene, path: Vec3[], name: string): Mesh {
  if (path.length < 2) return new Mesh(`${name}_empty`, scene)

  const pts = path.map((p) => ifcToBabylonVector(p))
  const lines = MeshBuilder.CreateLines(name, { points: pts }, scene)
  lines.color = new Color3(0.2, 0.9, 0.2)
  return lines
}

/**
 * Creates oriented local-frame gizmos at every waypoint of the path.
 * The tangent axis (blue) follows the path direction at each point;
 * the remaining two axes are constructed from a consistent reference vector
 * so that the frames rotate smoothly along the sweep.
 *
 * Axis colour convention:
 *   red   – local X (side / reference direction)
 *   green – local Y (normal / up within the cross-section plane)
 *   blue  – local Z / tangent (sweep direction)
 */
export function buildPathFrames(scene: Scene, path: Vec3[], size = 0.4): Mesh[] {
  if (path.length < 2) return []

  const pts = path.map((p) => toIfcMathVector(p))

  /** Compute the path tangent at index i using central/forward/backward difference. */
  function tangentAt(i: number): Vector3 {
    if (i === 0) return pts[1].subtract(pts[0]).normalize()
    if (i === pts.length - 1) return pts[i].subtract(pts[i - 1]).normalize()
    return pts[i + 1].subtract(pts[i - 1]).normalize()
  }

  /**
   * Given a tangent, pick a reference "up" that is not nearly parallel to it,
   * then build a full orthonormal frame.
   */
  function frameAt(tangent: Vector3): { xAxis: Vector3; yAxis: Vector3; zAxis: Vector3 } {
    const zAxis = tangent.clone()
    const ref = Math.abs(Vector3.Dot(zAxis, IFC_Z_AXIS)) < 0.9
      ? IFC_Z_AXIS
      : IFC_Y_AXIS
    const xAxis = Vector3.Cross(ref, zAxis).normalize()
    const yAxis = Vector3.Cross(zAxis, xAxis).normalize()
    return { xAxis, yAxis, zAxis }
  }

  return pts.map((origin, i) => {
    const { xAxis, yAxis, zAxis } = frameAt(tangentAt(i))

    const babylonOrigin = ifcToBabylonVector(origin)
    const xEnd = babylonOrigin.add(ifcToBabylonVector(xAxis.scale(size)))
    const yEnd = babylonOrigin.add(ifcToBabylonVector(yAxis.scale(size)))
    const zEnd = babylonOrigin.add(ifcToBabylonVector(zAxis.scale(size)))

    const xLine = MeshBuilder.CreateLines(`frame${i}_x`, { points: [babylonOrigin, xEnd] }, scene)
    xLine.color = new Color3(1, 0, 0)

    const yLine = MeshBuilder.CreateLines(`frame${i}_y`, { points: [babylonOrigin, yEnd] }, scene)
    yLine.color = new Color3(0, 1, 0)

    const zLine = MeshBuilder.CreateLines(`frame${i}_z`, { points: [babylonOrigin, zEnd] }, scene)
    zLine.color = new Color3(0.3, 0.5, 1)

    const parent = new Mesh(`frame${i}`, scene)
    xLine.parent = parent
    yLine.parent = parent
    zLine.parent = parent
    return parent
  })
}
