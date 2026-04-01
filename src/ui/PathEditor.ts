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

    // SVG top-down preview
    const preview = document.createElement('div')
    preview.className = 'path-preview'
    const svg = this._buildSVG()
    preview.appendChild(svg)
    wrapper.appendChild(preview)

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
          this._refreshPreview()
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

  // ── SVG preview (top-down XY view) ──────────────────────────────────────

  private _buildSVG(): SVGSVGElement {
    const ns = 'http://www.w3.org/2000/svg'
    const W = 248
    const H = 140
    const PAD = 16

    const svg = document.createElementNS(ns, 'svg')
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`)
    svg.setAttribute('width', String(W))
    svg.setAttribute('height', String(H))

    if (this.path.length < 2) {
      // Nothing meaningful to draw
      const t = document.createElementNS(ns, 'text')
      t.setAttribute('x', String(W / 2))
      t.setAttribute('y', String(H / 2))
      t.setAttribute('text-anchor', 'middle')
      t.setAttribute('dominant-baseline', 'middle')
      t.setAttribute('fill', '#4a6080')
      t.setAttribute('font-size', '11')
      t.textContent = 'Add at least 2 waypoints'
      svg.appendChild(t)
      return svg
    }

    // Compute bounding box of XY plane
    const xs = this.path.map(p => p.x)
    const ys = this.path.map(p => p.y)
    const minX = Math.min(...xs)
    const maxX = Math.max(...xs)
    const minY = Math.min(...ys)
    const maxY = Math.max(...ys)

    const rangeX = maxX - minX || 1
    const rangeY = maxY - minY || 1

    const scaleX = (W - PAD * 2) / rangeX
    const scaleY = (H - PAD * 2) / rangeY
    const scale = Math.min(scaleX, scaleY)

    const toSVG = (x: number, y: number): [number, number] => [
      PAD + (x - minX) * scale + ((W - PAD * 2) - rangeX * scale) / 2,
      H - PAD - (y - minY) * scale - ((H - PAD * 2) - rangeY * scale) / 2,
    ]

    // Axis labels
    const labelX = document.createElementNS(ns, 'text')
    labelX.setAttribute('x', String(W - 4))
    labelX.setAttribute('y', String(H - 4))
    labelX.setAttribute('text-anchor', 'end')
    labelX.setAttribute('fill', '#ef5350')
    labelX.setAttribute('font-size', '9')
    labelX.textContent = 'X →'
    svg.appendChild(labelX)

    const labelY = document.createElementNS(ns, 'text')
    labelY.setAttribute('x', '4')
    labelY.setAttribute('y', '12')
    labelY.setAttribute('fill', '#66bb6a')
    labelY.setAttribute('font-size', '9')
    labelY.textContent = '↑ Y'
    svg.appendChild(labelY)

    // Path polyline
    const points = this.path.map(p => {
      const [sx, sy] = toSVG(p.x, p.y)
      return `${sx.toFixed(1)},${sy.toFixed(1)}`
    }).join(' ')

    const polyline = document.createElementNS(ns, 'polyline')
    polyline.setAttribute('points', points)
    polyline.setAttribute('fill', 'none')
    polyline.setAttribute('stroke', '#4fc3f7')
    polyline.setAttribute('stroke-width', '1.5')
    polyline.setAttribute('stroke-linejoin', 'round')
    polyline.setAttribute('stroke-linecap', 'round')
    svg.appendChild(polyline)

    // Waypoint dots
    this.path.forEach((p, i) => {
      const [sx, sy] = toSVG(p.x, p.y)
      const circle = document.createElementNS(ns, 'circle')
      circle.setAttribute('cx', sx.toFixed(1))
      circle.setAttribute('cy', sy.toFixed(1))
      circle.setAttribute('r', '3')
      circle.setAttribute('fill', i === 0 ? '#66bb6a' : i === this.path.length - 1 ? '#ef5350' : '#4fc3f7')
      svg.appendChild(circle)

      const label = document.createElementNS(ns, 'text')
      label.setAttribute('x', (sx + 5).toFixed(1))
      label.setAttribute('y', (sy - 4).toFixed(1))
      label.setAttribute('fill', '#90caf9')
      label.setAttribute('font-size', '8')
      label.textContent = `P${i}`
      svg.appendChild(label)
    })

    return svg
  }

  /** Full re-render (e.g. after adding/removing a point). */
  private _refresh(): void {
    this._render()
  }

  /** Only update the SVG preview without rebuilding the whole editor. */
  private _refreshPreview(): void {
    const preview = this.container.querySelector('.path-preview')
    if (!preview) return
    preview.innerHTML = ''
    preview.appendChild(this._buildSVG())
  }
}
