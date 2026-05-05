import { Color3, MeshBuilder } from "@babylonjs/core";
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
import { getNumber } from "../../types.ts";
import { getOrCreateSolidMaterial } from "../../engine/materials.ts";
import { ifcToBabylonVector } from "../../engine/ifc-coordinates.ts";
import type { IfcPolynomialCurve } from "../generated/schema.ts";
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

const COEFFICIENT_AXES = ["x", "y", "z"] as const;
const COEFFICIENT_COUNT = 4;

function buildIfcPolynomialCurve(
  params: ParamValues,
  placement: IfcAxis2Placement3D,
): IfcPolynomialCurve {
  return {
    type: "IfcPolynomialCurve",
    position: toIfcCurvePlacement(placement),
    coefficientsX: [
      getNumber(params, "x0"),
      getNumber(params, "x1"),
      getNumber(params, "x2"),
      getNumber(params, "x3"),
    ],
    coefficientsY: [
      getNumber(params, "y0"),
      getNumber(params, "y1"),
      getNumber(params, "y2"),
      getNumber(params, "y3"),
    ],
    coefficientsZ: [
      getNumber(params, "z0"),
      getNumber(params, "z1"),
      getNumber(params, "z2"),
      getNumber(params, "z3"),
    ],
  };
}

function buildPlacementMarker(scene: Scene, placement: IfcAxis2Placement3D): Mesh {
  const marker = MeshBuilder.CreateSphere(
    "curve_polynomial_origin",
    { diameter: 0.24, segments: 16 },
    scene,
  );
  marker.position = ifcToBabylonVector(placement.location);
  marker.material = getOrCreateSolidMaterial(
    scene,
    "curve_polynomial_origin_material",
    new Color3(1, 0.75, 0.2),
  );
  return marker;
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

function buildCoefficientParameters(): SampleDef["parameters"] {
  const defaults = {
    x: [0, 1, 0, 0],
    y: [0, -0.25, 0, 0.03],
    z: [-3, 0, 0.06, 0],
  } as const;

  return COEFFICIENT_AXES.flatMap((axis) =>
    Array.from({ length: COEFFICIENT_COUNT }, (_value, index) => ({
      key: `${axis}${index}`,
      label: `${axis.toUpperCase()} c${index}`,
      type: "number" as const,
      min: -5,
      max: 5,
      step: 0.01,
      defaultValue: defaults[axis][index],
      group: `Coefficients${axis.toUpperCase()}`,
    })),
  );
}

export const curvePolynomialSample: SampleDef = {
  id: "curve-polynomial",
  title: "Polynomial Curve (IfcPolynomialCurve)",
  description:
    "Inspect an unbounded IfcPolynomialCurve through coefficient sets for X, Y, and Z. " +
    "The standalone view clips the local curve to the origin-centered [-10, 10] display region before applying Position.",
  parameters: buildCoefficientParameters(),
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
  buildGeometry: (
    scene: Scene,
    params: ParamValues,
    _stepIndex: number,
    _profile?: IfcProfileDef,
    _path?: Vec3[],
    _extrusion?: ExtrusionParams,
    placement?: IfcAxis2Placement3D,
    _sweepView?: SweepViewState,
  ): Mesh[] => {
    const activePlacement = placement ?? DEFAULT_CURVE_PLACEMENT;
    const curve = buildIfcPolynomialCurve(params, activePlacement);

    return [
      buildDisplayRegionBox(scene, curve),
      buildPlacementMarker(scene, activePlacement),
      ...buildSupportedCurve(scene, curve, "curve_polynomial_result", {
        curveColor: new Color3(0.35, 0.85, 0.95),
      }),
    ];
  },
  getIFCRepresentation: (params: ParamValues) =>
    buildIfcPolynomialCurve(params, DEFAULT_CURVE_PLACEMENT),
};
