import { Color3 } from "@babylonjs/core";
import type { Mesh, Scene } from "@babylonjs/core";
import type {
  ExtrusionParams,
  IfcAxis2Placement3D,
  IfcProfileDef,
  ParamValues,
  PolynomialCoefficients,
  SampleDef,
  SweepViewState,
  Vec3,
} from "../../types.ts";
import type {
  IfcBSplineCurveWithKnots,
  IfcIndexedPolyCurve,
} from "../generated/schema.ts";
import { getOrCreateSolidMaterial } from "../../engine/materials.ts";
import {
  buildBSplineCurveControlPolygon,
  buildBSplineCurvePointMarkers,
  buildSupportedCurve,
} from "../operations/curve.ts";

const DEFAULT_CONTROL_POINTS: Vec3[] = [
  { x: -4, y: -1.2, z: 0 },
  { x: -2.8, y: 1.4, z: 0.5 },
  { x: -1.3, y: 2, z: 1.2 },
  { x: 0.4, y: -0.8, z: 1.7 },
  { x: 2.2, y: -1.5, z: 2.4 },
  { x: 4, y: 1.1, z: 3 },
];

function toIfcBSplineCurveWithKnots(
  controlPoints: Vec3[],
): IfcBSplineCurveWithKnots {
  return {
    type: "IfcBSplineCurveWithKnots",
    degree: 3,
    controlPointsList: controlPoints.map((point) => ({
      type: "IfcCartesianPoint",
      coordinates: [point.x, point.y, point.z],
    })),
    curveForm: "UNSPECIFIED",
    closedCurve: false,
    selfIntersect: false,
    knotMultiplicities: [4, 1, 1, 4],
    knots: [0, 1, 2, 3],
    knotSpec: "UNSPECIFIED",
  };
}

export const curveBSplineWithKnotsSample: SampleDef = {
  id: "curve-bspline-with-knots",
  title: "B-Spline Curve With Knots (IfcBSplineCurveWithKnots)",
  description:
    "Inspect an IfcBSplineCurveWithKnots through editable control points, knot multiplicities, and distinct knot values.",
  parameters: [],
  steps: [
    {
      id: "curve",
      label: "IfcBSplineCurveWithKnots",
      description:
        "ControlPointsList is shown as vertices, the control polygon joins them with straight lines, and the evaluated B-spline curve is drawn from the expanded knot vector.",
    },
  ],
  bsplineCurveWithKnotsEditorConfig: {
    defaultCurve: toIfcBSplineCurveWithKnots(DEFAULT_CONTROL_POINTS),
    label: "IfcBSplineCurveWithKnots",
  },
  buildGeometry: (
    scene: Scene,
    _params: ParamValues,
    _stepIndex: number,
    _profile?: IfcProfileDef,
    _path?: Vec3[],
    _extrusion?: ExtrusionParams,
    _placement?: IfcAxis2Placement3D,
    _sweepView?: SweepViewState,
    _indexedPolyCurve?: IfcIndexedPolyCurve,
    _polynomialCoefficients?: PolynomialCoefficients,
    bsplineCurve?: IfcBSplineCurveWithKnots,
  ): Mesh[] => {
    const curve =
      bsplineCurve ?? toIfcBSplineCurveWithKnots(DEFAULT_CONTROL_POINTS);
    const markerMaterial = getOrCreateSolidMaterial(
      scene,
      "bspline_control_point_marker",
      new Color3(1, 0.58, 0.18),
    );

    return [
      buildBSplineCurveControlPolygon(scene, curve, "bspline_control_polygon"),
      ...buildBSplineCurvePointMarkers(
        scene,
        curve,
        markerMaterial,
        "bspline_control_point",
      ),
      ...buildSupportedCurve(scene, curve, "bspline_curve", {
        curveColor: new Color3(0.2, 0.88, 0.95),
      }),
    ];
  },
  getIFCRepresentation: () =>
    toIfcBSplineCurveWithKnots(DEFAULT_CONTROL_POINTS),
};
