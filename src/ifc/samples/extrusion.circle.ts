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
  type: "IfcCircleProfileDef",
  profileType: "AREA",
  radius: 2,
};

const DEFAULT_EXTRUSION: ExtrusionParams = {
  depth: 5,
  extrudedDirection: { x: 0, y: 1, z: 0 },
};

const DEFAULT_PLACEMENT: IfcAxis2Placement3D = {
  type: "IfcAxis2Placement3D",
  location: { x: 0, y: 0, z: 0 },
  axis: { x: 0, y: 0, z: 1 },
  refDirection: { x: 1, y: 0, z: 0 },
};

export const extrusionCircleSample: SampleDef = {
  id: "extrusion-circle",
  title: "Circle Profile (IfcCircleProfileDef)",
  description:
    "A circular cross-section extruded into a 3D solid using IfcExtrudedAreaSolid. " +
    "Adjust the radius in the profile editor and extrusion settings below.",
  parameters: [],
  steps: [
    {
      id: "profile",
      label: "Step 1: Circle Profile",
      description:
        "IfcCircleProfileDef defines a circular cross-section by its radius. " +
        "Edit the radius using the profile editor above.",
    },
    {
      id: "solid",
      label: "Step 2: Extruded Solid",
      description:
        "The circle is extruded along the Z-axis by the given depth to produce a cylinder. " +
        "This is equivalent to IfcExtrudedAreaSolid applied to an IfcCircleProfileDef.",
    },
  ],
  profileEditorConfig: {
    allowedTypes: ["circle"],
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
    const radius =
      activeProfile.type === "IfcCircleProfileDef" ? activeProfile.radius : 2;

    const generatedSolid: IfcExtrudedAreaSolid = {
      type: "IfcExtrudedAreaSolid",
      sweptArea: { type: "IfcCircleProfileDef", profileType: "AREA", radius },
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
        ...buildProfileOverlay(scene, activeProfile, "circle_outline"),
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
      type: "IfcCircleProfileDef",
      profileType: "AREA",
      radius: "(see profile editor)",
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
