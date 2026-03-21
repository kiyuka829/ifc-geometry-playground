import type { SampleDef, ParamValues } from '../types.ts'

export class ParameterPanel {
  private container: HTMLElement
  private sample: SampleDef
  private values: ParamValues = {}
  private changeCallbacks: Array<(values: ParamValues) => void> = []

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

      if (param.type === 'number') {
        const valueDisplay = document.createElement('span')
        valueDisplay.textContent = (this.values[param.key] as number).toFixed(2)
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
          valueDisplay.textContent = (this.values[param.key] as number).toFixed(2)
          this._notifyChange()
        })

        group.appendChild(label)
        group.appendChild(slider)
      } else if (param.type === 'select') {
        label.appendChild(labelText)

        const select = document.createElement('select')
        select.className = 'param-select'

        for (const opt of param.options) {
          const option = document.createElement('option')
          option.value = opt.value
          option.textContent = opt.label
          if (opt.value === this.values[param.key]) {
            option.selected = true
          }
          select.appendChild(option)
        }

        select.addEventListener('change', () => {
          this.values[param.key] = select.value
          this._notifyChange()
        })

        group.appendChild(label)
        group.appendChild(select)
      }

      this.container.appendChild(group)
    }
  }

  getValues(): ParamValues {
    return { ...this.values }
  }

  onChange(callback: (values: ParamValues) => void) {
    this.changeCallbacks.push(callback)
  }

  private _notifyChange() {
    const vals = this.getValues()
    for (const cb of this.changeCallbacks) {
      cb(vals)
    }
  }
}
