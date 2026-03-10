import type { ExampleEvaluation, ExampleSample, Parameters } from '../ifc/schema'

export class SceneViewport {
  private readonly container: HTMLElement

  constructor(container: HTMLElement) {
    this.container = container
  }

  render(sample: ExampleSample, params: Parameters, evaluation: ExampleEvaluation): void {
    const lines = evaluation.debugLines.map((line) => `<li>${line}</li>`).join('')
    this.container.innerHTML = `
      <h3>3D View (placeholder)</h3>
      <div class="viewport-placeholder">
        <p><strong>${sample.title}</strong></p>
        <p>${sample.summary}</p>
        <p>Babylon.js scene をここに接続予定（現時点は枠組みのみ）。</p>
      </div>
      <h4>Debug Overlay</h4>
      <ul>${lines}</ul>
      <h4>Current Params</h4>
      <pre>${JSON.stringify(params, null, 2)}</pre>
    `
  }
}
