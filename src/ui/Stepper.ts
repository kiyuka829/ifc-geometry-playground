import type { StepDef } from '../types.ts'

export class Stepper {
  private container: HTMLElement
  private steps: StepDef[]
  private activeIndex = 0
  private stepChangeCallbacks: Array<(index: number) => void> = []

  constructor(container: HTMLElement, steps: StepDef[]) {
    this.container = container
    this.steps = steps
    this._render()
  }

  private _render() {
    this.container.innerHTML = ''
    this.steps.forEach((step, i) => {
      const btn = document.createElement('button')
      btn.className = `step-btn${i === this.activeIndex ? ' active' : ''}`
      btn.textContent = step.label
      btn.addEventListener('click', () => {
        this.setActiveStep(i)
        for (const cb of this.stepChangeCallbacks) cb(i)
      })
      this.container.appendChild(btn)
    })

    this._updateDescription()
  }

  private _updateDescription() {
    const existing = this.container.querySelector('.step-desc')
    if (existing) existing.remove()

    const step = this.steps[this.activeIndex]
    if (step) {
      const desc = document.createElement('div')
      desc.className = 'step-desc'
      desc.textContent = step.description
      this.container.appendChild(desc)
    }
  }

  setActiveStep(index: number) {
    this.activeIndex = index
    const btns = this.container.querySelectorAll('.step-btn')
    btns.forEach((btn, i) => {
      btn.classList.toggle('active', i === index)
    })
    this._updateDescription()
  }

  onStepChange(callback: (stepIndex: number) => void) {
    this.stepChangeCallbacks.push(callback)
  }
}
