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
  buildIfcCircle,
  DEFAULT_CURVE_PLACEMENT,
  pointOnPlacement,
} from "./curve.conic.shared.ts";

function buildPlacementMarker(
  scene: Scene,
  placement: IfcAxis2Placement3D,
): Mesh {
  const marker = MeshBuilder.CreateSphere(
    "curve_circle_center",
    { diameter: 0.22, segments: 16 },
    scene,
  );
  marker.position = ifcToBabylonVector(placement.location);
  marker.material = getOrCreateSolidMaterial(
    scene,
    "curve_circle_center_material",
    new Color3(1, 0.8, 0.2),
  );
  return marker;
}

function buildRadiusGuide(
  scene: Scene,
  placement: IfcAxis2Placement3D,
  radius: number,
): Mesh {
  const guide = MeshBuilder.CreateLines(
    "curve_circle_radius_guide",
    {
      points: [
        ifcToBabylonVector(placement.location),
        ifcToBabylonVector(pointOnPlacement(placement, { x: radius, y: 0 })),
      ],
    },
    scene,
  );
  guide.color = new Color3(1, 0.55, 0.15);
  return guide;
}

export const curveCircleSample: SampleDef = {
  id: "curve-circle",
  title: "Circle (IfcCircle)",
  description:
    "Inspect a standalone circular curve defined by an axis placement and radius. " +
    "The sample reuses the same basis-curve evaluation used by IfcTrimmedCurve.",
  parameters: [
    {
      key: "radius",
      label: "Radius",
      type: "number",
      min: 0.5,
      max: 8,
      step: 0.1,
      defaultValue: 3,
    },
  ],
  steps: [
    {
      id: "placement",
      label: "Step 1: Placement + Radius",
      description:
        "IfcCircle is positioned by IfcAxis2Placement and one radius value. " +
        "The guide line follows the local X direction from the circle center.",
    },
    {
      id: "curve",
      label: "Step 2: Full Circle",
      description:
        "The full 360-degree curve is evaluated from the basis placement, which is the " +
        "same representation later reused by IfcTrimmedCurve for circular arcs.",
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
    const radius = getNumber(params, "radius");
    const curve = buildIfcCircle(radius, activePlacement);
    const meshes: Mesh[] = [
      buildPlacementMarker(scene, activePlacement),
      buildRadiusGuide(scene, activePlacement, radius),
    ];

    if (stepIndex >= 1) {
      meshes.push(
        ...buildSupportedCurve(scene, curve, "curve_circle_result", {
          curveColor: new Color3(0.25, 0.55, 1),
        }),
      );
    }

    return meshes;
  },
  getIFCRepresentation: (params: ParamValues) =>
    buildIfcCircle(getNumber(params, "radius"), DEFAULT_CURVE_PLACEMENT),
};
