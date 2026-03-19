import type { Vec3 } from '../ifc/schema.ts';
import type { SampleParameter } from '../ifc/schema.ts';

export interface ParameterChangeEvent {
  parameterId: string;
  value: number | Vec3;
}

export class ParameterPanel {
  private container: HTMLElement;

  constructor(container: HTMLElement) {
    this.container = container;
  }

  render(parameters: SampleParameter[], onChange: (event: ParameterChangeEvent) => void): void {
    this.container.innerHTML = '';

    parameters.forEach(param => {
      if (param.type === 'number') {
        const row = document.createElement('div');
        row.className = 'parameter-row';

        const label = document.createElement('label');
        label.textContent = param.label;

        const valueDisplay = document.createElement('span');
        valueDisplay.className = 'param-value';
        valueDisplay.textContent = String(param.value as number);

        const slider = document.createElement('input');
        slider.type = 'range';
        slider.min = String(param.min ?? 0);
        slider.max = String(param.max ?? 100);
        slider.step = String(param.step ?? 1);
        slider.value = String(param.value as number);

        slider.addEventListener('input', () => {
          const val = parseFloat(slider.value);
          valueDisplay.textContent = val.toFixed(2);
          onChange({ parameterId: param.id, value: val });
        });

        row.appendChild(label);
        row.appendChild(slider);
        row.appendChild(valueDisplay);
        this.container.appendChild(row);
      }
    });
  }

  clear(): void {
    this.container.innerHTML = '';
  }
}
