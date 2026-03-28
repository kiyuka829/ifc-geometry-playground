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
import type { IfcExtrudedAreaSolid } from "../generated/schema.ts";

const DEFAULT_PROFILE: IfcProfileDef = {
  type: "IfcLShapeProfileDef",
  profileType: "AREA",
  depth: 4,
  width: 3,
  thickness: 0.4,
};

export const extrusionLShapeSample: SampleDef = {
  id: "extrusion-l-shape",
  title: "L-Shape / Angle Profile (IfcLShapeProfileDef)",
  description:
    "An L-shaped cross-section defined by vertical leg depth, horizontal leg width, and uniform thickness (IfcLShapeProfileDef). " +
    "Adjust the dimensions in the profile editor.",
  parameters: [
    {
      key: "depth",
      label: "Extrusion Depth",
      type: "number",
      min: 0.5,
      max: 20,
      step: 0.1,
      defaultValue: 6,
    },
  ],
  steps: [
    {
      id: "profile",
      label: "Step 1: L-Shape Cross-Section",
      description:
        "IfcLShapeProfileDef defines an L-shaped cross-section with a vertical leg (depth), " +
        "a horizontal leg (width), and a uniform thickness. " +
        "The bounding box centre is used as the local origin.",
    },
    {
      id: "solid",
      label: "Step 2: Extruded Solid",
      description:
        "The L-shaped cross-section is extruded along the Z-axis to produce a 3D solid (IfcExtrudedAreaSolid).",
    },
  ],
  profileEditorConfig: {
    allowedTypes: ["l-shape"],
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
    const width =
      activeProfile.type === "IfcLShapeProfileDef"
        ? activeProfile.width
        : DEFAULT_PROFILE.width;
    const lDepth =
      activeProfile.type === "IfcLShapeProfileDef"
        ? activeProfile.depth
        : DEFAULT_PROFILE.depth;
    const thickness =
      activeProfile.type === "IfcLShapeProfileDef"
        ? activeProfile.thickness
        : DEFAULT_PROFILE.thickness;

    const generatedSolid: IfcExtrudedAreaSolid = {
      type: "IfcExtrudedAreaSolid",
      sweptArea: {
        type: "IfcLShapeProfileDef",
        profileType: "AREA",
        depth: lDepth,
        width,
        thickness,
      },
      position: {
        type: "IfcAxis2Placement3D",
        location: { type: "IfcCartesianPoint", coordinates: [0, 0, 0] },
      },
      extrudedDirection: { type: "IfcDirection", directionRatios: [0, 1, 0] },
      depth,
    };

    if (stepIndex >= 0) {
      meshes.push(
        ...buildProfileOverlay(scene, activeProfile, "lshape_outline"),
      );
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
          generatedSolid,
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
      type: "IfcLShapeProfileDef",
      profileType: "AREA",
      depth: "(see profile editor)",
      width: "(see profile editor)",
      thickness: "(see profile editor)",
    },
    position: {
      type: "IfcAxis2Placement3D",
      location: { type: "IfcCartesianPoint", coordinates: [0, 0, 0] },
    },
    extrudedDirection: { type: "IfcDirection", directionRatios: [0, 1, 0] },
    depth: getNumber(params, "depth"),
  }),
};
