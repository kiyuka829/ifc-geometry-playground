import { Color3 } from "@babylonjs/core";
import type { Scene, Mesh } from "@babylonjs/core";
import type {
  ExtrusionParams,
  IfcAxis2Placement3D,
  IfcProfileDef,
  ParamValues,
  SampleDef,
  SweepViewState,
  Vec3,
} from "../../types.ts";
import type { IfcCartesianPoint, IfcPolyline } from "../generated/schema.ts";
import { getOrCreateSolidMaterial } from "../../engine/materials.ts";
import { buildCurvePointMarkers, buildPolylineCurve } from "../operations/curve.ts";

const DEFAULT_POLYLINE_PATH: Vec3[] = [
  { x: -4, y: -1, z: 0 },
  { x: -2, y: 1.5, z: 0.8 },
  { x: 0.5, y: 0.5, z: 2.1 },
  { x: 2.2, y: 2.5, z: 2.8 },
  { x: 4, y: -0.5, z: 3.5 },
];

function toCartesianPoint(point: Vec3): IfcCartesianPoint {
  return {
    type: "IfcCartesianPoint",
    coordinates: [point.x, point.y, point.z],
  };
}

function toIfcPolyline(path: Vec3[]): IfcPolyline {
  return {
    type: "IfcPolyline",
    points: path.map(toCartesianPoint),
  };
}

export const curvePolylineSample: SampleDef = {
  id: "curve-polyline",
  title: "Polyline (IfcPolyline)",
  description:
    "Inspect an IfcPolyline as an ordered list of cartesian points. Edit the " +
    "waypoints to see how the directrix used by sweep operations is represented.",
  parameters: [],
  steps: [
    {
      id: "points",
      label: "Step 1: Cartesian Points",
      description:
        "IfcPolyline stores an ordered list of IfcCartesianPoint references. " +
        "Each point contributes one vertex to the curve.",
    },
    {
      id: "segments",
      label: "Step 2: Polyline Segments",
      description:
        "Consecutive points are joined by straight line segments. The curve is " +
        "open unless the final point repeats the first point.",
    },
  ],
  pathEditorConfig: {
    defaultPath: DEFAULT_POLYLINE_PATH,
    minPoints: 2,
    label: "IfcPolyline.Points",
  },
  buildGeometry: (
    scene: Scene,
    _params: ParamValues,
    stepIndex: number,
    _profile?: IfcProfileDef,
    path?: Vec3[],
    _extrusion?: ExtrusionParams,
    _placement?: IfcAxis2Placement3D,
    _sweepView?: SweepViewState,
  ): Mesh[] => {
    const pts = path && path.length >= 2 ? path : DEFAULT_POLYLINE_PATH;
    const curve = toIfcPolyline(pts);
    const markerMaterial = getOrCreateSolidMaterial(scene, "polyline_marker", new Color3(1, 0.55, 0.15));

    const meshes: Mesh[] = [
      ...buildCurvePointMarkers(scene, curve, markerMaterial, "polyline_point"),
    ];

    if (stepIndex >= 1) {
      meshes.push(buildPolylineCurve(scene, curve, "polyline_curve"));
    }

    return meshes;
  },
  getIFCRepresentation: () => toIfcPolyline(DEFAULT_POLYLINE_PATH),
};
