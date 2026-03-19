import { Color3, MeshBuilder, Vector3, StandardMaterial } from '@babylonjs/core';
import type { Scene } from '@babylonjs/core';
import type { Sample, Vec2, Vec3 } from '../schema.ts';
import { buildExtrudedAreaSolid } from '../operations/extrusion.ts';
import { defaultPlacement } from '../operations/placement.ts';
import { disposeSceneMeshes, addAxisHelper } from '../../engine/scene.ts';
import { createTransparentMaterial } from '../../engine/materials.ts';

function buildLShapePoints(width: number, thickness: number): Vec2[] {
  return [
    [0, 0],
    [width, 0],
    [width, thickness],
    [thickness, thickness],
    [thickness, width],
    [0, width],
  ];
}

export const extrusionLShapeSample: Sample = {
  id: 'extrusion-lshape',
  name: 'L字断面押し出し (IfcArbitraryClosedProfileDef)',
  description:
    'L字形の断面を IfcArbitraryClosedProfileDef で表現し、押し出すサンプルです。\n' +
    'A sample extruding an L-shaped cross-section defined with IfcArbitraryClosedProfileDef.',
  ifcType: 'IfcArbitraryClosedProfileDef',
  parameters: [
    { id: 'width', label: '幅 (Width)', type: 'number', min: 1, max: 5, step: 0.1, value: 3 },
    { id: 'thickness', label: '厚み (Thickness)', type: 'number', min: 0.1, max: 2, step: 0.1, value: 1 },
    { id: 'depth', label: '奥行 (Depth)', type: 'number', min: 0.1, max: 5, step: 0.1, value: 2 },
  ],
  steps: [
    {
      title: 'L字プロファイルを定義',
      description:
        'IfcArbitraryClosedProfileDef で L 字形の頂点座標リストを定義します。',
    },
    {
      title: '押し出し方向を設定',
      description: 'Z 軸方向 (0, 0, 1) に押し出します。',
    },
    {
      title: '3Dソリッドを生成',
      description: 'Depth パラメータを適用して L 字形ソリッドを生成します。',
    },
  ],
  ifcSnippet: `#1 = IFCARBITRARYCLOSEDPROFILEDEF(AREA, $, #2);
#2 = IFCPOLYLINE((#3, #4, #5, #6, #7, #8));
/* L-shape vertices */
#3 = IFCCARTESIANPOINT((0., 0.));
#4 = IFCCARTESIANPOINT((width, 0.));
#5 = IFCCARTESIANPOINT((width, thickness));
#6 = IFCCARTESIANPOINT((thickness, thickness));
#7 = IFCCARTESIANPOINT((thickness, width));
#8 = IFCCARTESIANPOINT((0., width));
#9 = IFCEXTRUDEDAREASOLID(#1, #10, #11, depth);
#10 = IFCAXIS2PLACEMENT3D(...);
#11 = IFCDIRECTION((0., 0., 1.));`,

  buildScene(scene: Scene, params: Record<string, number | Vec3>): void {
    disposeSceneMeshes(scene);

    const width = params['width'] as number;
    const thickness = params['thickness'] as number;
    const depth = params['depth'] as number;

    // Ground grid
    const ground = MeshBuilder.CreateGround('ground', { width: 10, height: 10 }, scene);
    const groundMat = new StandardMaterial('groundMat', scene);
    groundMat.diffuseColor = new Color3(0.2, 0.2, 0.25);
    groundMat.wireframe = true;
    ground.material = groundMat;

    const outerCurve = buildLShapePoints(width, thickness);

    const solid = {
      sweptArea: { profileType: 'AREA' as const, outerCurve },
      position: defaultPlacement(),
      extrudedDirection: [0, 0, 1] as Vec3,
      depth,
    };

    const mesh = buildExtrudedAreaSolid(scene, solid);
    mesh.position.set(-width / 2, depth / 2, -width / 2);
    const mat = createTransparentMaterial(scene, 'solid', new Color3(0.4, 0.8, 0.5), 0.85);
    mesh.material = mat;

    addAxisHelper(scene, Vector3.Zero(), 2);
  },
};
