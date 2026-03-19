import { Color3, MeshBuilder, Vector3, StandardMaterial } from '@babylonjs/core';
import type { Scene } from '@babylonjs/core';
import type { Sample, Vec3 } from '../schema.ts';
import { buildBooleanResult } from '../operations/boolean.ts';
import { defaultPlacement } from '../operations/placement.ts';
import { disposeSceneMeshes, addAxisHelper } from '../../engine/scene.ts';
import { createTransparentMaterial } from '../../engine/materials.ts';

export const booleanDifferenceSample: Sample = {
  id: 'boolean-difference',
  name: 'Boolean差分 (IfcBooleanClippingResult)',
  description:
    '直方体から別の直方体を差し引く Boolean 演算のサンプルです。\n' +
    'A sample showing Boolean difference: subtracting one box from another using IfcBooleanClippingResult.',
  ifcType: 'IfcBooleanClippingResult',
  parameters: [
    { id: 'width', label: '幅 (Width)', type: 'number', min: 1, max: 5, step: 0.1, value: 3 },
    { id: 'height', label: '奥行 (Height)', type: 'number', min: 1, max: 5, step: 0.1, value: 3 },
    { id: 'depth', label: '高さ (Depth)', type: 'number', min: 0.5, max: 5, step: 0.1, value: 2 },
    { id: 'cutWidth', label: '切断幅 (CutWidth)', type: 'number', min: 0.1, max: 4, step: 0.1, value: 1.5 },
    { id: 'cutHeight', label: '切断奥行 (CutHeight)', type: 'number', min: 0.1, max: 4, step: 0.1, value: 1.5 },
    { id: 'cutOffset', label: '切断オフセット (CutOffset)', type: 'number', min: -2, max: 2, step: 0.1, value: 0 },
  ],
  steps: [
    {
      title: '第一オペランドを定義',
      description:
        'IfcExtrudedAreaSolid で基本ソリッド（直方体）を定義します。',
    },
    {
      title: '第二オペランドを定義',
      description: '差し引くソリッド（カット用直方体）を定義します。',
    },
    {
      title: 'Boolean差分を適用',
      description:
        'IfcBooleanClippingResult で DIFFERENCE 演算を行い、第一オペランドから第二オペランドを除去します。',
    },
  ],
  ifcSnippet: `#1 = IFCBOOLEANCLIPPINGRESULT(DIFFERENCE, #2, #3);
#2 = IFCEXTRUDEDAREASOLID(#4, #5, #6, depth);
#3 = IFCEXTRUDEDAREASOLID(#7, #8, #6, depth + 0.1);
/* First operand: base box */
#4 = IFCRECTANGLEPROFILEDEF(AREA, $, #9, width, height);
/* Second operand: cut box */
#7 = IFCRECTANGLEPROFILEDEF(AREA, $, #10, cutWidth, cutHeight);
#5 = IFCAXIS2PLACEMENT3D((0,0,0), (0,0,1), (1,0,0));
#8 = IFCAXIS2PLACEMENT3D((cutOffset,cutOffset,-0.1), (0,0,1), (1,0,0));
#6 = IFCDIRECTION((0., 0., 1.));`,

  buildScene(scene: Scene, params: Record<string, number | Vec3>): void {
    disposeSceneMeshes(scene);

    const width = params['width'] as number;
    const height = params['height'] as number;
    const depth = params['depth'] as number;
    const cutWidth = params['cutWidth'] as number;
    const cutHeight = params['cutHeight'] as number;
    const cutOffset = params['cutOffset'] as number;

    // Ground grid
    const ground = MeshBuilder.CreateGround('ground', { width: 10, height: 10 }, scene);
    const groundMat = new StandardMaterial('groundMat', scene);
    groundMat.diffuseColor = new Color3(0.2, 0.2, 0.25);
    groundMat.wireframe = true;
    ground.material = groundMat;

    const boolResult = {
      operator: 'DIFFERENCE' as const,
      firstOperand: {
        sweptArea: { profileType: 'AREA' as const, xDim: width, yDim: height },
        position: defaultPlacement(),
        extrudedDirection: [0, 0, 1] as Vec3,
        depth,
      },
      secondOperand: {
        sweptArea: { profileType: 'AREA' as const, xDim: cutWidth, yDim: cutHeight },
        position: {
          location: [cutOffset, cutOffset, -0.05] as Vec3,
          axis: [0, 0, 1] as Vec3,
          refDirection: [1, 0, 0] as Vec3,
        },
        extrudedDirection: [0, 0, 1] as Vec3,
        depth: depth + 0.1,
      },
    };

    const mesh = buildBooleanResult(scene, boolResult);
    mesh.position.set(-width / 2, depth / 2, -height / 2);
    const mat = createTransparentMaterial(scene, 'solid', new Color3(0.9, 0.5, 0.3), 0.9);
    mesh.material = mat;

    addAxisHelper(scene, Vector3.Zero(), 2);
  },
};
