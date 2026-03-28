import { Vector3 } from "@babylonjs/core";
import type { Scene, Mesh } from "@babylonjs/core";
import type { SampleDef, ParamValues, IfcProfileDef, Vec3, IfcAxis2Placement3D, SweepViewState } from "../../types.ts";
import { getNumber } from "../../types.ts";
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

export const extrusionCircleSample: SampleDef = {
  id: "extrusion-circle",
  title: "Circle Profile (IfcCircleProfileDef)",
  description:
    "A circular cross-section extruded into a 3D solid using IfcExtrudedAreaSolid. " +
    "Adjust the radius in the profile editor and the extrusion depth below.",
  parameters: [
    {
      key: "depth",
      label: "Extrusion Depth",
      type: "number",
      min: 0.5,
      max: 20,
      step: 0.1,
      defaultValue: 5,
    },
  ],
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
  buildGeometry: (
    scene: Scene,
    params: ParamValues,
    stepIndex: number,
    profile?: IfcProfileDef,
    _path?: Vec3[],
    _placement?: IfcAxis2Placement3D,
    _sweepView?: SweepViewState,
  ): Mesh[] => {
    const meshes: Mesh[] = [];
    const depth = getNumber(params, "depth");
    const activeProfile: IfcProfileDef = profile ?? DEFAULT_PROFILE;
    const radius =
      activeProfile.type === "IfcCircleProfileDef" ? activeProfile.radius : 2;

    const generatedSolid: IfcExtrudedAreaSolid = {
      type: "IfcExtrudedAreaSolid",
      sweptArea: { type: "IfcCircleProfileDef", profileType: "AREA", radius },
      position: {
        type: "IfcAxis2Placement3D",
        location: { type: "IfcCartesianPoint", coordinates: [0, 0, 0] },
      },
      extrudedDirection: { type: "IfcDirection", directionRatios: [0, 1, 0] },
      depth,
    };

    if (stepIndex >= 0) {
      meshes.push(
        ...buildProfileOverlay(scene, activeProfile, "circle_outline"),
      );
    }

    if (stepIndex >= 1) {
      const dir = new Vector3(0, 1, 0);
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
  getIFCRepresentation: (params: ParamValues) => ({
    type: "IfcExtrudedAreaSolid",
    sweptArea: {
      type: "IfcCircleProfileDef",
      profileType: "AREA",
      radius: "(see profile editor)",
    },
    position: {
      type: "IfcAxis2Placement3D",
      location: { type: "IfcCartesianPoint", coordinates: [0, 0, 0] },
    },
    extrudedDirection: { type: "IfcDirection", directionRatios: [0, 1, 0] },
    depth: getNumber(params, "depth"),
  }),
};
