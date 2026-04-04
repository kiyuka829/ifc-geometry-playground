/**
 * Normalization layer: converts generated IFC schema entities into an
 * internal rendering-oriented geometry model that geometry builders consume.
 *
 * Flow:  generated/schema.ts  →  normalize.ts (this file)  →  mesh builders
 */

import type {
  IfcCartesianPoint,
  IfcDirection,
  IfcAxis2Placement2D,
  IfcAxis2Placement3D,
  IfcAreaParameterizedProfileDef,
  IfcExtrudedAreaSolid,
} from './generated/schema.ts'

// ── Internal geometry model ───────────────────────────────────────────────

/** A 2D point in profile-local space. */
export interface NormalizedVec2 { x: number; y: number }

/** A 3D point in world space. */
export interface NormalizedVec3 { x: number; y: number; z: number }

/**
 * A normalized 2D placement with a local origin and a unit X-axis direction.
 * The Y axis is implicitly 90° counter-clockwise from the X axis.
 */
export interface NormalizedPlacement2D {
  origin: NormalizedVec2;
  /** Unit vector along the local X axis. Defaults to (1, 0). */
  xAxis: NormalizedVec2;
}

/**
 * A normalized 3D placement with a local origin, Z axis (normal/extrusion
 * axis), and X axis (reference direction).
 * The Y axis is implicitly Cross(zAxis, xAxis) per the IFC right-hand rule.
 */
export interface NormalizedPlacement3D {
  origin: NormalizedVec3;
  /** Unit vector along the local Z axis. Defaults to (0, 0, 1). */
  zAxis: NormalizedVec3;
  /** Unit vector along the local X axis. Defaults to (1, 0, 0). */
  xAxis: NormalizedVec3;
}

/** A profile normalized into closed planar loops ready for triangulation. */
export interface NormalizedProfile {
  /** Outer boundary polygon (counter-clockwise winding). */
  outerLoop: NormalizedVec2[];
  /** Inner boundary polygons / holes (clockwise winding). */
  innerLoops: NormalizedVec2[][];
}

/** A renderer-friendly extrusion specification. */
export interface NormalizedExtrusion {
  /** Normalized cross-section profile. */
  profile: NormalizedProfile;
  /** 3D placement of the solid's local coordinate system. */
  placement: NormalizedPlacement3D;
  /** Unit vector of the extrusion direction in placement-local space. */
  extrusionDirection: NormalizedVec3;
  /** Length of the extrusion. */
  depth: number;
}

// ── Vector helpers ────────────────────────────────────────────────────────

function dot3(a: NormalizedVec3, b: NormalizedVec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z
}

function cross3(a: NormalizedVec3, b: NormalizedVec3): NormalizedVec3 {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  }
}

function sub3(a: NormalizedVec3, b: NormalizedVec3): NormalizedVec3 {
  return {
    x: a.x - b.x,
    y: a.y - b.y,
    z: a.z - b.z,
  }
}

function scale3(v: NormalizedVec3, scalar: number): NormalizedVec3 {
  return {
    x: v.x * scalar,
    y: v.y * scalar,
    z: v.z * scalar,
  }
}

function magnitude3(v: NormalizedVec3): number {
  return Math.hypot(v.x, v.y, v.z)
}

function normalizeVec3(v: NormalizedVec3, fallback: NormalizedVec3): NormalizedVec3 {
  const len = magnitude3(v)
  if (len < 1e-9) return fallback
  return {
    x: v.x / len,
    y: v.y / len,
    z: v.z / len,
  }
}

function orthogonalizeXAxis(zAxis: NormalizedVec3, candidate: NormalizedVec3): NormalizedVec3 {
  const projected = sub3(candidate, scale3(zAxis, dot3(candidate, zAxis)))
  if (magnitude3(projected) >= 1e-9) {
    return normalizeVec3(projected, { x: 1, y: 0, z: 0 })
  }

  const fallbackSeed = Math.abs(zAxis.x) < 0.9
    ? { x: 1, y: 0, z: 0 }
    : { x: 0, y: 1, z: 0 }
  return normalizeVec3(cross3(fallbackSeed, zAxis), { x: 1, y: 0, z: 0 })
}

// ── Point converters ──────────────────────────────────────────────────────

/** Extract a 2D point from an IfcCartesianPoint (uses coordinates[0..1]). */
export function normalizePoint2(pt: IfcCartesianPoint): NormalizedVec2 {
  return {
    x: pt.coordinates[0] ?? 0,
    y: pt.coordinates[1] ?? 0,
  }
}

