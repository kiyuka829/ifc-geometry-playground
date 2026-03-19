import type { Mesh } from '@babylonjs/core'
import type { SampleDef } from '../types.ts'
import { SceneManager } from '../engine/scene.ts'
import { createArcRotateCamera } from '../engine/camera.ts'
import { ParameterPanel } from '../ui/ParameterPanel.ts'
import { Stepper } from '../ui/Stepper.ts'
import { TreeView } from '../ui/TreeView.ts'
import { CodeView } from '../ui/CodeView.ts'

export class ExamplePage {
  private appContainer: HTMLElement
  private sceneManager: SceneManager | null = null
  private currentMeshes: Mesh[] = []
  private currentSample: SampleDef | null = null
  private currentParams: Record<string, number> = {}
  private currentStep = 0

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
            <div class="params-title">パラメータ</div>
            <div id="param-panel"></div>
          </div>
          <div class="canvas-container">
            <canvas id="renderCanvas"></canvas>
          </div>
        </div>
        <div class="bottom-panel">
          <div class="stepper-panel">
            <div class="params-title">ステップ</div>
            <div id="stepper"></div>
          </div>
          <div class="info-panel">
            <div class="tab-bar">
              <button class="tab-btn active" data-tab="code">IFC Code</button>
              <button class="tab-btn" data-tab="tree">Tree View</button>
            </div>
            <div class="tab-content">
              <div id="code-view"></div>
              <div id="tree-view" style="display:none"></div>
            </div>
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
    const codeContainer = document.getElementById('code-view')!
    const treeContainer = document.getElementById('tree-view')!

    const paramPanel = new ParameterPanel(paramContainer, sample)
    const stepper = new Stepper(stepperContainer, sample.steps)
    const codeView = new CodeView(codeContainer)
    const treeView = new TreeView(treeContainer)

    this._rebuildGeometry()
    this._updateInfoPanels(codeView, treeView)

    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = (btn as HTMLElement).dataset.tab
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'))
        btn.classList.add('active')
        if (tab === 'code') {
          codeContainer.style.display = 'block'
          treeContainer.style.display = 'none'
        } else {
          codeContainer.style.display = 'none'
          treeContainer.style.display = 'block'
        }
      })
    })

    paramPanel.onChange(values => {
      this.currentParams = values
      this._rebuildGeometry()
      this._updateInfoPanels(codeView, treeView)
    })

    stepper.onStepChange(index => {
      this.currentStep = index
      this._rebuildGeometry()
      this._updateInfoPanels(codeView, treeView)
    })
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

  private _updateInfoPanels(codeView: CodeView, treeView: TreeView) {
    if (!this.currentSample) return
    const rep = this.currentSample.getIFCRepresentation(this.currentParams)
    codeView.render(rep)
    treeView.render(rep)
  }

  unmount() {
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
