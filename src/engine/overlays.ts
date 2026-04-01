import { Color3, Vector3, StandardMaterial } from "@babylonjs/core";
import type { Scene, Mesh } from "@babylonjs/core";
import type { IfcProfileDef, IfcAxis2Placement3D, Vec3 } from "../types.ts";
import { buildProfileOutlines } from "../ifc/operations/extrusion.ts";
import { createIfcAxisGizmo, createArrow } from "./gizmos.ts";
import {
  IFC_X_AXIS,
  IFC_Z_AXIS,
  ifcToBabylonVector,
  toIfcMathVector,
} from "./ifc-coordinates.ts";

/** Minimum direction vector length to treat as a valid extrusion direction. */
const MIN_DIRECTION_LENGTH = 0.001;

/**
 * Dot-product threshold above which two unit vectors are considered nearly
 * parallel.  Used when selecting a world-axis fallback that is least aligned
 * with the local Z axis so that the cross-product yields a stable result.
 */
const NEAR_PARALLEL_DOT_THRESHOLD = 0.9;

// ---------------------------------------------------------------------------
// Placement-axis material cache
// ---------------------------------------------------------------------------
// One set of materials is created per Babylon.js scene and reused across all
// subsequent calls to buildPlacementAxesOverlay for that scene.  Because the
// cache is a WeakMap keyed on the scene object, the entry becomes eligible for
// GC once the scene is disposed and no other code holds a reference to it.
// ---------------------------------------------------------------------------

interface AxisMaterials {
  x: StandardMaterial;
  y: StandardMaterial;
  z: StandardMaterial;
}

const _axisMatCache = new WeakMap<Scene, AxisMaterials>();

function _getPlacementAxisMaterials(scene: Scene): AxisMaterials {
  let mats = _axisMatCache.get(scene);
  if (!mats) {
    const makeMat = (name: string, color: Color3): StandardMaterial => {
      const m = new StandardMaterial(name, scene);
      m.diffuseColor = color;
      m.emissiveColor = color;
      return m;
    };
    mats = {
      x: makeMat("placement_x_mat", new Color3(1, 0.2, 0.2)),
      y: makeMat("placement_y_mat", new Color3(0.2, 1, 0.2)),
      z: makeMat("placement_z_mat", new Color3(0.3, 0.5, 1)),
    };
    _axisMatCache.set(scene, mats);
  }
  return mats;
}

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
  origin: Vec3 = { x: 0, y: 0, z: 0 },
  axisSize = 2,
): Mesh[] {
  const meshes: Mesh[] = [];
  const babylonOrigin = ifcToBabylonVector(origin);

  const outlines = buildProfileOutlines(scene, profile, namePrefix);
  for (const l of outlines) {
    l.position = babylonOrigin.clone();
    meshes.push(l as unknown as Mesh);
  }

  meshes.push(createIfcAxisGizmo(scene, babylonOrigin, axisSize));

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
  origin: Vec3,
  direction: Vec3,
  depth: number,
  name: string,
): Mesh | null {
  const ifcDirection = toIfcMathVector(direction);
  if (ifcDirection.length() < MIN_DIRECTION_LENGTH) return null;
  return createArrow(
    scene,
    ifcToBabylonVector(origin),
    ifcToBabylonVector(direction),
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
  const loc = ifcToBabylonVector(placement.location);

  const rawAxis = placement.axis ?? { x: 0, y: 0, z: 1 };
  const rawRef = placement.refDirection ?? { x: 1, y: 0, z: 0 };

  // Normalise axis; fall back to world Z if near-zero.
  let zAxis = toIfcMathVector(rawAxis);
  if (zAxis.length() < MIN_DIRECTION_LENGTH) {
    zAxis = IFC_Z_AXIS.clone();
  } else {
    zAxis = zAxis.normalize();
  }

  // IFC: X = RefDirection − (RefDirection · Z)Z, then normalise.
  // If RefDirection is parallel to Z (or near-zero), choose a stable fallback.
  const refVec = toIfcMathVector(rawRef);
  const xTemp = refVec.subtract(zAxis.scale(Vector3.Dot(refVec, zAxis)));

  let xAxis: Vector3;
  let yAxis: Vector3;

  if (xTemp.length() >= MIN_DIRECTION_LENGTH) {
    xAxis = xTemp.normalize();
    const yCross = Vector3.Cross(zAxis, xAxis);
    if (yCross.length() >= MIN_DIRECTION_LENGTH) {
      yAxis = yCross.normalize();
    } else {
      // RefDirection nearly collinear with axis — build a robust basis.
      const worldFallback =
        Math.abs(zAxis.z) < NEAR_PARALLEL_DOT_THRESHOLD
          ? IFC_Z_AXIS
          : IFC_X_AXIS;
      xAxis = Vector3.Cross(worldFallback, zAxis).normalize();
      yAxis = Vector3.Cross(zAxis, xAxis).normalize();
    }
  } else {
    // RefDirection parallel to axis or near-zero — build a robust basis.
    const worldFallback =
      Math.abs(zAxis.z) < NEAR_PARALLEL_DOT_THRESHOLD ? IFC_Z_AXIS : IFC_X_AXIS;
    xAxis = Vector3.Cross(worldFallback, zAxis).normalize();
    yAxis = Vector3.Cross(zAxis, xAxis).normalize();
  }

  const mats = _getPlacementAxisMaterials(scene);
  const meshes: Mesh[] = [];
  meshes.push(
    createArrow(
      scene,
      loc,
      ifcToBabylonVector(xAxis),
      arrowLength,
      new Color3(1, 0.2, 0.2),
      "placement_x",
      mats.x,
    ),
  );
  meshes.push(
    createArrow(
      scene,
      loc,
      ifcToBabylonVector(yAxis),
      arrowLength,
      new Color3(0.2, 1, 0.2),
      "placement_y",
      mats.y,
    ),
  );
  meshes.push(
    createArrow(
      scene,
      loc,
      ifcToBabylonVector(zAxis),
      arrowLength,
      new Color3(0.3, 0.5, 1),
      "placement_z",
      mats.z,
    ),
  );

  return meshes;
}
