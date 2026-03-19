import { MeshBuilder, Vector3, Mesh } from '@babylonjs/core';
import type { Scene } from '@babylonjs/core';
import type { IfcRevolvedAreaSolid, IfcRectangleProfileDef } from '../schema.ts';
import { rectangleProfilePoints, arbitraryClosedProfilePoints } from './profile.ts';

export function buildRevolvedAreaSolid(scene: Scene, solid: IfcRevolvedAreaSolid): Mesh {
  const area = solid.sweptArea;
  const pts2d = 'xDim' in area
    ? rectangleProfilePoints(area as IfcRectangleProfileDef)
    : arbitraryClosedProfilePoints(area);

  // Convert 2D profile points to 3D for lathe (x=radius, y=height)
  const shape = pts2d.map(([x, y]) => new Vector3(x, y, 0));
  // Close the shape
  shape.push(shape[0].clone());

  const DEGREES_PER_SEGMENT = 3;
  const tessellation = Math.max(8, Math.round(solid.angle / DEGREES_PER_SEGMENT));
  const arc = solid.angle / 360;

  const [lx, ly, lz] = solid.position.location;

  const mesh = MeshBuilder.CreateLathe(
    'revolved',
    {
      shape,
      radius: 1,
      tessellation,
      arc,
      cap: Mesh.CAP_ALL,
      sideOrientation: Mesh.DOUBLESIDE,
    },
    scene,
  );
  mesh.position.set(lx, ly, lz);
  return mesh;
}
