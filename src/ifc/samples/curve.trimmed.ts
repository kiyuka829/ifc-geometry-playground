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
} from "./curve.conic.shared.ts";
const BASIS_CURVE_OPTIONS = ["ELLIPSE", "CIRCLE"] as const;
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
  remainderCurve: IfcTrimmedCurve;
  trimPoints: Vec3[];
} {
  const basisCurve = buildBasisCurve(params, placement);
  const startAngle = (getNumber(params, "startAngleDeg") * Math.PI) / 180;
  const endAngle = (getNumber(params, "endAngleDeg") * Math.PI) / 180;
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
    trim1: [startAngle],
    trim2: [endAngle],
    senseAgreement,
    masterRepresentation: "PARAMETER",
  };

  const remainderCurve: IfcTrimmedCurve = {
    ...trimmedCurve,
    trim1: trimmedCurve.trim2,
    trim2: trimmedCurve.trim1,
  };

  return { basisCurve, trimmedCurve, remainderCurve, trimPoints };
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

function distanceBetweenPoints(a: Vec3, b: Vec3): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const dz = b.z - a.z;
  return Math.hypot(dx, dy, dz);
}

function interpolatePoint(a: Vec3, b: Vec3, ratio: number): Vec3 {
  return {
    x: a.x + (b.x - a.x) * ratio,
    y: a.y + (b.y - a.y) * ratio,
    z: a.z + (b.z - a.z) * ratio,
  };
}

function extractPolylineRange(
  points: Vec3[],
  startDistance: number,
  endDistance: number,
): Vec3[] {
  if (points.length < 2 || endDistance <= startDistance) return [];

  const extracted: Vec3[] = [];
  let traversed = 0;

  for (let index = 0; index < points.length - 1; index += 1) {
    const segmentStart = points[index];
    const segmentEnd = points[index + 1];
    const segmentLength = distanceBetweenPoints(segmentStart, segmentEnd);

    if (segmentLength <= 1e-9) continue;

    const localStart = Math.max(0, startDistance - traversed);
    const localEnd = Math.min(segmentLength, endDistance - traversed);

    if (localEnd > localStart) {
      const startPoint = interpolatePoint(
        segmentStart,
        segmentEnd,
        localStart / segmentLength,
      );
      const endPoint = interpolatePoint(
        segmentStart,
        segmentEnd,
        localEnd / segmentLength,
      );

      if (extracted.length === 0) {
        extracted.push(startPoint);
      } else {
        const previous = extracted[extracted.length - 1];
        if (distanceBetweenPoints(previous, startPoint) > 1e-9) {
          extracted.push(startPoint);
        }
      }

      if (
        extracted.length === 0 ||
        distanceBetweenPoints(extracted[extracted.length - 1], endPoint) > 1e-9
      ) {
        extracted.push(endPoint);
      }
    }

    traversed += segmentLength;
    if (traversed >= endDistance) break;
  }

  return extracted;
}

function buildDashedCurve(
  scene: Scene,
  curve: IfcTrimmedCurve,
  name: string,
  color: Color3,
): Mesh[] {
  const segments = resolveSupportedCurveSegments(curve);

  return segments.flatMap((segment, index) => {
    if (segment.points.length < 2) return [];
    const dashLength = 0.22;
    const gapLength = 0.12;
    const totalLength = segment.points.reduce((sum, point, pointIndex) => {
      if (pointIndex === 0) return sum;
      return sum + distanceBetweenPoints(segment.points[pointIndex - 1], point);
    }, 0);
    const lines = [];

    for (
      let cursor = 0;
      cursor < totalLength;
      cursor += dashLength + gapLength
    ) {
      const dashPoints = extractPolylineRange(
        segment.points,
        cursor,
        Math.min(cursor + dashLength, totalLength),
      );
      if (dashPoints.length >= 2) {
        lines.push(dashPoints.map(ifcToBabylonVector));
      }
    }

    if (lines.length === 0) return [];

    const dashed = MeshBuilder.CreateLineSystem(
      `${name}_${index}`,
      { lines },
      scene,
    );
    dashed.color = color;
    return [dashed];
  });
}

export const curveTrimmedSample: SampleDef = {
  id: "curve-trimmed",
  title: "Trimmed Curve (IfcTrimmedCurve)",
  description:
    "Build circular or elliptical arcs by trimming a reusable basis curve. " +
    "Inspect how IfcTrimmedCurve wraps IfcCircle and IfcEllipse using parameter-based trims.",
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
      label: "Step 1: Basis Curve",
      description:
        "IfcTrimmedCurve starts from a full IfcCircle or IfcEllipse basisCurve. " +
        "This step shows the reusable base geometry before any trim is applied.",
    },
    {
      id: "trimmed-curve",
      label: "Step 2: Trim",
      description:
        "The trim selectors choose the start and end positions on the basis curve, and " +
        "senseAgreement controls whether the visible segment follows the basis direction or the reverse direction.",
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
    const { basisCurve, trimmedCurve, remainderCurve, trimPoints } = buildTrimmedCurve(
      params,
      activePlacement,
    );
    const meshes: Mesh[] =
      stepIndex === 0
        ? [
            ...buildSupportedCurve(scene, basisCurve, "trimmed_curve_basis", {
              curveColor: new Color3(0.55, 0.6, 0.7),
            }),
          ]
        : [];

    if (stepIndex >= 1) {
      meshes.push(
        ...buildTrimPointMarkers(scene, trimPoints),
        ...buildDashedCurve(
          scene,
          remainderCurve,
          "trimmed_curve_remainder",
          new Color3(0.42, 0.46, 0.54),
        ),
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
