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
const DEFAULT_AXIS_ORIGIN: Vec3 = { x: 2.4, y: 0, z: 0 };
const DEFAULT_ANGLE_DEG = 120;
const AXIS_OVERLAY_LENGTH = 8;
const DEFAULT_PLACEMENT: IfcAxis2Placement3D = {
  type: "IfcAxis2Placement3D",
  location: { x: 0, y: 0, z: 0 },
  axis: { x: 0, y: 0, z: 1 },
  refDirection: { x: 1, y: 0, z: 0 },
};

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

function normalizeDirection(direction: Vec3): Vec3 {
  const length = Math.hypot(direction.x, direction.y, direction.z);
  if (length < 1e-9) {
    return DEFAULT_AXIS_DIRECTION;
  }
  return {
    x: direction.x / length,
    y: direction.y / length,
    z: direction.z / length,
  };
}

export const revolvedRectangleSample: SampleDef = {
  id: "revolved-rectangle",
  title: "Revolved Area Solid (IfcRevolvedAreaSolid)",
  description:
    "A rectangular area profile revolved around a configurable local axis. " +
    "The axis origin and direction stay in the local XY plane, matching the IFC constraints for IfcRevolvedAreaSolid.",
  parameters: [
    {
      key: "axisOriginX",
      label: "Axis Origin X",
      type: "number",
      min: -5,
      max: 5,
      step: 0.1,
      defaultValue: DEFAULT_AXIS_ORIGIN.x,
    },
    {
      key: "axisOriginY",
      label: "Axis Origin Y",
      type: "number",
      min: -5,
      max: 5,
      step: 0.1,
      defaultValue: DEFAULT_AXIS_ORIGIN.y,
    },
    {
      key: "axisDirX",
      label: "Axis Dir X",
      type: "number",
      min: -1,
      max: 1,
      step: 0.1,
      defaultValue: DEFAULT_AXIS_DIRECTION.x,
    },
    {
      key: "axisDirY",
      label: "Axis Dir Y",
      type: "number",
      min: -1,
      max: 1,
      step: 0.1,
      defaultValue: DEFAULT_AXIS_DIRECTION.y,
    },
    {
      key: "angleDeg",
      label: "Angle (deg)",
      type: "number",
      min: 15,
      max: 360,
      step: 5,
      defaultValue: DEFAULT_ANGLE_DEG,
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
        "For IfcRevolvedAreaSolid, both the axis start point and direction must stay in the local XY plane.",
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
  placementEditorConfig: {
    defaultPlacement: DEFAULT_PLACEMENT,
  },
  buildGeometry: (
    scene: Scene,
    params: ParamValues,
    stepIndex: number,
    profile?: IfcProfileDef,
    _path?: Vec3[],
    _extrusion?: ExtrusionParams,
    placement?: IfcAxis2Placement3D,
    _sweepView?: SweepViewState,
  ): Mesh[] => {
    const meshes: Mesh[] = [];
    const activeProfile = profile ?? DEFAULT_PROFILE;
    const activePlacement = placement ?? DEFAULT_PLACEMENT;
    const rectangleProfile =
      activeProfile.type === "IfcRectangleProfileDef"
        ? activeProfile
        : DEFAULT_PROFILE;

    const angleDeg = getNumber(params, "angleDeg");
    const axisOrigin = {
      x: getNumber(params, "axisOriginX"),
      y: getNumber(params, "axisOriginY"),
      z: 0,
    };
    const axisDirection = normalizeDirection({
      x: getNumber(params, "axisDirX"),
      y: getNumber(params, "axisDirY"),
      z: 0,
    });

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
          coordinates: [
            activePlacement.location.x,
            activePlacement.location.y,
            activePlacement.location.z,
          ],
        },
        ...(activePlacement.axis
          ? {
              axis: {
                type: "IfcDirection",
                directionRatios: [
                  activePlacement.axis.x,
                  activePlacement.axis.y,
                  activePlacement.axis.z,
                ],
              },
            }
          : {}),
        ...(activePlacement.refDirection
          ? {
              refDirection: {
                type: "IfcDirection",
                directionRatios: [
                  activePlacement.refDirection.x,
                  activePlacement.refDirection.y,
                  activePlacement.refDirection.z,
                ],
              },
            }
          : {}),
      },
      axis: {
        type: "IfcAxis1Placement",
        location: {
          type: "IfcCartesianPoint",
          coordinates: [axisOrigin.x, axisOrigin.y, axisOrigin.z],
        },
        axis: {
          type: "IfcDirection",
          directionRatios: [
            axisDirection.x,
            axisDirection.y,
            axisDirection.z,
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
        {
          x: axisOrigin.x - axisDirection.x * AXIS_OVERLAY_LENGTH * 0.5,
          y: axisOrigin.y - axisDirection.y * AXIS_OVERLAY_LENGTH * 0.5,
          z: axisOrigin.z - axisDirection.z * AXIS_OVERLAY_LENGTH * 0.5,
        },
        axisDirection,
        AXIS_OVERLAY_LENGTH,
        "revolved_axis",
        activePlacement,
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
      location: "(see placement editor)",
      axis: "(see placement editor)",
      refDirection: "(see placement editor)",
    },
    axis: {
      type: "IfcAxis1Placement",
      location: {
        type: "IfcCartesianPoint",
        coordinates: [
          getNumber(params, "axisOriginX"),
          getNumber(params, "axisOriginY"),
          0,
        ],
      },
      axis: {
        type: "IfcDirection",
        directionRatios: [
          Number(normalizeDirection({
            x: getNumber(params, "axisDirX"),
            y: getNumber(params, "axisDirY"),
            z: 0,
          }).x.toFixed(4)),
          Number(normalizeDirection({
            x: getNumber(params, "axisDirX"),
            y: getNumber(params, "axisDirY"),
            z: 0,
          }).y.toFixed(4)),
          0,
        ],
      },
    },
    angle: Number(toRadians(getNumber(params, "angleDeg")).toFixed(4)),
  }),
};
