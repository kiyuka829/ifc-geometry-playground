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
    hash: '#/examples/profile-circle',
    title: 'Circle Profile',
    description: 'Demonstrates a circular cross-section using IfcCircleProfileDef.',
    category: 'Profile',
    difficulty: 'beginner',
    status: 'planned',
  },
  {
    hash: '#/examples/profile-ibeam',
    title: 'I-Beam Profile',
    description: 'Demonstrates a standard I-beam cross-section using IfcIShapeProfileDef.',
    category: 'Profile',
    difficulty: 'intermediate',
    status: 'planned',
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
