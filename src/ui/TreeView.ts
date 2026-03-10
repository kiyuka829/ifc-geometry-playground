export class TreeView {
  private container: HTMLElement

  constructor(container: HTMLElement) {
    this.container = container
  }

  render(data: object) {
    this.container.innerHTML = ''
    const tree = this._buildTree(data, 0)
    this.container.appendChild(tree)
  }

  private static readonly MAX_DEPTH = 8

  private _buildTree(data: unknown, depth: number): HTMLElement {
    const wrapper = document.createElement('div')
    wrapper.style.paddingLeft = depth > 0 ? '16px' : '0'

    if (depth >= TreeView.MAX_DEPTH) {
      const span = document.createElement('span')
      span.className = 'tree-value'
      span.textContent = '[…]'
      wrapper.appendChild(span)
      return wrapper
    }

    if (data === null || data === undefined) {
      const text = document.createElement('span')
      text.style.color = '#888'
      text.textContent = String(data)
      wrapper.appendChild(text)
    } else if (Array.isArray(data)) {
      const span = document.createElement('span')
      span.className = 'tree-value'
      span.textContent = JSON.stringify(data)
      wrapper.appendChild(span)
    } else if (typeof data === 'object') {
      for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
        const row = document.createElement('div')
        row.className = 'tree-row'

        const keySpan = document.createElement('span')
        keySpan.className = 'tree-key'
        keySpan.textContent = key + ': '

        if (typeof value === 'object' && value !== null) {
          const toggle = document.createElement('span')
          toggle.className = 'tree-toggle'
          toggle.textContent = '▶ '
          toggle.style.cursor = 'pointer'

          const child = this._buildTree(value, depth + 1)
          child.style.display = 'none'

          toggle.addEventListener('click', () => {
            const collapsed = child.style.display === 'none'
            child.style.display = collapsed ? 'block' : 'none'
            toggle.textContent = collapsed ? '▼ ' : '▶ '
          })

          row.appendChild(toggle)
          row.appendChild(keySpan)
          row.appendChild(child)
        } else {
          const valSpan = document.createElement('span')
          valSpan.className = 'tree-value'
          valSpan.textContent = JSON.stringify(value)
          row.appendChild(keySpan)
          row.appendChild(valSpan)
        }

        wrapper.appendChild(row)
      }
    } else {
      const span = document.createElement('span')
      span.className = 'tree-value'
      span.textContent = JSON.stringify(data)
      wrapper.appendChild(span)
    }

    return wrapper
  }
}
