import { Vector3 } from "@babylonjs/core";
import type { Scene, Mesh } from "@babylonjs/core";
import type {
  SampleDef,
  ParamValues,
  IfcProfileDef,
  Vec3,
  IfcAxis2Placement3D,
  SweepViewState,
} from "../../types.ts";
import { getNumber } from "../../types.ts";
import { buildExtrusionMesh } from "../operations/extrusion.ts";
import { createExtrusionMaterial } from "../../engine/materials.ts";
import {
  buildProfileOverlay,
  buildExtrusionDirectionOverlay,
} from "../../engine/overlays.ts";
import type { IfcExtrudedAreaSolid } from "../generated/schema.ts";

const DEFAULT_PROFILE: IfcProfileDef = {
  type: "IfcCircleHollowProfileDef",
  profileType: "AREA",
  radius: 2,
  wallThickness: 0.3,
};

export const extrusionCircleHollowSample: SampleDef = {
  id: "extrusion-circle-hollow",
  title: "Circular Hollow Section (IfcCircleHollowProfileDef)",
  description:
    "A circular hollow cross-section defined by outer radius and wall thickness (IfcCircleHollowProfileDef). " +
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
      label: "Step 1: Hollow Circle Profile",
      description:
        "IfcCircleHollowProfileDef defines a circular outer boundary with a concentric circular void. " +
        "The inner radius equals the outer radius minus the wall thickness.",
    },
    {
      id: "solid",
      label: "Step 2: Extruded Solid",
      description:
        "The circular hollow cross-section is extruded along the Z-axis to produce a 3D solid (IfcExtrudedAreaSolid).",
    },
  ],
  profileEditorConfig: {
    allowedTypes: ["circle-hollow"],
    defaultProfile: DEFAULT_PROFILE,
  },
  buildGeometry: (
    scene: Scene,
    params: ParamValues,
    stepIndex: number,
    profile?: IfcProfileDef,
    _path?: Vec3[],
    _placement?: IfcAxis2Placement3D,
    _sweepView?: SweepViewState,
  ): Mesh[] => {
    const meshes: Mesh[] = [];
    const depth = getNumber(params, "depth");
    const activeProfile: IfcProfileDef = profile ?? DEFAULT_PROFILE;
    const radius =
      activeProfile.type === "IfcCircleHollowProfileDef"
        ? activeProfile.radius
        : DEFAULT_PROFILE.radius;
    const wallThickness =
      activeProfile.type === "IfcCircleHollowProfileDef"
        ? activeProfile.wallThickness
        : DEFAULT_PROFILE.wallThickness;

    const generatedSolid: IfcExtrudedAreaSolid = {
      type: "IfcExtrudedAreaSolid",
      sweptArea: {
        type: "IfcCircleHollowProfileDef",
        profileType: "AREA",
        radius,
        wallThickness,
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
        ...buildProfileOverlay(scene, activeProfile, "circle_hollow_outline"),
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
      type: "IfcCircleHollowProfileDef",
      profileType: "AREA",
      radius: "(see profile editor)",
      wallThickness: "(see profile editor)",
    },
    position: {
      type: "IfcAxis2Placement3D",
      location: { type: "IfcCartesianPoint", coordinates: [0, 0, 0] },
    },
    extrudedDirection: { type: "IfcDirection", directionRatios: [0, 1, 0] },
    depth: getNumber(params, "depth"),
  }),
};
