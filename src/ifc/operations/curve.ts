import { Color3, Mesh, MeshBuilder } from "@babylonjs/core";
import type { Scene, StandardMaterial } from "@babylonjs/core";
import type {
  IfcCartesianPoint,
  IfcCartesianPointList,
  IfcCircle,
  IfcEllipse,
  IfcIndexedPolyCurve,
  IfcLine,
  IfcPolyline,
  IfcSegmentIndexSelect,
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
import { ifcToBabylonVector } from "../../engine/ifc-coordinates.ts";
import type { Vec3 } from "../../types.ts";

const DEFAULT_ARC_SEGMENTS = 32;
const DEFAULT_CONIC_SEGMENTS = 64;
const EPSILON = 1e-9;
const FULL_CIRCLE_EPSILON = 1e-6;

export type CurveSegmentKind = "line" | "arc" | "curve";
export type IndexedPolyCurveSegmentKind = "line" | "arc";

export interface ResolvedCurveSegment {
  kind: CurveSegmentKind;
  points: Vec3[];
}

export interface IndexedPolyCurveResolvedSegment extends ResolvedCurveSegment {
  kind: IndexedPolyCurveSegmentKind;
  indices: number[];
}

type RenderableCurve =
  | IfcPolyline
  | IfcIndexedPolyCurve
  | IfcCircle
  | IfcEllipse
  | IfcTrimmedCurve
  | IfcLine;

function distance(a: Vec3, b: Vec3): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.hypot(dx, dy, dz);
}

