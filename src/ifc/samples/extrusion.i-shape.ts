import { Vector3 } from "@babylonjs/core";
import type { Scene, Mesh } from "@babylonjs/core";
import type {
  SampleDef,
  ParamValues,
  IfcProfileDef,
  ExtrusionParams,
  Vec3,
  IfcAxis2Placement3D,
  SweepViewState,
} from "../../types.ts";
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

const DEFAULT_EXTRUSION: ExtrusionParams = {
  depth: 6,
  extrudedDirection: { x: 0, y: 1, z: 0 },
};

export const extrusionIShapeSample: SampleDef = {
  id: "extrusion-i-shape",
  title: "I-Shape / H-Beam Profile (IfcIShapeProfileDef)",
  description:
    "An I-shaped (or H-shaped) cross-section defined by overall width, overall depth, web thickness, and flange thickness (IfcIShapeProfileDef). " +
    "Adjust the dimensions in the profile editor.",
  parameters: [],
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
  extrusionEditorConfig: {
    defaultExtrusion: DEFAULT_EXTRUSION,
  },
  buildGeometry: (
    scene: Scene,
    _params: ParamValues,
    stepIndex: number,
    profile?: IfcProfileDef,
    _path?: Vec3[],
    extrusion?: ExtrusionParams,
    _placement?: IfcAxis2Placement3D,
    _sweepView?: SweepViewState,
  ): Mesh[] => {
    const meshes: Mesh[] = [];
    const depth = extrusion?.depth ?? DEFAULT_EXTRUSION.depth;
    const extrusionDirection =
      extrusion?.extrudedDirection ?? DEFAULT_EXTRUSION.extrudedDirection;
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
      extrudedDirection: {
        type: "IfcDirection",
        directionRatios: [
          extrusionDirection.x,
          extrusionDirection.y,
          extrusionDirection.z,
        ],
      },
      depth,
    };

    if (stepIndex >= 0) {
      meshes.push(
        ...buildProfileOverlay(scene, activeProfile, "ishape_outline"),
      );
    }

    if (stepIndex >= 1) {
      const dir = new Vector3(
        extrusionDirection.x,
        extrusionDirection.y,
        extrusionDirection.z,
      );
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
  getIFCRepresentation: (_params: ParamValues) => ({
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
    extrudedDirection: {
      type: "IfcDirection",
      directionRatios: "(see extrusion editor)",
    },
    depth: "(see extrusion editor)",
  }),
};
