import type {
  IfcCartesianPoint,
  IfcLine,
} from "../generated/schema.ts";
import type { Vec3 } from "../../types.ts";
import type { ResolvedCurveSegment } from "./curve-types.ts";

const EPSILON = 1e-9;

interface LineParameterRange {
  startParameter?: number;
  endParameter?: number;
  senseAgreement?: boolean;
}

export function cartesianPointToVec3(point: IfcCartesianPoint): Vec3 {
  return {
    x: point.coordinates[0] ?? 0,
    y: point.coordinates[1] ?? 0,
    z: point.coordinates[2] ?? 0,
  };
}

function scale(v: Vec3, factor: number): Vec3 {
  return { x: v.x * factor, y: v.y * factor, z: v.z * factor };
}

function add(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

function length(v: Vec3): number {
  return Math.hypot(v.x, v.y, v.z);
}

export function getLineStartPoint(line: IfcLine): Vec3 {
  return cartesianPointToVec3(line.pnt);
}

export function getLineDirection(line: IfcLine): Vec3 {
  const ratios = line.dir.orientation.directionRatios;
  const direction = {
    x: ratios[0] ?? 0,
    y: ratios[1] ?? 0,
    z: ratios[2] ?? 0,
  };
  const directionLength = length(direction);

  if (directionLength < EPSILON) {
    return { x: 0, y: 0, z: 0 };
  }

  return scale(direction, line.dir.magnitude / directionLength);
}

export function pointOnLine(line: IfcLine, parameter: number): Vec3 {
  return add(getLineStartPoint(line), scale(getLineDirection(line), parameter));
}

export function resolveLineCurveSegment(
  line: IfcLine,
  range: LineParameterRange = {},
): ResolvedCurveSegment {
  const startParameter = range.startParameter ?? 0;
  const endParameter = range.endParameter ?? 1;
  const points = [
    pointOnLine(line, startParameter),
    pointOnLine(line, endParameter),
  ];

  return {
    kind: "line",
    points: range.senseAgreement === false ? points.reverse() : points,
  };
}
