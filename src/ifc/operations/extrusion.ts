import { MeshBuilder, Vector3, Mesh } from '@babylonjs/core';
import type { Scene } from '@babylonjs/core';
import earcut from 'earcut';
import type { IfcExtrudedAreaSolid, IfcRectangleProfileDef, Vec2 } from '../schema.ts';
import { rectangleProfilePoints, arbitraryClosedProfilePoints } from './profile.ts';

function profilePoints(solid: IfcExtrudedAreaSolid): Vec2[] {
  const area = solid.sweptArea;
  if ('xDim' in area) {
    return rectangleProfilePoints(area as IfcRectangleProfileDef);
  }
  return arbitraryClosedProfilePoints(area);
}

export function buildExtrudedAreaSolid(scene: Scene, solid: IfcExtrudedAreaSolid): Mesh {
  const pts = profilePoints(solid);
  const shape = pts.map(([x, y]) => new Vector3(x, 0, y));

  const [dx, dy, dz] = solid.extrudedDirection;
  const dirLen = Math.sqrt(dx * dx + dy * dy + dz * dz);
  const ndx = dx / dirLen;
  const ndy = dy / dirLen;
  const ndz = dz / dirLen;

  const [lx, ly, lz] = solid.position.location;

  // For Z-up extrusion (most common IFC case) use ExtrudePolygon
  if (Math.abs(ndx) < 1e-6 && Math.abs(ndy) < 1e-6 && Math.abs(ndz - 1) < 1e-6) {
    // Standard Z-up extrusion
    const mesh = MeshBuilder.ExtrudePolygon(
      'extruded',
      { shape, depth: solid.depth, updatable: false },
      scene,
      earcut,
    );
    mesh.position.set(lx, ly, lz);
    return mesh;
  }

  // General case: extrude along arbitrary direction using path extrusion
  const extDir = new Vector3(ndx, ndz, ndy).scale(solid.depth);
  const path = [Vector3.Zero(), extDir];
  const mesh = MeshBuilder.ExtrudeShape(
    'extruded',
    { shape, path, cap: Mesh.NO_CAP, updatable: false },
    scene,
  );
  mesh.position.set(lx, ly, lz);
  return mesh;
}
