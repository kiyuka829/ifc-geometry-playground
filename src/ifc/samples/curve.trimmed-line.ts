import { Color3, MeshBuilder, Vector3 } from "@babylonjs/core";
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
import { getOrCreateSolidMaterial } from "../../engine/materials.ts";
import { ifcToBabylonVector } from "../../engine/ifc-coordinates.ts";
import type {
  IfcDirection,
  IfcLine,
  IfcTrimmedCurve,
} from "../generated/schema.ts";
import {
  buildSupportedCurve,
  resolveSupportedCurveSegments,
} from "../operations/curve.ts";
import {
  getLineStartPoint,
  pointOnLine,
  resolveLineCurveSegment,
} from "../operations/curve-line.ts";

const SENSE_OPTIONS = ["SAME", "REVERSE"] as const;

function toIfcDirection(direction: Vec3): IfcDirection {
  return {
    type: "IfcDirection",
    directionRatios: [direction.x, direction.y, direction.z],
  };
}

function buildIfcLine(params: ParamValues): IfcLine {
  return {
    type: "IfcLine",
    pnt: {
      type: "IfcCartesianPoint",
      coordinates: [
        getNumber(params, "pntX"),
        getNumber(params, "pntY"),
        getNumber(params, "pntZ"),
      ],
    },
    dir: {
      type: "IfcVector",
      orientation: toIfcDirection({
        x: getNumber(params, "dirX"),
        y: getNumber(params, "dirY"),
        z: getNumber(params, "dirZ"),
      }),
      magnitude: getNumber(params, "magnitude"),
    },
  };
}

function buildTrimmedLine(params: ParamValues): {
  basisCurve: IfcLine;
  trimmedCurve: IfcTrimmedCurve;
} {
  const basisCurve = buildIfcLine(params);
  const senseAgreement =
    getSelect(params, "sense", SENSE_OPTIONS, SENSE_OPTIONS[0]) === "SAME";

  return {
    basisCurve,
    trimmedCurve: {
      type: "IfcTrimmedCurve",
      basisCurve,
      trim1: [getNumber(params, "startParameter")],
      trim2: [getNumber(params, "endParameter")],
      senseAgreement,
      masterRepresentation: "PARAMETER",
    },
  };
}

function buildPointMarker(
  scene: Scene,
  point: Vec3,
  name: string,
  color: Color3,
  diameter = 0.2,
): Mesh {
  const marker = MeshBuilder.CreateSphere(
    name,
    { diameter, segments: 16 },
    scene,
  );
  marker.position = ifcToBabylonVector(point);
  marker.material = getOrCreateSolidMaterial(scene, `${name}_material`, color);
  return marker;
}

function distance(a: Vec3, b: Vec3): number {
  return Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
}

function interpolatePoint(a: Vec3, b: Vec3, ratio: number): Vec3 {
  return {
    x: a.x + (b.x - a.x) * ratio,
    y: a.y + (b.y - a.y) * ratio,
    z: a.z + (b.z - a.z) * ratio,
  };
}

function buildDashedLineSegment(
  scene: Scene,
  points: Vec3[],
  name: string,
  color: Color3,
): Mesh[] {
  if (points.length < 2) return [];

  const [start, end] = points;
  const totalLength = distance(start, end);
  if (totalLength <= 1e-9) return [];

  const dashLength = 0.22;
  const gapLength = 0.12;
  const lines: Vector3[][] = [];

  for (let cursor = 0; cursor < totalLength; cursor += dashLength + gapLength) {
    const dashStart = cursor / totalLength;
    const dashEnd = Math.min(cursor + dashLength, totalLength) / totalLength;
    lines.push([
      ifcToBabylonVector(interpolatePoint(start, end, dashStart)),
      ifcToBabylonVector(interpolatePoint(start, end, dashEnd)),
    ]);
  }

  const dashed = MeshBuilder.CreateLineSystem(name, { lines }, scene);
  dashed.color = color;
  return [dashed];
}

function buildTrimEndpointMarkers(
  scene: Scene,
  trimmedCurve: IfcTrimmedCurve,
): Mesh[] {
  const points = resolveSupportedCurveSegments(trimmedCurve)[0]?.points ?? [];
  if (points.length < 2) return [];

  return [
    buildPointMarker(
      scene,
      points[0],
      "trimmed_line_start",
      new Color3(0.25, 0.55, 1),
      0.18,
    ),
    buildPointMarker(
      scene,
      points[points.length - 1],
      "trimmed_line_end",
      new Color3(1, 0.55, 0.15),
      0.18,
    ),
  ];
}

