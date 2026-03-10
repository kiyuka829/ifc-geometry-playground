import type { PipelineStep } from '../ifc/schema'

export function renderStepper(container: HTMLElement, steps: PipelineStep[]): void {
  container.innerHTML = '<h3>Build Steps</h3>'
  const list = document.createElement('ol')
  steps.forEach((step) => {
    const item = document.createElement('li')
    item.innerHTML = `<strong>${step.title}</strong><p>${step.description}</p>`
    list.append(item)
  })
  container.append(list)
}
