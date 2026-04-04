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
  type: "IfcEllipseProfileDef",
  profileType: "AREA",
  semiAxis1: 3,
  semiAxis2: 2,
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

export const extrusionEllipseSample: SampleDef = {
  id: "extrusion-ellipse",
  title: "Ellipse Profile (IfcEllipseProfileDef)",
  description:
    "An elliptical cross-section extruded into a 3D solid using IfcExtrudedAreaSolid. " +
    "Adjust the two semi-axes in the profile editor and extrusion settings below.",
  parameters: [],
  steps: [
    {
      id: "profile",
      label: "Step 1: Ellipse Profile",
      description:
        "IfcEllipseProfileDef defines an elliptical cross-section by semiAxis1 and semiAxis2. " +
        "Edit both semi-axes using the profile editor above.",
    },
    {
      id: "direction",
      label: "Step 2: Extruded Direction",
      description:
        "The extrusion direction vector specifies where the elliptical profile will be swept. " +
        "Adjust direction and depth to inspect the setup before creating the final solid.",
    },
    {
      id: "solid",
      label: "Step 3: Extruded Solid",
      description:
        "The ellipse is extruded along the Z-axis by the given depth to produce an elliptical cylinder. " +
        "This is equivalent to IfcExtrudedAreaSolid applied to an IfcEllipseProfileDef.",
    },
  ],
  profileEditorConfig: {
    allowedTypes: ["ellipse"],
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
    const semiAxis1 =
      activeProfile.type === "IfcEllipseProfileDef"
        ? activeProfile.semiAxis1
        : DEFAULT_PROFILE.semiAxis1;
    const semiAxis2 =
      activeProfile.type === "IfcEllipseProfileDef"
        ? activeProfile.semiAxis2
        : DEFAULT_PROFILE.semiAxis2;

    const generatedSolid: IfcExtrudedAreaSolid = {
      type: "IfcExtrudedAreaSolid",
      sweptArea: {
        type: "IfcEllipseProfileDef",
        profileType: "AREA",
        semiAxis1,
        semiAxis2,
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
        ...buildProfileOverlay(scene, activeProfile, "ellipse_outline"),
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
      type: "IfcEllipseProfileDef",
      profileType: "AREA",
      semiAxis1: "(see profile editor)",
      semiAxis2: "(see profile editor)",
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
