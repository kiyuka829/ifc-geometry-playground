import { Engine, Scene, HemisphericLight, DirectionalLight, Vector3, Color3, Color4, MeshBuilder, StandardMaterial } from '@babylonjs/core'

export class SceneManager {
  readonly engine: Engine
  readonly scene: Scene
  readonly canvas: HTMLCanvasElement

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas
    this.engine = new Engine(canvas, true)
    this.scene = new Scene(this.engine)
    this.scene.clearColor = new Color4(0.15, 0.15, 0.2, 1)

    const hemi = new HemisphericLight('hemi', new Vector3(0, 1, 0), this.scene)
    hemi.intensity = 0.8

    const dir = new DirectionalLight('dir', new Vector3(1, 2, 3).normalize(), this.scene)
    dir.intensity = 0.6

    this._createGrid()

    window.addEventListener('resize', this._onResize)
  }

  private _createGrid() {
    const ground = MeshBuilder.CreateGround('ground', { width: 20, height: 20, subdivisions: 20 }, this.scene)
    const mat = new StandardMaterial('groundMat', this.scene)
    mat.wireframe = true
    mat.alpha = 0.15
    mat.diffuseColor = new Color3(0.5, 0.5, 0.8)
    ground.material = mat
    ground.isPickable = false
  }

  private _onResize = () => {
    this.engine.resize()
  }

  startRenderLoop() {
    this.engine.runRenderLoop(() => {
      this.scene.render()
    })
  }

  stopRenderLoop() {
    this.engine.stopRenderLoop()
  }

  dispose() {
    window.removeEventListener('resize', this._onResize)
    this.stopRenderLoop()
    this.scene.dispose()
    this.engine.dispose()
  }
}
