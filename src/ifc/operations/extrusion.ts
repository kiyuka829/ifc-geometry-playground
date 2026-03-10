import { MeshBuilder, Vector3, Color3 } from '@babylonjs/core'
import type { Scene, StandardMaterial, Mesh, LinesMesh } from '@babylonjs/core'
import earcut from 'earcut'
import type { IfcExtrudedAreaSolid, IfcProfileDef } from '../schema.ts'
import { applyPlacement } from './placement.ts'

export function buildExtrusionMesh(
  scene: Scene,
  solid: IfcExtrudedAreaSolid,
  material: StandardMaterial,
  name: string
): Mesh {
  const profile = solid.sweptArea
  let mesh: Mesh

  if (profile.type === 'IfcRectangleProfileDef') {
    mesh = MeshBuilder.CreateBox(name, {
      width: profile.xDim,
      height: solid.depth,
      depth: profile.yDim,
    }, scene)
    // Position center of box at placement + direction * depth/2
    const dir = new Vector3(
      solid.extrudedDirection.directionRatios.x,
      solid.extrudedDirection.directionRatios.y,
      solid.extrudedDirection.directionRatios.z
    ).normalize()
    const loc = solid.position.location
    mesh.position = new Vector3(
      loc.x + dir.x * solid.depth / 2,
      loc.y + dir.y * solid.depth / 2,
      loc.z + dir.z * solid.depth / 2
    )
  } else {
    const points = profile.outerCurve.map(p => new Vector3(p.x, 0, p.y))
    mesh = MeshBuilder.ExtrudePolygon(name, {
      shape: points,
      depth: solid.depth,
    }, scene, earcut)
    applyPlacement(mesh, solid.position)
  }

  mesh.material = material
  return mesh
}

export function buildProfileOutline(
  scene: Scene,
  profile: IfcProfileDef,
  _material: StandardMaterial,
  name: string
): LinesMesh {
  let points: Vector3[]

  if (profile.type === 'IfcRectangleProfileDef') {
    const hw = profile.xDim / 2
    const hd = profile.yDim / 2
    points = [
      new Vector3(-hw, 0, -hd),
      new Vector3(hw, 0, -hd),
      new Vector3(hw, 0, hd),
      new Vector3(-hw, 0, hd),
      new Vector3(-hw, 0, -hd),
    ]
  } else {
    points = profile.outerCurve.map(p => new Vector3(p.x, 0, p.y))
    points.push(points[0].clone())
  }

  const lines = MeshBuilder.CreateLines(name, { points }, scene)
  lines.color = new Color3(1, 0.5, 0.1)
  return lines
}
