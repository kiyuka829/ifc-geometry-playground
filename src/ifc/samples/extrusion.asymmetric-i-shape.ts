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
  type: "IfcAsymmetricIShapeProfileDef",
  profileType: "AREA",
  bottomFlangeWidth: 4.2,
  overallDepth: 5.5,
  webThickness: 0.45,
  bottomFlangeThickness: 0.7,
  topFlangeWidth: 3.1,
  topFlangeThickness: 0.45,
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

export const extrusionAsymmetricIShapeSample: SampleDef = {
  id: "extrusion-asymmetric-i-shape",
  title: "Asymmetric I-Shape Profile (IfcAsymmetricIShapeProfileDef)",
  description:
    "An asymmetric I-shaped cross-section defined by independent top and bottom flange widths and thicknesses, plus overall depth and web thickness (IfcAsymmetricIShapeProfileDef). " +
    "Adjust the section in the profile editor.",
  parameters: [],
  steps: [
    {
      id: "profile",
      label: "Step 1: Asymmetric I-Shape Cross-Section",
      description:
        "IfcAsymmetricIShapeProfileDef defines an I-shaped cross-section whose top and bottom flanges may differ in width and thickness while sharing a centered web.",
    },
    {
      id: "direction",
      label: "Step 2: Extruded Direction",
      description:
        "The extrusion direction vector specifies where the asymmetric I-shaped profile is swept. " +
        "Use this step to inspect direction and depth before generating the final solid.",
    },
    {
      id: "solid",
      label: "Step 3: Extruded Solid",
      description:
        "The asymmetric I-shaped cross-section is extruded along the Z-axis to produce a 3D solid (IfcExtrudedAreaSolid).",
    },
  ],
  profileEditorConfig: {
    allowedTypes: ["asymmetric-i-shape"],
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
    const bottomFlangeWidth =
      activeProfile.type === "IfcAsymmetricIShapeProfileDef"
        ? activeProfile.bottomFlangeWidth
        : DEFAULT_PROFILE.bottomFlangeWidth;
    const overallDepth =
      activeProfile.type === "IfcAsymmetricIShapeProfileDef"
        ? activeProfile.overallDepth
        : DEFAULT_PROFILE.overallDepth;
    const webThickness =
      activeProfile.type === "IfcAsymmetricIShapeProfileDef"
        ? activeProfile.webThickness
        : DEFAULT_PROFILE.webThickness;
    const bottomFlangeThickness =
      activeProfile.type === "IfcAsymmetricIShapeProfileDef"
        ? activeProfile.bottomFlangeThickness
        : DEFAULT_PROFILE.bottomFlangeThickness;
    const topFlangeWidth =
      activeProfile.type === "IfcAsymmetricIShapeProfileDef"
        ? activeProfile.topFlangeWidth
        : DEFAULT_PROFILE.topFlangeWidth;
    const topFlangeThickness =
      activeProfile.type === "IfcAsymmetricIShapeProfileDef"
        ? activeProfile.topFlangeThickness
        : DEFAULT_PROFILE.topFlangeThickness;

    const generatedSolid: IfcExtrudedAreaSolid = {
      type: "IfcExtrudedAreaSolid",
      sweptArea: {
        type: "IfcAsymmetricIShapeProfileDef",
        profileType: "AREA",
        bottomFlangeWidth,
        overallDepth,
        webThickness,
        bottomFlangeThickness,
        topFlangeWidth,
        topFlangeThickness,
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
        ...buildProfileOverlay(scene, activeProfile, "asymmetric_ishape_outline"),
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
      type: "IfcAsymmetricIShapeProfileDef",
      profileType: "AREA",
      bottomFlangeWidth: "(see profile editor)",
      overallDepth: "(see profile editor)",
      webThickness: "(see profile editor)",
      bottomFlangeThickness: "(see profile editor)",
      topFlangeWidth: "(see profile editor)",
      topFlangeThickness: "(see profile editor)",
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
