import { routes, GEOMETRY_CATEGORIES } from '../app/routes.ts'
import type { GeometryCategory, Difficulty } from '../app/routes.ts'

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
}

function renderCard(route: typeof routes[number]): string {
  const isPlanned = route.status === 'planned'
  const description = route.description ?? ''

  const difficultyBadge = route.difficulty
    ? `<span class="example-card-badge example-card-badge--${route.difficulty}">${DIFFICULTY_LABELS[route.difficulty]}</span>`
    : ''

  if (isPlanned) {
    return `
      <div class="example-card example-card--planned">
        <div class="example-card-header">
          <h3>${route.title}</h3>
          ${difficultyBadge}
        </div>
        <p>${description}</p>
        <span class="example-card-status">Coming soon</span>
      </div>
    `
  }

  return `
    <a href="${route.hash}" class="example-card-link">
      <div class="example-card">
        <div class="example-card-header">
          <h3>${route.title}</h3>
          ${difficultyBadge}
        </div>
        <p>${description}</p>
      </div>
    </a>
  `
}

function renderCategory(category: GeometryCategory, categoryRoutes: typeof routes): string {
  if (categoryRoutes.length === 0) return ''

  const cards = categoryRoutes.map(renderCard).join('')

  return `
    <section class="category-section">
      <h2 class="category-title">${category}</h2>
      <div class="examples-grid">
        ${cards}
      </div>
    </section>
  `
}

export class HomePage {
  render(container: HTMLElement) {
    const sampleRoutes = routes.filter(r => r.category)

    const byCategory = new Map<GeometryCategory, typeof routes>()
    for (const cat of GEOMETRY_CATEGORIES) {
      byCategory.set(cat, [])
    }
    for (const route of sampleRoutes) {
      if (route.category) {
        byCategory.get(route.category)!.push(route)
      }
    }

    const categorySections = GEOMETRY_CATEGORIES
      .map(cat => renderCategory(cat, byCategory.get(cat) ?? []))
      .join('')

    container.innerHTML = `
      <nav class="nav">
        <span class="nav-brand">IFC Geometry Playground</span>
      </nav>
      <div class="home-page">
        <h1>IFC Geometry Playground</h1>
        <p class="home-desc">An interactive playground for learning IFC geometry concepts. Browse examples by category and click any available sample to explore its 3D visualization.</p>
        ${categorySections}
      </div>
    `
  }
}
