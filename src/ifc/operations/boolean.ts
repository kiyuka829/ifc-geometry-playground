import { Mesh } from '@babylonjs/core';
import type { Scene } from '@babylonjs/core';
import { CSG } from '@babylonjs/core/Meshes/csg.js';
import type { IfcBooleanResult } from '../schema.ts';
import { buildExtrudedAreaSolid } from './extrusion.ts';

export function buildBooleanResult(scene: Scene, result: IfcBooleanResult): Mesh {
  const meshA = buildExtrudedAreaSolid(scene, result.firstOperand);
  const meshB = buildExtrudedAreaSolid(scene, result.secondOperand);

  const csgA = CSG.FromMesh(meshA);
  const csgB = CSG.FromMesh(meshB);

  let csgResult: CSG;
  switch (result.operator) {
    case 'DIFFERENCE':
      csgResult = csgA.subtract(csgB);
      break;
    case 'UNION':
      csgResult = csgA.union(csgB);
      break;
    case 'INTERSECTION':
      csgResult = csgA.intersect(csgB);
      break;
  }

  meshA.dispose();
  meshB.dispose();

  return csgResult.toMesh('boolean-result', null, scene, false);
}
