import type { SampleStep } from '../ifc/schema.ts';

export class Stepper {
  private container: HTMLElement;
  private currentStep: number = 0;
  onStepChange: ((step: number) => void) | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  render(steps: SampleStep[]): void {
    this.container.innerHTML = '';

    const buttonsRow = document.createElement('div');
    buttonsRow.className = 'stepper-buttons';

    const descEl = document.createElement('div');
    descEl.className = 'stepper-description';

    const updateDesc = (index: number): void => {
      const step = steps[index];
      if (step) {
        descEl.innerHTML = `<strong>${step.title}</strong><p>${step.description}</p>`;
      }
    };

    steps.forEach((step, i) => {
      const btn = document.createElement('button');
      btn.className = 'step-btn' + (i === this.currentStep ? ' active' : '');
      btn.textContent = `Step ${i + 1}`;
      btn.title = step.title;
      btn.addEventListener('click', () => {
        this.setStep(i);
        this.container.querySelectorAll('.step-btn').forEach((b, bi) => {
          b.className = 'step-btn' + (bi === i ? ' active' : '');
        });
        updateDesc(i);
        if (this.onStepChange) this.onStepChange(i);
      });
      buttonsRow.appendChild(btn);
    });

    this.container.appendChild(buttonsRow);
    this.container.appendChild(descEl);
    updateDesc(this.currentStep);
  }

  setStep(step: number): void {
    this.currentStep = step;
  }
}
