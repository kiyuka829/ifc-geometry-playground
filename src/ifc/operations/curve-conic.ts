import type {
  IfcCartesianPoint,
  IfcCircle,
  IfcEllipse,
  IfcTrimmedCurve,
} from "../generated/schema.ts";
import {
  normalizePlacement2D,
  normalizePlacement3D,
  type NormalizedPlacement2D,
  type NormalizedPlacement3D,
  type NormalizedVec2,
  type NormalizedVec3,
} from "../normalize.ts";
import type { Vec3 } from "../../types.ts";
import type { CurveSegmentKind, ResolvedCurveSegment } from "./curve-types.ts";

const DEFAULT_CONIC_SEGMENTS = 64;
const EPSILON = 1e-9;
const FULL_CIRCLE_EPSILON = 1e-6;

type ConicCurve = IfcCircle | IfcEllipse;
type TrimmedCurveParameters = Pick<
  IfcTrimmedCurve,
  "trim1" | "trim2" | "senseAgreement" | "masterRepresentation"
>;

function distance(a: Vec3, b: Vec3): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.hypot(dx, dy, dz);
}

function normalizeAngle(angle: number): number {
  const turn = Math.PI * 2;
  let result = angle % turn;
  if (result < 0) result += turn;
  return result;
}

function cartesianPointToVec3(point: IfcCartesianPoint): Vec3 {
  return {
    x: point.coordinates[0] ?? 0,
    y: point.coordinates[1] ?? 0,
    z: point.coordinates[2] ?? 0,
  };
}

function addCurvePoint(points: Vec3[], point: Vec3, removeCoincident = true) {
  const previous = points.at(-1);
  if (!previous || !removeCoincident || distance(previous, point) > EPSILON) {
    points.push(point);
  }
}

function dot2(a: NormalizedVec2, b: NormalizedVec2): number {
  return a.x * b.x + a.y * b.y;
}

