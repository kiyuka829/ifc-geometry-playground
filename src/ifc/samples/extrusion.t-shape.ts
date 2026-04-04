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
  type: "IfcTShapeProfileDef",
  profileType: "AREA",
  depth: 5,
  flangeWidth: 4,
  webThickness: 0.8,
  flangeThickness: 1.2,
};

const DEFAULT_EXTRUSION: ExtrusionParams = {
  depth: 6,
  extrudedDirection: { x: 0, y: 0, z: 1 },
};

const DEFAULT_PLACEMENT: IfcAxis2Placement3D = {
  type: "IfcAxis2Placement3D",
  location: { x: 0, y: 0, z: 0 },
  axis: { x: 0, y: 0, z: 1 },
  refDirection: { x: 1, y: 0, z: 0 },
};

export const extrusionTShapeSample: SampleDef = {
  id: "extrusion-t-shape",
  title: "T-Shape / Tee Profile (IfcTShapeProfileDef)",
  description:
    "A T-shaped cross-section defined by depth, flange width, web thickness, and flange thickness (IfcTShapeProfileDef). " +
    "Adjust the dimensions in the profile editor.",
  parameters: [],
  steps: [
    {
      id: "profile",
      label: "Step 1: T-Shape Cross-Section",
      description:
        "IfcTShapeProfileDef defines a tee-shaped section with a top flange and a centered web. " +
        "This sample focuses on the main dimensional parameters used to form the profile.",
    },
    {
      id: "direction",
      label: "Step 2: Extruded Direction",
      description:
        "The extrusion direction vector specifies where the T-shaped profile is swept. " +
        "Use this step to inspect direction and depth before generating the final solid.",
    },
    {
      id: "solid",
      label: "Step 3: Extruded Solid",
      description:
        "The T-shaped cross-section is extruded along the Z-axis to produce a 3D solid (IfcExtrudedAreaSolid).",
    },
  ],
  profileEditorConfig: {
    allowedTypes: ["t-shape"],
    defaultProfile: DEFAULT_PROFILE,
  },
  extrusionEditorConfig: {
    defaultExtrusion: DEFAULT_EXTRUSION,
  },
  placementEditorConfig: {
    defaultPlacement: DEFAULT_PLACEMENT,
  },
  buildGeometry: (
    scene: Scene,
    _params: ParamValues,
    stepIndex: number,
    profile?: IfcProfileDef,
    _path?: Vec3[],
    extrusion?: ExtrusionParams,
    placement?: IfcAxis2Placement3D,
    _sweepView?: SweepViewState,
  ): Mesh[] => {
    const meshes: Mesh[] = [];
    const depth = extrusion?.depth ?? DEFAULT_EXTRUSION.depth;
    const extrusionDirection =
      extrusion?.extrudedDirection ?? DEFAULT_EXTRUSION.extrudedDirection;
    const activePlacement = placement ?? DEFAULT_PLACEMENT;
    const activeProfile: IfcProfileDef = profile ?? DEFAULT_PROFILE;
    const flangeWidth =
      activeProfile.type === "IfcTShapeProfileDef"
        ? activeProfile.flangeWidth
        : DEFAULT_PROFILE.flangeWidth;
    const tDepth =
      activeProfile.type === "IfcTShapeProfileDef"
        ? activeProfile.depth
        : DEFAULT_PROFILE.depth;
    const webThickness =
      activeProfile.type === "IfcTShapeProfileDef"
        ? activeProfile.webThickness
        : DEFAULT_PROFILE.webThickness;
    const flangeThickness =
      activeProfile.type === "IfcTShapeProfileDef"
        ? activeProfile.flangeThickness
        : DEFAULT_PROFILE.flangeThickness;

    const generatedSolid: IfcExtrudedAreaSolid = {
      type: "IfcExtrudedAreaSolid",
      sweptArea: {
        type: "IfcTShapeProfileDef",
        profileType: "AREA",
        depth: tDepth,
        flangeWidth,
        webThickness,
        flangeThickness,
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
        ...buildProfileOverlay(scene, activeProfile, "tshape_outline"),
      );
    }

    if (stepIndex >= 1) {
      const arrow = buildExtrusionDirectionOverlay(
        scene,
        { x: 0, y: 0, z: 0 },
        extrusionDirection,
        depth,
        "dir_arrow",
        activePlacement,
      );
      if (arrow) meshes.push(arrow);
    }

    if (stepIndex >= 2) {
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
      type: "IfcTShapeProfileDef",
      profileType: "AREA",
      depth: "(see profile editor)",
      flangeWidth: "(see profile editor)",
      webThickness: "(see profile editor)",
      flangeThickness: "(see profile editor)",
    },
    position: {
      type: "IfcAxis2Placement3D",
      location: "(see placement editor)",
      axis: "(see placement editor)",
      refDirection: "(see placement editor)",
    },
    extrudedDirection: {
      type: "IfcDirection",
      directionRatios: "(see extrusion editor)",
    },
    depth: "(see extrusion editor)",
  }),
};
