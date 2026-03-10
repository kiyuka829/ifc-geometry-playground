export function renderTreeView(container: HTMLElement, nodes: string[]): void {
  container.innerHTML = '<h3>IFC Tree</h3>'
  const pre = document.createElement('pre')
  pre.textContent = nodes.join('\n')
  container.append(pre)
}
