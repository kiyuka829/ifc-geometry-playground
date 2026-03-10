import { createExamplePage } from '../pages/ExamplePage'
import { buildNavigationHtml, ensureRoute, resolveSampleByHash } from './routes'

export function mountApp(root: HTMLElement): void {
  root.innerHTML = `
    <div class="app-shell">
      <header>
        <h1>IFC Geometry Playground</h1>
        <p>IFC形状生成の学習に向けたインタラクティブ可視化の土台実装</p>
        <nav data-slot="nav"></nav>
      </header>
      <div data-slot="page"></div>
    </div>
  `

  const nav = root.querySelector<HTMLElement>('[data-slot="nav"]')!
  const page = root.querySelector<HTMLElement>('[data-slot="page"]')!

  const render = () => {
    ensureRoute()
    const sample = resolveSampleByHash()
    nav.innerHTML = buildNavigationHtml(sample.id)
    createExamplePage(page, sample)
  }

  window.addEventListener('hashchange', render)
  render()
}
