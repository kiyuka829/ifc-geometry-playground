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
  type: "IfcZShapeProfileDef",
  profileType: "AREA",
  depth: 5,
  flangeWidth: 3.5,
  webThickness: 0.6,
  flangeThickness: 0.8,
  filletRadius: 0.2,
  edgeRadius: 0.15,
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

export const extrusionZShapeSample: SampleDef = {
  id: "extrusion-z-shape",
  title: "Z-Shape Profile (IfcZShapeProfileDef)",
  description:
    "A Z-shaped cross-section defined by depth, flange width, web thickness, flange thickness, and optional corner radii (IfcZShapeProfileDef). " +
    "Adjust the dimensions in the profile editor.",
  parameters: [],
  steps: [
    {
      id: "profile",
      label: "Step 1: Z-Shape Cross-Section",
      description:
        "IfcZShapeProfileDef defines two opposite flanges offset across a central web, creating a Z-shaped section. " +
        "This sample also exposes the optional inner fillet radius and outer edge radius.",
    },
    {
      id: "direction",
      label: "Step 2: Extruded Direction",
      description:
        "The extrusion direction vector specifies where the Z-shaped profile is swept. " +
        "Use this step to inspect direction and depth before generating the final solid.",
    },
    {
      id: "solid",
      label: "Step 3: Extruded Solid",
      description:
        "The Z-shaped cross-section is extruded along the Z-axis to produce a 3D solid (IfcExtrudedAreaSolid).",
    },
  ],
  profileEditorConfig: {
    allowedTypes: ["z-shape"],
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
    const zDepth =
      activeProfile.type === "IfcZShapeProfileDef"
        ? activeProfile.depth
        : DEFAULT_PROFILE.depth;
    const flangeWidth =
      activeProfile.type === "IfcZShapeProfileDef"
        ? activeProfile.flangeWidth
        : DEFAULT_PROFILE.flangeWidth;
    const webThickness =
      activeProfile.type === "IfcZShapeProfileDef"
        ? activeProfile.webThickness
        : DEFAULT_PROFILE.webThickness;
    const flangeThickness =
      activeProfile.type === "IfcZShapeProfileDef"
        ? activeProfile.flangeThickness
        : DEFAULT_PROFILE.flangeThickness;
    const filletRadius =
      activeProfile.type === "IfcZShapeProfileDef"
        ? activeProfile.filletRadius
        : DEFAULT_PROFILE.filletRadius;
    const edgeRadius =
      activeProfile.type === "IfcZShapeProfileDef"
        ? activeProfile.edgeRadius
        : DEFAULT_PROFILE.edgeRadius;

    const generatedSolid: IfcExtrudedAreaSolid = {
      type: "IfcExtrudedAreaSolid",
      sweptArea: {
        type: "IfcZShapeProfileDef",
        profileType: "AREA",
        depth: zDepth,
        flangeWidth,
        webThickness,
        flangeThickness,
        ...(filletRadius && filletRadius > 0 ? { filletRadius } : {}),
        ...(edgeRadius && edgeRadius > 0 ? { edgeRadius } : {}),
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
        ...buildProfileOverlay(scene, activeProfile, "zshape_outline"),
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
      type: "IfcZShapeProfileDef",
      profileType: "AREA",
      depth: "(see profile editor)",
      flangeWidth: "(see profile editor)",
      webThickness: "(see profile editor)",
      flangeThickness: "(see profile editor)",
      filletRadius: "(see profile editor)",
      edgeRadius: "(see profile editor)",
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
