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
  IfcCartesianPoint,
  IfcAxis2Placement3D as IfcGeneratedAxis2Placement3D,
  IfcCircle,
  IfcDirection,
  IfcEllipse,
  IfcTrimmedCurve,
} from "../generated/schema.ts";
import {
  buildSupportedCurve,
  resolveSupportedCurveSegments,
} from "../operations/curve.ts";
import { getOrCreateSolidMaterial } from "../../engine/materials.ts";
import { ifcToBabylonVector } from "../../engine/ifc-coordinates.ts";
import { normalizePlacement3D } from "../normalize.ts";

const DEFAULT_PLACEMENT: IfcAxis2Placement3D = {
  type: "IfcAxis2Placement3D",
  location: { x: 0, y: 0, z: 0 },
  axis: { x: 0, y: 0, z: 1 },
  refDirection: { x: 1, y: 0, z: 0 },
};
const BASIS_CURVE_OPTIONS = ["ELLIPSE", "CIRCLE"] as const;
const TRIM_MODE_OPTIONS = ["PARAMETER", "CARTESIAN"] as const;
const SENSE_OPTIONS = ["SAME", "REVERSE"] as const;

function toIfcDirection(direction: Vec3): IfcDirection {
  return {
    type: "IfcDirection",
    directionRatios: [direction.x, direction.y, direction.z],
  };
}

function toIfcTrimPlacement(
  placement: IfcAxis2Placement3D,
): IfcGeneratedAxis2Placement3D {
  return {
    type: "IfcAxis2Placement3D",
    location: {
      type: "IfcCartesianPoint",
      coordinates: [
        placement.location.x,
        placement.location.y,
        placement.location.z,
      ],
    },
    ...(placement.axis ? { axis: toIfcDirection(placement.axis) } : {}),
    ...(placement.refDirection
      ? { refDirection: toIfcDirection(placement.refDirection) }
      : {}),
  };
}

function pointOnPlacement(
  placement: IfcAxis2Placement3D,
  localPoint: { x: number; y: number },
): Vec3 {
  const normalizedPlacement = normalizePlacement3D(toIfcTrimPlacement(placement));
  const yAxis = {
    x:
      normalizedPlacement.zAxis.y * normalizedPlacement.xAxis.z -
      normalizedPlacement.zAxis.z * normalizedPlacement.xAxis.y,
    y:
      normalizedPlacement.zAxis.z * normalizedPlacement.xAxis.x -
      normalizedPlacement.zAxis.x * normalizedPlacement.xAxis.z,
    z:
      normalizedPlacement.zAxis.x * normalizedPlacement.xAxis.y -
      normalizedPlacement.zAxis.y * normalizedPlacement.xAxis.x,
  };

  return {
    x:
      normalizedPlacement.origin.x +
      localPoint.x * normalizedPlacement.xAxis.x +
      localPoint.y * yAxis.x,
    y:
      normalizedPlacement.origin.y +
      localPoint.x * normalizedPlacement.xAxis.y +
      localPoint.y * yAxis.y,
    z:
      normalizedPlacement.origin.z +
      localPoint.x * normalizedPlacement.xAxis.z +
      localPoint.y * yAxis.z,
  };
}

function pointOnConic(
  placement: IfcAxis2Placement3D,
  semiAxis1: number,
  semiAxis2: number,
  parameter: number,
): Vec3 {
  return pointOnPlacement(placement, {
    x: semiAxis1 * Math.cos(parameter),
    y: semiAxis2 * Math.sin(parameter),
  });
}

function toIfcCartesianPoint(point: Vec3): IfcCartesianPoint {
  return {
    type: "IfcCartesianPoint",
    coordinates: [point.x, point.y, point.z],
  };
}

function buildBasisCurve(
  params: ParamValues,
  placement: IfcAxis2Placement3D,
): IfcCircle | IfcEllipse {
  const basis = getSelect(
    params,
    "basis",
    BASIS_CURVE_OPTIONS,
    BASIS_CURVE_OPTIONS[0],
  );
  const radius = getNumber(params, "radius");
  const semiAxis1 = getNumber(params, "semiAxis1");
  const semiAxis2 = getNumber(params, "semiAxis2");
  const position = toIfcTrimPlacement(placement);

  if (basis === "CIRCLE") {
    return {
      type: "IfcCircle",
      position,
      radius,
    };
  }

  return {
    type: "IfcEllipse",
    position,
    semiAxis1,
    semiAxis2,
  };
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
      key: "basis",
      label: "Basis Curve",
      type: "select",
      options: [
        { value: "ELLIPSE", label: "Ellipse" },
        { value: "CIRCLE", label: "Circle" },
      ],
      defaultValue: "ELLIPSE",
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
    },
    {
      key: "radius",
      label: "Circle Radius",
      type: "number",
      min: 0.5,
      max: 8,
      step: 0.1,
      defaultValue: 3,
    },
    {
      key: "semiAxis1",
      label: "Ellipse Semi-Axis 1",
      type: "number",
      min: 0.5,
      max: 8,
      step: 0.1,
      defaultValue: 4,
    },
    {
      key: "semiAxis2",
      label: "Ellipse Semi-Axis 2",
      type: "number",
      min: 0.5,
      max: 8,
      step: 0.1,
      defaultValue: 2.5,
    },
    {
      key: "startAngleDeg",
      label: "Start Angle",
      type: "number",
      min: 0,
      max: 360,
      step: 1,
      defaultValue: 25,
    },
    {
      key: "endAngleDeg",
      label: "End Angle",
      type: "number",
      min: 0,
      max: 360,
      step: 1,
      defaultValue: 305,
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
    defaultPlacement: DEFAULT_PLACEMENT,
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
    const activePlacement = placement ?? DEFAULT_PLACEMENT;
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
    buildTrimmedCurve(params, DEFAULT_PLACEMENT).trimmedCurve,
};
