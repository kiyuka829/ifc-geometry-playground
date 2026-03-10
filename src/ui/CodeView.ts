// Matches JSON keys, strings, numbers, booleans, and null values
const JSON_TOKEN_RE = /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g

export class CodeView {
  private container: HTMLElement

  constructor(container: HTMLElement) {
    this.container = container
  }

  render(data: object) {
    const json = JSON.stringify(data, null, 2)
    const highlighted = this._highlight(json)
    this.container.innerHTML = `<pre class="code-pre"><code>${highlighted}</code></pre>`
  }

  private _highlight(json: string): string {
    return json
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(JSON_TOKEN_RE, (match) => {
        let cls = 'json-number'
        if (/^"/.test(match)) {
          cls = /:$/.test(match) ? 'json-key' : 'json-string'
        } else if (/true|false/.test(match)) {
          cls = 'json-bool'
        } else if (/null/.test(match)) {
          cls = 'json-null'
        }
        return `<span class="${cls}">${match}</span>`
      })
  }
}
