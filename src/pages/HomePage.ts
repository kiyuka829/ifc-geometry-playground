import {
  routes,
  GEOMETRY_DOMAINS,
  implementationMap,
  OPERATION_GROUPS,
} from "../app/routes.ts";
import type {
  AvailableRoute,
  Difficulty,
  GeometryDomain,
  OperationGroup,
  ImplementationStatus,
  PlannedRoute,
  Route,
} from "../app/routes.ts";

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

const STATUS_LABELS: Record<ImplementationStatus, string> = {
  available: "Available",
  partial: "Partial",
  planned: "Planned",
};

const DOMAIN_DESCRIPTIONS: Record<GeometryDomain, string> = {
  Curves:
    "Curve entities used as directrices, path segments, and profile boundaries.",
  Profiles:
    "Profile workbench for inspecting reusable area definitions before they are used by operations.",
  "Swept Solids":
    "Operations that turn profiles or curve paths into solids.",
  "Boolean / CSG":
    "Operations and primitive volumes for combining, trimming, and composing solids.",
};

function renderCard(route: AvailableRoute | PlannedRoute): string {
  const isPlanned = route.status === "planned";
  const description = route.description ?? "";
  const entityBadge = `<span class="example-card-entity">${route.entity}</span>`;

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
        ${entityBadge}
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
        ${entityBadge}
        <p>${description}</p>
      </div>
    </a>
  `;
}

function renderOperationGroup(
  group: OperationGroup,
  groupRoutes: AvailableRoute[],
): string {
  if (groupRoutes.length === 0) return "";

  const variantCards = groupRoutes.map(renderCard).join("");

  return `
    <div class="operation-group">
      <div class="operation-header">
        <div>
          <h3>${group.title}</h3>
          <span class="operation-entity">${group.entity}</span>
        </div>
        <p>${group.description}</p>
      </div>
      <div class="examples-grid examples-grid--variants">
        ${variantCards}
      </div>
    </div>
  `;
}

function renderDomain(domain: GeometryDomain, domainRoutes: Route[]): string {
  const routesWithDomain = domainRoutes.filter(hasHomeDomain);
  if (routesWithDomain.length === 0) return "";

  const operationGroups = OPERATION_GROUPS.filter(
    (group) => group.domain === domain,
  );

  const operationGroupMarkup = operationGroups
    .map((group) =>
      renderOperationGroup(
        group,
        routesWithDomain.filter(
          (route): route is AvailableRoute =>
            route.status === "available" && route.operationGroup === group.id,
        ),
      ),
    )
    .join("");

  const standaloneRoutes = routesWithDomain.filter(
    (route) => !route.operationGroup,
  );
  const primaryRoutes = standaloneRoutes.filter(
    (route) => route.exampleKind === "primary",
  );

  const primaryCards = primaryRoutes.map(renderCard).join("");

  return `
    <section class="category-section">
      <h2 class="category-title">${domain}</h2>
      <p class="category-desc">${DOMAIN_DESCRIPTIONS[domain]}</p>
      ${operationGroupMarkup}
      ${
        primaryRoutes.length > 0
          ? `
        <div class="examples-grid">
          ${primaryCards}
        </div>
      `
          : ""
      }
    </section>
  `;
}

function renderDependencyList(dependsOn?: string[]): string {
  if (!dependsOn || dependsOn.length === 0) return "";
  return dependsOn
    .map((dependency) => `<span class="map-dependency">${dependency}</span>`)
    .join("");
}

function renderImplementationMap(): string {
  const rows = implementationMap
    .map((item) => {
      const label = STATUS_LABELS[item.status];
      const entity = item.routeHash
        ? `<a href="${item.routeHash}" class="map-entity">${item.entity}</a>`
        : `<span class="map-entity">${item.entity}</span>`;

      return `
        <tr>
          <td>${entity}</td>
          <td>${item.domain}</td>
          <td><span class="status-pill status-pill--${item.status}">${label}</span></td>
          <td>${item.description}</td>
          <td class="map-dependencies">${renderDependencyList(item.dependsOn)}</td>
        </tr>
      `;
    })
    .join("");

  return `
    <section class="category-section implementation-map-section">
      <h2 class="category-title">Implementation Map</h2>
      <p class="category-desc">Track implemented, partial, and planned IFC geometry entities without treating non-shape placement data as its own shape category.</p>
      <div class="implementation-map">
        <table>
          <thead>
            <tr>
              <th>Entity</th>
              <th>Domain</th>
              <th>Status</th>
              <th>Scope</th>
              <th>Depends on</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </section>
  `;
}

function hasHomeDomain(route: Route): route is AvailableRoute | PlannedRoute {
  return Boolean(route.domain);
}

export class HomePage {
  render(container: HTMLElement) {
    const sampleRoutes = routes.filter(hasHomeDomain);

    const byDomain = new Map<GeometryDomain, Route[]>();
    for (const domain of GEOMETRY_DOMAINS) {
      byDomain.set(domain, []);
    }

    for (const route of sampleRoutes) {
      byDomain.get(route.domain)!.push(route);
    }

    const domainMarkup = GEOMETRY_DOMAINS.map((domain) =>
      renderDomain(domain, byDomain.get(domain) ?? []),
    ).join("");

    container.innerHTML = `
      <nav class="nav">
        <a href="#/" class="nav-brand">IFC Geometry Playground</a>
      </nav>
      <div class="home-page">
        <h1>IFC Geometry Playground</h1>
        <p class="home-desc">Explore implemented IFC geometry samples by operation, then use the implementation map to track entity-level coverage.</p>
        ${domainMarkup}
        ${renderImplementationMap()}
      </div>
    `;
  }
}
