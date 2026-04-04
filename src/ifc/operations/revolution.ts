import { Mesh, Vector3, VertexBuffer, VertexData } from "@babylonjs/core";
import type { Scene, StandardMaterial } from "@babylonjs/core";
import earcut from "earcut";
import {
  normalizeRevolvedAreaSolid,
  type NormalizedPlacement3D,
  type NormalizedProfile,
  type NormalizedRevolution,
  type NormalizedVec2,
  type NormalizedVec3,
} from "../normalize.ts";
import type { IfcRevolvedAreaSolid as IfcGeneratedRevolvedAreaSolid } from "../generated/schema.ts";
import {
  ifcToBabylonVector,
  toIfcMathVector,
} from "../../engine/ifc-coordinates.ts";

const EPSILON = 1e-9;
const FULL_REVOLUTION_EPSILON = 1e-5;
const FULL_CIRCLE_SEGMENTS = 48;

function add3(a: NormalizedVec3, b: NormalizedVec3): NormalizedVec3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
}

function sub3(a: NormalizedVec3, b: NormalizedVec3): NormalizedVec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
}

function scale3(v: NormalizedVec3, scalar: number): NormalizedVec3 {
  return { x: v.x * scalar, y: v.y * scalar, z: v.z * scalar };
}

function dot3(a: NormalizedVec3, b: NormalizedVec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z;
}

