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

const DEFAULT_X_DIM = 4;
const DEFAULT_Y_DIM = 3;
const DEFAULT_ROUNDING_RADIUS = 0.5;

const DEFAULT_PROFILE: IfcProfileDef = {
  type: "IfcRoundedRectangleProfileDef",
  profileType: "AREA",
  xDim: DEFAULT_X_DIM,
  yDim: DEFAULT_Y_DIM,
  roundingRadius: DEFAULT_ROUNDING_RADIUS,
};

const DEFAULT_EXTRUSION: ExtrusionParams = {
  depth: 5,
  extrudedDirection: { x: 0, y: 0, z: 1 },
};

const DEFAULT_PLACEMENT: IfcAxis2Placement3D = {
  type: "IfcAxis2Placement3D",
  location: { x: 0, y: 0, z: 0 },
  axis: { x: 0, y: 0, z: 1 },
  refDirection: { x: 1, y: 0, z: 0 },
};

export const extrusionRoundedRectangleSample: SampleDef = {
  id: "extrusion-rounded-rectangle",
  title: "Rounded Rectangle Profile (IfcRoundedRectangleProfileDef)",
  description:
    "A rounded rectangular cross-section extruded along the Z-axis into a 3D solid. " +
    "Edit xDim, yDim, and the corner radius in the profile editor.",
  parameters: [],
  steps: [
    {
      id: "profile",
      label: "Step 1: Rounded Rectangle Profile",
      description:
        "IfcRoundedRectangleProfileDef defines a rectangular cross-section by xDim and yDim, with arcs at the corners controlled by roundingRadius. " +
        "Edit those values in the profile editor above.",
    },
    {
      id: "direction",
      label: "Step 2: Extruded Direction",
      description:
        "The extrusion direction vector defines where the rounded profile will be swept. " +
        "Adjust direction and depth to inspect how IfcExtrudedAreaSolid is configured before generating the solid.",
    },
    {
      id: "solid",
      label: "Step 3: Extruded Solid",
      description:
        "The rounded rectangle is extruded along the Z-axis by the given depth to produce a prismatic solid with filleted corners. " +
        "This is equivalent to IfcExtrudedAreaSolid applied to an IfcRoundedRectangleProfileDef.",
    },
  ],
  profileEditorConfig: {
    allowedTypes: ["rounded-rectangle"],
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
    const xDim =
      activeProfile.type === "IfcRoundedRectangleProfileDef"
        ? activeProfile.xDim
        : DEFAULT_X_DIM;
    const yDim =
      activeProfile.type === "IfcRoundedRectangleProfileDef"
        ? activeProfile.yDim
        : DEFAULT_Y_DIM;
    const roundingRadius =
      activeProfile.type === "IfcRoundedRectangleProfileDef"
        ? activeProfile.roundingRadius
        : DEFAULT_ROUNDING_RADIUS;

    const generatedSolid: IfcExtrudedAreaSolid = {
      type: "IfcExtrudedAreaSolid",
      sweptArea: {
        type: "IfcRoundedRectangleProfileDef",
        profileType: "AREA",
        xDim,
        yDim,
        roundingRadius,
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
        ...buildProfileOverlay(
          scene,
          activeProfile,
          "rounded_rectangle_outline",
        ),
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
      type: "IfcRoundedRectangleProfileDef",
      profileType: "AREA",
      xDim: "(see profile editor)",
      yDim: "(see profile editor)",
      roundingRadius: "(see profile editor)",
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
