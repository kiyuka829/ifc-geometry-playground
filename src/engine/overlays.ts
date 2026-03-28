import { Color3, Vector3 } from '@babylonjs/core'
import type { Scene, Mesh } from '@babylonjs/core'
import type { IfcProfileDef } from '../types.ts'
import { buildProfileOutlines } from '../ifc/operations/extrusion.ts'
import { createAxisGizmo, createArrow } from './gizmos.ts'

/** Minimum direction vector length to treat as a valid extrusion direction. */
const MIN_DIRECTION_LENGTH = 0.001

/**
 * Build 3D overlay meshes that represent a profile cross-section in the
 * 3D viewport: profile boundary lines and local placement axes.
 *
 * These overlays replace the removed 2D SVG preview and let users inspect
 * the section geometry directly in the Babylon.js scene.
 *
 * @param scene       Active Babylon.js scene.
 * @param profile     IFC profile definition to visualise.
 * @param namePrefix  Prefix for mesh names (must be unique per call).
 * @param origin      World-space origin of the placement frame (default: world origin).
 * @param axisSize    Length of the rendered placement axes (default: 2).
 * @returns           Array of meshes that should be disposed together with other scene meshes.
 */
export function buildProfileOverlay(
  scene: Scene,
  profile: IfcProfileDef,
  namePrefix: string,
  origin: Vector3 = Vector3.Zero(),
  axisSize = 2,
): Mesh[] {
  const meshes: Mesh[] = []

  const outlines = buildProfileOutlines(scene, profile, namePrefix)
  for (const l of outlines) {
    l.position = origin.clone()
    meshes.push(l as unknown as Mesh)
  }

  meshes.push(createAxisGizmo(scene, origin, axisSize))

  return meshes
}

/**
 * Build a 3D arrow overlay that visualises the extrusion direction vector.
 *
 * The arrow starts at `origin`, points in `direction` (need not be
 * normalised), and has the same length as the extrusion depth so that
 * it lines up with the extruded solid.
 *
 * @param scene     Active Babylon.js scene.
 * @param origin    Base of the arrow in world space.
 * @param direction Extrusion direction vector (normalised internally).
 * @param depth     Extrusion depth — used as the arrow length.
 * @param name      Mesh name (must be unique per call).
 * @returns         Arrow parent mesh, or null if direction vector is negligible.
 */
export function buildExtrusionDirectionOverlay(
  scene: Scene,
  origin: Vector3,
  direction: Vector3,
  depth: number,
  name: string,
): Mesh | null {
  if (direction.length() < MIN_DIRECTION_LENGTH) return null
  return createArrow(scene, origin, direction, depth, new Color3(0.2, 0.9, 0.2), name)
}
