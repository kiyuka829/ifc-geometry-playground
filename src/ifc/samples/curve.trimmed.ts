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
import { getNumber, getSelect } from "../../types.ts";
import type {
  IfcCircle,
  IfcEllipse,
  IfcTrimmedCurve,
} from "../generated/schema.ts";
import {
  buildSupportedCurve,
  resolveSupportedCurveSegments,
} from "../operations/curve.ts";
import { getOrCreateSolidMaterial } from "../../engine/materials.ts";
import { ifcToBabylonVector } from "../../engine/ifc-coordinates.ts";
import {
  buildIfcCircle,
  buildIfcEllipse,
  DEFAULT_CURVE_PLACEMENT,
  pointOnConic,
  toIfcCartesianPoint,
} from "./curve.conic.shared.ts";
const BASIS_CURVE_OPTIONS = ["ELLIPSE", "CIRCLE"] as const;
const TRIM_MODE_OPTIONS = ["PARAMETER", "CARTESIAN"] as const;
const SENSE_OPTIONS = ["SAME", "REVERSE"] as const;

function buildBasisCurve(
  params: ParamValues,
  placement: IfcAxis2Placement3D,
): IfcCircle | IfcEllipse {
  const basis = getSelect(
    params,
    "basisCurve",
    BASIS_CURVE_OPTIONS,
    BASIS_CURVE_OPTIONS[0],
  );
  const radius = getNumber(params, "radius");
  const semiAxis1 = getNumber(params, "semiAxis1");
  const semiAxis2 = getNumber(params, "semiAxis2");

  if (basis === "CIRCLE") {
    return buildIfcCircle(radius, placement);
  }

  return buildIfcEllipse(semiAxis1, semiAxis2, placement);
}

function buildTrimmedCurve(
  params: ParamValues,
  placement: IfcAxis2Placement3D,
): {
  basisCurve: IfcCircle | IfcEllipse;
  trimmedCurve: IfcTrimmedCurve;
  trimPoints: Vec3[];
} {
  const basisCurve = buildBasisCurve(params, placement);
  const startAngle = (getNumber(params, "startAngleDeg") * Math.PI) / 180;
  const endAngle = (getNumber(params, "endAngleDeg") * Math.PI) / 180;
  const trimMode = getSelect(
    params,
    "trimMode",
    TRIM_MODE_OPTIONS,
    TRIM_MODE_OPTIONS[0],
  ) as IfcTrimmedCurve["masterRepresentation"];
  const senseAgreement =
    getSelect(params, "sense", SENSE_OPTIONS, SENSE_OPTIONS[0]) === "SAME";
  const semiAxis1 =
    basisCurve.type === "IfcCircle" ? basisCurve.radius : basisCurve.semiAxis1;
  const semiAxis2 =
    basisCurve.type === "IfcCircle" ? basisCurve.radius : basisCurve.semiAxis2;
  const trimPoints = [
    pointOnConic(placement, semiAxis1, semiAxis2, startAngle),
    pointOnConic(placement, semiAxis1, semiAxis2, endAngle),
  ];

  const trimmedCurve: IfcTrimmedCurve = {
    type: "IfcTrimmedCurve",
    basisCurve,
    trim1:
      trimMode === "CARTESIAN"
        ? [toIfcCartesianPoint(trimPoints[0])]
        : [startAngle],
    trim2:
      trimMode === "CARTESIAN"
        ? [toIfcCartesianPoint(trimPoints[1])]
        : [endAngle],
    senseAgreement,
    masterRepresentation: trimMode,
  };

  return { basisCurve, trimmedCurve, trimPoints };
}

function buildTrimPointMarkers(
  scene: Scene,
  trimPoints: Vec3[],
): Mesh[] {
  const startMaterial = getOrCreateSolidMaterial(
    scene,
    "trimmed_curve_start_marker",
    new Color3(0.25, 0.55, 1),
  );
  const endMaterial = getOrCreateSolidMaterial(
    scene,
    "trimmed_curve_end_marker",
    new Color3(1, 0.55, 0.15),
  );

  return trimPoints.map((point, index) => {
    const marker = MeshBuilder.CreateSphere(
      `trimmed_curve_marker_${index}`,
      { diameter: 0.24, segments: 16 },
      scene,
    );
    marker.position = ifcToBabylonVector(point);
    marker.material = index === 0 ? startMaterial : endMaterial;
    return marker;
  });
}

function buildResultEndMarkers(
  scene: Scene,
  trimmedCurve: IfcTrimmedCurve,
): Mesh[] {
  const segments = resolveSupportedCurveSegments(trimmedCurve);
  const points = segments[0]?.points ?? [];
  if (points.length === 0) return [];

  const material = getOrCreateSolidMaterial(
    scene,
    "trimmed_curve_result_marker",
    new Color3(1, 0.8, 0.2),
  );
  const endpoints = [points[0], points[points.length - 1]];

  return endpoints.map((point, index) => {
    const marker = MeshBuilder.CreateSphere(
      `trimmed_curve_result_endpoint_${index}`,
      { diameter: 0.18, segments: 16 },
      scene,
    );
    marker.position = ifcToBabylonVector(point);
    marker.material = material;
    return marker;
  });
}

