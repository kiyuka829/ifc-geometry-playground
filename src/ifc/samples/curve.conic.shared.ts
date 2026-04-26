import type { IfcAxis2Placement3D, Vec3 } from "../../types.ts";
import type {
  IfcAxis2Placement3D as IfcGeneratedAxis2Placement3D,
  IfcCartesianPoint,
  IfcCircle,
  IfcDirection,
  IfcEllipse,
} from "../generated/schema.ts";
import { normalizePlacement3D } from "../normalize.ts";

export const DEFAULT_CURVE_PLACEMENT: IfcAxis2Placement3D = {
  type: "IfcAxis2Placement3D",
  location: { x: 0, y: 0, z: 0 },
  axis: { x: 0, y: 0, z: 1 },
  refDirection: { x: 1, y: 0, z: 0 },
};

export function toIfcDirection(direction: Vec3): IfcDirection {
  return {
    type: "IfcDirection",
    directionRatios: [direction.x, direction.y, direction.z],
  };
}

export function toIfcCurvePlacement(
  placement: IfcAxis2Placement3D,
): IfcGeneratedAxis2Placement3D {
  return {
    type: "IfcAxis2Placement3D",
    location: {
      type: "IfcCartesianPoint",
      coordinates: [
        placement.location.x,
        placement.location.y,
        placement.location.z,
      ],
    },
    ...(placement.axis ? { axis: toIfcDirection(placement.axis) } : {}),
    ...(placement.refDirection
      ? { refDirection: toIfcDirection(placement.refDirection) }
      : {}),
  };
}

export function pointOnPlacement(
  placement: IfcAxis2Placement3D,
  localPoint: { x: number; y: number },
): Vec3 {
  const normalizedPlacement = normalizePlacement3D(toIfcCurvePlacement(placement));
  const yAxis = {
    x:
      normalizedPlacement.zAxis.y * normalizedPlacement.xAxis.z -
      normalizedPlacement.zAxis.z * normalizedPlacement.xAxis.y,
    y:
      normalizedPlacement.zAxis.z * normalizedPlacement.xAxis.x -
      normalizedPlacement.zAxis.x * normalizedPlacement.xAxis.z,
    z:
      normalizedPlacement.zAxis.x * normalizedPlacement.xAxis.y -
      normalizedPlacement.zAxis.y * normalizedPlacement.xAxis.x,
  };

  return {
    x:
      normalizedPlacement.origin.x +
      localPoint.x * normalizedPlacement.xAxis.x +
      localPoint.y * yAxis.x,
    y:
      normalizedPlacement.origin.y +
      localPoint.x * normalizedPlacement.xAxis.y +
      localPoint.y * yAxis.y,
    z:
      normalizedPlacement.origin.z +
      localPoint.x * normalizedPlacement.xAxis.z +
      localPoint.y * yAxis.z,
  };
}

export function pointOnConic(
  placement: IfcAxis2Placement3D,
  semiAxis1: number,
  semiAxis2: number,
  parameter: number,
): Vec3 {
  return pointOnPlacement(placement, {
    x: semiAxis1 * Math.cos(parameter),
    y: semiAxis2 * Math.sin(parameter),
  });
}

export function toIfcCartesianPoint(point: Vec3): IfcCartesianPoint {
  return {
    type: "IfcCartesianPoint",
    coordinates: [point.x, point.y, point.z],
  };
}

export function buildIfcCircle(
  radius: number,
  placement: IfcAxis2Placement3D,
): IfcCircle {
  return {
    type: "IfcCircle",
    position: toIfcCurvePlacement(placement),
    radius,
  };
}

export function buildIfcEllipse(
  semiAxis1: number,
  semiAxis2: number,
  placement: IfcAxis2Placement3D,
): IfcEllipse {
  return {
    type: "IfcEllipse",
    position: toIfcCurvePlacement(placement),
    semiAxis1,
    semiAxis2,
  };
}
