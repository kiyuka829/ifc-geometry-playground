import { routes } from './routes.ts'
import { HomePage } from '../pages/HomePage.ts'
import { ExamplePage } from '../pages/ExamplePage.ts'
import { extrusionBasicSample } from '../ifc/samples/extrusion.basic.ts'
import { booleanDifferenceSample } from '../ifc/samples/boolean.difference.ts'
import { profileEditorSample } from '../ifc/samples/profile.editor.ts'
import type { SampleDef } from '../types.ts'

const samples: Record<string, SampleDef> = {
  'extrusion-basic': extrusionBasicSample,
  'boolean-difference': booleanDifferenceSample,
  'profile-editor': profileEditorSample,
}

export class App {
  private container: HTMLElement
  private examplePage: ExamplePage | null = null

  constructor(container: HTMLElement) {
    this.container = container
    window.addEventListener('hashchange', () => this._navigate())
  }

  start() {
    this._navigate()
  }

  private _navigate() {
    const hash = window.location.hash || '#/'

    const route = routes.find(r => r.hash === hash)

    if (this.examplePage) {
      this.examplePage.unmount()
      this.examplePage = null
    }

    if (route?.sampleId) {
      const sample = samples[route.sampleId]
      if (sample) {
        this.examplePage = new ExamplePage(this.container)
        this.examplePage.mount(sample)
        return
      }
    }

    const homePage = new HomePage()
    homePage.render(this.container)
  }
}
