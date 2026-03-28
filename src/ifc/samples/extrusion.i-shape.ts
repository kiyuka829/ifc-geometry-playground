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
  type: "IfcIShapeProfileDef",
  profileType: "AREA",
  overallWidth: 3,
  overallDepth: 5,
  webThickness: 0.2,
  flangeThickness: 0.3,
};

export const extrusionIShapeSample: SampleDef = {
  id: "extrusion-i-shape",
  title: "I-Shape / H-Beam Profile (IfcIShapeProfileDef)",
  description:
    "An I-shaped (or H-shaped) cross-section defined by overall width, overall depth, web thickness, and flange thickness (IfcIShapeProfileDef). " +
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
      label: "Step 1: I-Shape Cross-Section",
      description:
        "IfcIShapeProfileDef defines an I-shaped (or H-shaped) cross-section by overall width, overall depth, " +
        "web thickness, and flange thickness. The section is symmetric about both axes.",
    },
    {
      id: "solid",
      label: "Step 2: Extruded Solid",
      description:
        "The I-shaped cross-section is extruded along the Z-axis to produce a 3D solid (IfcExtrudedAreaSolid).",
    },
  ],
  profileEditorConfig: {
    allowedTypes: ["i-shape"],
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
    const overallWidth =
      activeProfile.type === "IfcIShapeProfileDef"
        ? activeProfile.overallWidth
        : DEFAULT_PROFILE.overallWidth;
    const overallDepth =
      activeProfile.type === "IfcIShapeProfileDef"
        ? activeProfile.overallDepth
        : DEFAULT_PROFILE.overallDepth;
    const webThickness =
      activeProfile.type === "IfcIShapeProfileDef"
        ? activeProfile.webThickness
        : DEFAULT_PROFILE.webThickness;
    const flangeThickness =
      activeProfile.type === "IfcIShapeProfileDef"
        ? activeProfile.flangeThickness
        : DEFAULT_PROFILE.flangeThickness;

    const generatedSolid: IfcExtrudedAreaSolid = {
      type: "IfcExtrudedAreaSolid",
      sweptArea: {
        type: "IfcIShapeProfileDef",
        profileType: "AREA",
        overallWidth,
        overallDepth,
        webThickness,
        flangeThickness,
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
        ...buildProfileOverlay(scene, activeProfile, "ishape_outline"),
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
      type: "IfcIShapeProfileDef",
      profileType: "AREA",
      overallWidth: "(see profile editor)",
      overallDepth: "(see profile editor)",
      webThickness: "(see profile editor)",
      flangeThickness: "(see profile editor)",
    },
    position: {
      type: "IfcAxis2Placement3D",
      location: { type: "IfcCartesianPoint", coordinates: [0, 0, 0] },
    },
    extrudedDirection: { type: "IfcDirection", directionRatios: [0, 1, 0] },
    depth: getNumber(params, "depth"),
  }),
};
