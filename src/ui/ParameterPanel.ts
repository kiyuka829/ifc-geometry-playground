import type { SampleDef } from '../types.ts'

export class ParameterPanel {
  private container: HTMLElement
  private sample: SampleDef
  private values: Record<string, number> = {}
  private changeCallbacks: Array<(values: Record<string, number>) => void> = []

  constructor(container: HTMLElement, sample: SampleDef) {
    this.container = container
    this.sample = sample
    this._initValues()
    this._render()
  }

  private _initValues() {
    for (const p of this.sample.parameters) {
      this.values[p.key] = p.defaultValue
    }
  }

  private _render() {
    this.container.innerHTML = ''
    for (const param of this.sample.parameters) {
      const group = document.createElement('div')
      group.className = 'param-group'

      const label = document.createElement('div')
      label.className = 'param-label'
      const labelText = document.createElement('span')
      labelText.textContent = param.label
      const valueDisplay = document.createElement('span')
      valueDisplay.textContent = this.values[param.key].toFixed(2)
      label.appendChild(labelText)
      label.appendChild(valueDisplay)

      const slider = document.createElement('input')
      slider.type = 'range'
      slider.className = 'param-slider'
      slider.min = String(param.min)
      slider.max = String(param.max)
      slider.step = String(param.step)
      slider.value = String(this.values[param.key])

      slider.addEventListener('input', () => {
        this.values[param.key] = Number(slider.value)
        valueDisplay.textContent = this.values[param.key].toFixed(2)
        this._notifyChange()
      })

      group.appendChild(label)
      group.appendChild(slider)
      this.container.appendChild(group)
    }
  }

  getValues(): Record<string, number> {
    return { ...this.values }
  }

  onChange(callback: (values: Record<string, number>) => void) {
    this.changeCallbacks.push(callback)
  }

  private _notifyChange() {
    const vals = this.getValues()
    for (const cb of this.changeCallbacks) {
      cb(vals)
    }
  }
}
