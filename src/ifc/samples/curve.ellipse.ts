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
import { buildSupportedCurve } from "../operations/curve.ts";
import {
  buildIfcEllipse,
  DEFAULT_CURVE_PLACEMENT,
  pointOnPlacement,
} from "./curve.conic.shared.ts";

function buildPlacementMarker(
  scene: Scene,
  placement: IfcAxis2Placement3D,
): Mesh {
  const marker = MeshBuilder.CreateSphere(
    "curve_ellipse_center",
    { diameter: 0.22, segments: 16 },
    scene,
  );
  marker.position = ifcToBabylonVector(placement.location);
  marker.material = getOrCreateSolidMaterial(
    scene,
    "curve_ellipse_center_material",
    new Color3(1, 0.8, 0.2),
  );
  return marker;
}

function buildSemiAxisGuide(
  scene: Scene,
  placement: IfcAxis2Placement3D,
  localTarget: { x: number; y: number },
  name: string,
  color: Color3,
): Mesh {
  const guide = MeshBuilder.CreateLines(
    name,
    {
      points: [
        ifcToBabylonVector(placement.location),
        ifcToBabylonVector(pointOnPlacement(placement, localTarget)),
      ],
    },
    scene,
  );
  guide.color = color;
  return guide;
}

export const curveEllipseSample: SampleDef = {
  id: "curve-ellipse",
  title: "Ellipse (IfcEllipse)",
  description:
    "Inspect a standalone elliptical curve defined by an axis placement and two semi-axis lengths. " +
    "This is the full basis curve used later by IfcTrimmedCurve for elliptical arcs.",
  parameters: [
    {
      key: "semiAxis1",
      label: "Semi-Axis 1",
      type: "number",
      min: 0.5,
      max: 8,
      step: 0.1,
      defaultValue: 4,
    },
    {
      key: "semiAxis2",
      label: "Semi-Axis 2",
      type: "number",
      min: 0.5,
      max: 8,
      step: 0.1,
      defaultValue: 2.5,
    },
  ],
  steps: [
    {
      id: "placement",
      label: "Step 1: Placement + Semi-Axes",
      description:
        "IfcEllipse uses the same placement concept as IfcCircle, but with independent lengths " +
        "along the local X and Y directions.",
    },
    {
      id: "curve",
      label: "Step 2: Full Ellipse",
      description:
        "The full ellipse is sampled from the basis placement and both semi-axis lengths, " +
        "matching the representation consumed by IfcTrimmedCurve.",
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
    const semiAxis1 = getNumber(params, "semiAxis1");
    const semiAxis2 = getNumber(params, "semiAxis2");
    const curve = buildIfcEllipse(semiAxis1, semiAxis2, activePlacement);

    const meshes: Mesh[] = [
      buildPlacementMarker(scene, activePlacement),
      buildSemiAxisGuide(
        scene,
        activePlacement,
        { x: semiAxis1, y: 0 },
        "curve_ellipse_axis1_guide",
        new Color3(0.25, 0.55, 1),
      ),
      buildSemiAxisGuide(
        scene,
        activePlacement,
        { x: 0, y: semiAxis2 },
        "curve_ellipse_axis2_guide",
        new Color3(1, 0.55, 0.15),
      ),
    ];

    if (stepIndex >= 1) {
      meshes.push(
        ...buildSupportedCurve(scene, curve, "curve_ellipse_result", {
          curveColor: new Color3(0.35, 0.8, 0.95),
        }),
      );
    }

    return meshes;
  },
  getIFCRepresentation: (params: ParamValues) =>
    buildIfcEllipse(
      getNumber(params, "semiAxis1"),
      getNumber(params, "semiAxis2"),
      DEFAULT_CURVE_PLACEMENT,
    ),
};
