export function renderCodeView(container: HTMLElement, code: string): void {
  container.innerHTML = '<h3>Pseudo IFC</h3>'
  const pre = document.createElement('pre')
  pre.textContent = code
  container.append(pre)
}
