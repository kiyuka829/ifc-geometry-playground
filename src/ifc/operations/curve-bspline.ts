import type { IfcBSplineCurveWithKnots } from "../generated/schema.ts";
import type { Vec3 } from "../../types.ts";
import type { ResolvedCurveSegment } from "./curve-types.ts";

const DEFAULT_BSPLINE_SEGMENTS = 128;
const EPSILON = 1e-9;

export interface BSplineValidationResult {
  valid: boolean;
  errors: string[];
}

export interface BSplineCurveOptions {
  segmentCount?: number;
}

function cartesianPointToVec3(point: { coordinates: number[] }): Vec3 {
  return {
    x: point.coordinates[0] ?? 0,
    y: point.coordinates[1] ?? 0,
    z: point.coordinates[2] ?? 0,
  };
}

function expandKnots(
  knotMultiplicities: readonly number[],
  knots: readonly number[],
): number[] {
  const expanded: number[] = [];
  const count = Math.min(knotMultiplicities.length, knots.length);

  for (let index = 0; index < count; index += 1) {
    const multiplicity = Math.max(0, Math.floor(knotMultiplicities[index]));
    for (let repeat = 0; repeat < multiplicity; repeat += 1) {
      expanded.push(knots[index]);
    }
  }

  return expanded;
}

function interpolateVec3(a: Vec3, b: Vec3, ratio: number): Vec3 {
  return {
    x: a.x + (b.x - a.x) * ratio,
    y: a.y + (b.y - a.y) * ratio,
    z: a.z + (b.z - a.z) * ratio,
  };
}

function evaluateBSpline(
  parameter: number,
  degree: number,
  controlPoints: readonly Vec3[],
  expandedKnots: readonly number[],
): Vec3 {
  const domainLow = degree;
  const domainHigh = expandedKnots.length - 1 - degree;
  const low = expandedKnots[domainLow];
  const high = expandedKnots[domainHigh];
  const clampedParameter = Math.min(Math.max(parameter, 0), 1);
  const knotParameter = low + clampedParameter * (high - low);

  let segment = 0;
  for (let index = domainLow; index < domainHigh; index += 1) {
    if (
      expandedKnots[index] <= knotParameter &&
      knotParameter < expandedKnots[index + 1]
    ) {
      segment = index;
      break;
    }
  }

  if (segment === 0) {
    segment = domainHigh - 1;
  }

  const points = controlPoints.map((point) => ({ ...point }));
  for (let level = 1; level <= degree + 1; level += 1) {
    for (let index = segment; index > segment - degree - 1 + level; index -= 1) {
      const denominator = expandedKnots[index + degree + 1 - level] -
        expandedKnots[index];
      const alpha =
        Math.abs(denominator) < EPSILON
          ? 1
          : (knotParameter - expandedKnots[index]) / denominator;
      points[index] = interpolateVec3(points[index - 1], points[index], alpha);
    }
  }

  return points[segment];
}

export function getBSplineCurveControlPoints(
  curve: IfcBSplineCurveWithKnots,
): Vec3[] {
  return curve.controlPointsList.map(cartesianPointToVec3);
}

export function validateBSplineCurveWithKnots(
  curve: IfcBSplineCurveWithKnots,
): BSplineValidationResult {
  const errors: string[] = [];
  const degree = Math.floor(curve.degree);
  const upKnots = curve.knots.length;
  const upCp = curve.controlPointsList.length - 1;
  const sum = curve.knotMultiplicities.reduce(
    (total, multiplicity) => total + Math.floor(multiplicity),
    0,
  );

  if (curve.knotMultiplicities.length !== curve.knots.length) {
    errors.push(
      "CorrespondingKnotLists: KnotMultiplicities and Knots must have the same number of elements.",
    );
  }

  if (degree < 1) {
    errors.push("ConsistentBSpline: Degree must be at least 1.");
  }
  if (upKnots < 2) {
    errors.push("ConsistentBSpline: at least two distinct knots are required.");
  }
  if (upCp < degree) {
    errors.push(
      "ConsistentBSpline: the upper index on control points must be at least Degree.",
    );
  }
  if (sum !== degree + upCp + 2) {
    errors.push(
      `ConsistentBSpline: sum of KnotMultiplicities must be ${degree + upCp + 2}, got ${sum}.`,
    );
  }

  if (curve.knotMultiplicities.length > 0) {
    const firstMultiplicity = Math.floor(curve.knotMultiplicities[0]);
    if (firstMultiplicity < 1 || firstMultiplicity > degree + 1) {
      errors.push(
        `ConsistentBSpline: first knot multiplicity must be between 1 and ${degree + 1}.`,
      );
    }
  }

  for (let index = 1; index < upKnots; index += 1) {
    const multiplicity = Math.floor(curve.knotMultiplicities[index] ?? 0);
    if (multiplicity < 1) {
      errors.push(
        `ConsistentBSpline: knot multiplicity K${index + 1} must be at least 1.`,
      );
    }
    if (curve.knots[index] <= curve.knots[index - 1]) {
      errors.push(
        `ConsistentBSpline: knot K${index + 1} must be greater than K${index}.`,
      );
    }
    if (index < upKnots - 1 && multiplicity > degree) {
      errors.push(
        `ConsistentBSpline: interior knot multiplicity K${index + 1} must not exceed Degree (${degree}).`,
      );
    }
    if (index === upKnots - 1 && multiplicity > degree + 1) {
      errors.push(
        `ConsistentBSpline: last knot multiplicity must not exceed Degree + 1 (${degree + 1}).`,
      );
    }
  }

  return { valid: errors.length === 0, errors };
}

export function resolveBSplineCurveWithKnotsSegments(
  curve: IfcBSplineCurveWithKnots,
  options: BSplineCurveOptions = {},
): ResolvedCurveSegment[] {
  const validation = validateBSplineCurveWithKnots(curve);
  if (!validation.valid) return [];

  const controlPoints = getBSplineCurveControlPoints(curve);
  const expandedKnots = expandKnots(curve.knotMultiplicities, curve.knots);
  const segmentCount = Math.max(
    1,
    options.segmentCount ?? DEFAULT_BSPLINE_SEGMENTS,
  );

  const points: Vec3[] = [];
  for (let index = 0; index <= segmentCount; index += 1) {
    points.push(
      evaluateBSpline(index / segmentCount, curve.degree, controlPoints, expandedKnots),
    );
  }

  return [{ kind: "curve", points }];
}
