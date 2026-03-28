import { Vector3, Matrix, Quaternion } from '@babylonjs/core'
import type { Mesh } from '@babylonjs/core'
import type { IfcAxis2Placement3D } from '../../types.ts'

export function applyPlacement(mesh: Mesh, placement?: IfcAxis2Placement3D): void {
  if (!placement) return
  const loc = placement.location
  mesh.position = new Vector3(loc.x, loc.y, loc.z)

  if (placement.axis || placement.refDirection) {
    const zAxis = placement.axis
      ? new Vector3(placement.axis.x, placement.axis.y, placement.axis.z).normalize()
      : Vector3.Up()
    const xAxis = placement.refDirection
      ? new Vector3(placement.refDirection.x, placement.refDirection.y, placement.refDirection.z).normalize()
      : Vector3.Right()
    const yAxis = Vector3.Cross(xAxis, zAxis).normalize()

    const rotMatrix = Matrix.FromValues(
      xAxis.x, yAxis.x, zAxis.x, 0,
      xAxis.y, yAxis.y, zAxis.y, 0,
      xAxis.z, yAxis.z, zAxis.z, 0,
      0, 0, 0, 1
    )
    mesh.rotationQuaternion = Quaternion.FromRotationMatrix(rotMatrix)
  }
}
