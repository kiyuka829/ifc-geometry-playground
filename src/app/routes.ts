export type HomeSection =
  | "Foundations"
  | "Build Solids"
  | "Compose Solids";

export const HOME_SECTIONS: HomeSection[] = [
  "Foundations",
  "Build Solids",
  "Compose Solids",
];

export type Difficulty = "beginner" | "intermediate" | "advanced";
export type HomeKind = "featured" | "coverage";

interface BaseRoute {
  hash: string;
  title: string;
  description?: string;
}

export interface StaticRoute extends BaseRoute {
  sampleId?: undefined;
  homeSection?: undefined;
  difficulty?: undefined;
  homeKind?: undefined;
  status?: undefined;
}

export interface AvailableRoute extends BaseRoute {
  description: string;
  sampleId: string;
  homeSection: HomeSection;
  difficulty: Difficulty;
  homeKind: HomeKind;
  status: "available";
}

export interface PlannedRoute extends BaseRoute {
  description: string;
  sampleId?: undefined;
  homeSection: HomeSection;
  difficulty: Difficulty;
  homeKind: "featured";
  status: "planned";
}

export type Route = StaticRoute | AvailableRoute | PlannedRoute;

export const routes: Route[] = [
  { hash: "#/", title: "Home" },
  {
    hash: "#/examples/curves",
    title: "Curves",
    description:
      "Explore curve primitives before using them as directrices for sweep-based geometry.",
    homeSection: "Foundations",
    difficulty: "beginner",
    homeKind: "featured",
    status: "planned",
  },
  {
    hash: "#/examples/profiles",
    title: "Profiles",
    description:
      "Inspect and compare reusable area profiles before they are turned into solids.",
    homeSection: "Foundations",
    difficulty: "beginner",
    homeKind: "featured",
    status: "planned",
  },
  {
    hash: "#/examples/placement",
    title: "Placement",
    description:
      "See how local axes and placements affect profile orientation and solid generation.",
    homeSection: "Foundations",
    difficulty: "beginner",
    homeKind: "featured",
    status: "planned",
  },
  {
    hash: "#/examples/extrusion-rectangle",
    title: "Extrusion",
    description:
      "Build a swept solid from an area profile and an extrusion direction (IfcExtrudedAreaSolid).",
    sampleId: "extrusion-rectangle",
    homeSection: "Build Solids",
    difficulty: "beginner",
    homeKind: "featured",
    status: "available",
  },
  {
    hash: "#/examples/revolved",
    title: "Revolution",
    description:
      "Rotate an area profile around a local axis to create a revolved solid (IfcRevolvedAreaSolid).",
    sampleId: "revolved-rectangle",
    homeSection: "Build Solids",
    difficulty: "intermediate",
    homeKind: "featured",
    status: "available",
  },
  {
    hash: "#/examples/swept-disk",
    title: "Swept Disk",
    description:
      "Sweep a circular disk or pipe section along a curve-based path (IfcSweptDiskSolid).",
    sampleId: "swept-disk-basic",
    homeSection: "Build Solids",
    difficulty: "intermediate",
    homeKind: "featured",
    status: "available",
  },
  {
    hash: "#/examples/fixed-reference-sweep",
    title: "Fixed-Reference Sweep",
    description:
      "Sweep a profile along a curve while controlling the reference orientation (IfcFixedReferenceSweptAreaSolid).",
    homeSection: "Build Solids",
    difficulty: "intermediate",
    homeKind: "featured",
    status: "planned",
  },
  {
    hash: "#/examples/sectioned-solid",
    title: "Sectioned Solid",
    description:
      "Interpolate multiple section profiles along a horizontal alignment (IfcSectionedSolidHorizontal).",
    homeSection: "Build Solids",
    difficulty: "advanced",
    homeKind: "featured",
    status: "planned",
  },
  {
    hash: "#/examples/extrusion-rounded-rectangle",
    title: "Rounded Rectangle",
    description:
      "Variation coverage for IfcRoundedRectangleProfileDef within the extrusion workflow.",
    sampleId: "extrusion-rounded-rectangle",
    homeSection: "Build Solids",
    difficulty: "beginner",
    homeKind: "coverage",
    status: "available",
  },
  {
    hash: "#/examples/extrusion-circle",
    title: "Circle",
    description:
      "Variation coverage for IfcCircleProfileDef within the extrusion workflow.",
    sampleId: "extrusion-circle",
    homeSection: "Build Solids",
    difficulty: "beginner",
    homeKind: "coverage",
    status: "available",
  },
  {
    hash: "#/examples/extrusion-ellipse",
    title: "Ellipse",
    description:
      "Variation coverage for IfcEllipseProfileDef within the extrusion workflow.",
    sampleId: "extrusion-ellipse",
    homeSection: "Build Solids",
    difficulty: "beginner",
    homeKind: "coverage",
    status: "available",
  },
  {
    hash: "#/examples/extrusion-rect-hollow",
    title: "Rectangular Hollow",
    description:
      "Variation coverage for IfcRectangleHollowProfileDef within the extrusion workflow.",
    sampleId: "extrusion-rect-hollow",
    homeSection: "Build Solids",
    difficulty: "beginner",
    homeKind: "coverage",
    status: "available",
  },
  {
    hash: "#/examples/extrusion-circle-hollow",
    title: "Circular Hollow",
    description:
      "Variation coverage for IfcCircleHollowProfileDef within the extrusion workflow.",
    sampleId: "extrusion-circle-hollow",
    homeSection: "Build Solids",
    difficulty: "beginner",
    homeKind: "coverage",
    status: "available",
  },
  {
    hash: "#/examples/extrusion-i-shape",
    title: "I-Shape",
    description:
      "Variation coverage for IfcIShapeProfileDef within the extrusion workflow.",
    sampleId: "extrusion-i-shape",
    homeSection: "Build Solids",
    difficulty: "beginner",
    homeKind: "coverage",
    status: "available",
  },
  {
    hash: "#/examples/extrusion-asymmetric-i-shape",
    title: "Asymmetric I-Shape",
    description:
      "Variation coverage for IfcAsymmetricIShapeProfileDef within the extrusion workflow.",
    sampleId: "extrusion-asymmetric-i-shape",
    homeSection: "Build Solids",
    difficulty: "intermediate",
    homeKind: "coverage",
    status: "available",
  },
  {
    hash: "#/examples/extrusion-c-shape",
    title: "C-Shape",
    description:
      "Variation coverage for IfcCShapeProfileDef within the extrusion workflow.",
    sampleId: "extrusion-c-shape",
    homeSection: "Build Solids",
    difficulty: "beginner",
    homeKind: "coverage",
    status: "available",
  },
  {
    hash: "#/examples/extrusion-l-shape",
    title: "L-Shape",
    description:
      "Variation coverage for IfcLShapeProfileDef within the extrusion workflow.",
    sampleId: "extrusion-l-shape",
    homeSection: "Build Solids",
    difficulty: "beginner",
    homeKind: "coverage",
    status: "available",
  },
  {
    hash: "#/examples/extrusion-t-shape",
    title: "T-Shape",
    description:
      "Variation coverage for IfcTShapeProfileDef within the extrusion workflow.",
    sampleId: "extrusion-t-shape",
    homeSection: "Build Solids",
    difficulty: "beginner",
    homeKind: "coverage",
    status: "available",
  },
  {
    hash: "#/examples/extrusion-u-shape",
    title: "U-Shape",
    description:
      "Variation coverage for IfcUShapeProfileDef within the extrusion workflow.",
    sampleId: "extrusion-u-shape",
    homeSection: "Build Solids",
    difficulty: "beginner",
    homeKind: "coverage",
    status: "available",
  },
  {
    hash: "#/examples/extrusion-z-shape",
    title: "Z-Shape",
    description:
      "Variation coverage for IfcZShapeProfileDef within the extrusion workflow.",
    sampleId: "extrusion-z-shape",
    homeSection: "Build Solids",
    difficulty: "beginner",
    homeKind: "coverage",
    status: "available",
  },
  {
    hash: "#/examples/boolean",
    title: "Boolean",
    description:
      "Combine solids with boolean operations such as difference, union, and intersection (IfcBooleanResult).",
    sampleId: "boolean-difference",
    homeSection: "Compose Solids",
    difficulty: "beginner",
    homeKind: "featured",
    status: "available",
  },
  {
    hash: "#/examples/boolean-clipping",
    title: "Half-Space Clipping",
    description:
      "Trim a solid with half-space operands such as IfcHalfSpaceSolid and IfcPolygonalBoundedHalfSpace.",
    homeSection: "Compose Solids",
    difficulty: "intermediate",
    homeKind: "featured",
    status: "planned",
  },
  {
    hash: "#/examples/csg-primitives",
    title: "CSG Primitives",
    description:
      "Construct solids from primitive volumes such as block, cylinder, cone, sphere, and rectangular pyramid.",
    homeSection: "Compose Solids",
    difficulty: "beginner",
    homeKind: "featured",
    status: "planned",
  },
];
