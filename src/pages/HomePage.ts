import { routes, HOME_SECTIONS } from "../app/routes.ts";
import type {
  AvailableRoute,
  Difficulty,
  HomeSection,
  PlannedRoute,
  Route,
} from "../app/routes.ts";

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

const SECTION_DESCRIPTIONS: Record<HomeSection, string> = {
  Foundations:
    "Start with reusable inputs such as curves, profiles, and local placements before building geometry from them.",
  "Build Solids":
    "Turn profiles and paths into IFC solids, then compare representative implementations against profile-specific coverage.",
  "Compose Solids":
    "Combine and trim existing solids with boolean and CSG-style operations.",
};

function renderCard(route: Route): string {
  const isPlanned = route.status === "planned";
  const description = route.description ?? "";

  const difficultyBadge = route.difficulty
    ? `<span class="example-card-badge example-card-badge--${route.difficulty}">${DIFFICULTY_LABELS[route.difficulty]}</span>`
    : "";

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
    `;
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
  `;
}

function renderSection(section: HomeSection, sectionRoutes: Route[]): string {
  if (sectionRoutes.length === 0) return "";

  const featuredRoutes = sectionRoutes.filter(
    (route) => route.homeKind === "featured",
  );
  const coverageRoutes = sectionRoutes.filter(
    (route) => route.homeKind === "coverage",
  );

  const featuredCards = featuredRoutes.map(renderCard).join("");
  const coverageCards = coverageRoutes.map(renderCard).join("");

  return `
    <section class="category-section">
      <h2 class="category-title">${section}</h2>
      <p class="category-desc">${SECTION_DESCRIPTIONS[section]}</p>
      <div class="examples-grid">
        ${featuredCards}
      </div>
      ${
        coverageRoutes.length > 0
          ? `
        <div class="coverage-block">
          <div class="coverage-title">Coverage</div>
          <div class="examples-grid examples-grid--coverage">
            ${coverageCards}
          </div>
        </div>
      `
          : ""
      }
    </section>
  `;
}

function hasHomeSection(route: Route): route is AvailableRoute | PlannedRoute {
  return Boolean(route.homeSection);
}

export class HomePage {
  render(container: HTMLElement) {
    const sampleRoutes = routes.filter(hasHomeSection);

    const bySection = new Map<HomeSection, Route[]>();
    for (const section of HOME_SECTIONS) {
      bySection.set(section, []);
    }

    for (const route of sampleRoutes) {
      bySection.get(route.homeSection)!.push(route);
    }

    const sectionMarkup = HOME_SECTIONS.map((section) =>
      renderSection(section, bySection.get(section) ?? []),
    ).join("");

    container.innerHTML = `
      <nav class="nav">
        <a href="#/" class="nav-brand">IFC Geometry Playground</a>
      </nav>
      <div class="home-page">
        <h1>IFC Geometry Playground</h1>
        <p class="home-desc">Learn IFC geometry from reusable inputs through solid generation and solid composition. Start with the featured concepts in each section, then use the coverage cards to inspect additional implemented variants.</p>
        ${sectionMarkup}
      </div>
    `;
  }
}
