import { sampleMap, samples } from '../ifc/samples'
import type { ExampleSample } from '../ifc/schema'

const defaultRoute = `#/examples/${samples[0].id}`

export function ensureRoute(): void {
  if (!location.hash) {
    location.hash = defaultRoute
  }
}

export function resolveSampleByHash(hash = location.hash): ExampleSample {
  const [, section, id] = hash.replace('#/', '').split('/')
  if (section === 'examples' && id && sampleMap.has(id)) {
    return sampleMap.get(id)!
  }
  return samples[0]
}

export function buildNavigationHtml(activeId: string): string {
  return samples
    .map((sample) => {
      const active = sample.id === activeId ? 'active-link' : ''
      return `<a class="${active}" href="#/examples/${sample.id}">${sample.title}</a>`
    })
    .join('')
}