/** Extract a 3D point from an IfcCartesianPoint (uses coordinates[0..2]). */
export function normalizePoint3(pt: IfcCartesianPoint): NormalizedVec3 {
  return {
    x: pt.coordinates[0] ?? 0,
    y: pt.coordinates[1] ?? 0,
    z: pt.coordinates[2] ?? 0,
  }
}

// ── Direction converters ──────────────────────────────────────────────────

/** Normalize an IfcDirection to a unit 2D vector (uses directionRatios[0..1]). */
export function normalizeDirection2(dir: IfcDirection): NormalizedVec2 {
  const x = dir.directionRatios[0] ?? 1
  const y = dir.directionRatios[1] ?? 0
  const len = Math.hypot(x, y) || 1
  return { x: x / len, y: y / len }
}

/** Normalize an IfcDirection to a unit 3D vector (uses directionRatios[0..2]). */
export function normalizeDirection3(
  dir: IfcDirection,
  fallback: NormalizedVec3 = { x: 0, y: 0, z: 1 },
): NormalizedVec3 {
  return normalizeVec3({
    x: dir.directionRatios[0] ?? 0,
    y: dir.directionRatios[1] ?? 0,
    z: dir.directionRatios[2] ?? 0,
  }, fallback)
}

// ── Placement converters ──────────────────────────────────────────────────

/** Convert an IfcAxis2Placement2D to a NormalizedPlacement2D. */
export function normalizePlacement2D(p: IfcAxis2Placement2D): NormalizedPlacement2D {
  return {
    origin: normalizePoint2(p.location),
    xAxis: p.refDirection ? normalizeDirection2(p.refDirection) : { x: 1, y: 0 },
  }
}

/** Convert an IfcAxis2Placement3D to a NormalizedPlacement3D. */
export function normalizePlacement3D(p: IfcAxis2Placement3D): NormalizedPlacement3D {
  const zAxis = p.axis
    ? normalizeDirection3(p.axis, { x: 0, y: 0, z: 1 })
    : { x: 0, y: 0, z: 1 }
  const refDirection = p.refDirection
    ? normalizeDirection3(p.refDirection, { x: 1, y: 0, z: 0 })
    : { x: 1, y: 0, z: 0 }

  return {
    origin: normalizePoint3(p.location),
    zAxis,
    xAxis: orthogonalizeXAxis(zAxis, refDirection),
  }
}

/** Return the identity 3D placement (origin at zero, Z up, X right). */
export function defaultPlacement3D(): NormalizedPlacement3D {
  return {
    origin: { x: 0, y: 0, z: 0 },
    zAxis: { x: 0, y: 0, z: 1 },
    xAxis: { x: 1, y: 0, z: 0 },
  }
}

// ── Profile polygon helpers ───────────────────────────────────────────────

const CIRCLE_SEGMENTS = 48
const FILLET_SEGMENTS = 8

function circleLoop(radius: number, segments = CIRCLE_SEGMENTS): NormalizedVec2[] {
  const pts: NormalizedVec2[] = []
  for (let i = 0; i < segments; i++) {
    const angle = (i / segments) * Math.PI * 2
    pts.push({ x: Math.cos(angle) * radius, y: Math.sin(angle) * radius })
  }
  return pts
}

function polygonSignedArea(pts: NormalizedVec2[]): number {
  let area = 0
  for (let i = 0; i < pts.length; i++) {
    const current = pts[i]
    const next = pts[(i + 1) % pts.length]
    area += current.x * next.y - next.x * current.y
  }
  return area / 2
}

function ensureCounterClockwise(pts: NormalizedVec2[]): NormalizedVec2[] {
  return polygonSignedArea(pts) >= 0 ? pts : [...pts].reverse()
}

function appendArc(
  pts: NormalizedVec2[],
  centerX: number,
  centerY: number,
  radius: number,
  startAngle: number,
  endAngle: number,
  segments = FILLET_SEGMENTS,
): void {
  for (let i = 1; i <= segments; i++) {
    const t = i / segments
    const angle = startAngle + (endAngle - startAngle) * t
    pts.push({
      x: centerX + Math.cos(angle) * radius,
      y: centerY + Math.sin(angle) * radius,
    })
  }
}

