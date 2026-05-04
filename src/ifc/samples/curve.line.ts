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
import type { IfcDirection, IfcLine } from "../generated/schema.ts";
import { buildSupportedCurve } from "../operations/curve.ts";
import { getLineStartPoint, pointOnLine } from "../operations/curve-line.ts";

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

function buildPointMarker(
  scene: Scene,
  point: Vec3,
  name: string,
  color: Color3,
  diameter = 0.22,
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

export const curveLineSample: SampleDef = {
  id: "curve-line",
  title: "Line (IfcLine)",
  description:
    "Inspect an IfcLine from its explicit Pnt and Dir attributes. Because the IFC line is infinite, " +
    "this sample renders the Dir magnitude as a finite segment for display.",
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
  ],
  steps: [
    {
      id: "attributes",
      label: "Step 1: Pnt + Dir",
      description:
        "IfcLine stores one point on the infinite line and an IfcVector. " +
        "The vector is split into DirectionRatios and Magnitude.",
    },
    {
      id: "display-segment",
      label: "Step 2: Magnitude Segment",
      description:
        "For display, the infinite line is represented as Pnt plus the normalized Dir.Orientation scaled by Dir.Magnitude.",
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
    const line = buildIfcLine(params);
    const start = getLineStartPoint(line);
    const end = pointOnLine(line, 1);
    const meshes: Mesh[] = [
      buildPointMarker(scene, start, "curve_line_pnt", new Color3(0.25, 0.55, 1)),
    ];

    if (stepIndex >= 1) {
      meshes.push(
        ...buildSupportedCurve(scene, line, "curve_line_result", {
          lineColor: new Color3(1, 0.75, 0.2),
        }),
        buildPointMarker(
          scene,
          end,
          "curve_line_magnitude_end",
          new Color3(1, 0.55, 0.15),
          0.18,
        ),
      );
    }

    return meshes;
  },
  getIFCRepresentation: (params: ParamValues) => buildIfcLine(params),
};
