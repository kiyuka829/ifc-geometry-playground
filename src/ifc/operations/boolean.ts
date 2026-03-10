import { Color3 } from '@babylonjs/core'
import type { Scene, Mesh } from '@babylonjs/core'
import { CSG } from '@babylonjs/core/Meshes/csg.js'
import type { IfcBooleanResult, IfcExtrudedAreaSolid } from '../schema.ts'
import { buildExtrusionMesh } from './extrusion.ts'
import { createSolidMaterial, createGhostMaterial } from '../../engine/materials.ts'

function buildOperandMesh(scene: Scene, operand: IfcExtrudedAreaSolid | IfcBooleanResult, name: string): Mesh {
  if (operand.type === 'IfcExtrudedAreaSolid') {
    const mat = createSolidMaterial(scene, new Color3(0.3, 0.5, 0.7))
    return buildExtrusionMesh(scene, operand, mat, name)
  } else {
    return buildBooleanMesh(scene, operand, name)
  }
}

export function buildBooleanMesh(scene: Scene, result: IfcBooleanResult, name: string): Mesh {
  const mat = createSolidMaterial(scene, new Color3(0.3, 0.5, 0.7))
  const mesh1 = buildOperandMesh(scene, result.firstOperand, `${name}_first`)
  const mesh2 = buildOperandMesh(scene, result.secondOperand, `${name}_second`)

  try {
    const csg1 = CSG.FromMesh(mesh1)
    const csg2 = CSG.FromMesh(mesh2)

    let csgResult
    if (result.operator === 'DIFFERENCE') csgResult = csg1.subtract(csg2)
    else if (result.operator === 'UNION') csgResult = csg1.union(csg2)
    else csgResult = csg1.intersect(csg2)

    const resultMesh = csgResult.toMesh(name, mat, scene, true)
    mesh1.dispose()
    mesh2.dispose()
    return resultMesh
  } catch (err) {
    // CSG operation failed; fall back to showing the first operand
    console.warn(
      `CSG ${result.operator} operation failed (ensure both meshes are manifold/non-degenerate). Falling back to first operand:`,
      err
    )
    mesh2.dispose()
    mesh1.material = mat
    return mesh1
  }
}

export function buildBooleanVisualization(
  scene: Scene,
  result: IfcBooleanResult,
  name: string,
  stepIndex: number
): Mesh[] {
  const meshes: Mesh[] = []

  if (stepIndex >= 0) {
    const mat = createSolidMaterial(scene, new Color3(0.3, 0.5, 0.7))
    const first = buildOperandMesh(scene, result.firstOperand, `${name}_first_vis`)
    first.material = mat
    meshes.push(first)
  }

  if (stepIndex >= 1) {
    const ghostMat = createGhostMaterial(scene, new Color3(1, 0.3, 0.3))
    const second = buildOperandMesh(scene, result.secondOperand, `${name}_second_vis`)
    second.material = ghostMat
    meshes.push(second)
  }

  if (stepIndex >= 2) {
    // Dispose previous meshes and show boolean result
    for (const m of meshes) {
      m.dispose()
    }
    meshes.length = 0
    const resultMesh = buildBooleanMesh(scene, result, `${name}_result`)
    meshes.push(resultMesh)
  }

  return meshes
}
