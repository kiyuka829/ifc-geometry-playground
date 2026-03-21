import { MeshBuilder, Vector3, Color3, Mesh } from '@babylonjs/core'
import type { Scene, StandardMaterial } from '@babylonjs/core'
import type { IfcSweptDiskSolid, Vec3 } from '../schema.ts'
import { createAxisGizmo } from '../../engine/gizmos.ts'

const TUBE_TESSELLATION = 16

// ── Builders ─────────────────────────────────────────────────────────────

/**
 * Creates a Babylon.js tube mesh from an IfcSweptDiskSolid.
 * When `innerRadius` is set, two tubes are created (outer and inner) as
 * children of a parent Mesh so that disposal is handled with a single call.
 */
export function buildSweptDiskSolid(
  scene: Scene,
  solid: IfcSweptDiskSolid,
  material: StandardMaterial,
  name: string,
): Mesh {
  const path = solid.directrix.points.map(p => new Vector3(p.x, p.y, p.z))

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

  if (solid.innerRadius !== undefined && solid.innerRadius > 0) {
    const innerTube = MeshBuilder.CreateTube(`${name}_inner`, {
      path,
      radius: solid.innerRadius,
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
 * Returns it as a plain Mesh so callers can push it into a Mesh[] array.
 */
export function buildPathLines(scene: Scene, path: Vec3[], name: string): Mesh {
  if (path.length < 2) return new Mesh(`${name}_empty`, scene)

  const pts = path.map(p => new Vector3(p.x, p.y, p.z))
  const lines = MeshBuilder.CreateLines(name, { points: pts }, scene)
  lines.color = new Color3(0.2, 0.9, 0.2)
  return lines as unknown as Mesh
}

/**
 * Creates axis gizmos at every waypoint of the path, representing the local
 * reference frames of the sweep at each sample position.
 */
export function buildPathFrames(scene: Scene, path: Vec3[]): Mesh[] {
  return path.map(p =>
    createAxisGizmo(scene, new Vector3(p.x, p.y, p.z), 0.4),
  )
}
