import type {
  IfcProfileDef,
  IfcRectangleProfileDef,
  IfcCircleProfileDef,
  IfcArbitraryClosedProfileDef,
  Vec2,
} from '../ifc/schema.ts'
import type { ProfileEditorConfig, ProfileType } from '../types.ts'

const DEFAULT_ARBITRARY_CURVE: Vec2[] = [
  { x: 0, y: 0 },
  { x: 3, y: 0 },
  { x: 3, y: 1 },
  { x: 1, y: 1 },
  { x: 1, y: 4 },
  { x: 0, y: 4 },
]

export class ProfileEditor {
  private container: HTMLElement
  private config: ProfileEditorConfig
  private currentProfile: IfcProfileDef
  private changeCallbacks: Array<(profile: IfcProfileDef) => void> = []

  constructor(container: HTMLElement, config: ProfileEditorConfig) {
    this.container = container
    this.config = config
    this.currentProfile = config.defaultProfile
    this._render()
  }

  getProfile(): IfcProfileDef {
    return this.currentProfile
  }

  onChange(callback: (profile: IfcProfileDef) => void): void {
    this.changeCallbacks.push(callback)
  }

  private _notify(): void {
    for (const cb of this.changeCallbacks) {
      cb(this.currentProfile)
    }
  }

  private _activeType(): ProfileType {
    switch (this.currentProfile.type) {
      case 'IfcRectangleProfileDef': return 'rectangle'
      case 'IfcCircleProfileDef': return 'circle'
      case 'IfcArbitraryClosedProfileDef':
      case 'IfcArbitraryProfileDefWithVoids': return 'arbitrary'
    }
  }

  private _switchType(newType: ProfileType): void {
    if (this._activeType() === newType) return
    switch (newType) {
      case 'rectangle':
        this.currentProfile = {
          type: 'IfcRectangleProfileDef', profileType: 'AREA', xDim: 4, yDim: 3,
        } satisfies IfcRectangleProfileDef
        break
      case 'circle':
        this.currentProfile = {
          type: 'IfcCircleProfileDef', profileType: 'AREA', radius: 2,
        } satisfies IfcCircleProfileDef
        break
      case 'arbitrary':
        this.currentProfile = {
          type: 'IfcArbitraryClosedProfileDef',
          profileType: 'AREA',
          outerCurve: DEFAULT_ARBITRARY_CURVE.map(p => ({ ...p })),
        } satisfies IfcArbitraryClosedProfileDef
        break
    }
    this._render()
    this._notify()
  }

  // ── SVG preview ──────────────────────────────────────────────────────────────

