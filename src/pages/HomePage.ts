import { routes } from '../app/routes.ts'
import { extrusionBasicSample } from '../ifc/samples/extrusion.basic.ts'
import { booleanDifferenceSample } from '../ifc/samples/boolean.difference.ts'

const sampleDescriptions: Record<string, string> = {
  'extrusion-basic': extrusionBasicSample.description,
  'boolean-difference': booleanDifferenceSample.description,
}

export class HomePage {
  render(container: HTMLElement) {
    const cards = routes
      .filter(r => r.sampleId)
      .map(r => `
        <a href="${r.hash}" class="example-card-link">
          <div class="example-card">
            <h3>${r.title}</h3>
            <p>${r.description ?? sampleDescriptions[r.sampleId!] ?? ''}</p>
          </div>
        </a>
      `)
      .join('')

    container.innerHTML = `
      <nav class="nav">
        <span class="nav-brand">IFC Geometry Playground</span>
      </nav>
      <div class="home-page">
        <h1>IFC Geometry Playground</h1>
        <p class="home-desc">An interactive playground for learning IFC geometry concepts. Click each sample to explore 3D visualizations.</p>
        <div class="examples-grid">
          ${cards}
        </div>
      </div>
    `
  }
}
