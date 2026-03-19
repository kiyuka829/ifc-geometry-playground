import { allSamples } from '../ifc/samples/index.ts';

export function renderHomePage(container: HTMLElement, onNavigate: (path: string) => void): void {
  container.innerHTML = '';
  container.className = 'home-page';

  const hero = document.createElement('div');
  hero.className = 'hero';
  hero.innerHTML = `
    <h1>IFC Geometry Playground</h1>
    <p class="hero-sub">
      IFC ジオメトリの概念をインタラクティブに学べる教育ツールです。<br>
      An interactive educational tool for exploring IFC geometry concepts.
    </p>
  `;
  container.appendChild(hero);

  const grid = document.createElement('div');
  grid.className = 'sample-grid';

  allSamples.forEach(sample => {
    const card = document.createElement('div');
    card.className = 'sample-card';
    card.innerHTML = `
      <div class="ifc-type-badge">${sample.ifcType}</div>
      <h3>${sample.name}</h3>
      <p>${sample.description.split('\n')[0]}</p>
    `;
    card.addEventListener('click', () => onNavigate(`#/examples/${sample.id}`));
    grid.appendChild(card);
  });

  container.appendChild(grid);
}
