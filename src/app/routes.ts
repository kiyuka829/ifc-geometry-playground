export type GeometryDomain =
  | "Curves"
  | "Profiles"
  | "Swept Solids"
  | "Boolean / CSG";

export const GEOMETRY_DOMAINS: GeometryDomain[] = [
  "Curves",
  "Profiles",
  "Swept Solids",
  "Boolean / CSG",
];

export type Difficulty = "beginner" | "intermediate" | "advanced";
export type ExampleKind = "primary" | "variant";
export type ImplementationStatus = "available" | "partial" | "planned";
export type OperationGroupId =
  | "curve-primitives"
  | "extrusion"
  | "revolution"
  | "swept-disk";

interface BaseRoute {
  hash: string;
  title: string;
  description?: string;
}

export interface StaticRoute extends BaseRoute {
  sampleId?: undefined;
  domain?: undefined;
  difficulty?: undefined;
  exampleKind?: undefined;
  status?: undefined;
  entity?: undefined;
  dependsOn?: undefined;
  operationGroup?: undefined;
}

export interface AvailableRoute extends BaseRoute {
  description: string;
  sampleId: string;
  domain: GeometryDomain;
  difficulty: Difficulty;
  exampleKind: ExampleKind;
  status: "available";
  entity: string;
  dependsOn?: string[];
  operationGroup?: OperationGroupId;
}

export interface PlannedRoute extends BaseRoute {
  description: string;
  sampleId?: undefined;
  domain: GeometryDomain;
  difficulty: Difficulty;
  exampleKind: "primary";
  status: "planned";
  entity: string;
  dependsOn?: string[];
  operationGroup?: undefined;
}

export type Route = StaticRoute | AvailableRoute | PlannedRoute;

export interface ImplementationMapItem {
  entity: string;
  domain: GeometryDomain;
  status: ImplementationStatus;
  description: string;
  routeHash?: string;
  dependsOn?: string[];
}

export interface OperationGroup {
  id: OperationGroupId;
  domain: GeometryDomain;
  title: string;
  entity: string;
  description: string;
}

export const OPERATION_GROUPS: OperationGroup[] = [
  {
    id: "curve-primitives",
    domain: "Curves",
    title: "Curve Primitives",
    entity: "IfcCurve",
    description:
      "Inspect curve entities before they are reused as directrices and profile boundaries.",
  },
  {
    id: "extrusion",
    domain: "Swept Solids",
    title: "Extrusion",
    entity: "IfcExtrudedAreaSolid",
    description:
      "Sweep area profiles along an extrusion direction and compare profile-specific variants.",
  },
  {
    id: "revolution",
    domain: "Swept Solids",
    title: "Revolution",
    entity: "IfcRevolvedAreaSolid",
    description:
      "Rotate an area profile around a local axis to create a revolved solid.",
  },
  {
    id: "swept-disk",
    domain: "Swept Solids",
    title: "Swept Disk",
    entity: "IfcSweptDiskSolid",
    description:
      "Sweep a disk or ring along a curve directrix.",
  },
];

