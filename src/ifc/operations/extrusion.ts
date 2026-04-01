import {
  MeshBuilder,
  Matrix,
  Quaternion,
  Vector3,
  Color3,
} from "@babylonjs/core";
import type { Scene, StandardMaterial, Mesh, LinesMesh } from "@babylonjs/core";
import earcut from "earcut";
import type {
  IfcProfileDef,
  IfcIShapeProfileDef,
  IfcLShapeProfileDef,
  Vec2,
} from "../../types.ts";
import {
  normalizeExtrudedAreaSolid,
  type NormalizedExtrusion,
} from "../normalize.ts";
import type { IfcExtrudedAreaSolid as IfcGeneratedExtrudedAreaSolid } from "../generated/schema.ts";
import {
  ifcProfileToBabylonVector,
  ifcToBabylonVector,
  toIfcMathVector,
} from "../../engine/ifc-coordinates.ts";

const CIRCLE_SEGMENTS = 48;

// ── Polygon generators ─────────────────────────────────────────────────────

function circleVec2(radius: number, segments = CIRCLE_SEGMENTS): Vec2[] {
  const pts: Vec2[] = [];
  for (let i = 0; i < segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    pts.push({ x: Math.cos(angle) * radius, y: Math.sin(angle) * radius });
  }
  return pts;
}

function iShapeVec2(p: IfcIShapeProfileDef): Vec2[] {
  const hw = p.overallWidth / 2;
  const hd = p.overallDepth / 2;
  const htw = p.webThickness / 2;
  const tf = p.flangeThickness;
  return [
    { x: -hw, y: -hd },
    { x: hw, y: -hd },
    { x: hw, y: -hd + tf },
    { x: htw, y: -hd + tf },
    { x: htw, y: hd - tf },
    { x: hw, y: hd - tf },
    { x: hw, y: hd },
    { x: -hw, y: hd },
    { x: -hw, y: hd - tf },
    { x: -htw, y: hd - tf },
    { x: -htw, y: -hd + tf },
    { x: -hw, y: -hd + tf },
  ];
}

function lShapeVec2(p: IfcLShapeProfileDef): Vec2[] {
  const w = p.width ?? p.depth;
  const cx = w / 2;
  const cy = p.depth / 2;
  const t = p.thickness;
  return [
    { x: 0 - cx, y: 0 - cy },
    { x: w - cx, y: 0 - cy },
    { x: w - cx, y: t - cy },
    { x: t - cx, y: t - cy },
    { x: t - cx, y: p.depth - cy },
    { x: 0 - cx, y: p.depth - cy },
  ];
}

// ── Public polygon accessors ───────────────────────────────────────────────

/** Outer boundary of any profile as Vec2 list. */
export function profileOuterVec2(profile: IfcProfileDef): Vec2[] {
  switch (profile.type) {
    case "IfcRectangleProfileDef": {
      const hw = profile.xDim / 2,
        hd = profile.yDim / 2;
      return [
        { x: -hw, y: -hd },
        { x: hw, y: -hd },
        { x: hw, y: hd },
        { x: -hw, y: hd },
      ];
    }
    case "IfcRectangleHollowProfileDef": {
      const hw = profile.xDim / 2,
        hd = profile.yDim / 2;
      return [
        { x: -hw, y: -hd },
        { x: hw, y: -hd },
        { x: hw, y: hd },
        { x: -hw, y: hd },
      ];
    }
    case "IfcCircleProfileDef":
      return circleVec2(profile.radius);
    case "IfcCircleHollowProfileDef":
      return circleVec2(profile.radius);
    case "IfcIShapeProfileDef":
      return iShapeVec2(profile);
    case "IfcLShapeProfileDef":
      return lShapeVec2(profile);
    case "IfcArbitraryClosedProfileDef":
    case "IfcArbitraryProfileDefWithVoids":
      return profile.outerCurve;
    default: {
      const unsupported = profile as { type: string };
      throw new Error(
        `profileOuterVec2: unsupported profile type '${unsupported.type}'`,
      );
    }
  }
}

/** Inner boundary polygons (holes) for hollow profiles; empty array for solids. */
export function profileInnerVec2s(profile: IfcProfileDef): Vec2[][] {
  switch (profile.type) {
    case "IfcRectangleHollowProfileDef": {
      const ihw = profile.xDim / 2 - profile.wallThickness;
      const ihd = profile.yDim / 2 - profile.wallThickness;
      return [
        [
          { x: -ihw, y: -ihd },
          { x: -ihw, y: ihd },
          { x: ihw, y: ihd },
          { x: ihw, y: -ihd },
        ],
      ];
    }
    case "IfcCircleHollowProfileDef":
      return [circleVec2(profile.radius - profile.wallThickness).reverse()];
    case "IfcArbitraryProfileDefWithVoids":
      return profile.innerCurves.map((curve) => [...curve].reverse());
    default:
      return [];
  }
}

// ── Outline helpers ────────────────────────────────────────────────────────

function vec2ToV3Closed(pts: Vec2[]): Vector3[] {
  const v = pts.map((p) => ifcProfileToBabylonVector(p));
  if (v.length > 0) v.push(v[0].clone());
  return v;
}