function dot3Normalized(a: NormalizedVec3, b: NormalizedVec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

function cross3Normalized(
  a: NormalizedVec3,
  b: NormalizedVec3,
): NormalizedVec3 {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

function pointOnPlacement2D(
  placement: NormalizedPlacement2D,
  point: NormalizedVec2,
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

function localPointOnPlacement3D(
  placement: NormalizedPlacement3D,
  point: NormalizedVec2,
): Vec3 {
  const yAxis = cross3Normalized(placement.zAxis, placement.xAxis);
  return {
    x:
      placement.origin.x +
      point.x * placement.xAxis.x +
      point.y * yAxis.x,
    y:
      placement.origin.y +
      point.x * placement.xAxis.y +
      point.y * yAxis.y,
    z:
      placement.origin.z +
      point.x * placement.xAxis.z +
      point.y * yAxis.z,
  };
}

function pointToPlacement2DLocal(
  placement: NormalizedPlacement2D,
  point: Vec3,
): NormalizedVec2 {
  const yAxis = { x: -placement.xAxis.y, y: placement.xAxis.x };
  const relative = {
    x: point.x - placement.origin.x,
    y: point.y - placement.origin.y,
  };
  return {
    x: dot2(relative, placement.xAxis),
    y: dot2(relative, yAxis),
  };
}

function pointToPlacement3DLocal(
  placement: NormalizedPlacement3D,
  point: Vec3,
): NormalizedVec2 {
  const yAxis = cross3Normalized(placement.zAxis, placement.xAxis);
  const relative = {
    x: point.x - placement.origin.x,
    y: point.y - placement.origin.y,
    z: point.z - placement.origin.z,
  };
  return {
    x: dot3Normalized(relative, placement.xAxis),
    y: dot3Normalized(relative, yAxis),
  };
}

function pointOnConic(curve: ConicCurve, parameter: number): Vec3 {
  const radiusX = curve.type === "IfcCircle" ? curve.radius : curve.semiAxis1;
  const radiusY = curve.type === "IfcCircle" ? curve.radius : curve.semiAxis2;
  const localPoint = {
    x: radiusX * Math.cos(parameter),
    y: radiusY * Math.sin(parameter),
  };

  return curve.position.type === "IfcAxis2Placement2D"
    ? pointOnPlacement2D(normalizePlacement2D(curve.position), localPoint)
    : localPointOnPlacement3D(normalizePlacement3D(curve.position), localPoint);
}

function parameterFromConicPoint(
  curve: ConicCurve,
  point: IfcCartesianPoint,
): number {
  const worldPoint = cartesianPointToVec3(point);
  const localPoint =
    curve.position.type === "IfcAxis2Placement2D"
      ? pointToPlacement2DLocal(normalizePlacement2D(curve.position), worldPoint)
      : pointToPlacement3DLocal(normalizePlacement3D(curve.position), worldPoint);
  const radiusX = curve.type === "IfcCircle" ? curve.radius : curve.semiAxis1;
  const radiusY = curve.type === "IfcCircle" ? curve.radius : curve.semiAxis2;
  return Math.atan2(localPoint.y / radiusY, localPoint.x / radiusX);
}

function sampleConic(
  curve: ConicCurve,
  startParameter: number,
  sweep: number,
  kind: CurveSegmentKind,
): ResolvedCurveSegment {
  const isClosed = Math.abs(Math.abs(sweep) - Math.PI * 2) <= FULL_CIRCLE_EPSILON;
  const segmentCount = isClosed
    ? DEFAULT_CONIC_SEGMENTS
    : Math.max(
        2,
        Math.ceil((Math.abs(sweep) / (Math.PI * 2)) * DEFAULT_CONIC_SEGMENTS),
      );
  const points: Vec3[] = [];

  for (let index = 0; index <= segmentCount; index += 1) {
    const ratio = index / segmentCount;
    addCurvePoint(
      points,
      pointOnConic(curve, startParameter + sweep * ratio),
      !isClosed,
    );
  }

  return { kind, points };
}

function preferredTrimValue(
  trim: (IfcCartesianPoint | number)[],
  masterRepresentation: IfcTrimmedCurve["masterRepresentation"],
): IfcCartesianPoint | number | undefined {
  const parameterValue = trim.find((value) => typeof value === "number");
  const cartesianValue = trim.find((value) => typeof value !== "number");

  if (masterRepresentation === "CARTESIAN") {
    return cartesianValue ?? parameterValue;
  }
  return parameterValue ?? cartesianValue;
}

function trimValueToParameter(
  curve: ConicCurve,
  trim: (IfcCartesianPoint | number)[],
  fallback: number,
  masterRepresentation: IfcTrimmedCurve["masterRepresentation"],
): number {
  const value = preferredTrimValue(trim, masterRepresentation);
  if (typeof value === "number") {
    return value;
  }
  if (value) {
    return parameterFromConicPoint(curve, value);
  }
  return fallback;
}

export function resolveConicCurveSegment(
  curve: ConicCurve,
  trimmed?: TrimmedCurveParameters,
): ResolvedCurveSegment {
  if (!trimmed) {
    return sampleConic(curve, 0, Math.PI * 2, "curve");
  }

  const start = normalizeAngle(
    trimValueToParameter(
      curve,
      trimmed.trim1,
      0,
      trimmed.masterRepresentation,
    ),
  );
  const end = normalizeAngle(
    trimValueToParameter(
      curve,
      trimmed.trim2,
      Math.PI * 2,
      trimmed.masterRepresentation,
    ),
  );

  if (trimmed.senseAgreement) {
    const adjustedEnd = start >= end ? end + Math.PI * 2 : end;
    return sampleConic(curve, start, adjustedEnd - start, "arc");
  }

  const adjustedStart = start <= end ? start + Math.PI * 2 : start;
  return sampleConic(curve, adjustedStart, end - adjustedStart, "arc");
}