export const routes: Route[] = [
  { hash: "#/", title: "Home" },
  {
    hash: "#/examples/curve-polyline",
    title: "Polyline",
    description:
      "Inspect an IfcPolyline as ordered cartesian points joined by straight segments.",
    sampleId: "curve-polyline",
    domain: "Curves",
    difficulty: "beginner",
    exampleKind: "variant",
    status: "available",
    entity: "IfcPolyline",
    dependsOn: ["IfcCurve"],
    operationGroup: "curve-primitives",
  },
  {
    hash: "#/examples/curve-indexed-polycurve",
    title: "Indexed PolyCurve",
    description:
      "Represent compact line and arc segments through indexed point lists.",
    sampleId: "curve-indexed-polycurve",
    domain: "Curves",
    difficulty: "intermediate",
    exampleKind: "primary",
    status: "available",
    entity: "IfcIndexedPolyCurve",
    dependsOn: ["IfcCurve"],
    operationGroup: "curve-primitives",
  },
  {
    hash: "#/examples/curve-circle",
    title: "Circle",
    description:
      "Define a circular curve from an axis placement and radius.",
    sampleId: "curve-circle",
    domain: "Curves",
    difficulty: "beginner",
    exampleKind: "primary",
    status: "available",
    entity: "IfcCircle",
    dependsOn: ["IfcCurve"],
  },
  {
    hash: "#/examples/curve-ellipse",
    title: "Ellipse",
    description:
      "Define an elliptical curve from an axis placement and two semi-axis lengths.",
    sampleId: "curve-ellipse",
    domain: "Curves",
    difficulty: "beginner",
    exampleKind: "primary",
    status: "available",
    entity: "IfcEllipse",
    dependsOn: ["IfcCurve"],
  },
  {
    hash: "#/examples/curve-trimmed",
    title: "Trimmed Curve",
    description:
      "Trim a circle or ellipse into an arc using parameter or cartesian trim selectors.",
    sampleId: "curve-trimmed",
    domain: "Curves",
    difficulty: "intermediate",
    exampleKind: "primary",
    status: "available",
    entity: "IfcTrimmedCurve",
    dependsOn: ["IfcCurve"],
  },
  {
    hash: "#/examples/profiles",
    title: "Profiles",
    description:
      "Inspect and compare reusable area profiles before they are turned into solids.",
    domain: "Profiles",
    difficulty: "beginner",
    exampleKind: "primary",
    status: "planned",
    entity: "IfcProfileDef",
  },
  {
    hash: "#/examples/extrusion-rectangle",
    title: "Rectangle",
    description:
      "Extrude an IfcRectangleProfileDef along an extrusion direction.",
    sampleId: "extrusion-rectangle",
    domain: "Swept Solids",
    difficulty: "beginner",
    exampleKind: "variant",
    status: "available",
    entity: "IfcRectangleProfileDef",
    dependsOn: ["IfcExtrudedAreaSolid"],
    operationGroup: "extrusion",
  },
  {
    hash: "#/examples/revolved",
    title: "Rectangle",
    description:
      "Revolve an IfcRectangleProfileDef around a local axis.",
    sampleId: "revolved-rectangle",
    domain: "Swept Solids",
    difficulty: "intermediate",
    exampleKind: "variant",
    status: "available",
    entity: "IfcRectangleProfileDef",
    dependsOn: ["IfcRevolvedAreaSolid"],
    operationGroup: "revolution",
  },
  {
    hash: "#/examples/swept-disk",
    title: "Polyline Directrix",
    description:
      "Sweep a circular disk or pipe section along an IfcPolyline directrix.",
    sampleId: "swept-disk-basic",
    domain: "Swept Solids",
    difficulty: "intermediate",
    exampleKind: "variant",
    status: "available",
    entity: "IfcPolyline",
    dependsOn: ["IfcSweptDiskSolid"],
    operationGroup: "swept-disk",
  },
  {
    hash: "#/examples/fixed-reference-sweep",
    title: "Fixed-Reference Sweep",
    description:
      "Sweep a profile along a curve while controlling the reference orientation (IfcFixedReferenceSweptAreaSolid).",
    domain: "Swept Solids",
    difficulty: "intermediate",
    exampleKind: "primary",
    status: "planned",
    entity: "IfcFixedReferenceSweptAreaSolid",
    dependsOn: ["IfcCurve", "IfcProfileDef"],
  },
  {
    hash: "#/examples/sectioned-solid",
    title: "Sectioned Solid",
    description:
      "Interpolate multiple section profiles along a horizontal alignment (IfcSectionedSolidHorizontal).",
    domain: "Swept Solids",
    difficulty: "advanced",
    exampleKind: "primary",
    status: "planned",
    entity: "IfcSectionedSolidHorizontal",
    dependsOn: ["IfcCurve", "IfcProfileDef"],
  },
  {
    hash: "#/examples/extrusion-rounded-rectangle",
    title: "Rounded Rectangle",
    description:
      "Implemented variant for IfcRoundedRectangleProfileDef within the extrusion workflow.",
    sampleId: "extrusion-rounded-rectangle",
    domain: "Swept Solids",
    difficulty: "beginner",
    exampleKind: "variant",
    status: "available",
    entity: "IfcRoundedRectangleProfileDef",
    dependsOn: ["IfcExtrudedAreaSolid"],
    operationGroup: "extrusion",
  },
  {
    hash: "#/examples/extrusion-circle",
    title: "Circle",
    description:
      "Implemented variant for IfcCircleProfileDef within the extrusion workflow.",
    sampleId: "extrusion-circle",
    domain: "Swept Solids",
    difficulty: "beginner",
    exampleKind: "variant",
    status: "available",
    entity: "IfcCircleProfileDef",
    dependsOn: ["IfcExtrudedAreaSolid"],
    operationGroup: "extrusion",
  },
  {
    hash: "#/examples/extrusion-ellipse",
    title: "Ellipse",
    description:
      "Implemented variant for IfcEllipseProfileDef within the extrusion workflow.",
    sampleId: "extrusion-ellipse",
    domain: "Swept Solids",
    difficulty: "beginner",
    exampleKind: "variant",
    status: "available",
    entity: "IfcEllipseProfileDef",
    dependsOn: ["IfcExtrudedAreaSolid"],
    operationGroup: "extrusion",
  },
  {
    hash: "#/examples/extrusion-rect-hollow",
    title: "Rectangular Hollow",
    description:
      "Implemented variant for IfcRectangleHollowProfileDef within the extrusion workflow.",
    sampleId: "extrusion-rect-hollow",
    domain: "Swept Solids",
    difficulty: "beginner",
    exampleKind: "variant",
    status: "available",
    entity: "IfcRectangleHollowProfileDef",
    dependsOn: ["IfcExtrudedAreaSolid"],
    operationGroup: "extrusion",
  },
  {
    hash: "#/examples/extrusion-circle-hollow",
    title: "Circular Hollow",
    description:
      "Implemented variant for IfcCircleHollowProfileDef within the extrusion workflow.",
    sampleId: "extrusion-circle-hollow",
    domain: "Swept Solids",
    difficulty: "beginner",
    exampleKind: "variant",
    status: "available",
    entity: "IfcCircleHollowProfileDef",
    dependsOn: ["IfcExtrudedAreaSolid"],
    operationGroup: "extrusion",
  },
  {
    hash: "#/examples/extrusion-i-shape",
    title: "I-Shape",
    description:
      "Implemented variant for IfcIShapeProfileDef within the extrusion workflow.",
    sampleId: "extrusion-i-shape",
    domain: "Swept Solids",
    difficulty: "beginner",
    exampleKind: "variant",
    status: "available",
    entity: "IfcIShapeProfileDef",
    dependsOn: ["IfcExtrudedAreaSolid"],
    operationGroup: "extrusion",
  },
  {
    hash: "#/examples/extrusion-asymmetric-i-shape",
    title: "Asymmetric I-Shape",
    description:
      "Implemented variant for IfcAsymmetricIShapeProfileDef within the extrusion workflow.",
    sampleId: "extrusion-asymmetric-i-shape",
    domain: "Swept Solids",
    difficulty: "intermediate",
    exampleKind: "variant",
    status: "available",
    entity: "IfcAsymmetricIShapeProfileDef",
    dependsOn: ["IfcExtrudedAreaSolid"],
    operationGroup: "extrusion",
  },
  {
    hash: "#/examples/extrusion-c-shape",
    title: "C-Shape",
    description:
      "Implemented variant for IfcCShapeProfileDef within the extrusion workflow.",
    sampleId: "extrusion-c-shape",
    domain: "Swept Solids",
    difficulty: "beginner",
    exampleKind: "variant",
    status: "available",
    entity: "IfcCShapeProfileDef",
    dependsOn: ["IfcExtrudedAreaSolid"],
    operationGroup: "extrusion",
  },
  {
    hash: "#/examples/extrusion-l-shape",
    title: "L-Shape",
    description:
      "Implemented variant for IfcLShapeProfileDef within the extrusion workflow.",
    sampleId: "extrusion-l-shape",
    domain: "Swept Solids",
    difficulty: "beginner",
    exampleKind: "variant",
    status: "available",
    entity: "IfcLShapeProfileDef",
    dependsOn: ["IfcExtrudedAreaSolid"],
    operationGroup: "extrusion",
  },
  {
    hash: "#/examples/extrusion-t-shape",
    title: "T-Shape",
    description:
      "Implemented variant for IfcTShapeProfileDef within the extrusion workflow.",
    sampleId: "extrusion-t-shape",
    domain: "Swept Solids",
    difficulty: "beginner",
    exampleKind: "variant",
    status: "available",
    entity: "IfcTShapeProfileDef",
    dependsOn: ["IfcExtrudedAreaSolid"],
    operationGroup: "extrusion",
  },
  {
    hash: "#/examples/extrusion-u-shape",
    title: "U-Shape",
    description:
      "Implemented variant for IfcUShapeProfileDef within the extrusion workflow.",
    sampleId: "extrusion-u-shape",
    domain: "Swept Solids",
    difficulty: "beginner",
    exampleKind: "variant",
    status: "available",
    entity: "IfcUShapeProfileDef",
    dependsOn: ["IfcExtrudedAreaSolid"],
    operationGroup: "extrusion",
  },
  {
    hash: "#/examples/extrusion-z-shape",
    title: "Z-Shape",
    description:
      "Implemented variant for IfcZShapeProfileDef within the extrusion workflow.",
    sampleId: "extrusion-z-shape",
    domain: "Swept Solids",
    difficulty: "beginner",
    exampleKind: "variant",
    status: "available",
    entity: "IfcZShapeProfileDef",
    dependsOn: ["IfcExtrudedAreaSolid"],
    operationGroup: "extrusion",
  },
  {
    hash: "#/examples/boolean",
    title: "Boolean",
    description:
      "Combine solids with boolean operations such as difference, union, and intersection (IfcBooleanResult).",
    sampleId: "boolean-difference",
    domain: "Boolean / CSG",
    difficulty: "beginner",
    exampleKind: "primary",
    status: "available",
    entity: "IfcBooleanResult",
  },
  {
    hash: "#/examples/boolean-clipping",
    title: "Half-Space Clipping",
    description:
      "Trim a solid with half-space operands such as IfcHalfSpaceSolid and IfcPolygonalBoundedHalfSpace.",
    domain: "Boolean / CSG",
    difficulty: "intermediate",
    exampleKind: "primary",
    status: "planned",
    entity: "IfcHalfSpaceSolid",
  },
  {
    hash: "#/examples/csg-primitives",
    title: "CSG Primitives",
    description:
      "Construct solids from primitive volumes such as block, cylinder, cone, sphere, and rectangular pyramid.",
    domain: "Boolean / CSG",
    difficulty: "beginner",
    exampleKind: "primary",
    status: "planned",
    entity: "IfcCsgPrimitive3D",
  },
];

