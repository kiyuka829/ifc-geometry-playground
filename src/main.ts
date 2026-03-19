import './style.css';
import { parseRoute, navigateTo } from './app/router.ts';
import { renderHomePage } from './pages/HomePage.ts';
import { renderExamplePage } from './pages/ExamplePage.ts';
import { allSamples } from './ifc/samples/index.ts';
import type { BabylonScene } from './engine/scene.ts';

const app = document.querySelector<HTMLDivElement>('#app')!;
let currentBabylonScene: BabylonScene | null = null;

function render(): void {
  const route = parseRoute(window.location.hash);

  if (currentBabylonScene) {
    currentBabylonScene.engine.dispose();
    currentBabylonScene = null;
  }

  app.innerHTML = '';

  if (route.type === 'home') {
    renderHomePage(app, (path) => navigateTo(path));
  } else if (route.type === 'example') {
    const sample = allSamples.find(s => s.id === route.sampleId);
    if (sample) {
      currentBabylonScene = renderExamplePage(app, sample, (path) => navigateTo(path));
    } else {
      navigateTo('#/');
    }
  }
}

window.addEventListener('hashchange', render);
render();