export const curveTrimmedSample: SampleDef = {
  id: "curve-trimmed",
  title: "Trimmed Curve (IfcTrimmedCurve)",
  description:
    "Build circular or elliptical arcs by trimming a reusable basis curve. " +
    "Switch between parameter-based and cartesian trimming to inspect how " +
    "IfcTrimmedCurve wraps IfcCircle and IfcEllipse.",
  parameters: [
    {
      key: "basisCurve",
      label: "Basis Curve",
      type: "select",
      options: [
        { value: "ELLIPSE", label: "Ellipse" },
        { value: "CIRCLE", label: "Circle" },
      ],
      defaultValue: "ELLIPSE",
      group: "Basis Curve",
    },
    {
      key: "radius",
      label: "Circle Radius",
      type: "number",
      min: 0.5,
      max: 8,
      step: 0.1,
      defaultValue: 3,
      group: "Basis Parameters",
      visibleWhen: {
        key: "basisCurve",
        equals: "CIRCLE",
      },
    },
    {
      key: "semiAxis1",
      label: "Ellipse Semi-Axis 1",
      type: "number",
      min: 0.5,
      max: 8,
      step: 0.1,
      defaultValue: 4,
      group: "Basis Parameters",
      visibleWhen: {
        key: "basisCurve",
        equals: "ELLIPSE",
      },
    },
    {
      key: "semiAxis2",
      label: "Ellipse Semi-Axis 2",
      type: "number",
      min: 0.5,
      max: 8,
      step: 0.1,
      defaultValue: 2.5,
      group: "Basis Parameters",
      visibleWhen: {
        key: "basisCurve",
        equals: "ELLIPSE",
      },
    },
    {
      key: "trimMode",
      label: "Trim Mode",
      type: "select",
      options: [
        { value: "PARAMETER", label: "Parameter" },
        { value: "CARTESIAN", label: "Cartesian" },
      ],
      defaultValue: "PARAMETER",
      group: "Trim",
    },
    {
      key: "sense",
      label: "Sense",
      type: "select",
      options: [
        { value: "SAME", label: "Same" },
        { value: "REVERSE", label: "Reverse" },
      ],
      defaultValue: "SAME",
      group: "Trim",
    },
    {
      key: "startAngleDeg",
      label: "Start Angle",
      type: "number",
      min: 0,
      max: 360,
      step: 1,
      defaultValue: 25,
      group: "Trim",
    },
    {
      key: "endAngleDeg",
      label: "End Angle",
      type: "number",
      min: 0,
      max: 360,
      step: 1,
      defaultValue: 305,
      group: "Trim",
    },
  ],
  steps: [
    {
      id: "basis-curve",
      label: "Step 1: Basis Curve + Trim Selects",
      description:
        "IfcTrimmedCurve keeps a full IfcCircle or IfcEllipse as its basisCurve. " +
        "The trim arrays then identify where the visible segment should start and end.",
    },
    {
      id: "trimmed-result",
      label: "Step 2: Visible Arc",
      description:
        "senseAgreement chooses whether the curve follows the basis parameter direction " +
        "or the reverse direction between the two trim positions.",
    },
  ],
  placementEditorConfig: {
    defaultPlacement: DEFAULT_CURVE_PLACEMENT,
  },
  buildGeometry: (
    scene: Scene,
    params: ParamValues,
    stepIndex: number,
    _profile?: IfcProfileDef,
    _path?: Vec3[],
    _extrusion?: ExtrusionParams,
    placement?: IfcAxis2Placement3D,
    _sweepView?: SweepViewState,
  ): Mesh[] => {
    const activePlacement = placement ?? DEFAULT_CURVE_PLACEMENT;
    const { basisCurve, trimmedCurve, trimPoints } = buildTrimmedCurve(
      params,
      activePlacement,
    );
    const meshes: Mesh[] = [
      ...buildSupportedCurve(scene, basisCurve, "trimmed_curve_basis", {
        curveColor: new Color3(0.55, 0.6, 0.7),
      }),
      ...buildTrimPointMarkers(scene, trimPoints),
    ];

    if (stepIndex >= 1) {
      meshes.push(
        ...buildSupportedCurve(scene, trimmedCurve, "trimmed_curve_result", {
          curveColor: new Color3(1, 0.75, 0.2),
          arcColor: new Color3(1, 0.75, 0.2),
        }),
        ...buildResultEndMarkers(scene, trimmedCurve),
      );
    }

    return meshes;
  },
  getIFCRepresentation: (params: ParamValues) =>
    buildTrimmedCurve(params, DEFAULT_CURVE_PLACEMENT).trimmedCurve,
};
