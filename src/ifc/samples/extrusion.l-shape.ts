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
  type: "IfcLShapeProfileDef",
  profileType: "AREA",
  depth: 4,
  width: 3,
  thickness: 0.4,
};

const DEFAULT_EXTRUSION: ExtrusionParams = {
  depth: 6,
  extrudedDirection: { x: 0, y: 1, z: 0 },
};

const DEFAULT_PLACEMENT: IfcAxis2Placement3D = {
  type: "IfcAxis2Placement3D",
  location: { x: 0, y: 0, z: 0 },
  axis: { x: 0, y: 0, z: 1 },
  refDirection: { x: 1, y: 0, z: 0 },
};

export const extrusionLShapeSample: SampleDef = {
  id: "extrusion-l-shape",
  title: "L-Shape / Angle Profile (IfcLShapeProfileDef)",
  description:
    "An L-shaped cross-section defined by vertical leg depth, horizontal leg width, and uniform thickness (IfcLShapeProfileDef). " +
    "Adjust the dimensions in the profile editor.",
  parameters: [],
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
        ...buildProfileOverlay(scene, activeProfile, "lshape_outline"),
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
      type: "IfcLShapeProfileDef",
      profileType: "AREA",
      depth: "(see profile editor)",
      width: "(see profile editor)",
      thickness: "(see profile editor)",
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