function add(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

function subtract(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

function scale(v: Vec3, factor: number): Vec3 {
  return { x: v.x * factor, y: v.y * factor, z: v.z * factor };
}

function dot(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

function cross(a: Vec3, b: Vec3): Vec3 {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

function length(v: Vec3): number {
  return Math.hypot(v.x, v.y, v.z);
}

function normalize(v: Vec3): Vec3 {
  const len = length(v);
  if (len < EPSILON) return { x: 0, y: 0, z: 0 };
  return scale(v, 1 / len);
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

function pointListToVec3(points: IfcCartesianPointList): Vec3[] {
  return points.coordList.map((coords) => ({
    x: coords[0] ?? 0,
    y: coords[1] ?? 0,
    z: points.type === "IfcCartesianPointList3D" ? (coords[2] ?? 0) : 0,
  }));
}

function buildArc3Point(
  p1: Vec3,
  p2: Vec3,
  p3: Vec3,
  circleSegments = DEFAULT_ARC_SEGMENTS,
): Vec3[] {
  const v1 = subtract(p2, p1);
  const v2 = subtract(p3, p1);
  const crossV = cross(v1, v2);
  const crossLen = length(crossV);

  if (crossLen < EPSILON) {
    return [p1, p2, p3];
  }

  const denom = 2 * dot(crossV, crossV);
  const centerOffset = scale(
    add(
      scale(cross(crossV, v1), dot(v2, v2)),
      scale(cross(v2, crossV), dot(v1, v1)),
    ),
    1 / denom,
  );
  const center = add(p1, centerOffset);
  const radius = distance(center, p1);
  let pointList = [p1, p2, p3];

  while (pointList.length < circleSegments) {
    const nextPoints: Vec3[] = [];
    for (let i = 0; i < pointList.length - 1; i++) {
      const midPoint = scale(add(pointList[i], pointList[i + 1]), 0.5);
      const direction = normalize(subtract(midPoint, center));
      nextPoints.push(pointList[i], add(center, scale(direction, radius)));
    }
    nextPoints.push(pointList[pointList.length - 1]);
    pointList = nextPoints;
  }

  const curve: Vec3[] = [];
  for (const point of pointList) {
    addCurvePoint(curve, point);
  }
  return curve;
}

function indexedPoints(points: Vec3[], indices: readonly number[]): Vec3[] {
  return indices
    .map((index) => points[index - 1])
    .filter((point): point is Vec3 => Boolean(point));
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

function pointOnCircleOrEllipse(
  curve: IfcCircle | IfcEllipse,
  parameter: number,
): Vec3 {
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

function parameterFromCircleOrEllipsePoint(
  curve: IfcCircle | IfcEllipse,
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

function sampleCircleOrEllipse(
  curve: IfcCircle | IfcEllipse,
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
      pointOnCircleOrEllipse(curve, startParameter + sweep * ratio),
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
  curve: IfcCircle | IfcEllipse,
  trim: (IfcCartesianPoint | number)[],
  fallback: number,
  masterRepresentation: IfcTrimmedCurve["masterRepresentation"],
): number {
  const value = preferredTrimValue(trim, masterRepresentation);
  if (typeof value === "number") {
    return value;
  }
  if (value) {
    return parameterFromCircleOrEllipsePoint(curve, value);
  }
  return fallback;
}

function resolveCircleOrEllipseSegment(
  curve: IfcCircle | IfcEllipse,
  trimmed?: Pick<
    IfcTrimmedCurve,
    "trim1" | "trim2" | "senseAgreement" | "masterRepresentation"
  >,
): ResolvedCurveSegment {
  if (!trimmed) {
    return sampleCircleOrEllipse(curve, 0, Math.PI * 2, "curve");
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
    return sampleCircleOrEllipse(curve, start, adjustedEnd - start, "arc");
  }

  const adjustedStart = start <= end ? start + Math.PI * 2 : start;
  return sampleCircleOrEllipse(curve, adjustedStart, end - adjustedStart, "arc");
}

function resolveIndexedPolyCurveSegment(
  controlPoints: Vec3[],
  segment: IfcSegmentIndexSelect,
): IndexedPolyCurveResolvedSegment {
  const sourcePoints = indexedPoints(controlPoints, segment.indices);
  const kind: IndexedPolyCurveSegmentKind =
    segment.type === "IfcArcIndex" ? "arc" : "line";

  return {
    kind,
    indices: [...segment.indices],
    points:
      kind === "arc" && sourcePoints.length === 3
        ? buildArc3Point(sourcePoints[0], sourcePoints[1], sourcePoints[2])
        : sourcePoints,
  };
}

export function getIndexedPolyCurveControlPoints(
  curve: IfcIndexedPolyCurve,
): Vec3[] {
  return pointListToVec3(curve.points);
}

export function resolveIndexedPolyCurveSegments(
  curve: IfcIndexedPolyCurve,
): IndexedPolyCurveResolvedSegment[] {
  const controlPoints = getIndexedPolyCurveControlPoints(curve);
  const segments = curve.segments;

  if (!segments || segments.length === 0) {
    return [
      {
        kind: "line",
        indices: controlPoints.map((_point, index) => index + 1),
        points: controlPoints,
      },
    ];
  }

  return segments.map((segment) =>
    resolveIndexedPolyCurveSegment(controlPoints, segment),
  );
}

export function resolveSupportedCurveSegments(
  curve: RenderableCurve,
): ResolvedCurveSegment[] {
  switch (curve.type) {
    case "IfcPolyline":
      return [
        {
          kind: "line",
          points: curve.points.map(cartesianPointToVec3),
        },
      ];
    case "IfcIndexedPolyCurve":
      return resolveIndexedPolyCurveSegments(curve);
    case "IfcCircle":
      return [resolveCircleOrEllipseSegment(curve)];
    case "IfcEllipse":
      return [resolveCircleOrEllipseSegment(curve)];
    case "IfcTrimmedCurve":
      if (curve.basisCurve.type === "IfcCircle") {
        return [resolveCircleOrEllipseSegment(curve.basisCurve, curve)];
      }
      if (curve.basisCurve.type === "IfcEllipse") {
        return [resolveCircleOrEllipseSegment(curve.basisCurve, curve)];
      }
      throw new Error(
        `IfcTrimmedCurve basis ${curve.basisCurve.type} is not supported yet`,
      );
    case "IfcLine":
      throw new Error(
        "IfcLine is infinite and cannot be rendered without a trimming strategy",
      );
    default: {
      const _exhaustive: never = curve;
      throw new Error(`Curve type is not supported yet: ${String(_exhaustive)}`);
    }
  }
}

export function buildPolylineCurve(
  scene: Scene,
  curve: IfcPolyline,
  name: string,
  color = new Color3(0.2, 0.9, 0.2),
): Mesh {
  if (curve.points.length < 2) {
    return new Mesh(`${name}_empty`, scene);
  }

  const points = curve.points.map((point) =>
    ifcToBabylonVector({
      x: point.coordinates[0] ?? 0,
      y: point.coordinates[1] ?? 0,
      z: point.coordinates[2] ?? 0,
    }),
  );
  const lines = MeshBuilder.CreateLines(name, { points }, scene);
  lines.color = color;
  return lines;
}

export function buildCurvePointMarkers(
  scene: Scene,
  curve: IfcPolyline,
  material: StandardMaterial,
  name: string,
  radius = 0.12,
): Mesh[] {
  return curve.points.map((point, index) => {
    const marker = MeshBuilder.CreateSphere(
      `${name}_${index}`,
      { diameter: radius * 2, segments: 16 },
      scene,
    );
    marker.position = ifcToBabylonVector({
      x: point.coordinates[0] ?? 0,
      y: point.coordinates[1] ?? 0,
      z: point.coordinates[2] ?? 0,
    });
    marker.material = material;
    return marker;
  });
}

export function buildSupportedCurve(
  scene: Scene,
  curve: RenderableCurve,
  name: string,
  options: {
    maxSegments?: number;
    lineColor?: Color3;
    arcColor?: Color3;
    curveColor?: Color3;
  } = {},
): Mesh[] {
  const lineColor = options.lineColor ?? new Color3(0.2, 0.9, 0.2);
  const arcColor = options.arcColor ?? new Color3(1, 0.55, 0.15);
  const curveColor = options.curveColor ?? new Color3(0.25, 0.55, 1);
  const maxSegments = options.maxSegments ?? Number.POSITIVE_INFINITY;
  const segments = resolveSupportedCurveSegments(curve).slice(0, maxSegments);

  return segments.flatMap((segment, index) => {
    if (segment.points.length < 2) return [];

    const points = segment.points.map(ifcToBabylonVector);
    const lines = MeshBuilder.CreateLines(
      `${name}_${segment.kind}_${index}`,
      { points },
      scene,
    );
    lines.color =
      segment.kind === "line"
        ? lineColor
        : segment.kind === "arc"
          ? arcColor
          : curveColor;
    return [lines];
  });
}

export function buildIndexedPolyCurve(
  scene: Scene,
  curve: IfcIndexedPolyCurve,
  name: string,
  options: {
    maxSegments?: number;
    lineColor?: Color3;
    arcColor?: Color3;
  } = {},
): Mesh[] {
  const lineColor = options.lineColor ?? new Color3(0.2, 0.9, 0.2);
  const arcColor = options.arcColor ?? new Color3(1, 0.55, 0.15);
  const maxSegments = options.maxSegments ?? Number.POSITIVE_INFINITY;
  const segments = resolveIndexedPolyCurveSegments(curve).slice(0, maxSegments);

  return segments.flatMap((segment, index) => {
    if (segment.points.length < 2) return [];

    const points = segment.points.map(ifcToBabylonVector);
    const lines = MeshBuilder.CreateLines(
      `${name}_${segment.kind}_${index}`,
      { points },
      scene,
    );
    lines.color = segment.kind === "arc" ? arcColor : lineColor;
    return [lines];
  });
}

export function buildIndexedPolyCurvePointMarkers(
  scene: Scene,
  curve: IfcIndexedPolyCurve,
  material: StandardMaterial,
  name: string,
  radius = 0.12,
): Mesh[] {
  return getIndexedPolyCurveControlPoints(curve).map((point, index) => {
    const marker = MeshBuilder.CreateSphere(
      `${name}_${index}`,
      { diameter: radius * 2, segments: 16 },
      scene,
    );
    marker.position = ifcToBabylonVector(point);
    marker.material = material;
    return marker;
  });
}
