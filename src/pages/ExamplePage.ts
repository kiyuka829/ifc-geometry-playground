import type { Mesh } from '@babylonjs/core'
import type { SampleDef, ParamValues, IfcProfileDef } from '../types.ts'
import { SceneManager } from '../engine/scene.ts'
import { createArcRotateCamera } from '../engine/camera.ts'
import { ParameterPanel } from '../ui/ParameterPanel.ts'
import { Stepper } from '../ui/Stepper.ts'
import { ProfileEditor } from '../ui/ProfileEditor.ts'

export class ExamplePage {
  private appContainer: HTMLElement
  private sceneManager: SceneManager | null = null
  private currentMeshes: Mesh[] = []
  private currentSample: SampleDef | null = null
  private currentParams: ParamValues = {}
  private currentStep = 0
  private currentProfile: IfcProfileDef | undefined = undefined
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

    // Seed the current profile from the config default (if any)
    this.currentProfile = sample.profileEditorConfig?.defaultProfile

    const hasProfileEditor = Boolean(sample.profileEditorConfig)

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
            ${hasProfileEditor ? `
              <div class="params-title">Profile</div>
              <div id="profile-editor-panel"></div>
            ` : ''}
            ${sample.parameters.length > 0 ? `
              <div class="params-title${hasProfileEditor ? ' left-panel-section-mt' : ''}">Parameters</div>
              <div id="param-panel"></div>
            ` : ''}
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

    // Profile editor (optional)
    const profileEditorContainer = document.getElementById('profile-editor-panel')
    if (profileEditorContainer && sample.profileEditorConfig) {
      const profileEditor = new ProfileEditor(profileEditorContainer, sample.profileEditorConfig)
      profileEditor.onChange(profile => {
        this.currentProfile = profile
        this._scheduleRebuild(sample.debounceMs ?? 0)
      })
    }

    // Parameter panel (optional – only rendered when there are params)
    const paramContainer = document.getElementById('param-panel')
    if (paramContainer && sample.parameters.length > 0) {
      const paramPanel = new ParameterPanel(paramContainer, sample)
      paramPanel.onChange(values => {
        this.currentParams = values
        this._scheduleRebuild(sample.debounceMs ?? 0)
      })
    }

    const stepperContainer = document.getElementById('stepper')!
    const stepper = new Stepper(stepperContainer, sample.steps)

    this._rebuildGeometry()

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
      this.currentStep,
      this.currentProfile,
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
