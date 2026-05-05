import type {
  IfcAxis2Placement2D,
  IfcAxis2Placement3D,
  IfcClothoid,
} from "../generated/schema.ts";
import {
  normalizePlacement2D,
  normalizePlacement3D,
  type NormalizedPlacement2D,
  type NormalizedPlacement3D,
  type NormalizedVec3,
} from "../normalize.ts";
import type { Vec3 } from "../../types.ts";
import type { ResolvedCurveSegment } from "./curve-types.ts";

export const CLOTHOID_DISPLAY_MIN = -10;
export const CLOTHOID_DISPLAY_MAX = 10;

const DEFAULT_CLOTHOID_SEGMENTS = 256;
const INTEGRATION_STEPS_PER_UNIT = 64;
const EPSILON = 1e-9;

interface ClothoidCurveOptions {
  displayMin?: number;
  displayMax?: number;
  segmentCount?: number;
}

type ClothoidPlacement = IfcAxis2Placement2D | IfcAxis2Placement3D;

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

function requireClothoidConstant(curve: IfcClothoid) {
  if (Math.abs(curve.clothoidConstant) < EPSILON) {
    throw new Error("IfcClothoid requires a non-zero ClothoidConstant");
  }
}

function evaluateLocalPoint(curve: IfcClothoid, parameter: number): Vec3 {
  if (Math.abs(parameter) < EPSILON) {
    return { x: 0, y: 0, z: 0 };
  }

  const a = curve.clothoidConstant;
  const aSquared = a * a;
  const sign = a >= 0 ? 1 : -1;
  const steps = Math.max(
    16,
    Math.ceil(Math.abs(parameter) * INTEGRATION_STEPS_PER_UNIT),
  );
  const ds = parameter / steps;

  let currentS = 0;
  let currentTheta = 0;
  let x = 0;
  let y = 0;

  for (let index = 0; index < steps; index += 1) {
    const dTheta =
      sign * (currentS * ds / aSquared + (ds * ds) / (2 * aSquared));
    const thetaMid = currentTheta + dTheta / 2;

    x += ds * Math.cos(thetaMid);
    y += ds * Math.sin(thetaMid);
    currentTheta += dTheta;
    currentS += ds;
  }

  return { x, y, z: 0 };
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

export function clothoidLocalPointToWorld(
  position: ClothoidPlacement,
  point: Vec3,
): Vec3 {
  switch (position.type) {
    case "IfcAxis2Placement2D":
      return pointOnPlacement2D(normalizePlacement2D(position), point);
    case "IfcAxis2Placement3D":
      return pointOnPlacement3D(normalizePlacement3D(position), point);
    default: {
      const _exhaustive: never = position;
      throw new Error(
        `IfcClothoid position is not supported yet: ${String(_exhaustive)}`,
      );
    }
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

export function resolveClothoidCurveSegments(
  curve: IfcClothoid,
  options: ClothoidCurveOptions = {},
): ResolvedCurveSegment[] {
  requireClothoidConstant(curve);

  const displayMin = options.displayMin ?? CLOTHOID_DISPLAY_MIN;
  const displayMax = options.displayMax ?? CLOTHOID_DISPLAY_MAX;
  const segmentCount = Math.max(
    1,
    options.segmentCount ?? DEFAULT_CLOTHOID_SEGMENTS,
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
    const worldStart = clothoidLocalPointToWorld(curve.position, localStart);
    const worldEnd = clothoidLocalPointToWorld(curve.position, localEnd);
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
