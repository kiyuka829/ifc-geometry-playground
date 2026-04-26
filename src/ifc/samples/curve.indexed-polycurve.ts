import { Color3 } from "@babylonjs/core";
import type { Mesh, Scene } from "@babylonjs/core";
import type {
  ExtrusionParams,
  IfcAxis2Placement3D,
  IfcProfileDef,
  ParamValues,
  SampleDef,
  SweepViewState,
  Vec3,
} from "../../types.ts";
import type {
  IfcIndexedPolyCurve,
  IfcSegmentIndexSelect,
} from "../generated/schema.ts";
import { getOrCreateSolidMaterial } from "../../engine/materials.ts";
import {
  buildIndexedPolyCurve,
  buildIndexedPolyCurvePointMarkers,
} from "../operations/curve.ts";

const DEFAULT_INDEXED_POLYCURVE_POINTS: Vec3[] = [
  { x: -4, y: -1, z: 0 },
  { x: -2.2, y: -0.8, z: 0.3 },
  { x: -0.7, y: 1.6, z: 1 },
  { x: 1.1, y: 0.2, z: 1.6 },
  { x: 2.5, y: -0.1, z: 2.4 },
  { x: 4, y: 1.2, z: 3.1 },
];

const DEFAULT_INDEXED_POLYCURVE_SEGMENTS: IfcSegmentIndexSelect[] = [
  { type: "IfcLineIndex" as const, indices: [1, 2] as [number, number] },
  {
    type: "IfcArcIndex" as const,
    indices: [2, 3, 4] as [number, number, number],
  },
  {
    type: "IfcLineIndex" as const,
    indices: [4, 5, 6] as [number, number, ...number[]],
  },
];

function cloneSegment(segment: IfcSegmentIndexSelect): IfcSegmentIndexSelect {
  return segment.type === "IfcArcIndex"
    ? { type: "IfcArcIndex", indices: [...segment.indices] }
    : { type: "IfcLineIndex", indices: [...segment.indices] };
}

function toIfcIndexedPolyCurve(points: Vec3[]): IfcIndexedPolyCurve {
  return {
    type: "IfcIndexedPolyCurve",
    points: {
      type: "IfcCartesianPointList3D",
      coordList: points.map((point) => [point.x, point.y, point.z]),
    },
    segments: DEFAULT_INDEXED_POLYCURVE_SEGMENTS.map(cloneSegment),
    selfIntersect: false,
  };
}

export const curveIndexedPolyCurveSample: SampleDef = {
  id: "curve-indexed-polycurve",
  title: "Indexed PolyCurve (IfcIndexedPolyCurve)",
  description:
    "Inspect an IfcIndexedPolyCurve as a compact point list with segment index " +
    "lists for straight lines and three-point arcs.",
  parameters: [],
  steps: [
    {
      id: "point-list",
      label: "Step 1: Points",
      description:
        "IfcIndexedPolyCurve stores coordinates in an IfcCartesianPointList. " +
        "Segments refer back to these coordinates by 1-based index.",
    },
    {
      id: "segments",
      label: "Step 2: Segments",
      description:
        "Segments choose IfcLineIndex or IfcArcIndex and reference the point " +
        "list by 1-based index. Lines accept two or more indices; arcs use three.",
    },
  ],
  indexedPolyCurveEditorConfig: {
    defaultCurve: toIfcIndexedPolyCurve(DEFAULT_INDEXED_POLYCURVE_POINTS),
    label: "IfcIndexedPolyCurve",
  },
  buildGeometry: (
    scene: Scene,
    _params: ParamValues,
    stepIndex: number,
    _profile?: IfcProfileDef,
    _path?: Vec3[],
    _extrusion?: ExtrusionParams,
    _placement?: IfcAxis2Placement3D,
    _sweepView?: SweepViewState,
    indexedPolyCurve?: IfcIndexedPolyCurve,
  ): Mesh[] => {
    const curve =
      indexedPolyCurve ?? toIfcIndexedPolyCurve(DEFAULT_INDEXED_POLYCURVE_POINTS);
    const markerMaterial = getOrCreateSolidMaterial(
      scene,
      "indexed_polycurve_marker",
      new Color3(0.25, 0.55, 1),
    );

    return [
      ...buildIndexedPolyCurvePointMarkers(
        scene,
        curve,
        markerMaterial,
        "indexed_polycurve_point",
      ),
      ...buildIndexedPolyCurve(scene, curve, "indexed_polycurve", {
        maxSegments: stepIndex >= 1 ? Number.POSITIVE_INFINITY : 0,
      }),
    ];
  },
  getIFCRepresentation: () =>
    toIfcIndexedPolyCurve(DEFAULT_INDEXED_POLYCURVE_POINTS),
};
