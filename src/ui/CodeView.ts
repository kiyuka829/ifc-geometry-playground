export class CodeView {
  private container: HTMLElement;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  render(ifcSnippet: string, ifcType: string): void {
    const header = document.createElement('div');
    header.className = 'code-view-header';
    header.textContent = ifcType;

    const pre = document.createElement('pre');
    pre.className = 'code-view-pre';
    pre.innerHTML = this.highlight(ifcSnippet);

    this.container.innerHTML = '';
    this.container.appendChild(header);
    this.container.appendChild(pre);
  }

  private highlight(code: string): string {
    return code
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/(IFC[A-Z0-9]+)/g, '<span class="kw-ifc">$1</span>')
      .replace(/\b(AREA|CURVE|DIFFERENCE|UNION|INTERSECTION)\b/g, '<span class="kw-enum">$1</span>')
      .replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="kw-comment">$1</span>')
      .replace(/(#\d+)/g, '<span class="kw-ref">$1</span>');
  }
}
