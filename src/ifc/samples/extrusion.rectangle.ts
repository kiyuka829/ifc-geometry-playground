import { Vector3 } from "@babylonjs/core";
import type { Scene, Mesh } from "@babylonjs/core";
import type { SampleDef, ParamValues, IfcProfileDef } from "../../types.ts";
import { getNumber } from "../../types.ts";
import { buildExtrusionMesh } from "../operations/extrusion.ts";
import { createExtrusionMaterial } from "../../engine/materials.ts";
import {
  buildProfileOverlay,
  buildExtrusionDirectionOverlay,
} from "../../engine/overlays.ts";

const DEFAULT_X_DIM = 4;
const DEFAULT_Y_DIM = 3;

const DEFAULT_PROFILE: IfcProfileDef = {
  type: "IfcRectangleProfileDef",
  profileType: "AREA",
  xDim: DEFAULT_X_DIM,
  yDim: DEFAULT_Y_DIM,
};

export const extrusionRectangleSample: SampleDef = {
  id: "extrusion-rectangle",
  title: "Rectangle Profile (IfcRectangleProfileDef)",
  description:
    "A basic rectangle profile extruded along the Y-axis to create a 3D solid. " +
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
      id: "solid",
      label: "Step 2: Extruded Solid",
      description:
        "The rectangle is extruded along the Y-axis by the given depth to produce a rectangular prism. " +
        "This is equivalent to IfcExtrudedAreaSolid applied to an IfcRectangleProfileDef.",
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
    const depth = getNumber(params, "depth");
    const activeProfile: IfcProfileDef = profile ?? DEFAULT_PROFILE;

    const solid = {
      type: "IfcExtrudedAreaSolid" as const,
      sweptArea: activeProfile,
      position: { location: { x: 0, y: 0, z: 0 } },
      extrudedDirection: {
        directionRatios: { x: 0, y: 1, z: 0 },
      },
      depth,
    };

    if (stepIndex >= 0) {
      meshes.push(...buildProfileOverlay(scene, activeProfile, "rectangle_outline"));
    }

    if (stepIndex >= 1) {
      const dir = new Vector3(0, 1, 0);
      const arrow = buildExtrusionDirectionOverlay(
        scene,
        Vector3.Zero(),
        dir,
        depth,
        "dir_arrow",
      );
      if (arrow) meshes.push(arrow);
      meshes.push(
        buildExtrusionMesh(
          scene,
          solid,
          createExtrusionMaterial(scene),
          "extrusion_solid",
        ),
      );
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
      directionRatios: [0, 1, 0],
    },
    depth: getNumber(params, "depth"),
  }),
};
