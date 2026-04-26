import type { Vec3 } from '../types.ts'
import type { PathEditorConfig } from '../types.ts'

const DEFAULT_COORD_STEP = 0.5
const DEFAULT_WAYPOINT_Y_OFFSET = 2

export class PathEditor {
  private container: HTMLElement
  private config: PathEditorConfig
  private path: Vec3[]
  private changeCallbacks: Array<(path: Vec3[]) => void> = []

  constructor(container: HTMLElement, config: PathEditorConfig) {
    this.container = container
    this.config = config
    this.path = JSON.parse(JSON.stringify(config.defaultPath)) as Vec3[]
    this._render()
  }

  getPath(): Vec3[] {
    return JSON.parse(JSON.stringify(this.path)) as Vec3[]
  }

  onChange(callback: (path: Vec3[]) => void): void {
    this.changeCallbacks.push(callback)
  }

  private _notify(): void {
    const copy = this.getPath()
    for (const cb of this.changeCallbacks) cb(copy)
  }

  // ── Rendering ────────────────────────────────────────────────────────────

  private _render(): void {
    this.container.innerHTML = ''

    const wrapper = document.createElement('div')
    wrapper.className = 'path-editor'

    // Point list
    const list = document.createElement('div')
    list.className = 'path-points-list'
    this.path.forEach((pt, i) => {
      list.appendChild(this._buildPointRow(pt, i))
    })
    wrapper.appendChild(list)

    // Add point button
    const addBtn = document.createElement('button')
    addBtn.className = 'path-add-point-btn'
    addBtn.textContent = '+ Add waypoint'
    addBtn.addEventListener('click', () => {
      // Append a point offset from the last one
      const last = this.path[this.path.length - 1] ?? { x: 0, y: 0, z: 0 }
      this.path.push({ x: last.x, y: last.y + DEFAULT_WAYPOINT_Y_OFFSET, z: last.z })
      this._refresh()
      this._notify()
    })
    wrapper.appendChild(addBtn)

    this.container.appendChild(wrapper)
  }

  private _buildPointRow(pt: Vec3, index: number): HTMLElement {
    const minPoints = this.config.minPoints ?? 2
    const row = document.createElement('div')
    row.className = 'path-point-row'

    const idx = document.createElement('span')
    idx.className = 'point-index'
    idx.textContent = `P${index}`
    row.appendChild(idx)

    const coords: Array<{ label: string; axis: keyof Vec3 }> = [
      { label: 'x', axis: 'x' },
      { label: 'y', axis: 'y' },
      { label: 'z', axis: 'z' },
    ]
    for (const { label, axis } of coords) {
      const lbl = document.createElement('span')
      lbl.className = 'point-coord-label'
      lbl.textContent = label
      row.appendChild(lbl)

      const input = document.createElement('input')
      input.type = 'number'
      input.className = 'point-coord-input'
      input.value = String(pt[axis])
      input.step = String(DEFAULT_COORD_STEP)
      input.addEventListener('input', () => {
        const parsed = Number(input.value)
        if (Number.isFinite(parsed)) {
          this.path[index][axis] = parsed
          this._notify()
        }
      })
      row.appendChild(input)
    }

    // Delete button
    if (this.path.length > minPoints) {
      const del = document.createElement('button')
      del.className = 'point-delete-btn'
      del.title = 'Remove waypoint'
      del.textContent = '×'
      del.addEventListener('click', () => {
        this.path.splice(index, 1)
        this._refresh()
        this._notify()
      })
      row.appendChild(del)
    } else {
      const placeholder = document.createElement('span')
      placeholder.className = 'point-delete-placeholder'
      row.appendChild(placeholder)
    }

    return row
  }

  /** Full re-render (e.g. after adding/removing a point). */
  private _refresh(): void {
    this._render()
  }
}
