import { Color3, MeshBuilder, Vector3, StandardMaterial } from '@babylonjs/core';
import type { Scene } from '@babylonjs/core';
import type { Sample, Vec2, Vec3 } from '../schema.ts';
import { buildRevolvedAreaSolid } from '../operations/revolved.ts';
import { defaultPlacement } from '../operations/placement.ts';
import { disposeSceneMeshes, addAxisHelper } from '../../engine/scene.ts';
import { createTransparentMaterial } from '../../engine/materials.ts';

function buildPipeProfile(radius: number, innerRadius: number, height: number): Vec2[] {
  // Create a rectangular cross-section offset from the axis for lathe
  const r = Math.max(innerRadius, 0.01);
  return [
    [r, 0],
    [radius, 0],
    [radius, height],
    [r, height],
  ];
}

export const revolvedBasicSample: Sample = {
  id: 'revolved-basic',
  name: '回転体 (IfcRevolvedAreaSolid)',
  description:
    '2D断面を軸周りに回転させて立体を生成するサンプルです。円筒・トーラス状のソリッドが作れます。\n' +
    'A sample creating a revolved solid (cylinder/torus) by rotating a 2D profile around an axis.',
  ifcType: 'IfcRevolvedAreaSolid',
  parameters: [
    { id: 'radius', label: '外半径 (Radius)', type: 'number', min: 0.5, max: 3, step: 0.1, value: 1.5 },
    { id: 'innerRadius', label: '内半径 (InnerRadius)', type: 'number', min: 0, max: 2, step: 0.1, value: 0.5 },
    { id: 'height', label: '高さ (Height)', type: 'number', min: 0.1, max: 3, step: 0.1, value: 1 },
    { id: 'angle', label: '回転角度 (Angle°)', type: 'number', min: 10, max: 360, step: 5, value: 360 },
  ],
  steps: [
    {
      title: '2D断面プロファイルを定義',
      description: '回転させる2D断面形状を定義します。ここでは矩形を使用します。',
    },
    {
      title: '回転軸を設定',
      description: 'IfcAxis1Placement で回転軸（Z 軸）を定義します。',
    },
    {
      title: '回転角度を適用',
      description: 'Angle パラメータで回転量を指定し、3D 回転体ソリッドを生成します。',
    },
  ],
  ifcSnippet: `#1 = IFCREVOLVEDAREASOLID(#2, #3, #4, angle);
#2 = IFCRECTANGLEPROFILEDEF(AREA, $, #5, (radius - innerRadius), height);
#3 = IFCAXIS2PLACEMENT3D(#6, #7, #8);
#4 = IFCAXIS1PLACEMENT(#9, #10);
#6 = IFCCARTESIANPOINT((0., 0., 0.));
#7 = IFCDIRECTION((0., 0., 1.));
#8 = IFCDIRECTION((1., 0., 0.));
#9 = IFCCARTESIANPOINT((0., 0., 0.));
#10 = IFCDIRECTION((0., 0., 1.));`,

  buildScene(scene: Scene, params: Record<string, number | Vec3>): void {
    disposeSceneMeshes(scene);

    const radius = params['radius'] as number;
    const innerRadius = params['innerRadius'] as number;
    const height = params['height'] as number;
    const angle = params['angle'] as number;

    // Ground grid
    const ground = MeshBuilder.CreateGround('ground', { width: 10, height: 10 }, scene);
    const groundMat = new StandardMaterial('groundMat', scene);
    groundMat.diffuseColor = new Color3(0.2, 0.2, 0.25);
    groundMat.wireframe = true;
    ground.material = groundMat;

    const outerCurve = buildPipeProfile(radius, innerRadius, height) as Vec2[];

    const solid = {
      sweptArea: { profileType: 'AREA' as const, outerCurve },
      position: defaultPlacement(),
      axis: { location: [0, 0, 0] as Vec3, z: [0, 1, 0] as Vec3 },
      angle,
    };

    const mesh = buildRevolvedAreaSolid(scene, solid);
    mesh.position.set(0, 0, 0);
    const mat = createTransparentMaterial(scene, 'solid', new Color3(0.8, 0.4, 0.8), 0.85);
    mesh.material = mat;

    addAxisHelper(scene, Vector3.Zero(), 2);
  },
};