  private _buildSVG(): string {
    const p = this.currentProfile
    const PAD = 0.5

    if (p.type === 'IfcRectangleProfileDef') {
      const hw = p.xDim / 2
      const hh = p.yDim / 2
      const vb = `${-hw - PAD} ${-hh - PAD} ${p.xDim + 2 * PAD} ${p.yDim + 2 * PAD}`
      return `<svg viewBox="${vb}" xmlns="http://www.w3.org/2000/svg">
        ${this._svgAxes(hw + PAD, hh + PAD)}
        <rect x="${-hw}" y="${-hh}" width="${p.xDim}" height="${p.yDim}"
              fill="rgba(255,128,26,0.18)" stroke="#ff801a" stroke-width="0.08"/>
      </svg>`
    }

    if (p.type === 'IfcCircleProfileDef') {
      const r = p.radius
      const dim = 2 * (r + PAD)
      const vb = `${-r - PAD} ${-r - PAD} ${dim} ${dim}`
      return `<svg viewBox="${vb}" xmlns="http://www.w3.org/2000/svg">
        ${this._svgAxes(r + PAD, r + PAD)}
        <circle cx="0" cy="0" r="${r}"
                fill="rgba(255,128,26,0.18)" stroke="#ff801a" stroke-width="0.08"/>
      </svg>`
    }

    if (
      p.type === 'IfcArbitraryClosedProfileDef' ||
      p.type === 'IfcArbitraryProfileDefWithVoids'
    ) {
      const curve = p.outerCurve
      if (curve.length < 2) {
        return `<svg viewBox="-5 -5 10 10" xmlns="http://www.w3.org/2000/svg">
          <text x="0" y="0" fill="#6a8aaa" font-size="1" text-anchor="middle">Add points</text>
        </svg>`
      }
      const xs = curve.map(q => q.x)
      const ys = curve.map(q => q.y)
      const minX = Math.min(...xs), maxX = Math.max(...xs)
      const minY = Math.min(...ys), maxY = Math.max(...ys)
      const w = maxX - minX || 1
      const h = maxY - minY || 1
      const vb = `${minX - PAD} ${minY - PAD} ${w + 2 * PAD} ${h + 2 * PAD}`

      const pts = curve.map(q => `${q.x},${q.y}`).join(' ')
      let innerPaths = ''
      if (p.type === 'IfcArbitraryProfileDefWithVoids') {
        for (const inner of p.innerCurves) {
          const ipts = inner.map(q => `${q.x},${q.y}`).join(' ')
          innerPaths += `<polygon points="${ipts}" fill="#1a1a2e" stroke="#ff801a" stroke-width="0.06" stroke-dasharray="0.15 0.1"/>`
        }
      }

      const dotRadius = Math.max(w, h) * 0.025
      const dots = curve.map((q, i) =>
        `<circle cx="${q.x}" cy="${q.y}" r="${dotRadius}" fill="#4fc3f7">
          <title>P${i} (${q.x.toFixed(2)}, ${q.y.toFixed(2)})</title>
        </circle>`
      ).join('')

      return `<svg viewBox="${vb}" xmlns="http://www.w3.org/2000/svg">
        ${this._svgAxes(maxX + PAD, maxY + PAD)}
        <polygon points="${pts}"
                 fill="rgba(255,128,26,0.18)" stroke="#ff801a" stroke-width="0.08"/>
        ${innerPaths}
        ${dots}
      </svg>`
    }

    return `<svg viewBox="-5 -5 10 10" xmlns="http://www.w3.org/2000/svg"></svg>`
  }

  /** Light axis lines centred at origin, sized to fit the profile bounds. */
  private _svgAxes(halfW: number, halfH: number): string {
    const sw = Math.max(halfW, halfH) * 0.02
    return `
      <line x1="${-halfW}" y1="0" x2="${halfW}" y2="0"
            stroke="#2a4a6a" stroke-width="${sw}"/>
      <line x1="0" y1="${-halfH}" x2="0" y2="${halfH}"
            stroke="#2a4a6a" stroke-width="${sw}"/>
    `
  }

  // ── Parameter controls HTML ───────────────────────────────────────────────

  private _buildParamsHTML(): string {
    const p = this.currentProfile

    if (p.type === 'IfcRectangleProfileDef') {
      return `
        ${this._sliderHTML('rect-w', 'Width (xDim)', p.xDim, 0.5, 10, 0.1)}
        ${this._sliderHTML('rect-h', 'Height (yDim)', p.yDim, 0.5, 10, 0.1)}
      `
    }

    if (p.type === 'IfcCircleProfileDef') {
      return this._sliderHTML('circle-r', 'Radius', p.radius, 0.1, 10, 0.1)
    }

    if (
      p.type === 'IfcArbitraryClosedProfileDef' ||
      p.type === 'IfcArbitraryProfileDefWithVoids'
    ) {
      const rows = p.outerCurve.map((pt, i) => `
        <div class="profile-point-row" data-index="${i}">
          <span class="point-index">P${i}</span>
          <label class="point-coord-label">X</label>
          <input type="number" class="point-coord-input point-x-input"
                 data-index="${i}" value="${pt.x}" step="0.1">
          <label class="point-coord-label">Y</label>
          <input type="number" class="point-coord-input point-y-input"
                 data-index="${i}" value="${pt.y}" step="0.1">
          ${p.outerCurve.length > 3
            ? `<button class="point-delete-btn" data-index="${i}" title="Remove point">×</button>`
            : `<span class="point-delete-placeholder"></span>`
          }
        </div>
      `).join('')
      return `
        <div class="profile-points-list">${rows}</div>
        <button class="profile-add-point-btn">+ Add Point</button>
      `
    }

    return ''
  }

  private _sliderHTML(
    elementId: string, label: string, value: number,
    min: number, max: number, step: number,
  ): string {
    return `
      <div class="param-group">
        <div class="param-label">
          <span>${label}</span>
          <span id="${elementId}-val">${value.toFixed(2)}</span>
        </div>
        <input type="range" class="param-slider" id="${elementId}"
               min="${min}" max="${max}" step="${step}" value="${value}">
      </div>
    `
  }

