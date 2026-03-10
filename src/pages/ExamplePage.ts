import { SceneViewport } from '../engine/scene'
import type { ExampleSample, Parameters } from '../ifc/schema'
import { renderCodeView } from '../ui/CodeView'
import { renderParameterPanel } from '../ui/ParameterPanel'
import { renderStepper } from '../ui/Stepper'
import { renderTreeView } from '../ui/TreeView'

export function createExamplePage(container: HTMLElement, sample: ExampleSample): void {
  container.innerHTML = `
    <section class="workspace">
      <aside class="panel" data-slot="params"></aside>
      <main class="panel panel-main" data-slot="viewport"></main>
      <section class="panel" data-slot="steps"></section>
      <section class="panel" data-slot="tree"></section>
      <section class="panel" data-slot="code"></section>
    </section>
  `

  const paramsSlot = container.querySelector<HTMLElement>('[data-slot="params"]')!
  const viewportSlot = container.querySelector<HTMLElement>('[data-slot="viewport"]')!
  const stepsSlot = container.querySelector<HTMLElement>('[data-slot="steps"]')!
  const treeSlot = container.querySelector<HTMLElement>('[data-slot="tree"]')!
  const codeSlot = container.querySelector<HTMLElement>('[data-slot="code"]')!

  let params: Parameters = { ...sample.initialParams }
  const viewport = new SceneViewport(viewportSlot)

  const render = () => {
    const evaluation = sample.evaluate(params)
    renderParameterPanel(paramsSlot, params, sample.parameters, (next) => {
      params = next
      render()
    })
    viewport.render(sample, params, evaluation)
    renderStepper(stepsSlot, evaluation.steps)
    renderTreeView(treeSlot, sample.ifcTree)
    renderCodeView(codeSlot, sample.pseudoIfc)
  }

  render()
}
