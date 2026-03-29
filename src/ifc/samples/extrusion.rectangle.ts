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

const DEFAULT_X_DIM = 4;
const DEFAULT_Y_DIM = 3;

const DEFAULT_PROFILE: IfcProfileDef = {
  type: "IfcRectangleProfileDef",
  profileType: "AREA",
  xDim: DEFAULT_X_DIM,
  yDim: DEFAULT_Y_DIM,
};

const DEFAULT_EXTRUSION: ExtrusionParams = {
  depth: 5,
  extrudedDirection: { x: 0, y: 1, z: 0 },
};

export const extrusionRectangleSample: SampleDef = {
  id: "extrusion-rectangle",
  title: "Rectangle Profile (IfcRectangleProfileDef)",
  description:
    "A basic rectangle profile extruded along the Y-axis to create a 3D solid. " +
    "Edit xDim and yDim in the profile editor.",
  parameters: [],
  steps: [
    {
      id: "profile",
      label: "Step 1: Rectangle Profile",
      description:
        "IfcRectangleProfileDef defines a rectangular cross-section by xDim and yDim. " +
        "Edit dimensions in the profile editor above.",
    },
    {
      id: "solid",
      label: "Step 2: Extruded Solid",
      description:
        "The rectangle is extruded along the Y-axis by the given depth to produce a rectangular prism. " +
        "This is equivalent to IfcExtrudedAreaSolid applied to an IfcRectangleProfileDef.",
    },
  ],
  profileEditorConfig: {
    allowedTypes: ["rectangle"],
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
    const xDim =
      activeProfile.type === "IfcRectangleProfileDef"
        ? activeProfile.xDim
        : DEFAULT_X_DIM;
    const yDim =
      activeProfile.type === "IfcRectangleProfileDef"
        ? activeProfile.yDim
        : DEFAULT_Y_DIM;

    const generatedSolid: IfcExtrudedAreaSolid = {
      type: "IfcExtrudedAreaSolid",
      sweptArea: {
        type: "IfcRectangleProfileDef",
        profileType: "AREA",
        xDim,
        yDim,
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
        ...buildProfileOverlay(scene, activeProfile, "rectangle_outline"),
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
      type: "IfcRectangleProfileDef",
      profileType: "AREA",
      xDim: "(see profile editor)",
      yDim: "(see profile editor)",
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
