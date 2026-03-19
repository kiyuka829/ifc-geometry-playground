import { Engine, Scene, ArcRotateCamera, HemisphericLight, DirectionalLight, Vector3, Color4, MeshBuilder, Color3 } from '@babylonjs/core';
import type { LinesMesh } from '@babylonjs/core';

export interface BabylonScene {
  engine: Engine;
  scene: Scene;
  canvas: HTMLCanvasElement;
}

export function createScene(canvas: HTMLCanvasElement): BabylonScene {
  const engine = new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });
  const scene = new Scene(engine);
  scene.clearColor = new Color4(0.15, 0.15, 0.2, 1);

  const camera = new ArcRotateCamera('camera', -Math.PI / 4, Math.PI / 3, 10, Vector3.Zero(), scene);
  camera.attachControl(canvas, true);
  camera.lowerRadiusLimit = 1;
  camera.upperRadiusLimit = 50;

  const hemisphericLight = new HemisphericLight('hemi', new Vector3(0, 1, 0), scene);
  hemisphericLight.intensity = 0.7;
  const dirLight = new DirectionalLight('dir', new Vector3(-1, -2, -1), scene);
  dirLight.intensity = 0.5;

  engine.runRenderLoop(() => scene.render());
  window.addEventListener('resize', () => engine.resize());

  return { engine, scene, canvas };
}

export function disposeSceneMeshes(scene: Scene): void {
  const meshesToDispose = scene.meshes.slice();
  meshesToDispose.forEach(m => m.dispose());
}

export function addAxisHelper(scene: Scene, position: Vector3, size: number): void {
  const axes: Array<{ end: Vector3; color: Color3 }> = [
    { end: new Vector3(size, 0, 0), color: new Color3(1, 0, 0) },
    { end: new Vector3(0, size, 0), color: new Color3(0, 1, 0) },
    { end: new Vector3(0, 0, size), color: new Color3(0, 0, 1) },
  ];
  const names = ['axis-x', 'axis-y', 'axis-z'];

  axes.forEach(({ end, color }, i) => {
    const line = MeshBuilder.CreateLines(
      names[i],
      {
        points: [position.clone(), position.add(end)],
        colors: [new Color4(color.r, color.g, color.b, 1), new Color4(color.r, color.g, color.b, 1)],
      },
      scene,
    ) as LinesMesh;
    line.color = color;
  });
}
