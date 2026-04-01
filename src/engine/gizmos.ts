import { MeshBuilder, StandardMaterial, Color3, Vector3, Mesh, Quaternion } from '@babylonjs/core'
import type { Scene } from '@babylonjs/core'
import { ifcToBabylonVector } from './ifc-coordinates.ts'

export function createArrow(
  scene: Scene,
  origin: Vector3,
  direction: Vector3,
  length: number,
  color: Color3,
  name: string,
  sharedMaterial?: StandardMaterial,
): Mesh {
  const dir = direction.normalize()
  const end = origin.add(dir.scale(length))

  const lines = MeshBuilder.CreateLines(`${name}_line`, {
    points: [origin, end],
  }, scene)
  lines.color = color

  const cone = MeshBuilder.CreateCylinder(`${name}_cone`, {
    height: 0.3,
    diameterTop: 0,
    diameterBottom: 0.15,
    tessellation: 8,
  }, scene)
  let mat: StandardMaterial
  if (sharedMaterial) {
    mat = sharedMaterial
  } else {
    mat = new StandardMaterial(`${name}_mat`, scene)
    mat.diffuseColor = color
    mat.emissiveColor = color
  }
  cone.material = mat
  cone.position = end.clone()

  // Orient cone along direction using quaternion
  const up = Vector3.Up()
  const dot = Vector3.Dot(up, dir)
  if (Math.abs(dot + 1) < 0.0001) {
    cone.rotationQuaternion = new Quaternion(1, 0, 0, 0)
  } else if (Math.abs(dot - 1) < 0.0001) {
    cone.rotationQuaternion = Quaternion.Identity()
  } else {
    const cross = Vector3.Cross(up, dir)
    cone.rotationQuaternion = new Quaternion(cross.x, cross.y, cross.z, 1 + dot).normalize()
  }

  const parent = new Mesh(name, scene)
  lines.parent = parent
  cone.parent = parent
  return parent
}

/**
 * Draws X/Y/Z axis lines at `origin` using IFC/UX axis semantics
 * (X = right, Y = depth, Z = up). `origin` must be in Babylon space;
 * the axis directions are converted from IFC space internally.
 */
export function createIfcAxisGizmo(scene: Scene, origin: Vector3, size: number): Mesh {
  const xLine = MeshBuilder.CreateLines('axis_x', {
    points: [origin, origin.add(ifcToBabylonVector({ x: size, y: 0, z: 0 }))],
  }, scene)
  xLine.color = new Color3(1, 0, 0)

  const yLine = MeshBuilder.CreateLines('axis_y', {
    points: [origin, origin.add(ifcToBabylonVector({ x: 0, y: size, z: 0 }))],
  }, scene)
  yLine.color = new Color3(0, 1, 0)

  const zLine = MeshBuilder.CreateLines('axis_z', {
    points: [origin, origin.add(ifcToBabylonVector({ x: 0, y: 0, z: size }))],
  }, scene)
  zLine.color = new Color3(0, 0, 1)

  const parent = new Mesh('axisGizmo', scene)
  xLine.parent = parent
  yLine.parent = parent
  zLine.parent = parent
  return parent
}
