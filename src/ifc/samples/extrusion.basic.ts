import { Color3, MeshBuilder, Vector3, StandardMaterial } from '@babylonjs/core';
import type { Scene } from '@babylonjs/core';
import type { Sample } from '../schema.ts';
import type { Vec3 } from '../schema.ts';
import { buildExtrudedAreaSolid } from '../operations/extrusion.ts';
import { defaultPlacement } from '../operations/placement.ts';
import { disposeSceneMeshes, addAxisHelper } from '../../engine/scene.ts';
import { createTransparentMaterial } from '../../engine/materials.ts';

export const extrusionBasicSample: Sample = {
  id: 'extrusion-basic',
  name: 'Basic Extrusion (IfcExtrudedAreaSolid)',
  description:
    '直方体を IfcExtrudedAreaSolid で表現するサンプルです。' +
    '矩形の2Dプロファイルを Z 軸方向に押し出して直方体ソリッドを生成します。\n' +
    'A sample representing a box using IfcExtrudedAreaSolid. ' +
    'A rectangular 2D profile is extruded along the Z-axis to create a 3D solid.',
  ifcType: 'IfcExtrudedAreaSolid',
  parameters: [
    { id: 'width', label: '幅 (Width)', type: 'number', min: 0.1, max: 5, step: 0.1, value: 2 },
    { id: 'height', label: '奥行 (Height)', type: 'number', min: 0.1, max: 5, step: 0.1, value: 3 },
    { id: 'depth', label: '高さ (Depth)', type: 'number', min: 0.1, max: 5, step: 0.1, value: 1 },
  ],
  steps: [
    {
      title: '2Dプロファイルを定義',
      description:
        'IfcRectangleProfileDef で矩形の2D断面形状を定義します。' +
        '幅 (XDim) と高さ (YDim) をパラメータとして持ちます。',
    },
    {
      title: '押し出し方向を設定',
      description:
        'IfcDirection で押し出し方向を指定します。ここでは Z 軸 (0, 0, 1) を使用します。',
    },
    {
      title: '深さを適用',
      description:
        'Depth パラメータを使って2D断面を3Dソリッドに変換します。' +
        'ExtrudedDepth × ExtrudedDirection の方向にソリッドが生成されます。',
    },
  ],
  ifcSnippet: `#1 = IFCRECTANGLEPROFILEDEF(AREA, $, #2, width, height);
#2 = IFCAXIS2PLACEMENT2D(#3, $);
#3 = IFCCARTESIANPOINT((0., 0.));
#4 = IFCEXTRUDEDAREASOLID(#1, #5, #6, depth);
#5 = IFCAXIS2PLACEMENT3D(#7, #8, #9);
#6 = IFCDIRECTION((0., 0., 1.));
#7 = IFCCARTESIANPOINT((0., 0., 0.));
#8 = IFCDIRECTION((0., 0., 1.));
#9 = IFCDIRECTION((1., 0., 0.));`,

  buildScene(scene: Scene, params: Record<string, number | Vec3>): void {
    disposeSceneMeshes(scene);

    const width = params['width'] as number;
    const height = params['height'] as number;
    const depth = params['depth'] as number;

    // Ground grid
    const ground = MeshBuilder.CreateGround('ground', { width: 10, height: 10 }, scene);
    const groundMat = new StandardMaterial('groundMat', scene);
    groundMat.diffuseColor = new Color3(0.2, 0.2, 0.25);
    groundMat.wireframe = true;
    ground.material = groundMat;

    const solid = {
      sweptArea: { profileType: 'AREA' as const, xDim: width, yDim: height },
      position: defaultPlacement(),
      extrudedDirection: [0, 0, 1] as Vec3,
      depth,
    };

    const mesh = buildExtrudedAreaSolid(scene, solid);
    mesh.position.set(-width / 2, depth / 2, -height / 2);
    const mat = createTransparentMaterial(scene, 'solid', new Color3(0.3, 0.5, 0.9), 0.85);
    mesh.material = mat;

    addAxisHelper(scene, Vector3.Zero(), 2);
  },
};
