import { Color3, Vector3 } from "@babylonjs/core";
import type { Scene, Mesh } from "@babylonjs/core";
import type { IfcProfileDef, IfcAxis2Placement3D } from "../types.ts";
import { buildProfileOutlines } from "../ifc/operations/extrusion.ts";
import { createAxisGizmo, createArrow } from "./gizmos.ts";

/** Minimum direction vector length to treat as a valid extrusion direction. */
const MIN_DIRECTION_LENGTH = 0.001;

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
  const meshes: Mesh[] = [];

  const outlines = buildProfileOutlines(scene, profile, namePrefix);
  for (const l of outlines) {
    l.position = origin.clone();
    meshes.push(l as unknown as Mesh);
  }

  meshes.push(createAxisGizmo(scene, origin, axisSize));

  return meshes;
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
  if (direction.length() < MIN_DIRECTION_LENGTH) return null;
  return createArrow(
    scene,
    origin,
    direction,
    depth,
    new Color3(0.2, 0.9, 0.2),
    name,
  );
}

/**
 * Build 3 coloured arrows representing the local coordinate frame defined
 * by an `IfcAxis2Placement3D`.
 *
 * - **Red**  = X axis (RefDirection)
 * - **Green** = Y axis (Axis × RefDirection)
 * - **Blue** = Z axis (Axis)
 *
 * Axis and RefDirection are normalised internally and the Y axis is derived
 * via cross-product so orthogonality is guaranteed.
 */
export function buildPlacementAxesOverlay(
  scene: Scene,
  placement: IfcAxis2Placement3D,
  arrowLength = 3,
): Mesh[] {
  const loc = new Vector3(
    placement.location.x,
    placement.location.y,
    placement.location.z,
  );

  const rawAxis = placement.axis ?? { x: 0, y: 0, z: 1 };
  const rawRef = placement.refDirection ?? { x: 1, y: 0, z: 0 };

  const zAxis = new Vector3(rawAxis.x, rawAxis.y, rawAxis.z).normalize();
  // IFC: X = RefDirection − (RefDirection · Z)Z, then normalise
  const refVec = new Vector3(rawRef.x, rawRef.y, rawRef.z);
  const xAxis = refVec
    .subtract(zAxis.scale(Vector3.Dot(refVec, zAxis)))
    .normalize();
  const yAxis = Vector3.Cross(zAxis, xAxis).normalize();

  const meshes: Mesh[] = [];
  meshes.push(
    createArrow(scene, loc, xAxis, arrowLength, new Color3(1, 0.2, 0.2), "placement_x"),
  );
  meshes.push(
    createArrow(scene, loc, yAxis, arrowLength, new Color3(0.2, 1, 0.2), "placement_y"),
  );
  meshes.push(
    createArrow(scene, loc, zAxis, arrowLength, new Color3(0.3, 0.5, 1), "placement_z"),
  );

  return meshes;
}