  // ── Render ────────────────────────────────────────────────────────────────

  private _render(): void {
    const activeType = this._activeType()

    this.container.innerHTML = `
      <div class="profile-editor">
        <div class="profile-type-tabs">
          ${this.config.allowedTypes.map(t => `
            <button class="profile-tab${t === activeType ? ' active' : ''}"
                    data-type="${t}">
              ${this._typeLabel(t)}
            </button>
          `).join('')}
        </div>
        <div class="profile-preview">
          ${this._buildSVG()}
        </div>
        <div class="profile-params">
          ${this._buildParamsHTML()}
        </div>
      </div>
    `

    // Tab buttons
    for (const btn of this.container.querySelectorAll<HTMLButtonElement>('.profile-tab')) {
      btn.addEventListener('click', () => this._switchType(btn.dataset.type as ProfileType))
    }

    // Rectangle sliders
    const rectWidthInput = this.container.querySelector<HTMLInputElement>('#rect-w')
    const rectHeightInput = this.container.querySelector<HTMLInputElement>('#rect-h')
    if (rectWidthInput && rectHeightInput) {
      const update = () => {
        const prof = this.currentProfile as IfcRectangleProfileDef
        prof.xDim = Number(rectWidthInput.value)
        prof.yDim = Number(rectHeightInput.value)
        this.container.querySelector<HTMLElement>('#rect-w-val')!.textContent = prof.xDim.toFixed(2)
        this.container.querySelector<HTMLElement>('#rect-h-val')!.textContent = prof.yDim.toFixed(2)
        this._refreshPreview()
        this._notify()
      }
      rectWidthInput.addEventListener('input', update)
      rectHeightInput.addEventListener('input', update)
    }

    // Circle slider
    const circleRadiusInput = this.container.querySelector<HTMLInputElement>('#circle-r')
    if (circleRadiusInput) {
      circleRadiusInput.addEventListener('input', () => {
        const prof = this.currentProfile as IfcCircleProfileDef
        prof.radius = Number(circleRadiusInput.value)
        this.container.querySelector<HTMLElement>('#circle-r-val')!.textContent = prof.radius.toFixed(2)
        this._refreshPreview()
        this._notify()
      })
    }

    // Arbitrary point inputs
    for (const input of this.container.querySelectorAll<HTMLInputElement>('.point-x-input, .point-y-input')) {
      input.addEventListener('input', () => {
        const idx = Number(input.dataset.index)
        const profile = this.currentProfile as IfcArbitraryClosedProfileDef
        if (input.classList.contains('point-x-input')) {
          profile.outerCurve[idx] = { ...profile.outerCurve[idx], x: Number(input.value) }
        } else {
          profile.outerCurve[idx] = { ...profile.outerCurve[idx], y: Number(input.value) }
        }
        this._refreshPreview()
        this._notify()
      })
    }

    // Delete point buttons
    for (const btn of this.container.querySelectorAll<HTMLButtonElement>('.point-delete-btn')) {
      btn.addEventListener('click', () => {
        const idx = Number(btn.dataset.index)
        const profile = this.currentProfile as IfcArbitraryClosedProfileDef
        profile.outerCurve.splice(idx, 1)
        this._render()
        this._notify()
      })
    }

    // Add point button
    const addBtn = this.container.querySelector<HTMLButtonElement>('.profile-add-point-btn')
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        const profile = this.currentProfile as IfcArbitraryClosedProfileDef
        const last = profile.outerCurve[profile.outerCurve.length - 1] ?? { x: 0, y: 0 }
        profile.outerCurve.push({ x: last.x + 1, y: last.y })
        this._render()
        this._notify()
      })
    }
  }

  /** Re-render only the SVG preview without re-creating the whole editor. */
  private _refreshPreview(): void {
    const previewEl = this.container.querySelector<HTMLElement>('.profile-preview')
    if (previewEl) {
      previewEl.innerHTML = this._buildSVG()
    }
  }

  private _typeLabel(type: ProfileType): string {
    switch (type) {
      case 'rectangle': return 'Rectangle'
      case 'circle': return 'Circle'
      case 'arbitrary': return 'Arbitrary'
    }
  }
}
