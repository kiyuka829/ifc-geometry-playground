import type { Mesh } from '@babylonjs/core'
import type { SampleDef, ParamValues } from '../types.ts'
import { SceneManager } from '../engine/scene.ts'
import { createArcRotateCamera } from '../engine/camera.ts'
import { ParameterPanel } from '../ui/ParameterPanel.ts'
import { Stepper } from '../ui/Stepper.ts'

export class ExamplePage {
  private appContainer: HTMLElement
  private sceneManager: SceneManager | null = null
  private currentMeshes: Mesh[] = []
  private currentSample: SampleDef | null = null
  private currentParams: ParamValues = {}
  private currentStep = 0
  private _debounceTimer: ReturnType<typeof setTimeout> | null = null

  constructor(appContainer: HTMLElement) {
    this.appContainer = appContainer
  }

  mount(sample: SampleDef) {
    this.currentSample = sample
    this.currentStep = 0

    for (const p of sample.parameters) {
      this.currentParams[p.key] = p.defaultValue
    }

    this.appContainer.innerHTML = `
      <nav class="nav">
        <a href="#/" class="nav-brand">IFC Geometry Playground</a>
        <span class="nav-sep"> › </span>
        <span class="nav-current">${sample.title}</span>
      </nav>
      <div class="example-page">
        <div class="example-main">
          <div class="left-panel">
            <div class="sample-title">${sample.title}</div>
            <div class="sample-desc">${sample.description}</div>
            <div class="params-title">Parameters</div>
            <div id="param-panel"></div>
            <div class="params-title left-panel-steps-title">Steps</div>
            <div id="stepper"></div>
          </div>
          <div class="canvas-container">
            <canvas id="renderCanvas"></canvas>
          </div>
        </div>
      </div>
    `

    const canvas = document.getElementById('renderCanvas') as HTMLCanvasElement
    this.sceneManager = new SceneManager(canvas)
    createArcRotateCamera(this.sceneManager.scene, canvas)
    this.sceneManager.startRenderLoop()

    const paramContainer = document.getElementById('param-panel')!
    const stepperContainer = document.getElementById('stepper')!

    const paramPanel = new ParameterPanel(paramContainer, sample)
    const stepper = new Stepper(stepperContainer, sample.steps)

    this._rebuildGeometry()

    paramPanel.onChange(values => {
      this.currentParams = values
      this._scheduleRebuild(sample.debounceMs ?? 0)
    })

    stepper.onStepChange(index => {
      this.currentStep = index
      this._scheduleRebuild(0)
    })
  }

  private _scheduleRebuild(debounceMs: number) {
    if (this._debounceTimer !== null) {
      clearTimeout(this._debounceTimer)
      this._debounceTimer = null
    }
    if (debounceMs <= 0) {
      this._rebuildGeometry()
    } else {
      this._debounceTimer = setTimeout(() => {
        this._debounceTimer = null
        this._rebuildGeometry()
      }, debounceMs)
    }
  }

  private _rebuildGeometry() {
    if (!this.sceneManager || !this.currentSample) return

    for (const mesh of this.currentMeshes) {
      mesh.dispose()
    }
    this.currentMeshes = []

    this.currentMeshes = this.currentSample.buildGeometry(
      this.sceneManager.scene,
      this.currentParams,
      this.currentStep
    )
  }

  unmount() {
    if (this._debounceTimer !== null) {
      clearTimeout(this._debounceTimer)
      this._debounceTimer = null
    }
    for (const mesh of this.currentMeshes) {
      mesh.dispose()
    }
    this.currentMeshes = []
    if (this.sceneManager) {
      this.sceneManager.dispose()
      this.sceneManager = null
    }
  }
}
