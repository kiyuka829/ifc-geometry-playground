import type { IfcPlacement, IfcPolynomialCurve } from "../generated/schema.ts";
import {
  normalizePlacement2D,
  normalizePlacement3D,
  type NormalizedPlacement2D,
  type NormalizedPlacement3D,
  type NormalizedVec3,
} from "../normalize.ts";
import type { Vec3 } from "../../types.ts";
import type { ResolvedCurveSegment } from "./curve-types.ts";

export const POLYNOMIAL_DISPLAY_MIN = -10;
export const POLYNOMIAL_DISPLAY_MAX = 10;

const DEFAULT_POLYNOMIAL_SEGMENTS = 192;
const EPSILON = 1e-9;

interface PolynomialCurveOptions {
  displayMin?: number;
  displayMax?: number;
  segmentCount?: number;
}

function distance(a: Vec3, b: Vec3): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.hypot(dx, dy, dz);
}

function cross3(a: NormalizedVec3, b: NormalizedVec3): NormalizedVec3 {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

function addCurvePoint(points: Vec3[], point: Vec3, removeCoincident = true) {
  const previous = points.at(-1);
  if (!previous || !removeCoincident || distance(previous, point) > EPSILON) {
    points.push(point);
  }
}

function hasCoefficientSet(coefficients: number[] | undefined): boolean {
  return Array.isArray(coefficients) && coefficients.length > 0;
}

function requirePolynomialCurveCondition(curve: IfcPolynomialCurve) {
  const definedSetCount = [
    curve.coefficientsX,
    curve.coefficientsY,
    curve.coefficientsZ,
  ].filter(hasCoefficientSet).length;

  if (definedSetCount < 2) {
    throw new Error(
      "IfcPolynomialCurve requires at least two coefficient sets among CoefficientsX, CoefficientsY, and CoefficientsZ",
    );
  }
}

function evaluatePolynomial(
  coefficients: number[] | undefined,
  parameter: number,
): number {
  let value = 0;
  for (let index = (coefficients?.length ?? 0) - 1; index >= 0; index -= 1) {
    value = value * parameter + (coefficients?.[index] ?? 0);
  }
  return value;
}

function evaluateLocalPoint(curve: IfcPolynomialCurve, parameter: number): Vec3 {
  return {
    x: evaluatePolynomial(curve.coefficientsX, parameter),
    y: evaluatePolynomial(curve.coefficientsY, parameter),
    z: evaluatePolynomial(curve.coefficientsZ, parameter),
  };
}

function pointOnPlacement2D(
  placement: NormalizedPlacement2D,
  point: Vec3,
): Vec3 {
  const yAxis = { x: -placement.xAxis.y, y: placement.xAxis.x };
  return {
    x:
      placement.origin.x +
      point.x * placement.xAxis.x +
      point.y * yAxis.x,
    y:
      placement.origin.y +
      point.x * placement.xAxis.y +
      point.y * yAxis.y,
    z: 0,
  };
}

function pointOnPlacement3D(
  placement: NormalizedPlacement3D,
  point: Vec3,
): Vec3 {
  const yAxis = cross3(placement.zAxis, placement.xAxis);
  return {
    x:
      placement.origin.x +
      point.x * placement.xAxis.x +
      point.y * yAxis.x +
      point.z * placement.zAxis.x,
    y:
      placement.origin.y +
      point.x * placement.xAxis.y +
      point.y * yAxis.y +
      point.z * placement.zAxis.y,
    z:
      placement.origin.z +
      point.x * placement.xAxis.z +
      point.y * yAxis.z +
      point.z * placement.zAxis.z,
  };
}

export function polynomialLocalPointToWorld(
  position: IfcPlacement,
  point: Vec3,
): Vec3 {
  switch (position.type) {
    case "IfcAxis2Placement2D":
      return pointOnPlacement2D(normalizePlacement2D(position), point);
    case "IfcAxis2Placement3D":
      return pointOnPlacement3D(normalizePlacement3D(position), point);
    default:
      throw new Error(
        `IfcPolynomialCurve position ${position.type} is not supported yet`,
      );
  }
}

function interpolate(a: Vec3, b: Vec3, ratio: number): Vec3 {
  return {
    x: a.x + (b.x - a.x) * ratio,
    y: a.y + (b.y - a.y) * ratio,
    z: a.z + (b.z - a.z) * ratio,
  };
}

function updateClipRange(
  start: number,
  delta: number,
  min: number,
  max: number,
  range: { enter: number; exit: number },
): boolean {
  if (Math.abs(delta) < EPSILON) {
    return start >= min && start <= max;
  }

  let near = (min - start) / delta;
  let far = (max - start) / delta;
  if (near > far) {
    [near, far] = [far, near];
  }

  range.enter = Math.max(range.enter, near);
  range.exit = Math.min(range.exit, far);
  return range.enter <= range.exit;
}

function clipSegmentToBox(
  start: Vec3,
  end: Vec3,
  min: number,
  max: number,
): [Vec3, Vec3] | undefined {
  const range = { enter: 0, exit: 1 };

  if (
    !updateClipRange(start.x, end.x - start.x, min, max, range) ||
    !updateClipRange(start.y, end.y - start.y, min, max, range) ||
    !updateClipRange(start.z, end.z - start.z, min, max, range)
  ) {
    return undefined;
  }

  return [
    interpolate(start, end, range.enter),
    interpolate(start, end, range.exit),
  ];
}

export function resolvePolynomialCurveSegments(
  curve: IfcPolynomialCurve,
  options: PolynomialCurveOptions = {},
): ResolvedCurveSegment[] {
  requirePolynomialCurveCondition(curve);

  const displayMin = options.displayMin ?? POLYNOMIAL_DISPLAY_MIN;
  const displayMax = options.displayMax ?? POLYNOMIAL_DISPLAY_MAX;
  const segmentCount = Math.max(
    1,
    options.segmentCount ?? DEFAULT_POLYNOMIAL_SEGMENTS,
  );
  const delta = (displayMax - displayMin) / segmentCount;

  const localPoints: Vec3[] = [];
  for (let index = 0; index <= segmentCount; index += 1) {
    localPoints.push(evaluateLocalPoint(curve, displayMin + delta * index));
  }

  const segments: ResolvedCurveSegment[] = [];
  let currentPoints: Vec3[] = [];

  for (let index = 0; index < localPoints.length - 1; index += 1) {
    const clipped = clipSegmentToBox(
      localPoints[index],
      localPoints[index + 1],
      displayMin,
      displayMax,
    );

    if (!clipped) {
      if (currentPoints.length >= 2) {
        segments.push({ kind: "curve", points: currentPoints });
      }
      currentPoints = [];
      continue;
    }

    const [localStart, localEnd] = clipped;
    const worldStart = polynomialLocalPointToWorld(curve.position, localStart);
    const worldEnd = polynomialLocalPointToWorld(curve.position, localEnd);
    const previous = currentPoints.at(-1);

    if (previous && distance(previous, worldStart) > EPSILON) {
      if (currentPoints.length >= 2) {
        segments.push({ kind: "curve", points: currentPoints });
      }
      currentPoints = [];
    }

    addCurvePoint(currentPoints, worldStart);
    addCurvePoint(currentPoints, worldEnd);
  }

  if (currentPoints.length >= 2) {
    segments.push({ kind: "curve", points: currentPoints });
  }

  return segments;
}
