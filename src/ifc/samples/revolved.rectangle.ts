import type { Scene, Mesh } from "@babylonjs/core";
import type {
  SampleDef,
  ParamValues,
  IfcProfileDef,
  Vec3,
  ExtrusionParams,
  IfcAxis2Placement3D,
  SweepViewState,
} from "../../types.ts";
import { getNumber } from "../../types.ts";
import { createExtrusionMaterial } from "../../engine/materials.ts";
import {
  buildProfileOverlay,
  buildRevolutionAxisOverlay,
} from "../../engine/overlays.ts";
import { buildRevolvedAreaSolidMesh } from "../operations/revolution.ts";
import type { IfcRevolvedAreaSolid } from "../generated/schema.ts";

const DEFAULT_PROFILE: IfcProfileDef = {
  type: "IfcRectangleProfileDef",
  profileType: "AREA",
  xDim: 1.6,
  yDim: 0.8,
};

const DEFAULT_AXIS_DIRECTION: Vec3 = { x: 0, y: 1, z: 0 };
const DEFAULT_AXIS_OFFSET_X = 2.4;
const DEFAULT_ANGLE_DEG = 270;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export const revolvedRectangleSample: SampleDef = {
  id: "revolved-rectangle",
  title: "Revolved Area Solid (IfcRevolvedAreaSolid)",
  description:
    "A rectangular area profile revolved around an offset local axis. " +
    "Use the angle slider to compare open revolutions with a closed 360° solid.",
  parameters: [
    {
      key: "angleDeg",
      label: "Angle (deg)",
      type: "number",
      min: 15,
      max: 360,
      step: 5,
      defaultValue: DEFAULT_ANGLE_DEG,
    },
    {
      key: "axisOffsetX",
      label: "Axis Offset X",
      type: "number",
      min: 1,
      max: 5,
      step: 0.1,
      defaultValue: DEFAULT_AXIS_OFFSET_X,
    },
  ],
  steps: [
    {
      id: "profile",
      label: "Step 1: Area Profile",
      description:
        "IfcRevolvedAreaSolid starts from a planar swept area. " +
        "This sample uses an IfcRectangleProfileDef as the section to rotate.",
    },
    {
      id: "axis",
      label: "Step 2: Revolution Axis",
      description:
        "IfcAxis1Placement defines the axis origin and direction in the solid's local coordinate system. " +
        "Here the axis runs along local Y and is offset from the profile.",
    },
    {
      id: "solid",
      label: "Step 3: Revolved Solid",
      description:
        "The profile is rotated around the axis by the given angle to create the final solid. " +
        "Angles below 360° keep start/end caps; 360° closes the seam into a full revolution.",
    },
  ],
  profileEditorConfig: {
    allowedTypes: ["rectangle"],
    defaultProfile: DEFAULT_PROFILE,
  },
  buildGeometry: (
    scene: Scene,
    params: ParamValues,
    stepIndex: number,
    profile?: IfcProfileDef,
    _path?: Vec3[],
    _extrusion?: ExtrusionParams,
    _placement?: IfcAxis2Placement3D,
    _sweepView?: SweepViewState,
  ): Mesh[] => {
    const meshes: Mesh[] = [];
    const activeProfile = profile ?? DEFAULT_PROFILE;
    const rectangleProfile =
      activeProfile.type === "IfcRectangleProfileDef"
        ? activeProfile
        : DEFAULT_PROFILE;

    const angleDeg = getNumber(params, "angleDeg");
    const axisOffsetX = getNumber(params, "axisOffsetX");
    const axisLength = Math.max(5, axisOffsetX * 2 + rectangleProfile.yDim * 2);

    const generatedSolid: IfcRevolvedAreaSolid = {
      type: "IfcRevolvedAreaSolid",
      sweptArea: {
        type: "IfcRectangleProfileDef",
        profileType: "AREA",
        xDim: rectangleProfile.xDim,
        yDim: rectangleProfile.yDim,
      },
      position: {
        type: "IfcAxis2Placement3D",
        location: {
          type: "IfcCartesianPoint",
          coordinates: [0, 0, 0],
        },
        axis: {
          type: "IfcDirection",
          directionRatios: [0, 0, 1],
        },
        refDirection: {
          type: "IfcDirection",
          directionRatios: [1, 0, 0],
        },
      },
      axis: {
        type: "IfcAxis1Placement",
        location: {
          type: "IfcCartesianPoint",
          coordinates: [axisOffsetX, 0, 0],
        },
        axis: {
          type: "IfcDirection",
          directionRatios: [
            DEFAULT_AXIS_DIRECTION.x,
            DEFAULT_AXIS_DIRECTION.y,
            DEFAULT_AXIS_DIRECTION.z,
          ],
        },
      },
      angle: toRadians(angleDeg),
    };

    if (stepIndex >= 0) {
      meshes.push(
        ...buildProfileOverlay(scene, rectangleProfile, "revolved_rectangle_outline"),
      );
    }

    if (stepIndex >= 1) {
      const axisOverlay = buildRevolutionAxisOverlay(
        scene,
        { x: axisOffsetX, y: -axisLength / 2, z: 0 },
        DEFAULT_AXIS_DIRECTION,
        axisLength,
        "revolved_axis",
      );
      if (axisOverlay) meshes.push(axisOverlay);
    }

    if (stepIndex >= 2) {
      meshes.push(
        buildRevolvedAreaSolidMesh(
          scene,
          generatedSolid,
          createExtrusionMaterial(scene),
          "revolved_solid",
        ),
      );
    }

    return meshes;
  },
  getIFCRepresentation: (params: ParamValues) => ({
    type: "IfcRevolvedAreaSolid",
    sweptArea: {
      type: "IfcRectangleProfileDef",
      profileType: "AREA",
      xDim: "(see profile editor)",
      yDim: "(see profile editor)",
    },
    position: {
      type: "IfcAxis2Placement3D",
      location: { type: "IfcCartesianPoint", coordinates: [0, 0, 0] },
      axis: { type: "IfcDirection", directionRatios: [0, 0, 1] },
      refDirection: { type: "IfcDirection", directionRatios: [1, 0, 0] },
    },
    axis: {
      type: "IfcAxis1Placement",
      location: {
        type: "IfcCartesianPoint",
        coordinates: [getNumber(params, "axisOffsetX"), 0, 0],
      },
      axis: {
        type: "IfcDirection",
        directionRatios: [0, 1, 0],
      },
    },
    angle: Number(toRadians(getNumber(params, "angleDeg")).toFixed(4)),
  }),
};