/** Returns one LinesMesh per boundary (outer + each inner hole). */
export function buildProfileOutlines(
  scene: Scene,
  profile: IfcProfileDef,
  namePrefix: string,
): LinesMesh[] {
  const color = new Color3(1, 0.5, 0.1);
  const result: LinesMesh[] = [];

  const outer = MeshBuilder.CreateLines(
    `${namePrefix}_outer`,
    { points: vec2ToV3Closed(profileOuterVec2(profile)) },
    scene,
  );
  outer.color = color;
  result.push(outer);

  profileInnerVec2s(profile).forEach((inner, i) => {
    const line = MeshBuilder.CreateLines(
      `${namePrefix}_inner${i}`,
      { points: vec2ToV3Closed(inner) },
      scene,
    );
    line.color = color;
    result.push(line);
  });

  return result;
}

/** @deprecated Use buildProfileOutlines (returns LinesMesh[]) for hollow-aware outlines. */
export function buildProfileOutline(
  scene: Scene,
  profile: IfcProfileDef,
  name: string,
): LinesMesh {
  return buildProfileOutlines(scene, profile, name)[0];
}

// ── Normalized-model builder ───────────────────────────────────────────────

/**
 * Build an extrusion mesh from a NormalizedExtrusion produced by the
 * normalization layer (src/ifc/normalize.ts).
 *
 * This function accepts the renderer-friendly normalized model directly
 * and is the canonical downstream consumer of the normalization layer.
 */
export function buildExtrusionMeshFromNormalized(
  scene: Scene,
  norm: NormalizedExtrusion,
  material: StandardMaterial,
  name: string,
): Mesh {
  const { profile, placement, extrusionDirection, depth } = norm;

  const shape = profile.outerLoop.map((p) => ifcProfileToBabylonVector(p));
  const holes =
    profile.innerLoops.length > 0
      ? profile.innerLoops.map((inner) =>
          inner.map((p) => ifcProfileToBabylonVector(p)),
        )
      : undefined;

  const mesh = MeshBuilder.ExtrudePolygon(
    name,
    { shape, depth, holes },
    scene,
    earcut,
  );

  // Apply 3D placement and extrusion direction
  const { origin, zAxis, xAxis } = placement;
  mesh.position = ifcToBabylonVector(origin);

  const ifcXAxis = toIfcMathVector(xAxis);
  const ifcZAxis = toIfcMathVector(zAxis);
  // Placement Y = Cross(Z, X) per IFC right-hand rule, so compute in IFC space
  // before converting into Babylon space.
  const ifcYAxis = Vector3.Cross(ifcZAxis, ifcXAxis).normalize();

  // Convert extrusionDirection from placement-local space to world space.
  // extrusionDirection is expressed in the placement's local coordinate system
  // where local (1,0,0) = X, (0,1,0) = Y, (0,0,1) = Z in IFC space.
  const ifcE = new Vector3(
    extrusionDirection.x * ifcXAxis.x +
      extrusionDirection.y * ifcYAxis.x +
      extrusionDirection.z * ifcZAxis.x,
    extrusionDirection.x * ifcXAxis.y +
      extrusionDirection.y * ifcYAxis.y +
      extrusionDirection.z * ifcZAxis.y,
    extrusionDirection.x * ifcXAxis.z +
      extrusionDirection.y * ifcYAxis.z +
      extrusionDirection.z * ifcZAxis.z,
  ).normalize();

  // Build a rotation matrix that maps BJS local axes to world axes such that:
  //   BJS local X → col0: profile X direction (orthogonalised against E)
  //   BJS local Y → col1: negative world extrusion direction (-E), so BJS -Y → E
  //   BJS local Z → col2: profile Y direction (right-hand rule from col0 × col1)
  //
  // This ensures ExtrudePolygon (which extrudes in -Y in BJS local space) produces
  // a solid whose extrusion axis aligns with the IFC extrudedDirection in world space.
  const dot = Vector3.Dot(ifcXAxis, ifcE);
  const ifcCol0 = ifcXAxis.subtract(ifcE.scale(dot)).normalize();
  const ifcCol1 = ifcE.negate();
  const ifcCol2 = Vector3.Cross(ifcCol0, ifcCol1).normalize();

  const col0 = ifcToBabylonVector(ifcCol0);
  const col1 = ifcToBabylonVector(ifcCol1);
  const col2 = ifcToBabylonVector(ifcCol2);

  const rotMatrix = Matrix.FromValues(
    col0.x,
    col1.x,
    col2.x,
    0,
    col0.y,
    col1.y,
    col2.y,
    0,
    col0.z,
    col1.z,
    col2.z,
    0,
    0,
    0,
    0,
    1,
  );
  mesh.rotationQuaternion = Quaternion.FromRotationMatrix(rotMatrix);

  mesh.material = material;
  return mesh;
}

/** Build an extrusion mesh from the generated IFC schema via the normalization layer. */
export function buildExtrusionMesh(
  scene: Scene,
  solid: IfcGeneratedExtrudedAreaSolid,
  material: StandardMaterial,
  name: string,
): Mesh {
  return buildExtrusionMeshFromNormalized(
    scene,
    normalizeExtrudedAreaSolid(solid),
    material,
    name,
  );
}
