import type { Mesh } from '@babylonjs/core'
import type { SampleDef, ParamValues } from '../types.ts'
import { SceneManager } from '../engine/scene.ts'
import { createArcRotateCamera } from '../engine/camera.ts'
import { ParameterPanel } from '../ui/ParameterPanel.ts'
import { Stepper } from '../ui/Stepper.ts'
import { CodeView } from '../ui/CodeView.ts'
import { TreeView } from '../ui/TreeView.ts'

export class ExamplePage {
  private appContainer: HTMLElement
  private sceneManager: SceneManager | null = null
  private currentMeshes: Mesh[] = []
  private currentSample: SampleDef | null = null
  private currentParams: ParamValues = {}
  private currentStep = 0
  private codeView: CodeView | null = null
  private treeView: TreeView | null = null

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
          <div class="right-panel">
            <div class="right-panel-tabs">
              <button class="right-tab active" data-tab="code">IFC Code</button>
              <button class="right-tab" data-tab="tree">IFC Tree</button>
            </div>
            <div class="right-panel-content">
              <div id="ifc-code-view" class="right-tab-pane active"></div>
              <div id="ifc-tree-view" class="right-tab-pane"></div>
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
    const codeContainer = document.getElementById('ifc-code-view')!
    const treeContainer = document.getElementById('ifc-tree-view')!

    const paramPanel = new ParameterPanel(paramContainer, sample)
    const stepper = new Stepper(stepperContainer, sample.steps)
    this.codeView = new CodeView(codeContainer)
    this.treeView = new TreeView(treeContainer)

    const tabs = this.appContainer.querySelectorAll<HTMLButtonElement>('.right-tab')
    const panes = this.appContainer.querySelectorAll<HTMLElement>('.right-tab-pane')
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const target = tab.dataset.tab
        tabs.forEach(t => t.classList.remove('active'))
        panes.forEach(p => p.classList.remove('active'))
        tab.classList.add('active')
        document.getElementById(`ifc-${target}-view`)?.classList.add('active')
      })
    })

    this._rebuildGeometry()

    paramPanel.onChange(values => {
      this.currentParams = values
      this._rebuildGeometry()
    })

    stepper.onStepChange(index => {
      this.currentStep = index
      this._rebuildGeometry()
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

    const ifcData = this.currentSample.getIFCRepresentation(this.currentParams)
    this.codeView?.render(ifcData)
    this.treeView?.render(ifcData)
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
    this.codeView = null
    this.treeView = null
  }
}
