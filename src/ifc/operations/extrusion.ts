import {
  MeshBuilder,
  Vector3,
  Color3,
  VertexBuffer,
  VertexData,
} from "@babylonjs/core";
import type { Scene, StandardMaterial, Mesh, LinesMesh } from "@babylonjs/core";
import earcut from "earcut";
import type {
  IfcProfileDef,
  IfcAsymmetricIShapeProfileDef,
  IfcCShapeProfileDef,
  IfcIShapeProfileDef,
  IfcLShapeProfileDef,
  IfcTShapeProfileDef,
  IfcUShapeProfileDef,
  IfcZShapeProfileDef,
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
const FILLET_SEGMENTS = 8;

function isIndexInRange(
  index: number,
  start: number,
  length: number,
): boolean {
  return index >= start && index < start + length;
}

// ── Polygon generators ─────────────────────────────────────────────────────

function circleVec2(radius: number, segments = CIRCLE_SEGMENTS): Vec2[] {
  const pts: Vec2[] = [];
  for (let i = 0; i < segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    pts.push({ x: Math.cos(angle) * radius, y: Math.sin(angle) * radius });
  }
  return pts;
}

function ellipseVec2(
  semiAxis1: number,
  semiAxis2: number,
  segments = CIRCLE_SEGMENTS,
): Vec2[] {
  const pts: Vec2[] = [];
  for (let i = 0; i < segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    pts.push({
      x: Math.cos(angle) * semiAxis1,
      y: Math.sin(angle) * semiAxis2,
    });
  }
  return pts;
}

function roundedRectangleVec2(
  xDim: number,
  yDim: number,
  roundingRadius: number,
): Vec2[] {
  const hw = xDim / 2;
  const hd = yDim / 2;
  const radius = Math.max(0, Math.min(roundingRadius, hw, hd));

  if (radius <= 1e-6) {
    return [
      { x: -hw, y: -hd },
      { x: hw, y: -hd },
      { x: hw, y: hd },
      { x: -hw, y: hd },
    ];
  }

  const pts: Vec2[] = [
    { x: -hw + radius, y: -hd },
    { x: hw - radius, y: -hd },
  ];

  appendArc(pts, hw - radius, -hd + radius, radius, -Math.PI / 2, 0);
  pts.push({ x: hw, y: hd - radius });
  appendArc(pts, hw - radius, hd - radius, radius, 0, Math.PI / 2);
  pts.push({ x: -hw + radius, y: hd });
  appendArc(pts, -hw + radius, hd - radius, radius, Math.PI / 2, Math.PI);
  pts.push({ x: -hw, y: -hd + radius });
  appendArc(
    pts,
    -hw + radius,
    -hd + radius,
    radius,
    Math.PI,
    (3 * Math.PI) / 2,
  );
  // The last arc ends at (-hw + radius, -hd), which matches pts[0].
  pts.pop();

  return ensureCounterClockwise(pts);
}

function polygonSignedArea(pts: Vec2[]): number {
  let area = 0;
  for (let i = 0; i < pts.length; i++) {
    const current = pts[i];
    const next = pts[(i + 1) % pts.length];
    area += current.x * next.y - next.x * current.y;
  }
  return area / 2;
}

function ensureCounterClockwise(pts: Vec2[]): Vec2[] {
  return polygonSignedArea(pts) >= 0 ? pts : [...pts].reverse();
}

function appendArc(
  pts: Vec2[],
  centerX: number,
  centerY: number,
  radius: number,
  startAngle: number,
  endAngle: number,
  segments = FILLET_SEGMENTS,
): void {
  for (let i = 1; i <= segments; i++) {
    const t = i / segments;
    const angle = startAngle + (endAngle - startAngle) * t;
    pts.push({
      x: centerX + Math.cos(angle) * radius,
      y: centerY + Math.sin(angle) * radius,
    });
  }
}

function cShapeVec2(p: IfcCShapeProfileDef): Vec2[] {
  const hw = p.width / 2;
  const hd = p.depth / 2;
  const thickness = p.wallThickness;
  const maxFilletRadius = Math.max(
    0,
    Math.min(
      p.girth - thickness,
      (p.width - 2 * thickness) / 2,
      (p.depth - 2 * thickness) / 2,
    ),
  );
  const filletRadius = Math.min(p.internalFilletRadius ?? 0, maxFilletRadius);

  if (filletRadius <= 1e-6) {
    return ensureCounterClockwise([
      { x: -hw, y: hd },
      { x: hw, y: hd },
      { x: hw, y: hd - p.girth },
      { x: hw - thickness, y: hd - p.girth },
      { x: hw - thickness, y: hd - thickness },
      { x: -hw + thickness, y: hd - thickness },
      { x: -hw + thickness, y: -hd + thickness },
      { x: hw - thickness, y: -hd + thickness },
      { x: hw - thickness, y: -hd + p.girth },
      { x: hw, y: -hd + p.girth },
      { x: hw, y: -hd },
      { x: -hw, y: -hd },
    ]);
  }

  const rInner = filletRadius;
  const rOuter = rInner + thickness;
  const pts: Vec2[] = [
    { x: -hw + rOuter, y: hd },
    { x: hw - rOuter, y: hd },
  ];

  appendArc(pts, hw - rOuter, hd - rOuter, rOuter, Math.PI / 2, 0);
  pts.push(
    { x: hw, y: hd - p.girth },
    { x: hw - thickness, y: hd - p.girth },
    { x: hw - thickness, y: hd - thickness - rInner },
  );
  appendArc(
    pts,
    hw - thickness - rInner,
    hd - thickness - rInner,
    rInner,
    0,
    Math.PI / 2,
  );
  pts.push({ x: -hw + thickness + rInner, y: hd - thickness });
  appendArc(
    pts,
    -hw + thickness + rInner,
    hd - thickness - rInner,
    rInner,
    Math.PI / 2,
    Math.PI,
  );
  pts.push({ x: -hw + thickness, y: -hd + thickness + rInner });
  appendArc(
    pts,
    -hw + thickness + rInner,
    -hd + thickness + rInner,
    rInner,
    Math.PI,
    (3 * Math.PI) / 2,
  );
  pts.push({ x: hw - thickness - rInner, y: -hd + thickness });
  appendArc(
    pts,
    hw - thickness - rInner,
    -hd + thickness + rInner,
    rInner,
    (3 * Math.PI) / 2,
    2 * Math.PI,
  );
  pts.push(
    { x: hw - thickness, y: -hd + p.girth },
    { x: hw, y: -hd + p.girth },
    { x: hw, y: -hd + rOuter },
  );
  appendArc(pts, hw - rOuter, -hd + rOuter, rOuter, 0, -Math.PI / 2);
  pts.push({ x: -hw + rOuter, y: -hd });
  appendArc(
    pts,
    -hw + rOuter,
    -hd + rOuter,
    rOuter,
    -Math.PI / 2,
    -Math.PI,
  );
  pts.push({ x: -hw, y: hd - rOuter });
  appendArc(
    pts,
    -hw + rOuter,
    hd - rOuter,
    rOuter,
    Math.PI,
    Math.PI / 2,
  );
  // The last arc ends at (-hw + rOuter, hd) which is identical to pts[0]; drop the duplicate.
  pts.pop();

  return ensureCounterClockwise(pts);
}

function iShapeVec2(p: IfcIShapeProfileDef): Vec2[] {
  return asymmetricIShapeVec2({
    type: "IfcAsymmetricIShapeProfileDef",
    profileType: "AREA",
    position: p.position,
    bottomFlangeWidth: p.overallWidth,
    overallDepth: p.overallDepth,
    webThickness: p.webThickness,
    bottomFlangeThickness: p.flangeThickness,
    topFlangeWidth: p.overallWidth,
    topFlangeThickness: p.flangeThickness,
  });
}

function asymmetricIShapeVec2(p: IfcAsymmetricIShapeProfileDef): Vec2[] {
  const halfTopWidth = p.topFlangeWidth / 2;
  const halfBottomWidth = p.bottomFlangeWidth / 2;
  const halfDepth = p.overallDepth / 2;
  const halfWebThickness = p.webThickness / 2;
  const bottomFlangeThickness = p.bottomFlangeThickness;
  const topFlangeThickness = p.topFlangeThickness ?? bottomFlangeThickness;
  return [
    { x: -halfBottomWidth, y: -halfDepth },
    { x: halfBottomWidth, y: -halfDepth },
    { x: halfBottomWidth, y: -halfDepth + bottomFlangeThickness },
    { x: halfWebThickness, y: -halfDepth + bottomFlangeThickness },
    { x: halfWebThickness, y: halfDepth - topFlangeThickness },
    { x: halfTopWidth, y: halfDepth - topFlangeThickness },
    { x: halfTopWidth, y: halfDepth },
    { x: -halfTopWidth, y: halfDepth },
    { x: -halfTopWidth, y: halfDepth - topFlangeThickness },
    { x: -halfWebThickness, y: halfDepth - topFlangeThickness },
    { x: -halfWebThickness, y: -halfDepth + bottomFlangeThickness },
    { x: -halfBottomWidth, y: -halfDepth + bottomFlangeThickness },
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

function tShapeVec2(p: IfcTShapeProfileDef): Vec2[] {
  const hw = p.flangeWidth / 2;
  const hd = p.depth / 2;
  const hweb = p.webThickness / 2;
  const yTop = hd;
  const yFlangeBottom = hd - p.flangeThickness;
  const yBottom = -hd;
  const flangeSpan = Math.max(0, hw - hweb);
  const webHeight = Math.max(0, p.depth - p.flangeThickness);
  const rFillet = Math.min(
    p.filletRadius ?? 0,
    flangeSpan,
    p.flangeThickness,
    webHeight,
  );
  const rFlange = Math.min(
    p.flangeEdgeRadius ?? 0,
    p.flangeThickness,
    Math.max(0, flangeSpan - rFillet),
  );
  const rWeb = Math.min(
    p.webEdgeRadius ?? 0,
    hweb,
    Math.max(0, webHeight - rFillet),
  );

  if (rFillet <= 1e-6 && rFlange <= 1e-6 && rWeb <= 1e-6) {
    return ensureCounterClockwise([
      { x: hw, y: yTop },
      { x: hw, y: yFlangeBottom },
      { x: hweb, y: yFlangeBottom },
      { x: hweb, y: yBottom },
      { x: -hweb, y: yBottom },
      { x: -hweb, y: yFlangeBottom },
      { x: -hw, y: yFlangeBottom },
      { x: -hw, y: yTop },
    ]);
  }

  const pts: Vec2[] = [{ x: hw, y: yTop }];

  if (rFlange > 1e-6) {
    pts.push({ x: hw, y: yFlangeBottom + rFlange });
    appendArc(pts, hw - rFlange, yFlangeBottom + rFlange, rFlange, 0, -Math.PI / 2);
  } else {
    pts.push({ x: hw, y: yFlangeBottom });
  }

  if (rFillet > 1e-6) {
    pts.push({ x: hweb + rFillet, y: yFlangeBottom });
    appendArc(
      pts,
      hweb + rFillet,
      yFlangeBottom - rFillet,
      rFillet,
      Math.PI / 2,
      Math.PI,
    );
  } else {
    pts.push({ x: hweb, y: yFlangeBottom });
  }

  if (rWeb > 1e-6) {
    pts.push({ x: hweb, y: yBottom + rWeb });
    appendArc(pts, hweb - rWeb, yBottom + rWeb, rWeb, 0, -Math.PI / 2);
  } else {
    pts.push({ x: hweb, y: yBottom });
  }

  if (rWeb > 1e-6) {
    pts.push({ x: -hweb + rWeb, y: yBottom });
    appendArc(pts, -hweb + rWeb, yBottom + rWeb, rWeb, -Math.PI / 2, -Math.PI);
  } else {
    pts.push({ x: -hweb, y: yBottom });
  }

  if (rFillet > 1e-6) {
    pts.push({ x: -hweb, y: yFlangeBottom - rFillet });
    appendArc(
      pts,
      -hweb - rFillet,
      yFlangeBottom - rFillet,
      rFillet,
      0,
      Math.PI / 2,
    );
  } else {
    pts.push({ x: -hweb, y: yFlangeBottom });
  }

  if (rFlange > 1e-6) {
    pts.push({ x: -hw + rFlange, y: yFlangeBottom });
    appendArc(
      pts,
      -hw + rFlange,
      yFlangeBottom + rFlange,
      rFlange,
      -Math.PI / 2,
      -Math.PI,
    );
  } else {
    pts.push({ x: -hw, y: yFlangeBottom });
  }

  pts.push({ x: -hw, y: yTop });

  return ensureCounterClockwise(pts);
}

function uShapeVec2(p: IfcUShapeProfileDef): Vec2[] {
  const hd = p.depth / 2;
  const hw = p.flangeWidth / 2;
  const xWeb = -hw + p.webThickness;
  const yTop = hd;
  const yBottom = -hd;
  const yFlangeTop = hd - p.flangeThickness;
  const yFlangeBottom = -hd + p.flangeThickness;
  const horizontalRadiusBudget = Math.max(0, p.flangeWidth - p.webThickness);
  const innerVerticalBudget = Math.max(0, p.depth / 2 - p.flangeThickness);
  const edgeVerticalBudget = Math.max(0, p.flangeThickness);
  const rawInner = Math.max(0, p.filletRadius ?? 0);
  const rawEdge = Math.max(0, p.edgeRadius ?? 0);

  let rEdge = Math.min(
    rawEdge,
    edgeVerticalBudget,
    Math.max(0, horizontalRadiusBudget - rawInner),
  );
  const rInner = Math.min(
    rawInner,
    innerVerticalBudget,
    Math.max(0, horizontalRadiusBudget - rEdge),
  );
  rEdge = Math.min(
    rEdge,
    edgeVerticalBudget,
    Math.max(0, horizontalRadiusBudget - rInner),
  );

  if (rInner <= 1e-6 && rEdge <= 1e-6) {
    return ensureCounterClockwise([
      { x: -hw, y: yTop },
      { x: hw, y: yTop },
      { x: hw, y: yFlangeTop },
      { x: xWeb, y: yFlangeTop },
      { x: xWeb, y: yFlangeBottom },
      { x: hw, y: yFlangeBottom },
      { x: hw, y: yBottom },
      { x: -hw, y: yBottom },
    ]);
  }

  const pts: Vec2[] = [
    { x: -hw, y: yTop },
    { x: hw, y: yTop },
  ];

  if (rEdge > 1e-6) {
    pts.push({ x: hw, y: yFlangeTop + rEdge });
    appendArc(pts, hw - rEdge, yFlangeTop + rEdge, rEdge, 0, -Math.PI / 2);
  } else {
    pts.push({ x: hw, y: yFlangeTop });
  }

  if (rInner > 1e-6) {
    pts.push({ x: xWeb + rInner, y: yFlangeTop });
    appendArc(
      pts,
      xWeb + rInner,
      yFlangeTop - rInner,
      rInner,
      Math.PI / 2,
      Math.PI,
    );
    pts.push({ x: xWeb, y: yFlangeBottom + rInner });
    appendArc(
      pts,
      xWeb + rInner,
      yFlangeBottom + rInner,
      rInner,
      Math.PI,
      (3 * Math.PI) / 2,
    );
  } else {
    pts.push(
      { x: xWeb, y: yFlangeTop },
      { x: xWeb, y: yFlangeBottom },
    );
  }

  if (rEdge > 1e-6) {
    pts.push({ x: hw - rEdge, y: yFlangeBottom });
    appendArc(
      pts,
      hw - rEdge,
      yFlangeBottom - rEdge,
      rEdge,
      Math.PI / 2,
      0,
    );
  } else {
    pts.push({ x: hw, y: yFlangeBottom });
  }

  pts.push(
    { x: hw, y: yBottom },
    { x: -hw, y: yBottom },
  );

  return ensureCounterClockwise(pts);
}

function zShapeVec2(p: IfcZShapeProfileDef): Vec2[] {
  const hd = p.depth / 2;
  const hweb = p.webThickness / 2;
  const hw = p.flangeWidth - hweb;
  const yTop = hd;
  const yBottom = -hd;
  const yBottomFlangeTop = -hd + p.flangeThickness;
  const yTopFlangeBottom = hd - p.flangeThickness;
  const horizontalRadiusBudget = Math.max(0, p.flangeWidth - p.webThickness);
  const innerVerticalBudget = Math.max(0, p.depth - p.flangeThickness);
  const edgeVerticalBudget = Math.max(0, p.flangeThickness);
  const rawInner = Math.max(0, p.filletRadius ?? 0);
  const rawEdge = Math.max(0, p.edgeRadius ?? 0);

  let rEdge = Math.min(
    rawEdge,
    edgeVerticalBudget,
    Math.max(0, horizontalRadiusBudget - rawInner),
  );
  const rInner = Math.min(
    rawInner,
    innerVerticalBudget,
    Math.max(0, horizontalRadiusBudget - rEdge),
  );
  rEdge = Math.min(
    rEdge,
    edgeVerticalBudget,
    Math.max(0, horizontalRadiusBudget - rInner),
  );

  if (rInner <= 1e-6 && rEdge <= 1e-6) {
    return ensureCounterClockwise([
      { x: -hw, y: yTop },
      { x: hweb, y: yTop },
      { x: hweb, y: yBottomFlangeTop },
      { x: hw, y: yBottomFlangeTop },
      { x: hw, y: yBottom },
      { x: -hweb, y: yBottom },
      { x: -hweb, y: yTopFlangeBottom },
      { x: -hw, y: yTopFlangeBottom },
    ]);
  }

  const pts: Vec2[] = [
    { x: -hw, y: yTop },
    { x: hweb, y: yTop },
  ];

  if (rInner > 1e-6) {
    pts.push({ x: hweb, y: yBottomFlangeTop + rInner });
    appendArc(
      pts,
      hweb + rInner,
      yBottomFlangeTop + rInner,
      rInner,
      Math.PI,
      (3 * Math.PI) / 2,
    );
  } else {
    pts.push({ x: hweb, y: yBottomFlangeTop });
  }

  if (rEdge > 1e-6) {
    pts.push({ x: hw - rEdge, y: yBottomFlangeTop });
    appendArc(
      pts,
      hw - rEdge,
      yBottomFlangeTop - rEdge,
      rEdge,
      Math.PI / 2,
      0,
    );
  } else {
    pts.push({ x: hw, y: yBottomFlangeTop });
  }

  pts.push(
    { x: hw, y: yBottom },
    { x: -hweb, y: yBottom },
  );

  if (rInner > 1e-6) {
    pts.push({ x: -hweb, y: yTopFlangeBottom - rInner });
    appendArc(
      pts,
      -hweb - rInner,
      yTopFlangeBottom - rInner,
      rInner,
      0,
      Math.PI / 2,
    );
  } else {
    pts.push({ x: -hweb, y: yTopFlangeBottom });
  }

  if (rEdge > 1e-6) {
    pts.push({ x: -hw + rEdge, y: yTopFlangeBottom });
    appendArc(
      pts,
      -hw + rEdge,
      yTopFlangeBottom + rEdge,
      rEdge,
      (3 * Math.PI) / 2,
      Math.PI,
    );
  } else {
    pts.push({ x: -hw, y: yTopFlangeBottom });
  }

  return ensureCounterClockwise(pts);
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
    case "IfcRoundedRectangleProfileDef":
      return roundedRectangleVec2(
        profile.xDim,
        profile.yDim,
        profile.roundingRadius,
      );
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
    case "IfcEllipseProfileDef":
      return ellipseVec2(profile.semiAxis1, profile.semiAxis2);
    case "IfcCircleHollowProfileDef":
      return circleVec2(profile.radius);
    case "IfcCShapeProfileDef":
      return cShapeVec2(profile);
    case "IfcAsymmetricIShapeProfileDef":
      return asymmetricIShapeVec2(profile);
    case "IfcIShapeProfileDef":
      return iShapeVec2(profile);
    case "IfcLShapeProfileDef":
      return lShapeVec2(profile);
    case "IfcTShapeProfileDef":
      return tShapeVec2(profile);
    case "IfcUShapeProfileDef":
      return uShapeVec2(profile);
    case "IfcZShapeProfileDef":
      return zShapeVec2(profile);
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

  const { origin, zAxis, xAxis } = placement;
  const ifcXAxis = toIfcMathVector(xAxis);
  const ifcZAxis = toIfcMathVector(zAxis);
  const ifcYAxis = Vector3.Cross(ifcZAxis, ifcXAxis).normalize();
  const ifcExtrusionVector = new Vector3(
    extrusionDirection.x * ifcXAxis.x +
      extrusionDirection.y * ifcYAxis.x +
      extrusionDirection.z * ifcZAxis.x,
    extrusionDirection.x * ifcXAxis.y +
      extrusionDirection.y * ifcYAxis.y +
      extrusionDirection.z * ifcZAxis.y,
    extrusionDirection.x * ifcXAxis.z +
      extrusionDirection.y * ifcYAxis.z +
      extrusionDirection.z * ifcZAxis.z,
  );

  const positions = mesh.getVerticesData(VertexBuffer.PositionKind);
  const indices = mesh.getIndices();
  if (!positions || !indices) {
    throw new Error("ExtrudePolygon did not return positions/indices");
  }

  const totalLoopVertexCount =
    profile.outerLoop.length +
    profile.innerLoops.reduce((sum, loop) => sum + loop.length, 0);
  const capVertexCount = totalLoopVertexCount * 2;
  const outerSideVertexCount = profile.outerLoop.length * 4;
  const innerSideRanges = profile.innerLoops.map((loop, holeIndex) => {
    const priorHoleSideVertexCount = profile.innerLoops
      .slice(0, holeIndex)
      .reduce((sum, innerLoop) => sum + innerLoop.length * 4, 0);
    return {
      start: capVertexCount + outerSideVertexCount + priorHoleSideVertexCount,
      length: loop.length * 4,
    };
  });

  // Babylon builds the polygon in local XZ and extrudes along local -Y.
  // Reinterpret those vertices as an IFC swept area in the placement XY plane,
  // then translate each layer along the IFC extrudedDirection.
  for (let i = 0; i < positions.length; i += 3) {
    const localX = positions[i];
    const localY = positions[i + 1];
    const localZ = positions[i + 2];

    const ifcRelative = {
      x:
        localX * ifcXAxis.x +
        localZ * ifcYAxis.x -
        localY * ifcExtrusionVector.x,
      y:
        localX * ifcXAxis.y +
        localZ * ifcYAxis.y -
        localY * ifcExtrusionVector.y,
      z:
        localX * ifcXAxis.z +
        localZ * ifcYAxis.z -
        localY * ifcExtrusionVector.z,
    };
    const babylonRelative = ifcToBabylonVector(ifcRelative);
    positions[i] = babylonRelative.x;
    positions[i + 1] = babylonRelative.y;
    positions[i + 2] = babylonRelative.z;
  }

  // The reinterpretation basis is [placement X, -extrusion, placement Y].
  // After the IFC->Babylon axis swap, its determinant becomes -extrusion.z,
  // so only extrusions with a positive local Z component need winding flipped.
  if (extrusionDirection.z > 0) {
    for (let i = 0; i < indices.length; i += 3) {
      const a = indices[i];
      indices[i] = indices[i + 1];
      indices[i + 1] = a;
    }
    mesh.setIndices(indices);
  }

  // Babylon's hole side quads end up inward-facing for the cavity after the IFC
  // reinterpretation. Flip only those side triangles so interior wall normals
  // point into the void instead of into the surrounding solid.
  for (let i = 0; i < indices.length; i += 3) {
    const i0 = indices[i];
    const i1 = indices[i + 1];
    const i2 = indices[i + 2];
    const isInnerSideTriangle = innerSideRanges.some(
      ({ start, length }) =>
        isIndexInRange(i0, start, length) &&
        isIndexInRange(i1, start, length) &&
        isIndexInRange(i2, start, length),
    );
    if (!isInnerSideTriangle) continue;
    indices[i] = i1;
    indices[i + 1] = i0;
  }
  mesh.setIndices(indices);

  const normals = new Array<number>(positions.length).fill(0);
  VertexData.ComputeNormals(positions, indices, normals, {
    useRightHandedSystem: scene.useRightHandedSystem,
  });
  mesh.setVerticesData(VertexBuffer.PositionKind, positions, false);
  mesh.setVerticesData(VertexBuffer.NormalKind, normals, false);
  mesh.position = ifcToBabylonVector(origin);

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
