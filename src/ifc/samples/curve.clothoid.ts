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
import { getNumber } from "../../types.ts";
import { ifcToBabylonVector } from "../../engine/ifc-coordinates.ts";
import type {
  IfcClothoid,
  IfcIndexedPolyCurve,
} from "../generated/schema.ts";
import { buildSupportedCurve } from "../operations/curve.ts";
import {
  CLOTHOID_DISPLAY_MAX,
  CLOTHOID_DISPLAY_MIN,
  clothoidLocalPointToWorld,
} from "../operations/curve-clothoid.ts";
import {
  DEFAULT_CURVE_PLACEMENT,
  toIfcCurvePlacement,
} from "./curve.conic.shared.ts";

const DEFAULT_CLOTHOID_CONSTANT = 6;

function buildIfcClothoid(
  clothoidConstant: number,
  placement: IfcAxis2Placement3D,
): IfcClothoid {
  return {
    type: "IfcClothoid",
    position: toIfcCurvePlacement(placement),
    clothoidConstant,
  };
}

function buildDisplayRegionBox(scene: Scene, curve: IfcClothoid): Mesh {
  const min = CLOTHOID_DISPLAY_MIN;
  const max = CLOTHOID_DISPLAY_MAX;
  const corners: Vec3[] = [
    { x: min, y: min, z: min },
    { x: max, y: min, z: min },
    { x: max, y: max, z: min },
    { x: min, y: max, z: min },
    { x: min, y: min, z: max },
    { x: max, y: min, z: max },
    { x: max, y: max, z: max },
    { x: min, y: max, z: max },
  ].map((point) => clothoidLocalPointToWorld(curve.position, point));
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
    "curve_clothoid_display_region",
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

export const curveClothoidSample: SampleDef = {
  id: "curve-clothoid",
  title: "Clothoid (IfcClothoid)",
  description:
    "Inspect an unbounded IfcClothoid within the origin-centered [-10, 10] local display region before applying Position.",
  parameters: [
    {
      key: "clothoidConstant",
      label: "Clothoid Constant",
      type: "number",
      min: 1,
      max: 20,
      step: 0.1,
      defaultValue: DEFAULT_CLOTHOID_CONSTANT,
    },
  ],
  steps: [
    {
      id: "curve",
      label: "IfcClothoid",
      description:
        "The clothoid is sampled in a local origin-centered range, clipped to the local X/Y/Z display box, then transformed by Position.",
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
    _indexedPolyCurve?: IfcIndexedPolyCurve,
    _coefficients?: PolynomialCoefficients,
  ): Mesh[] => {
    const activePlacement = placement ?? DEFAULT_CURVE_PLACEMENT;
    const clothoidConstant = getNumber(params, "clothoidConstant");
    const curve = buildIfcClothoid(clothoidConstant, activePlacement);

    return [
      buildDisplayRegionBox(scene, curve),
      ...buildSupportedCurve(scene, curve, "curve_clothoid_result", {
        curveColor: new Color3(0.36, 0.78, 0.42),
      }),
    ];
  },
  getIFCRepresentation: (params: ParamValues) =>
    buildIfcClothoid(
      getNumber(params, "clothoidConstant"),
      DEFAULT_CURVE_PLACEMENT,
    ),
};
