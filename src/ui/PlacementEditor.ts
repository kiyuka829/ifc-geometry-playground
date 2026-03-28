import type { Vec3, IfcAxis2Placement3D } from '../types.ts'
import type { PlacementEditorConfig } from '../types.ts'

const DEFAULT_INCREMENT = 0.1

export class PlacementEditor {
  private container: HTMLElement
  private placement: IfcAxis2Placement3D
  private changeCallbacks: Array<(placement: IfcAxis2Placement3D) => void> = []

  constructor(container: HTMLElement, config: PlacementEditorConfig) {
    this.container = container
    this.placement = this._clonePlacement(config.defaultPlacement)
    this._render()
  }

  getPlacement(): IfcAxis2Placement3D {
    return this._clonePlacement(this.placement)
  }

  onChange(callback: (placement: IfcAxis2Placement3D) => void): void {
    this.changeCallbacks.push(callback)
  }

  private _clonePlacement(p: IfcAxis2Placement3D): IfcAxis2Placement3D {
    return {
      type: 'IfcAxis2Placement3D',
      location: { ...p.location },
      axis: p.axis ? { ...p.axis } : undefined,
    }
  }

  private _notify(): void {
    for (const cb of this.changeCallbacks) {
      cb(this._clonePlacement(this.placement))
    }
  }

  // ── Rendering ────────────────────────────────────────────────────────────

  private _render(): void {
    this.container.innerHTML = ''

    const wrapper = document.createElement('div')
    wrapper.className = 'placement-editor'

    // Location section
    const locSection = document.createElement('div')
    locSection.className = 'placement-section'
    locSection.innerHTML = '<div class="placement-label">Location</div>'
    const locFields = document.createElement('div')
    locFields.className = 'placement-fields'

    const locInputs: Record<'x' | 'y' | 'z', HTMLInputElement> = {
      x: document.createElement('input'),
      y: document.createElement('input'),
      z: document.createElement('input'),
    }

    for (const axis of ['x', 'y', 'z'] as const) {
      const fieldDiv = document.createElement('div')
      fieldDiv.className = 'placement-field'

      const label = document.createElement('label')
      label.textContent = axis.toUpperCase()
      label.className = 'placement-field-label'

      const input = locInputs[axis]
      input.type = 'number'
      input.step = String(DEFAULT_INCREMENT)
      input.value = String(this.placement.location[axis])
      input.className = 'placement-input'

      input.addEventListener('change', () => {
        this.placement.location[axis] = parseFloat(input.value) || 0
        this._notify()
      })

      input.addEventListener('input', () => {
        this.placement.location[axis] = parseFloat(input.value) || 0
        this._notify()
      })

      fieldDiv.appendChild(label)
      fieldDiv.appendChild(input)
      locFields.appendChild(fieldDiv)
    }

    locSection.appendChild(locFields)
    wrapper.appendChild(locSection)

    // Axis section
    const axisSection = document.createElement('div')
    axisSection.className = 'placement-section'
    axisSection.innerHTML = '<div class="placement-label">Axis (Z direction)</div>'
    const axisFields = document.createElement('div')
    axisFields.className = 'placement-fields'

    const axisInputs: Record<'x' | 'y' | 'z', HTMLInputElement> = {
      x: document.createElement('input'),
      y: document.createElement('input'),
      z: document.createElement('input'),
    }

    const defaultAxis: Vec3 = this.placement.axis ?? { x: 0, y: 0, z: 1 }

    for (const component of ['x', 'y', 'z'] as const) {
      const fieldDiv = document.createElement('div')
      fieldDiv.className = 'placement-field'

      const label = document.createElement('label')
      label.textContent = component.toUpperCase()
      label.className = 'placement-field-label'

      const input = axisInputs[component]
      input.type = 'number'
      input.step = String(DEFAULT_INCREMENT)
      input.value = String(defaultAxis[component])
      input.className = 'placement-input'

      input.addEventListener('change', () => {
        const raw: Vec3 = {
          x: parseFloat(axisInputs.x.value) || 0,
          y: parseFloat(axisInputs.y.value) || 0,
          z: parseFloat(axisInputs.z.value) || 1,
        }
        this.placement.axis = this._normalizeAxis(raw)
        this._notify()
      })

      input.addEventListener('input', () => {
        const raw: Vec3 = {
          x: parseFloat(axisInputs.x.value) || 0,
          y: parseFloat(axisInputs.y.value) || 0,
          z: parseFloat(axisInputs.z.value) || 1,
        }
        this.placement.axis = this._normalizeAxis(raw)
        this._notify()
      })

      fieldDiv.appendChild(label)
      fieldDiv.appendChild(input)
      axisFields.appendChild(fieldDiv)
    }

    axisSection.appendChild(axisFields)
    wrapper.appendChild(axisSection)

    this.container.appendChild(wrapper)
  }

  /**
   * Normalize a 3D vector to unit length.
   * If length is 0, defaults to [0, 0, 1].
   */
  private _normalizeAxis(v: Vec3): Vec3 {
    const len = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z)
    if (len < 0.0001) {
      return { x: 0, y: 0, z: 1 }
    }
    return {
      x: v.x / len,
      y: v.y / len,
      z: v.z / len,
    }
  }
}