function cShapeLoop(profile: Extract<IfcAreaParameterizedProfileDef, { type: 'IfcCShapeProfileDef' }>): NormalizedVec2[] {
  const hw = profile.width / 2
  const hd = profile.depth / 2
  const thickness = profile.wallThickness
  const maxFilletRadius = Math.max(
    0,
    Math.min(
      profile.girth - thickness,
      (profile.width - 2 * thickness) / 2,
      (profile.depth - 2 * thickness) / 2,
    ),
  )
  const filletRadius = Math.min(profile.internalFilletRadius ?? 0, maxFilletRadius)

  if (filletRadius <= 1e-6) {
    return ensureCounterClockwise([
      { x: -hw, y: hd },
      { x: hw, y: hd },
      { x: hw, y: hd - profile.girth },
      { x: hw - thickness, y: hd - profile.girth },
      { x: hw - thickness, y: hd - thickness },
      { x: -hw + thickness, y: hd - thickness },
      { x: -hw + thickness, y: -hd + thickness },
      { x: hw - thickness, y: -hd + thickness },
      { x: hw - thickness, y: -hd + profile.girth },
      { x: hw, y: -hd + profile.girth },
      { x: hw, y: -hd },
      { x: -hw, y: -hd },
    ])
  }

  const rInner = filletRadius
  const rOuter = rInner + thickness
  const pts: NormalizedVec2[] = [
    { x: -hw + rOuter, y: hd },
    { x: hw - rOuter, y: hd },
  ]

  appendArc(pts, hw - rOuter, hd - rOuter, rOuter, Math.PI / 2, 0)
  pts.push(
    { x: hw, y: hd - profile.girth },
    { x: hw - thickness, y: hd - profile.girth },
    { x: hw - thickness, y: hd - thickness - rInner },
  )
  appendArc(
    pts,
    hw - thickness - rInner,
    hd - thickness - rInner,
    rInner,
    0,
    Math.PI / 2,
  )
  pts.push({ x: -hw + thickness + rInner, y: hd - thickness })
  appendArc(
    pts,
    -hw + thickness + rInner,
    hd - thickness - rInner,
    rInner,
    Math.PI / 2,
    Math.PI,
  )
  pts.push({ x: -hw + thickness, y: -hd + thickness + rInner })
  appendArc(
    pts,
    -hw + thickness + rInner,
    -hd + thickness + rInner,
    rInner,
    Math.PI,
    (3 * Math.PI) / 2,
  )
  pts.push({ x: hw - thickness - rInner, y: -hd + thickness })
  appendArc(
    pts,
    hw - thickness - rInner,
    -hd + thickness + rInner,
    rInner,
    (3 * Math.PI) / 2,
    2 * Math.PI,
  )
  pts.push(
    { x: hw - thickness, y: -hd + profile.girth },
    { x: hw, y: -hd + profile.girth },
    { x: hw, y: -hd + rOuter },
  )
  appendArc(pts, hw - rOuter, -hd + rOuter, rOuter, 0, -Math.PI / 2)
  pts.push({ x: -hw + rOuter, y: -hd })
  appendArc(
    pts,
    -hw + rOuter,
    -hd + rOuter,
    rOuter,
    -Math.PI / 2,
    -Math.PI,
  )
  pts.push({ x: -hw, y: hd - rOuter })
  appendArc(
    pts,
    -hw + rOuter,
    hd - rOuter,
    rOuter,
    Math.PI,
    Math.PI / 2,
  )

  return ensureCounterClockwise(pts)
}

/**
 * Apply a 2D placement transform to a list of profile-space points.
 * The Y axis is the 90° CCW rotation of the X axis.
 */
function applyPlacement2DToLoop(
  pts: NormalizedVec2[],
  p: NormalizedPlacement2D,
): NormalizedVec2[] {
  const { origin, xAxis } = p
  const yAxis: NormalizedVec2 = { x: -xAxis.y, y: xAxis.x }
  return pts.map(pt => ({
    x: origin.x + pt.x * xAxis.x + pt.y * yAxis.x,
    y: origin.y + pt.x * xAxis.y + pt.y * yAxis.y,
  }))
}

// ── Profile normalization ─────────────────────────────────────────────────

/**
 * Normalize a generated-schema area profile into outer/inner planar loops.
 * The optional 2D placement on the profile is applied to all loop vertices.
 *
 * Supported types: Rectangle, Circle, RectangleHollow, CircleHollow,
 * IShape (symmetric), LShape, CShape.
 * Other parameterized types throw an Error.
 */