export const implementationMap: ImplementationMapItem[] = [
  {
    entity: "IfcCurve",
    domain: "Curves",
    status: "partial",
    description: "Abstract curve base for directrices and profile boundaries.",
  },
  {
    entity: "IfcPolyline",
    domain: "Curves",
    status: "available",
    description: "Ordered cartesian points joined by straight segments.",
    routeHash: "#/examples/curve-polyline",
    dependsOn: ["IfcCurve"],
  },
  {
    entity: "IfcIndexedPolyCurve",
    domain: "Curves",
    status: "available",
    description: "Indexed curve representation for compact polyline and arc paths.",
    routeHash: "#/examples/curve-indexed-polycurve",
    dependsOn: ["IfcCurve"],
  },
  {
    entity: "IfcCircle",
    domain: "Curves",
    status: "available",
    description: "Circle primitive positioned from an axis placement and radius.",
    routeHash: "#/examples/curve-circle",
    dependsOn: ["IfcCurve"],
  },
  {
    entity: "IfcEllipse",
    domain: "Curves",
    status: "available",
    description:
      "Ellipse primitive positioned from an axis placement and two semi-axis lengths.",
    routeHash: "#/examples/curve-ellipse",
    dependsOn: ["IfcCurve"],
  },
  {
    entity: "IfcTrimmedCurve",
    domain: "Curves",
    status: "available",
    description:
      "Builds visible circle and ellipse segments from basis curves plus trim selectors.",
    routeHash: "#/examples/curve-trimmed",
    dependsOn: ["IfcCurve"],
  },
  {
    entity: "IfcProfileDef",
    domain: "Profiles",
    status: "partial",
    description: "Area profile family used by extrusion and revolution samples.",
  },
  {
    entity: "IfcExtrudedAreaSolid",
    domain: "Swept Solids",
    status: "available",
    description: "Sweeps an area profile along an extrusion direction.",
    routeHash: "#/examples/extrusion-rectangle",
    dependsOn: ["IfcProfileDef"],
  },
  {
    entity: "IfcRevolvedAreaSolid",
    domain: "Swept Solids",
    status: "available",
    description: "Rotates an area profile around a local axis.",
    routeHash: "#/examples/revolved",
    dependsOn: ["IfcProfileDef"],
  },
  {
    entity: "IfcSweptDiskSolid",
    domain: "Swept Solids",
    status: "available",
    description: "Sweeps a disk or ring along a curve directrix.",
    routeHash: "#/examples/swept-disk",
    dependsOn: ["IfcCurve"],
  },
  {
    entity: "IfcFixedReferenceSweptAreaSolid",
    domain: "Swept Solids",
    status: "planned",
    description: "Sweeps an area profile along a curve with fixed orientation reference.",
    dependsOn: ["IfcCurve", "IfcProfileDef"],
  },
  {
    entity: "IfcSectionedSolidHorizontal",
    domain: "Swept Solids",
    status: "planned",
    description: "Interpolates changing section profiles along an alignment.",
    dependsOn: ["IfcCurve", "IfcProfileDef"],
  },
  {
    entity: "IfcBooleanResult",
    domain: "Boolean / CSG",
    status: "available",
    description: "Combines two operands with boolean set operations.",
    routeHash: "#/examples/boolean",
  },
  {
    entity: "IfcHalfSpaceSolid",
    domain: "Boolean / CSG",
    status: "planned",
    description: "Trims solids against half-space operands.",
  },
  {
    entity: "IfcCsgPrimitive3D",
    domain: "Boolean / CSG",
    status: "planned",
    description: "Primitive volume family for CSG workflows.",
  },
];
