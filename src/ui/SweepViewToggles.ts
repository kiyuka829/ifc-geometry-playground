import type { SweepViewState, SweepViewConfig } from '../types.ts'

export class SweepViewToggles {
  private container: HTMLElement
  private state: SweepViewState
  private changeCallbacks: Array<(state: SweepViewState) => void> = []

  constructor(container: HTMLElement, config: SweepViewConfig) {
    this.container = container
    this.state = {
      showPath:   config.defaults?.showPath   ?? true,
      showFrames: config.defaults?.showFrames ?? false,
      showResult: config.defaults?.showResult ?? true,
    }
    this._render()
  }

  getState(): SweepViewState {
    return { ...this.state }
  }

  onChange(callback: (state: SweepViewState) => void): void {
    this.changeCallbacks.push(callback)
  }

  private _notify(): void {
    const s = this.getState()
    for (const cb of this.changeCallbacks) cb(s)
  }

  private _render(): void {
    this.container.innerHTML = ''

    const wrapper = document.createElement('div')
    wrapper.className = 'sweep-view-toggles'

    const toggles: Array<{ key: keyof SweepViewState; label: string }> = [
      { key: 'showPath',   label: 'Path' },
      { key: 'showFrames', label: 'Frames' },
      { key: 'showResult', label: 'Result' },
    ]

    for (const { key, label } of toggles) {
      const btn = document.createElement('button')
      btn.className = `sweep-toggle-btn${this.state[key] ? ' active' : ''}`
      btn.textContent = label
      btn.title = `Toggle ${label.toLowerCase()} visibility`
      btn.addEventListener('click', () => {
        this.state[key] = !this.state[key]
        btn.classList.toggle('active', this.state[key])
        this._notify()
      })
      wrapper.appendChild(btn)
    }

    this.container.appendChild(wrapper)
  }
}
