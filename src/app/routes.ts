export type GeometryCategory =
  | 'Swept Solid'
  | 'Boolean'
  | 'Profile'
  | 'Tessellation'
  | 'BRep'
  | 'Alignment'

export const GEOMETRY_CATEGORIES: GeometryCategory[] = [
  'Swept Solid',
  'Boolean',
  'Profile',
  'Tessellation',
  'BRep',
  'Alignment',
]

export type Difficulty = 'beginner' | 'intermediate' | 'advanced'

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
  status: 'available';
}

export interface PlannedRoute extends BaseRoute {
  description: string;
  sampleId?: undefined;
  category: GeometryCategory;
  difficulty: Difficulty;
  status: 'planned';
}

export type Route = StaticRoute | AvailableRoute | PlannedRoute;

export const routes: Route[] = [
  { hash: '#/', title: 'Home' },
  {
    hash: '#/examples/extrusion',
    title: 'Basic Extrusion',
    description: 'Extrudes a 2D profile into a 3D solid using IfcExtrudedAreaSolid.',
    sampleId: 'extrusion-basic',
    category: 'Swept Solid',
    difficulty: 'beginner',
    status: 'available',
  },
  {
    hash: '#/examples/revolved',
    title: 'Revolved Area Solid',
    description: 'Revolves a 2D profile around an axis to create a 3D solid (IfcRevolvedAreaSolid).',
    category: 'Swept Solid',
    difficulty: 'intermediate',
    status: 'planned',
  },
  {
    hash: '#/examples/boolean',
    title: 'Boolean Operation',
    description: 'Combines two solids using DIFFERENCE, UNION, or INTERSECTION (IfcBooleanResult).',
    sampleId: 'boolean-difference',
    category: 'Boolean',
    difficulty: 'beginner',
    status: 'available',
  },
  {
    hash: '#/examples/boolean-clipping',
    title: 'Boolean Clipping',
    description: 'Clips a solid with a half-space to produce an angled cut (IfcBooleanClippingResult).',
    category: 'Boolean',
    difficulty: 'intermediate',
    status: 'planned',
  },
  {
    hash: '#/examples/extrusion-circle',
    title: 'Circle Profile',
    description: 'A circular cross-section extruded into a 3D solid (IfcCircleProfileDef).',
    sampleId: 'extrusion-circle',
    category: 'Profile',
    difficulty: 'beginner',
    status: 'available',
  },
  {
    hash: '#/examples/extrusion-rect-hollow',
    title: 'Rectangular Hollow Section',
    description: 'Square or rectangular hollow section (SHS/RHS) steel tube (IfcRectangleHollowProfileDef).',
    sampleId: 'extrusion-rect-hollow',
    category: 'Profile',
    difficulty: 'beginner',
    status: 'available',
  },
  {
    hash: '#/examples/extrusion-circle-hollow',
    title: 'Circular Hollow Section',
    description: 'Circular hollow section (CHS) pipe profile (IfcCircleHollowProfileDef).',
    sampleId: 'extrusion-circle-hollow',
    category: 'Profile',
    difficulty: 'beginner',
    status: 'available',
  },
  {
    hash: '#/examples/extrusion-i-shape',
    title: 'I-Shape / H-Beam',
    description: 'Standard I-beam or H-column structural steel section (IfcIShapeProfileDef).',
    sampleId: 'extrusion-i-shape',
    category: 'Profile',
    difficulty: 'beginner',
    status: 'available',
  },
  {
    hash: '#/examples/extrusion-l-shape',
    title: 'L-Shape / Angle',
    description: 'Angle iron (equal or unequal leg) structural section (IfcLShapeProfileDef).',
    sampleId: 'extrusion-l-shape',
    category: 'Profile',
    difficulty: 'beginner',
    status: 'available',
  },
  {
    hash: '#/examples/extrusion-void',
    title: 'Profile with Void',
    description: 'Slab profile with a rectangular opening demonstrating IfcArbitraryProfileDefWithVoids.',
    sampleId: 'extrusion-void',
    category: 'Profile',
    difficulty: 'intermediate',
    status: 'available',
  },
  {
    hash: '#/examples/tessellation',
    title: 'Triangulated Face Set',
    description: 'Mesh-based geometry using indexed triangles (IfcTriangulatedFaceSet).',
    category: 'Tessellation',
    difficulty: 'intermediate',
    status: 'planned',
  },
  {
    hash: '#/examples/brep',
    title: 'Faceted BRep',
    description: 'Boundary representation using explicit faces and loops (IfcFacetedBrep).',
    category: 'BRep',
    difficulty: 'advanced',
    status: 'planned',
  },
  {
    hash: '#/examples/alignment',
    title: 'Linear Placement',
    description: 'Places an element along a defined alignment curve (IfcLinearPlacement).',
    category: 'Alignment',
    difficulty: 'advanced',
    status: 'planned',
  },
]
