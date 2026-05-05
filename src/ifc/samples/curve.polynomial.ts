import { Color3, MeshBuilder } from "@babylonjs/core";
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
import { ifcToBabylonVector } from "../../engine/ifc-coordinates.ts";
import type {
  IfcIndexedPolyCurve,
  IfcPolynomialCurve,
} from "../generated/schema.ts";
import { buildSupportedCurve } from "../operations/curve.ts";
import {
  POLYNOMIAL_DISPLAY_MAX,
  POLYNOMIAL_DISPLAY_MIN,
  polynomialLocalPointToWorld,
} from "../operations/curve-polynomial.ts";
import {
  DEFAULT_CURVE_PLACEMENT,
  toIfcCurvePlacement,
} from "./curve.conic.shared.ts";

const DEFAULT_POLYNOMIAL_COEFFICIENTS: PolynomialCoefficients = {
  x: [0, 1, 0, 0],
  y: [0, -0.25, 0, 0.03],
  z: [-3, 0, 0.06, 0],
};

function coefficientSet(coefficients: number[]): number[] | undefined {
  return coefficients.length > 0 ? [...coefficients] : undefined;
}

function buildIfcPolynomialCurve(
  coefficients: PolynomialCoefficients,
  placement: IfcAxis2Placement3D,
): IfcPolynomialCurve {
  return {
    type: "IfcPolynomialCurve",
    position: toIfcCurvePlacement(placement),
    coefficientsX: coefficientSet(coefficients.x),
    coefficientsY: coefficientSet(coefficients.y),
    coefficientsZ: coefficientSet(coefficients.z),
  };
}

function buildDisplayRegionBox(
  scene: Scene,
  curve: IfcPolynomialCurve,
): Mesh {
  const min = POLYNOMIAL_DISPLAY_MIN;
  const max = POLYNOMIAL_DISPLAY_MAX;
  const corners: Vec3[] = [
    { x: min, y: min, z: min },
    { x: max, y: min, z: min },
    { x: max, y: max, z: min },
    { x: min, y: max, z: min },
    { x: min, y: min, z: max },
    { x: max, y: min, z: max },
    { x: max, y: max, z: max },
    { x: min, y: max, z: max },
  ].map((point) => polynomialLocalPointToWorld(curve.position, point));
  const edges = [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 0],
    [4, 5],
    [5, 6],
    [6, 7],
    [7, 4],
    [0, 4],
    [1, 5],
    [2, 6],
    [3, 7],
  ] as const;

  const box = MeshBuilder.CreateLineSystem(
    "curve_polynomial_display_region",
    {
      lines: edges.map(([start, end]) => [
        ifcToBabylonVector(corners[start]),
        ifcToBabylonVector(corners[end]),
      ]),
    },
    scene,
  );
  box.color = new Color3(0.45, 0.5, 0.56);
  return box;
}

export const curvePolynomialSample: SampleDef = {
  id: "curve-polynomial",
  title: "Polynomial Curve (IfcPolynomialCurve)",
  description:
    "Inspect an unbounded IfcPolynomialCurve through coefficient sets for X, Y, and Z. " +
    "The standalone view clips the local curve to the origin-centered [-10, 10] display region before applying Position.",
  parameters: [],
  steps: [
    {
      id: "curve",
      label: "IfcPolynomialCurve",
      description:
        "At least two coefficient sets are provided, then the local polynomial curve is displayed within the origin-centered X/Y/Z range and transformed by Position.",
    },
  ],
  placementEditorConfig: {
    defaultPlacement: DEFAULT_CURVE_PLACEMENT,
  },
  polynomialCoefficientEditorConfig: {
    defaultCoefficients: DEFAULT_POLYNOMIAL_COEFFICIENTS,
    label: "Parameters",
    step: 0.01,
  },
  buildGeometry: (
    scene: Scene,
    _params: ParamValues,
    _stepIndex: number,
    _profile?: IfcProfileDef,
    _path?: Vec3[],
    _extrusion?: ExtrusionParams,
    placement?: IfcAxis2Placement3D,
    _sweepView?: SweepViewState,
    _indexedPolyCurve?: IfcIndexedPolyCurve,
    coefficients?: PolynomialCoefficients,
  ): Mesh[] => {
    const activePlacement = placement ?? DEFAULT_CURVE_PLACEMENT;
    const curve = buildIfcPolynomialCurve(
      coefficients ?? DEFAULT_POLYNOMIAL_COEFFICIENTS,
      activePlacement,
    );

    return [
      buildDisplayRegionBox(scene, curve),
      ...buildSupportedCurve(scene, curve, "curve_polynomial_result", {
        curveColor: new Color3(0.35, 0.85, 0.95),
      }),
    ];
  },
  getIFCRepresentation: (_params: ParamValues) =>
    buildIfcPolynomialCurve(
      DEFAULT_POLYNOMIAL_COEFFICIENTS,
      DEFAULT_CURVE_PLACEMENT,
    ),
};
