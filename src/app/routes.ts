export type GeometryCategory =
  | "ExtrudedAreaSolid"
  | "Swept Disk Solid"
  | "Revolved Area Solid"
  | "Boolean"
  | "Tessellation"
  | "BRep"
  | "Alignment";

export const GEOMETRY_CATEGORIES: GeometryCategory[] = [
  "ExtrudedAreaSolid",
  "Swept Disk Solid",
  "Revolved Area Solid",
  "Boolean",
  "Tessellation",
  "BRep",
  "Alignment",
];

export type Difficulty = "beginner" | "intermediate" | "advanced";

interface BaseRoute {
  hash: string;
  title: string;
  description?: string;
}

export interface StaticRoute extends BaseRoute {
  sampleId?: undefined;
  category?: undefined;
  difficulty?: undefined;
  status?: undefined;
}

export interface AvailableRoute extends BaseRoute {
  description: string;
  sampleId: string;
  category: GeometryCategory;
  difficulty: Difficulty;
  status: "available";
}

export interface PlannedRoute extends BaseRoute {
  description: string;
  sampleId?: undefined;
  category: GeometryCategory;
  difficulty: Difficulty;
  status: "planned";
}

export type Route = StaticRoute | AvailableRoute | PlannedRoute;

export const routes: Route[] = [
  { hash: "#/", title: "Home" },
  {
    hash: "#/examples/extrusion-rectangle",
    title: "Rectangle Profile (IfcRectangleProfileDef)",
    description:
      "Extrudes a rectangular cross-section into a 3D solid (IfcExtrudedAreaSolid + IfcRectangleProfileDef).",
    sampleId: "extrusion-rectangle",
    category: "ExtrudedAreaSolid",
    difficulty: "beginner",
    status: "available",
  },
  {
    hash: "#/examples/swept-disk",
    title: "Swept Disk Solid",
    description:
      "Sweeps a circular disk along a 3-D polyline path to create a rod or hollow pipe (IfcSweptDiskSolid).",
    sampleId: "swept-disk-basic",
    category: "Swept Disk Solid",
    difficulty: "intermediate",
    status: "available",
  },
  {
    hash: "#/examples/revolved",
    title: "Revolved Area Solid",
    description:
      "Revolves a 2D profile around an axis to create a 3D solid (IfcRevolvedAreaSolid).",
    category: "Revolved Area Solid",
    difficulty: "intermediate",
    status: "planned",
  },
  {
    hash: "#/examples/boolean",
    title: "Boolean Operation",
    description:
      "Combines two solids using DIFFERENCE, UNION, or INTERSECTION (IfcBooleanResult).",
    sampleId: "boolean-difference",
    category: "Boolean",
    difficulty: "beginner",
    status: "available",
  },
  {
    hash: "#/examples/boolean-clipping",
    title: "Boolean Clipping",
    description:
      "Clips a solid with a half-space to produce an angled cut (IfcBooleanClippingResult).",
    category: "Boolean",
    difficulty: "intermediate",
    status: "planned",
  },
  {
    hash: "#/examples/extrusion-circle",
    title: "Circle Profile (IfcCircleProfileDef)",
    description:
      "Extrudes a circular cross-section into a 3D solid (IfcExtrudedAreaSolid + IfcCircleProfileDef).",
    sampleId: "extrusion-circle",
    category: "ExtrudedAreaSolid",
    difficulty: "beginner",
    status: "available",
  },
  {
    hash: "#/examples/extrusion-rect-hollow",
    title: "Rectangular Hollow Section (IfcRectangleHollowProfileDef)",
    description:
      "Extrudes a rectangular hollow cross-section into a 3D solid (IfcExtrudedAreaSolid + IfcRectangleHollowProfileDef).",
    sampleId: "extrusion-rect-hollow",
    category: "ExtrudedAreaSolid",
    difficulty: "beginner",
    status: "available",
  },
  {
    hash: "#/examples/extrusion-circle-hollow",
    title: "Circular Hollow Section (IfcCircleHollowProfileDef)",
    description:
      "Extrudes a circular hollow cross-section into a 3D solid (IfcExtrudedAreaSolid + IfcCircleHollowProfileDef).",
    sampleId: "extrusion-circle-hollow",
    category: "ExtrudedAreaSolid",
    difficulty: "beginner",
    status: "available",
  },
  {
    hash: "#/examples/extrusion-i-shape",
    title: "I-Shape Profile (IfcIShapeProfileDef)",
    description:
      "Extrudes an I-shaped cross-section into a 3D solid (IfcExtrudedAreaSolid + IfcIShapeProfileDef).",
    sampleId: "extrusion-i-shape",
    category: "ExtrudedAreaSolid",
    difficulty: "beginner",
    status: "available",
  },
  {
    hash: "#/examples/extrusion-c-shape",
    title: "C-Shape Profile (IfcCShapeProfileDef)",
    description:
      "Extrudes a channel-shaped cross-section into a 3D solid (IfcExtrudedAreaSolid + IfcCShapeProfileDef).",
    sampleId: "extrusion-c-shape",
    category: "ExtrudedAreaSolid",
    difficulty: "beginner",
    status: "available",
  },
  {
    hash: "#/examples/extrusion-l-shape",
    title: "L-Shape Profile (IfcLShapeProfileDef)",
    description:
      "Extrudes an L-shaped cross-section into a 3D solid (IfcExtrudedAreaSolid + IfcLShapeProfileDef).",
    sampleId: "extrusion-l-shape",
    category: "ExtrudedAreaSolid",
    difficulty: "beginner",
    status: "available",
  },
  {
    hash: "#/examples/tessellation",
    title: "Triangulated Face Set",
    description:
      "Mesh-based geometry using indexed triangles (IfcTriangulatedFaceSet).",
    category: "Tessellation",
    difficulty: "intermediate",
    status: "planned",
  },
  {
    hash: "#/examples/brep",
    title: "Faceted BRep",
    description:
      "Boundary representation using explicit faces and loops (IfcFacetedBrep).",
    category: "BRep",
    difficulty: "advanced",
    status: "planned",
  },
  {
    hash: "#/examples/alignment",
    title: "Linear Placement",
    description:
      "Places an element along a defined alignment curve (IfcLinearPlacement).",
    category: "Alignment",
    difficulty: "advanced",
    status: "planned",
  },
];