export function normalizeProfileDef(profile: IfcAreaParameterizedProfileDef): NormalizedProfile {
  const placement: NormalizedPlacement2D = profile.position
    ? normalizePlacement2D(profile.position)
    : { origin: { x: 0, y: 0 }, xAxis: { x: 1, y: 0 } }

  let outerLoop: NormalizedVec2[]
  let innerLoops: NormalizedVec2[][] = []

  switch (profile.type) {
    case 'IfcRectangleProfileDef': {
      const hw = profile.xDim / 2
      const hd = profile.yDim / 2
      outerLoop = [
        { x: -hw, y: -hd }, { x: hw, y: -hd },
        { x:  hw, y:  hd }, { x: -hw, y:  hd },
      ]
      break
    }

    case 'IfcCircleProfileDef':
      outerLoop = circleLoop(profile.radius)
      break

    case 'IfcRectangleHollowProfileDef': {
      const hw = profile.xDim / 2
      const hd = profile.yDim / 2
      outerLoop = [
        { x: -hw, y: -hd }, { x: hw, y: -hd },
        { x:  hw, y:  hd }, { x: -hw, y:  hd },
      ]
      const ihw = hw - profile.wallThickness
      const ihd = hd - profile.wallThickness
      innerLoops = [[
        { x: -ihw, y: -ihd }, { x: -ihw, y:  ihd },
        { x:  ihw, y:  ihd }, { x:  ihw, y: -ihd },
      ]]
      break
    }

    case 'IfcCircleHollowProfileDef': {
      outerLoop = circleLoop(profile.radius)
      innerLoops = [circleLoop(profile.radius - profile.wallThickness).reverse()]
      break
    }

    case 'IfcCShapeProfileDef':
      outerLoop = cShapeLoop(profile)
      break

    case 'IfcIShapeProfileDef': {
      const hw  = profile.overallWidth / 2
      const hd  = profile.overallDepth / 2
      const htw = profile.webThickness / 2
      const tf  = profile.flangeThickness
      outerLoop = [
        { x: -hw,  y: -hd        },
        { x:  hw,  y: -hd        },
        { x:  hw,  y: -hd + tf   },
        { x:  htw, y: -hd + tf   },
        { x:  htw, y:  hd - tf   },
        { x:  hw,  y:  hd - tf   },
        { x:  hw,  y:  hd        },
        { x: -hw,  y:  hd        },
        { x: -hw,  y:  hd - tf   },
        { x: -htw, y:  hd - tf   },
        { x: -htw, y: -hd + tf   },
        { x: -hw,  y: -hd + tf   },
      ]
      break
    }

    case 'IfcLShapeProfileDef': {
      // Per IFC spec, width is optional; when omitted the L-shape is symmetric
      // (both legs share the same dimension as depth).
      const w  = profile.width ?? profile.depth
      const cx = w / 2
      const cy = profile.depth / 2
      const t  = profile.thickness
      outerLoop = [
        { x: 0 - cx,    y: 0 - cy              },
        { x: w - cx,    y: 0 - cy              },
        { x: w - cx,    y: t - cy              },
        { x: t - cx,    y: t - cy              },
        { x: t - cx,    y: profile.depth - cy  },
        { x: 0 - cx,    y: profile.depth - cy  },
      ]
      break
    }

    default: {
      const unsupported = profile as { type: string }
      throw new Error(
        `Profile type '${unsupported.type}' is not yet supported by the normalization layer`,
      )
    }
  }

  return {
    outerLoop: applyPlacement2DToLoop(outerLoop, placement),
    innerLoops: innerLoops.map(loop => applyPlacement2DToLoop(loop, placement)),
  }
}

// ── Extrusion normalization ───────────────────────────────────────────────

/**
 * Convert a generated-schema IfcExtrudedAreaSolid to a NormalizedExtrusion
 * ready for consumption by a mesh builder.
 */
export function normalizeExtrudedAreaSolid(solid: IfcExtrudedAreaSolid): NormalizedExtrusion {
  return {
    profile: normalizeProfileDef(solid.sweptArea),
    placement: solid.position
      ? normalizePlacement3D(solid.position)
      : defaultPlacement3D(),
    extrusionDirection: normalizeDirection3(solid.extrudedDirection),
    depth: solid.depth,
  }
}
