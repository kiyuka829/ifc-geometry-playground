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
  type: "IfcRectangleHollowProfileDef",
  profileType: "AREA",
  xDim: 4,
  yDim: 3,
  wallThickness: 0.3,
};

const DEFAULT_EXTRUSION: ExtrusionParams = {
  depth: 6,
  extrudedDirection: { x: 0, y: 1, z: 0 },
};

export const extrusionRectHollowSample: SampleDef = {
  id: "extrusion-rect-hollow",
  title: "Rectangular Hollow Section (IfcRectangleHollowProfileDef)",
  description:
    "A rectangular hollow cross-section defined by xDim, yDim, and uniform wall thickness (IfcRectangleHollowProfileDef). " +
    "Adjust xDim, yDim, and wall thickness in the profile editor.",
  parameters: [],
  steps: [
    {
      id: "profile",
      label: "Step 1: Hollow Section Profile",
      description:
        "IfcRectangleHollowProfileDef defines a rectangular outer boundary with a concentric rectangular void. " +
        "The wall thickness is uniform on all four sides.",
    },
    {
      id: "solid",
      label: "Step 2: Extruded Solid",
      description:
        "The rectangular hollow cross-section is extruded along the Z-axis to produce a 3D solid (IfcExtrudedAreaSolid).",
    },
  ],
  profileEditorConfig: {
    allowedTypes: ["rect-hollow"],
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
      activeProfile.type === "IfcRectangleHollowProfileDef"
        ? activeProfile.xDim
        : DEFAULT_PROFILE.xDim;
    const yDim =
      activeProfile.type === "IfcRectangleHollowProfileDef"
        ? activeProfile.yDim
        : DEFAULT_PROFILE.yDim;
    const wallThickness =
      activeProfile.type === "IfcRectangleHollowProfileDef"
        ? activeProfile.wallThickness
        : DEFAULT_PROFILE.wallThickness;

    const generatedSolid: IfcExtrudedAreaSolid = {
      type: "IfcExtrudedAreaSolid",
      sweptArea: {
        type: "IfcRectangleHollowProfileDef",
        profileType: "AREA",
        xDim,
        yDim,
        wallThickness,
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
        ...buildProfileOverlay(scene, activeProfile, "rect_hollow_outline"),
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
      type: "IfcRectangleHollowProfileDef",
      profileType: "AREA",
      xDim: "(see profile editor)",
      yDim: "(see profile editor)",
      wallThickness: "(see profile editor)",
    },
    position: {
      type: "IfcAxis2Placement3D",
      location: { type: "IfcCartesianPoint", coordinates: [0, 0, 0] },
    },
    extrudedDirection: { type: "IfcDirection", directionRatios: "(see extrusion editor)" },
    depth: "(see extrusion editor)",
  }),
};
