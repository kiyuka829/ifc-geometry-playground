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
  type: "IfcCShapeProfileDef",
  profileType: "AREA",
  depth: 5,
  width: 3,
  wallThickness: 0.35,
  girth: 1.3,
  internalFilletRadius: 0.15,
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

export const extrusionCShapeSample: SampleDef = {
  id: "extrusion-c-shape",
  title: "C-Shape / Channel Profile (IfcCShapeProfileDef)",
  description:
    "A channel-shaped cross-section defined by overall depth, width, wall thickness, girth, and optional internal fillet radius (IfcCShapeProfileDef). " +
    "Adjust the dimensions in the profile editor.",
  parameters: [],
  steps: [
    {
      id: "profile",
      label: "Step 1: C-Shape Cross-Section",
      description:
        "IfcCShapeProfileDef defines a channel-shaped section with a web on one side and two flanges returning inward. " +
        "Girth controls the flange reach measured from the outer top and bottom edges.",
    },
    {
      id: "direction",
      label: "Step 2: Extruded Direction",
      description:
        "The extrusion direction vector specifies where the C-shaped profile is swept. " +
        "Use this step to inspect direction and depth before generating the final solid.",
    },
    {
      id: "solid",
      label: "Step 3: Extruded Solid",
      description:
        "The C-shaped cross-section is extruded along the Z-axis to produce a 3D solid (IfcExtrudedAreaSolid).",
    },
  ],
  profileEditorConfig: {
    allowedTypes: ["c-shape"],
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
    const cDepth =
      activeProfile.type === "IfcCShapeProfileDef"
        ? activeProfile.depth
        : DEFAULT_PROFILE.depth;
    const width =
      activeProfile.type === "IfcCShapeProfileDef"
        ? activeProfile.width
        : DEFAULT_PROFILE.width;
    const wallThickness =
      activeProfile.type === "IfcCShapeProfileDef"
        ? activeProfile.wallThickness
        : DEFAULT_PROFILE.wallThickness;
    const girth =
      activeProfile.type === "IfcCShapeProfileDef"
        ? activeProfile.girth
        : DEFAULT_PROFILE.girth;
    const internalFilletRadius =
      activeProfile.type === "IfcCShapeProfileDef"
        ? activeProfile.internalFilletRadius
        : DEFAULT_PROFILE.internalFilletRadius;

    const generatedSolid: IfcExtrudedAreaSolid = {
      type: "IfcExtrudedAreaSolid",
      sweptArea: {
        type: "IfcCShapeProfileDef",
        profileType: "AREA",
        depth: cDepth,
        width,
        wallThickness,
        girth,
        ...(internalFilletRadius && internalFilletRadius > 0
          ? { internalFilletRadius }
          : {}),
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
        ...buildProfileOverlay(scene, activeProfile, "cshape_outline"),
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
      type: "IfcCShapeProfileDef",
      profileType: "AREA",
      depth: "(see profile editor)",
      width: "(see profile editor)",
      wallThickness: "(see profile editor)",
      girth: "(see profile editor)",
      internalFilletRadius: "(see profile editor)",
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
