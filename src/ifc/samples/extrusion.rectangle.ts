import { Vector3 } from "@babylonjs/core";
import type { Scene, Mesh } from "@babylonjs/core";
import type { SampleDef, ParamValues, IfcProfileDef } from "../../types.ts";
import { getNumber } from "../../types.ts";
import { buildExtrusionMeshFromGenerated } from "../operations/extrusion.ts";
import { createExtrusionMaterial } from "../../engine/materials.ts";
import {
  buildProfileOverlay,
  buildExtrusionDirectionOverlay,
} from "../../engine/overlays.ts";
import type { IfcExtrudedAreaSolid } from "../generated/schema.ts";

const DEFAULT_X_DIM = 4;
const DEFAULT_Y_DIM = 3;

const DEFAULT_PROFILE: IfcProfileDef = {
  type: "IfcRectangleProfileDef",
  profileType: "AREA",
  xDim: DEFAULT_X_DIM,
  yDim: DEFAULT_Y_DIM,
};

function getRectangleDimensions(profile?: IfcProfileDef): {
  xDim: number;
  yDim: number;
} {
  if (profile?.type === "IfcRectangleProfileDef") {
    return { xDim: profile.xDim, yDim: profile.yDim };
  }
  return { xDim: DEFAULT_X_DIM, yDim: DEFAULT_Y_DIM };
}

function createGeneratedExtrusionSolid(
  params: ParamValues,
  profile?: IfcProfileDef,
): IfcExtrudedAreaSolid {
  const { xDim, yDim } = getRectangleDimensions(profile);
  return {
    type: "IfcExtrudedAreaSolid",
    sweptArea: {
      type: "IfcRectangleProfileDef",
      profileType: "AREA",
      xDim,
      yDim,
    },
    position: {
      type: "IfcAxis2Placement3D",
      location: { type: "IfcCartesianPoint", coordinates: [0, 0, 0] },
    },
    extrudedDirection: {
      type: "IfcDirection",
      directionRatios: [
        getNumber(params, "dirX"),
        getNumber(params, "dirY"),
        getNumber(params, "dirZ"),
      ],
    },
    depth: getNumber(params, "depth"),
  };
}

export const extrusionRectangleSample: SampleDef = {
  id: "extrusion-rectangle",
  title: "Rectangle Profile (IfcRectangleProfileDef)",
  description:
    "A basic rectangle profile extruded in a specified direction to create a 3D solid. " +
    "Edit width and height in the profile editor.",
  parameters: [
    {
      key: "depth",
      label: "Extrusion Depth",
      type: "number",
      min: 0.5,
      max: 20,
      step: 0.1,
      defaultValue: 5,
    },
    {
      key: "dirX",
      label: "Direction X",
      type: "number",
      min: -1,
      max: 1,
      step: 0.1,
      defaultValue: 0,
    },
    {
      key: "dirY",
      label: "Direction Y",
      type: "number",
      min: -1,
      max: 1,
      step: 0.1,
      defaultValue: 1,
    },
    {
      key: "dirZ",
      label: "Direction Z",
      type: "number",
      min: -1,
      max: 1,
      step: 0.1,
      defaultValue: 0,
    },
  ],
  steps: [
    {
      id: "profile",
      label: "Step 1: Rectangle Profile",
      description:
        "IfcRectangleProfileDef defines a rectangular cross-section by xDim and yDim. " +
        "Edit dimensions in the profile editor above.",
    },
    {
      id: "direction",
      label: "Step 2: Extrusion Direction",
      description:
        "Set the extrusion direction vector. Specify direction ratios using IfcDirection.",
    },
    {
      id: "solid",
      label: "Step 3: Extruded Solid",
      description:
        "Apply extrusion to generate a 3D solid. Specify depth using IfcExtrudedAreaSolid.",
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
  ): Mesh[] => {
    const meshes: Mesh[] = [];
    const activeProfile: IfcProfileDef = profile ?? DEFAULT_PROFILE;
    const generatedSolid = createGeneratedExtrusionSolid(params, activeProfile);

    const solid = {
      type: "IfcExtrudedAreaSolid" as const,
      sweptArea: activeProfile,
      position: { location: { x: 0, y: 0, z: 0 } },
      extrudedDirection: {
        directionRatios: {
          x: getNumber(params, "dirX"),
          y: getNumber(params, "dirY"),
          z: getNumber(params, "dirZ"),
        },
      },
      depth: getNumber(params, "depth"),
    };

    if (stepIndex >= 0) {
      meshes.push(
        ...buildProfileOverlay(scene, solid.sweptArea, "profile_outline"),
      );
    }

    if (stepIndex >= 1) {
      const dir = new Vector3(
        getNumber(params, "dirX"),
        getNumber(params, "dirY"),
        getNumber(params, "dirZ"),
      );
      const arrow = buildExtrusionDirectionOverlay(
        scene,
        Vector3.Zero(),
        dir,
        getNumber(params, "depth"),
        "dir_arrow",
      );
      if (arrow) meshes.push(arrow);
    }

    if (stepIndex >= 2) {
      const mat = createExtrusionMaterial(scene);
      const mesh = buildExtrusionMeshFromGenerated(
        scene,
        generatedSolid,
        mat,
        "extrusion_solid",
      );
      meshes.push(mesh);
    }

    return meshes;
  },
  getIFCRepresentation: (params: ParamValues) => ({
    type: "IfcExtrudedAreaSolid",
    sweptArea: {
      type: "IfcRectangleProfileDef",
      profileType: "AREA",
      xDim: "(see profile editor)",
      yDim: "(see profile editor)",
    },
    position: {
      type: "IfcAxis2Placement3D",
      location: { type: "IfcCartesianPoint", coordinates: [0, 0, 0] },
    },
    extrudedDirection: {
      type: "IfcDirection",
      directionRatios: [
        getNumber(params, "dirX"),
        getNumber(params, "dirY"),
        getNumber(params, "dirZ"),
      ],
    },
    depth: getNumber(params, "depth"),
  }),
};
