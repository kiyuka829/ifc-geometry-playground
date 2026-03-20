export interface Route {
  hash: string;
  title: string;
  description?: string;
  sampleId?: string;
}

export const routes: Route[] = [
  { hash: '#/', title: 'Home' },
  {
    hash: '#/examples/extrusion',
    title: 'Basic Extrusion',
    description: 'Extrudes a 2D profile into a 3D solid.',
    sampleId: 'extrusion-basic',
  },
  {
    hash: '#/examples/boolean',
    title: 'Boolean Difference',
    description: 'Visualizes a boolean difference operation between two solids.',
    sampleId: 'boolean-difference',
  },
]
