import type { Sample } from '../ifc/schema.ts';
import type { Vec3 } from '../ifc/schema.ts';
import type { BabylonScene } from '../engine/scene.ts';
import { createScene } from '../engine/scene.ts';
import { ParameterPanel } from '../ui/ParameterPanel.ts';
import { Stepper } from '../ui/Stepper.ts';
import { CodeView } from '../ui/CodeView.ts';

export function renderExamplePage(
  container: HTMLElement,
  sample: Sample,
  onNavigate: (path: string) => void,
): BabylonScene {
  container.innerHTML = '';
  container.className = 'example-page';

  // Header
  const header = document.createElement('div');
  header.className = 'example-header';
  const backBtn = document.createElement('button');
  backBtn.className = 'back-btn';
  backBtn.textContent = '← Back';
  backBtn.addEventListener('click', () => onNavigate('#/'));
  const title = document.createElement('h2');
  title.textContent = sample.name;
  const badge = document.createElement('span');
  badge.className = 'ifc-type-badge';
  badge.textContent = sample.ifcType;
  header.appendChild(backBtn);
  header.appendChild(title);
  header.appendChild(badge);
  container.appendChild(header);

  // Main layout
  const layout = document.createElement('div');
  layout.className = 'example-layout';

  // Left panel
  const leftPanel = document.createElement('div');
  leftPanel.className = 'left-panel';

  const paramsSection = document.createElement('div');
  paramsSection.className = 'panel-section';
  const paramsTitle = document.createElement('h4');
  paramsTitle.textContent = 'パラメータ / Parameters';
  paramsSection.appendChild(paramsTitle);
  const paramsContainer = document.createElement('div');
  paramsSection.appendChild(paramsContainer);
  leftPanel.appendChild(paramsSection);

  const stepsSection = document.createElement('div');
  stepsSection.className = 'panel-section';
  const stepsTitle = document.createElement('h4');
  stepsTitle.textContent = 'ステップ / Steps';
  stepsSection.appendChild(stepsTitle);
  const stepsContainer = document.createElement('div');
  stepsSection.appendChild(stepsContainer);
  leftPanel.appendChild(stepsSection);

  const codeSection = document.createElement('div');
  codeSection.className = 'panel-section';
  const codeTitle = document.createElement('h4');
  codeTitle.textContent = 'IFC コード / IFC Code';
  codeSection.appendChild(codeTitle);
  const codeContainer = document.createElement('div');
  codeSection.appendChild(codeContainer);
  leftPanel.appendChild(codeSection);

  // Canvas
  const canvasContainer = document.createElement('div');
  canvasContainer.className = 'canvas-container';
  const canvas = document.createElement('canvas');
  canvas.id = 'babylon-canvas';
  canvasContainer.appendChild(canvas);

  layout.appendChild(leftPanel);
  layout.appendChild(canvasContainer);
  container.appendChild(layout);

  // Initialize Babylon
  const babylonScene = createScene(canvas);

  // Current params
  const currentParams: Record<string, number | Vec3> = {};
  sample.parameters.forEach(p => {
    currentParams[p.id] = p.value;
  });

  const rebuild = (): void => {
    sample.buildScene(babylonScene.scene, currentParams);
  };

  // Parameter panel
  const paramPanel = new ParameterPanel(paramsContainer);
  paramPanel.render(sample.parameters, (evt) => {
    currentParams[evt.parameterId] = evt.value;
    rebuild();
  });

  // Stepper
  const stepper = new Stepper(stepsContainer);
  stepper.render(sample.steps);

  // Code view
  const codeView = new CodeView(codeContainer);
  codeView.render(sample.ifcSnippet, sample.ifcType);

  // Initial build
  rebuild();

  return babylonScene;
}