function cross3(a: NormalizedVec3, b: NormalizedVec3): NormalizedVec3 {
  return {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
}

function magnitude3(v: NormalizedVec3): number {
  return Math.hypot(v.x, v.y, v.z);
}

function normalize3(
  v: NormalizedVec3,
  fallback: NormalizedVec3 = { x: 0, y: 0, z: 1 },
): NormalizedVec3 {
  const len = magnitude3(v);
  if (len < EPSILON) return fallback;
  return { x: v.x / len, y: v.y / len, z: v.z / len };
}

function vec2ToLocalPoint(v: NormalizedVec2): NormalizedVec3 {
  return { x: v.x, y: v.y, z: 0 };
}

function rotateVectorAroundAxis(
  vector: NormalizedVec3,
  axis: NormalizedVec3,
  angle: number,
): NormalizedVec3 {
  const k = normalize3(axis);
  const cosTheta = Math.cos(angle);
  const sinTheta = Math.sin(angle);
  const parallel = scale3(k, dot3(k, vector) * (1 - cosTheta));
  return add3(
    add3(scale3(vector, cosTheta), scale3(cross3(k, vector), sinTheta)),
    parallel,
  );
}

function rotatePointAroundAxis(
  point: NormalizedVec3,
  axisOrigin: NormalizedVec3,
  axis: NormalizedVec3,
  angle: number,
): NormalizedVec3 {
  const relative = sub3(point, axisOrigin);
  return add3(
    axisOrigin,
    rotateVectorAroundAxis(relative, axis, angle),
  );
}

function getPlacementBasis(placement: NormalizedPlacement3D): {
  xAxis: Vector3;
  yAxis: Vector3;
  zAxis: Vector3;
} {
  const xAxis = toIfcMathVector(placement.xAxis);
  const zAxis = toIfcMathVector(placement.zAxis);
  const yAxis = Vector3.Cross(zAxis, xAxis).normalize();
  return { xAxis, yAxis, zAxis };
}

function localIfcPointToBabylonRelative(
  point: NormalizedVec3,
  placement: NormalizedPlacement3D,
): Vector3 {
  const { xAxis, yAxis, zAxis } = getPlacementBasis(placement);
  return ifcToBabylonVector({
    x: point.x * xAxis.x + point.y * yAxis.x + point.z * zAxis.x,
    y: point.x * xAxis.y + point.y * yAxis.y + point.z * zAxis.y,
    z: point.x * xAxis.z + point.y * yAxis.z + point.z * zAxis.z,
  });
}

function appendOrientedTriangle(
  vertices: NormalizedVec3[],
  indices: number[],
  i0: number,
  i1: number,
  i2: number,
  expectedNormal: NormalizedVec3,
): void {
  const a = vertices[i0];
  const b = vertices[i1];
  const c = vertices[i2];
  const faceNormal = cross3(sub3(b, a), sub3(c, a));
  if (dot3(faceNormal, expectedNormal) < 0) {
    indices.push(i0, i2, i1);
  } else {
    indices.push(i0, i1, i2);
  }
}

function buildProfileTriangulation(profile: NormalizedProfile): {
  points: NormalizedVec2[];
  holeIndices: number[];
  triangleIndices: number[];
} {
  const points = [...profile.outerLoop];
  const holeIndices: number[] = [];

  for (const innerLoop of profile.innerLoops) {
    holeIndices.push(points.length);
    points.push(...innerLoop);
  }

  const flat = points.flatMap((point) => [point.x, point.y]);
  return {
    points,
    holeIndices,
    triangleIndices: earcut(flat, holeIndices, 2),
  };
}

function chooseReferencePoint(
  profile: NormalizedProfile,
  axisOrigin: NormalizedVec3,
  axis: NormalizedVec3,
): NormalizedVec3 | null {
  const loops = [profile.outerLoop, ...profile.innerLoops];
  for (const loop of loops) {
    for (const point of loop) {
      const localPoint = vec2ToLocalPoint(point);
      const relative = sub3(localPoint, axisOrigin);
      const radial = sub3(relative, scale3(axis, dot3(relative, axis)));
      if (magnitude3(radial) >= EPSILON) {
        return localPoint;
      }
    }
  }
  return null;
}

function getRevolutionAngles(angle: number): {
  angles: number[];
  isClosed: boolean;
} {
  const absAngle = Math.abs(angle);
  const isClosed = absAngle >= Math.PI * 2 - FULL_REVOLUTION_EPSILON;
  const segmentCount = Math.max(
    1,
    Math.ceil((absAngle / (Math.PI * 2)) * FULL_CIRCLE_SEGMENTS),
  );

  if (isClosed) {
    return {
      isClosed: true,
      angles: Array.from(
        { length: segmentCount },
        (_, index) => (angle * index) / segmentCount,
      ),
    };
  }

  return {
    isClosed: false,
    angles: Array.from(
      { length: segmentCount + 1 },
      (_, index) => (angle * index) / segmentCount,
    ),
  };
}

function appendLoopSideSurfaces(
  loop: NormalizedVec2[],
  axisOrigin: NormalizedVec3,
  axis: NormalizedVec3,
  angles: number[],
  isClosed: boolean,
  vertices: NormalizedVec3[],
  indices: number[],
): void {
  const ringSpanCount = isClosed ? angles.length : angles.length - 1;
  const closedStep =
    isClosed && angles.length > 1
      ? angles[1] - angles[0]
      : Math.PI * 2;

  for (let pointIndex = 0; pointIndex < loop.length; pointIndex++) {
    const nextPointIndex = (pointIndex + 1) % loop.length;
    const currentPoint = vec2ToLocalPoint(loop[pointIndex]);
    const nextPoint = vec2ToLocalPoint(loop[nextPointIndex]);
    const edge = sub3(nextPoint, currentPoint);
    const outward = normalize3(
      { x: edge.y, y: -edge.x, z: 0 },
      { x: 1, y: 0, z: 0 },
    );

    const stripVertexPairs: Array<[number, number]> = [];
    for (const theta of angles) {
      const currentRotated = rotatePointAroundAxis(
        currentPoint,
        axisOrigin,
        axis,
        theta,
      );
      const nextRotated = rotatePointAroundAxis(
        nextPoint,
        axisOrigin,
        axis,
        theta,
      );
      stripVertexPairs.push([
        vertices.push(currentRotated) - 1,
        vertices.push(nextRotated) - 1,
      ]);
    }

    for (let ringIndex = 0; ringIndex < ringSpanCount; ringIndex++) {
      const nextRingIndex = (ringIndex + 1) % angles.length;
      const [i0, i1] = stripVertexPairs[ringIndex];
      const [i3, i2] = stripVertexPairs[nextRingIndex];
      const nextAngle =
        isClosed && nextRingIndex === 0
          ? angles[ringIndex] + closedStep
          : angles[nextRingIndex];
      const midAngle = (angles[ringIndex] + nextAngle) / 2;
      const expectedNormal = rotateVectorAroundAxis(outward, axis, midAngle);

      appendOrientedTriangle(vertices, indices, i0, i1, i2, expectedNormal);
      appendOrientedTriangle(vertices, indices, i0, i2, i3, expectedNormal);
    }
  }
}

function appendCapSurfaces(
  profile: NormalizedProfile,
  axisOrigin: NormalizedVec3,
  axis: NormalizedVec3,
  angle: number,
  vertices: NormalizedVec3[],
  indices: number[],
): void {
  const referencePoint = chooseReferencePoint(profile, axisOrigin, axis);
  if (!referencePoint) return;

  const radial = sub3(referencePoint, axisOrigin);
  const tangent = normalize3(cross3(axis, radial), { x: 1, y: 0, z: 0 });
  const directionSign = angle < 0 ? -1 : 1;
  const triangulation = buildProfileTriangulation(profile);

  const startBaseIndex = vertices.length;
  for (const point of triangulation.points) {
    vertices.push(vec2ToLocalPoint(point));
  }
  const startExpectedNormal = scale3(tangent, -directionSign);
  for (let i = 0; i < triangulation.triangleIndices.length; i += 3) {
    appendOrientedTriangle(
      vertices,
      indices,
      startBaseIndex + triangulation.triangleIndices[i],
      startBaseIndex + triangulation.triangleIndices[i + 1],
      startBaseIndex + triangulation.triangleIndices[i + 2],
      startExpectedNormal,
    );
  }

  const endBaseIndex = vertices.length;
  for (const point of triangulation.points) {
    vertices.push(
      rotatePointAroundAxis(
        vec2ToLocalPoint(point),
        axisOrigin,
        axis,
        angle,
      ),
    );
  }
  const endExpectedNormal = scale3(
    rotateVectorAroundAxis(tangent, axis, angle),
    directionSign,
  );
  for (let i = 0; i < triangulation.triangleIndices.length; i += 3) {
    appendOrientedTriangle(
      vertices,
      indices,
      endBaseIndex + triangulation.triangleIndices[i],
      endBaseIndex + triangulation.triangleIndices[i + 1],
      endBaseIndex + triangulation.triangleIndices[i + 2],
      endExpectedNormal,
    );
  }
}

export function buildRevolvedAreaSolidMeshFromNormalized(
  scene: Scene,
  revolution: NormalizedRevolution,
  material: StandardMaterial,
  name: string,
): Mesh {
  const vertices: NormalizedVec3[] = [];
  const indices: number[] = [];
  const { profile, placement, axis, angle } = revolution;
  const { angles, isClosed } = getRevolutionAngles(angle);

  appendLoopSideSurfaces(
    profile.outerLoop,
    axis.origin,
    axis.axis,
    angles,
    isClosed,
    vertices,
    indices,
  );

  for (const innerLoop of profile.innerLoops) {
    appendLoopSideSurfaces(
      innerLoop,
      axis.origin,
      axis.axis,
      angles,
      isClosed,
      vertices,
      indices,
    );
  }

  if (!isClosed) {
    appendCapSurfaces(profile, axis.origin, axis.axis, angle, vertices, indices);
  }

  const positions = vertices.flatMap((point) => {
    const transformed = localIfcPointToBabylonRelative(point, placement);
    return [transformed.x, transformed.y, transformed.z];
  });

  const normals = new Array<number>(positions.length).fill(0);
  VertexData.ComputeNormals(positions, indices, normals, {
    useRightHandedSystem: scene.useRightHandedSystem,
  });

  const mesh = new Mesh(name, scene);
  mesh.setVerticesData(VertexBuffer.PositionKind, positions, false);
  mesh.setVerticesData(VertexBuffer.NormalKind, normals, false);
  mesh.setIndices(indices);
  mesh.position = ifcToBabylonVector(placement.origin);
  mesh.material = material;
  return mesh;
}

export function buildRevolvedAreaSolidMesh(
  scene: Scene,
  solid: IfcGeneratedRevolvedAreaSolid,
  material: StandardMaterial,
  name: string,
): Mesh {
  return buildRevolvedAreaSolidMeshFromNormalized(
    scene,
    normalizeRevolvedAreaSolid(solid),
    material,
    name,
  );
}