export const curveTrimmedLineSample: SampleDef = {
  id: "curve-trimmed-line",
  title: "Trimmed Line (IfcTrimmedCurve + IfcLine)",
  description:
    "Trim an IfcLine basis curve with parameter selectors. The visible IfcLine guide uses the same finite " +
    "Magnitude segment as the standalone sample, while trims may extend outside that display range.",
  parameters: [
    {
      key: "pntX",
      label: "Pnt X",
      type: "number",
      min: -6,
      max: 6,
      step: 0.1,
      defaultValue: -2,
      group: "Pnt",
    },
    {
      key: "pntY",
      label: "Pnt Y",
      type: "number",
      min: -6,
      max: 6,
      step: 0.1,
      defaultValue: -1,
      group: "Pnt",
    },
    {
      key: "pntZ",
      label: "Pnt Z",
      type: "number",
      min: -2,
      max: 6,
      step: 0.1,
      defaultValue: 0.5,
      group: "Pnt",
    },
    {
      key: "dirX",
      label: "Dir Orientation X",
      type: "number",
      min: -1,
      max: 1,
      step: 0.05,
      defaultValue: 1,
      group: "Dir",
    },
    {
      key: "dirY",
      label: "Dir Orientation Y",
      type: "number",
      min: -1,
      max: 1,
      step: 0.05,
      defaultValue: 0.35,
      group: "Dir",
    },
    {
      key: "dirZ",
      label: "Dir Orientation Z",
      type: "number",
      min: -1,
      max: 1,
      step: 0.05,
      defaultValue: 0.25,
      group: "Dir",
    },
    {
      key: "magnitude",
      label: "Dir Magnitude",
      type: "number",
      min: 0.1,
      max: 10,
      step: 0.1,
      defaultValue: 5,
      group: "Dir",
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
      key: "startParameter",
      label: "Start Parameter",
      type: "number",
      min: -2,
      max: 3,
      step: 0.05,
      defaultValue: -0.25,
      group: "Trim",
    },
    {
      key: "endParameter",
      label: "End Parameter",
      type: "number",
      min: -2,
      max: 3,
      step: 0.05,
      defaultValue: 1.25,
      group: "Trim",
    },
  ],
  steps: [
    {
      id: "basis-line",
      label: "Step 1: IfcLine",
      description:
        "The basis IfcLine is infinite, but the sample displays Pnt plus Dir.Magnitude as a finite guide segment.",
    },
    {
      id: "trimmed-line",
      label: "Step 2: Trim",
      description:
        "IfcTrimmedCurve applies parameter trims on the infinite basis line. The original guide is dotted and the trimmed result is solid.",
    },
  ],
  buildGeometry: (
    scene: Scene,
    params: ParamValues,
    stepIndex: number,
    _profile?: IfcProfileDef,
    _path?: Vec3[],
    _extrusion?: ExtrusionParams,
    _placement?: IfcAxis2Placement3D,
    _sweepView?: SweepViewState,
  ): Mesh[] => {
    const { basisCurve, trimmedCurve } = buildTrimmedLine(params);
    const basisStart = getLineStartPoint(basisCurve);
    const basisEnd = pointOnLine(basisCurve, 1);
    const basisMeshes = [
      buildPointMarker(
        scene,
        basisStart,
        "trimmed_line_pnt",
        new Color3(0.25, 0.55, 1),
      ),
      buildPointMarker(
        scene,
        basisEnd,
        "trimmed_line_magnitude_end",
        new Color3(1, 0.55, 0.15),
        0.18,
      ),
    ];

    if (stepIndex === 0) {
      return [
        ...basisMeshes,
        ...buildSupportedCurve(scene, basisCurve, "trimmed_line_basis", {
          lineColor: new Color3(1, 0.75, 0.2),
        }),
      ];
    }

    return [
      ...basisMeshes,
      ...buildDashedLineSegment(
        scene,
        resolveLineCurveSegment(basisCurve).points,
        "trimmed_line_basis_dashed",
        new Color3(0.42, 0.46, 0.54),
      ),
      ...buildSupportedCurve(scene, trimmedCurve, "trimmed_line_result", {
        lineColor: new Color3(1, 0.75, 0.2),
      }),
      ...buildTrimEndpointMarkers(scene, trimmedCurve),
    ];
  },
  getIFCRepresentation: (params: ParamValues) =>
    buildTrimmedLine(params).trimmedCurve,
};
