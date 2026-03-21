import type {
  IfcProfileDef,
  IfcRectangleProfileDef,
  IfcCircleProfileDef,
  IfcRectangleHollowProfileDef,
  IfcCircleHollowProfileDef,
  IfcIShapeProfileDef,
  IfcLShapeProfileDef,
  IfcArbitraryClosedProfileDef,
  Vec2,
} from '../ifc/schema.ts'
import type { ProfileEditorConfig, ProfileType } from '../types.ts'
import { profileOuterVec2, profileInnerVec2s } from '../ifc/operations/extrusion.ts'

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
      case 'IfcRectangleProfileDef':      return 'rectangle'
      case 'IfcCircleProfileDef':         return 'circle'
      case 'IfcRectangleHollowProfileDef': return 'rect-hollow'
      case 'IfcCircleHollowProfileDef':   return 'circle-hollow'
      case 'IfcIShapeProfileDef':         return 'i-shape'
      case 'IfcLShapeProfileDef':         return 'l-shape'
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
      case 'rect-hollow':
        this.currentProfile = {
          type: 'IfcRectangleHollowProfileDef', profileType: 'AREA', xDim: 4, yDim: 3, wallThickness: 0.3,
        } satisfies IfcRectangleHollowProfileDef
        break
      case 'circle-hollow':
        this.currentProfile = {
          type: 'IfcCircleHollowProfileDef', profileType: 'AREA', radius: 2, wallThickness: 0.3,
        } satisfies IfcCircleHollowProfileDef
        break
      case 'i-shape':
        this.currentProfile = {
          type: 'IfcIShapeProfileDef', profileType: 'AREA',
          overallWidth: 3, overallDepth: 5, webThickness: 0.2, flangeThickness: 0.3,
        } satisfies IfcIShapeProfileDef
        break
      case 'l-shape':
        this.currentProfile = {
          type: 'IfcLShapeProfileDef', profileType: 'AREA',
          depth: 4, width: 3, thickness: 0.4,
        } satisfies IfcLShapeProfileDef
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

  // ── SVG preview ─────────────────────────────────────────────────────────

  private _buildSVG(): string {
    const p = this.currentProfile
    const PAD = 0.5

    if (p.type === 'IfcRectangleProfileDef') {
      const hw = p.xDim / 2, hh = p.yDim / 2
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

    if (p.type === 'IfcRectangleHollowProfileDef') {
      const hw = p.xDim / 2, hh = p.yDim / 2
      const ihw = hw - p.wallThickness, ihh = hh - p.wallThickness
      const vb = `${-hw - PAD} ${-hh - PAD} ${p.xDim + 2 * PAD} ${p.yDim + 2 * PAD}`
      const sw = Math.max(p.xDim, p.yDim) * 0.015
      return `<svg viewBox="${vb}" xmlns="http://www.w3.org/2000/svg">
        ${this._svgAxes(hw + PAD, hh + PAD)}
        <rect x="${-hw}" y="${-hh}" width="${p.xDim}" height="${p.yDim}"
              fill="rgba(255,128,26,0.18)" stroke="#ff801a" stroke-width="${sw}"/>
        <rect x="${-ihw}" y="${-ihh}" width="${ihw * 2}" height="${ihh * 2}"
              fill="#1a1a2e" stroke="#ff801a" stroke-width="${sw}" stroke-dasharray="${sw * 2} ${sw}"/>
      </svg>`
    }

    if (p.type === 'IfcCircleHollowProfileDef') {
      const r = p.radius, ir = r - p.wallThickness
      const dim = 2 * (r + PAD)
      const vb = `${-r - PAD} ${-r - PAD} ${dim} ${dim}`
      const sw = r * 0.03
      return `<svg viewBox="${vb}" xmlns="http://www.w3.org/2000/svg">
        ${this._svgAxes(r + PAD, r + PAD)}
        <circle cx="0" cy="0" r="${r}"
                fill="rgba(255,128,26,0.18)" stroke="#ff801a" stroke-width="${sw}"/>
        <circle cx="0" cy="0" r="${ir}"
                fill="#1a1a2e" stroke="#ff801a" stroke-width="${sw}" stroke-dasharray="${sw * 2} ${sw}"/>
      </svg>`
    }

    // Polygon-based profiles (I-shape, L-shape, arbitrary)
    const outer = profileOuterVec2(p)
    const inners = profileInnerVec2s(p)

    if (outer.length < 2) {
      return `<svg viewBox="-5 -5 10 10" xmlns="http://www.w3.org/2000/svg">
        <text x="0" y="0" fill="#6a8aaa" font-size="1" text-anchor="middle">Add points</text>
      </svg>`
    }

    const xs = outer.map(q => q.x), ys = outer.map(q => q.y)
    const minX = Math.min(...xs), maxX = Math.max(...xs)
    const minY = Math.min(...ys), maxY = Math.max(...ys)
    const w = maxX - minX || 1, h = maxY - minY || 1
    const vb = `${minX - PAD} ${minY - PAD} ${w + 2 * PAD} ${h + 2 * PAD}`
    const sw = Math.max(w, h) * 0.015

    const outerPts = outer.map(q => `${q.x},${q.y}`).join(' ')
    let innerPaths = ''
    for (const inner of inners) {
      const pts = inner.map(q => `${q.x},${q.y}`).join(' ')
      innerPaths += `<polygon points="${pts}" fill="#1a1a2e" stroke="#ff801a"
        stroke-width="${sw}" stroke-dasharray="${sw * 2} ${sw}"/>`
    }

    // Vertex dots for arbitrary profiles
    let dots = ''
    if (p.type === 'IfcArbitraryClosedProfileDef' || p.type === 'IfcArbitraryProfileDefWithVoids') {
      const dr = Math.max(w, h) * 0.025
      dots = outer.map((q, i) =>
        `<circle cx="${q.x}" cy="${q.y}" r="${dr}" fill="#4fc3f7">
          <title>P${i} (${q.x.toFixed(2)}, ${q.y.toFixed(2)})</title>
        </circle>`
      ).join('')
    }

    return `<svg viewBox="${vb}" xmlns="http://www.w3.org/2000/svg">
      ${this._svgAxes(maxX + PAD, maxY + PAD)}
      <polygon points="${outerPts}"
               fill="rgba(255,128,26,0.18)" stroke="#ff801a" stroke-width="${sw}"/>
      ${innerPaths}
      ${dots}
    </svg>`
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

  // ── Parameter controls HTML ─────────────────────────────────────────────

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

    if (p.type === 'IfcRectangleHollowProfileDef') {
      return `
        ${this._sliderHTML('rh-w', 'Width (xDim)', p.xDim, 1, 10, 0.1)}
        ${this._sliderHTML('rh-h', 'Height (yDim)', p.yDim, 1, 10, 0.1)}
        ${this._sliderHTML('rh-t', 'Wall Thickness', p.wallThickness, 0.05, Math.min(p.xDim, p.yDim) / 2 - 0.05, 0.05)}
      `
    }

    if (p.type === 'IfcCircleHollowProfileDef') {
      return `
        ${this._sliderHTML('ch-r', 'Radius', p.radius, 0.5, 10, 0.1)}
        ${this._sliderHTML('ch-t', 'Wall Thickness', p.wallThickness, 0.05, p.radius - 0.05, 0.05)}
      `
    }

    if (p.type === 'IfcIShapeProfileDef') {
      return `
        ${this._sliderHTML('is-ow', 'Overall Width', p.overallWidth, 0.5, 8, 0.1)}
        ${this._sliderHTML('is-od', 'Overall Depth', p.overallDepth, 0.5, 10, 0.1)}
        ${this._sliderHTML('is-wt', 'Web Thickness', p.webThickness, 0.05, p.overallWidth / 2 - 0.05, 0.05)}
        ${this._sliderHTML('is-ft', 'Flange Thickness', p.flangeThickness, 0.05, p.overallDepth / 2 - 0.05, 0.05)}
      `
    }

    if (p.type === 'IfcLShapeProfileDef') {
      return `
        ${this._sliderHTML('ls-d', 'Depth', p.depth, 0.5, 10, 0.1)}
        ${this._sliderHTML('ls-w', 'Width', p.width, 0.5, 10, 0.1)}
        ${this._sliderHTML('ls-t', 'Thickness', p.thickness, 0.05, Math.min(p.depth, p.width) / 2, 0.05)}
      `
    }

    if (p.type === 'IfcArbitraryClosedProfileDef' || p.type === 'IfcArbitraryProfileDefWithVoids') {
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

  private _typeLabel(t: ProfileType): string {
    const labels: Record<ProfileType, string> = {
      'rectangle':    'Rectangle',
      'circle':       'Circle',
      'rect-hollow':  'Rect Hollow',
      'circle-hollow':'Circle Hollow',
      'i-shape':      'I-Shape',
      'l-shape':      'L-Shape',
      'arbitrary':    'Arbitrary',
    }
    return labels[t]
  }

  // ── Render ───────────────────────────────────────────────────────────────

  private _refreshPreview(): void {
    const svg = this.container.querySelector<HTMLElement>('.profile-preview')
    if (svg) svg.innerHTML = this._buildSVG()
  }

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

    // ── Rectangle ──
    this._bindSlider('rect-w', v => {
      (this.currentProfile as IfcRectangleProfileDef).xDim = v
    })
    this._bindSlider('rect-h', v => {
      (this.currentProfile as IfcRectangleProfileDef).yDim = v
    })

    // ── Circle ──
    this._bindSlider('circle-r', v => {
      (this.currentProfile as IfcCircleProfileDef).radius = v
    })

    // ── Rectangle Hollow ──
    this._bindSlider('rh-w', v => {
      (this.currentProfile as IfcRectangleHollowProfileDef).xDim = v
    })
    this._bindSlider('rh-h', v => {
      (this.currentProfile as IfcRectangleHollowProfileDef).yDim = v
    })
    this._bindSlider('rh-t', v => {
      (this.currentProfile as IfcRectangleHollowProfileDef).wallThickness = v
    })

    // ── Circle Hollow ──
    this._bindSlider('ch-r', v => {
      (this.currentProfile as IfcCircleHollowProfileDef).radius = v
    })
    this._bindSlider('ch-t', v => {
      (this.currentProfile as IfcCircleHollowProfileDef).wallThickness = v
    })

    // ── I-Shape ──
    this._bindSlider('is-ow', v => {
      (this.currentProfile as IfcIShapeProfileDef).overallWidth = v
    })
    this._bindSlider('is-od', v => {
      (this.currentProfile as IfcIShapeProfileDef).overallDepth = v
    })
    this._bindSlider('is-wt', v => {
      (this.currentProfile as IfcIShapeProfileDef).webThickness = v
    })
    this._bindSlider('is-ft', v => {
      (this.currentProfile as IfcIShapeProfileDef).flangeThickness = v
    })

    // ── L-Shape ──
    this._bindSlider('ls-d', v => {
      (this.currentProfile as IfcLShapeProfileDef).depth = v
    })
    this._bindSlider('ls-w', v => {
      (this.currentProfile as IfcLShapeProfileDef).width = v
    })
    this._bindSlider('ls-t', v => {
      (this.currentProfile as IfcLShapeProfileDef).thickness = v
    })

    // ── Arbitrary point inputs ──
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
        const last = profile.outerCurve.at(-1) ?? { x: 0, y: 0 }
        profile.outerCurve.push({ x: last.x + 1, y: last.y })
        this._render()
        this._notify()
      })
    }
  }

  /** Bind a range slider to a property update callback. */
  private _bindSlider(id: string, updater: (value: number) => void): void {
    const input = this.container.querySelector<HTMLInputElement>(`#${id}`)
    const valEl = this.container.querySelector<HTMLElement>(`#${id}-val`)
    if (!input) return
    input.addEventListener('input', () => {
      const v = Number(input.value)
      updater(v)
      if (valEl) valEl.textContent = v.toFixed(2)
      this._refreshPreview()
      this._notify()
    })
  }
}
