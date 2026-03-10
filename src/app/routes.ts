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
    description: '2Dプロファイルを押し出して3Dソリッドを生成します。',
    sampleId: 'extrusion-basic',
  },
  {
    hash: '#/examples/boolean',
    title: 'Boolean Difference',
    description: '2つのソリッドのブール差演算を可視化します。',
    sampleId: 'boolean-difference',
  },
]
