import type {
  PolynomialCoefficientAxis,
  PolynomialCoefficientEditorConfig,
  PolynomialCoefficients,
} from "../types.ts";

const AXES: Array<{
  key: PolynomialCoefficientAxis;
  label: string;
  group: string;
}> = [
  { key: "x", label: "X", group: "CoefficientsX" },
  { key: "y", label: "Y", group: "CoefficientsY" },
  { key: "z", label: "Z", group: "CoefficientsZ" },
];

const DEFAULT_COEFFICIENT_STEP = 0.01;
const MIN_COEFFICIENT_COUNT = 2;

function cloneCoefficients(
  coefficients: PolynomialCoefficients,
): PolynomialCoefficients {
  const ensureMinimumLength = (values: number[]): number[] => {
    const normalized = [...values];
    while (normalized.length < MIN_COEFFICIENT_COUNT) {
      normalized.push(0);
    }
    return normalized;
  };

  return {
    x: ensureMinimumLength(coefficients.x),
    y: ensureMinimumLength(coefficients.y),
    z: ensureMinimumLength(coefficients.z),
  };
}

export class PolynomialCoefficientEditor {
  private container: HTMLElement;
  private config: PolynomialCoefficientEditorConfig;
  private coefficients: PolynomialCoefficients;
  private changeCallbacks: Array<(coefficients: PolynomialCoefficients) => void> =
    [];

  constructor(
    container: HTMLElement,
    config: PolynomialCoefficientEditorConfig,
  ) {
    this.container = container;
    this.config = config;
    this.coefficients = cloneCoefficients(config.defaultCoefficients);
    this._render();
  }

  getCoefficients(): PolynomialCoefficients {
    return cloneCoefficients(this.coefficients);
  }

  onChange(callback: (coefficients: PolynomialCoefficients) => void): void {
    this.changeCallbacks.push(callback);
  }

  private _notify(): void {
    const copy = this.getCoefficients();
    for (const callback of this.changeCallbacks) callback(copy);
  }

  private _render(): void {
    this.container.innerHTML = "";

    const wrapper = document.createElement("div");
    wrapper.className = "polynomial-coefficient-editor";

    for (const axis of AXES) {
      wrapper.appendChild(this._buildAxisSection(axis.key, axis.label, axis.group));
    }

    this.container.appendChild(wrapper);
  }

  private _buildAxisSection(
    axis: PolynomialCoefficientAxis,
    axisLabel: string,
    groupLabel: string,
  ): HTMLElement {
    const section = document.createElement("section");
    section.className = "coefficient-axis-section";

    const heading = document.createElement("div");
    heading.className = "param-label coefficient-axis-heading";
    heading.textContent = groupLabel;
    section.appendChild(heading);

    const list = document.createElement("div");
    list.className = "coefficient-values-list";

    this.coefficients[axis].forEach((value, index) => {
      list.appendChild(this._buildCoefficientRow(axis, axisLabel, value, index));
    });

    section.appendChild(list);

    const addBtn = document.createElement("button");
    addBtn.type = "button";
    addBtn.className = "path-add-point-btn";
    addBtn.textContent = `+ Add ${axisLabel} coefficient`;
    addBtn.addEventListener("click", () => {
      this.coefficients[axis].push(0);
      this._refresh();
      this._notify();
    });
    section.appendChild(addBtn);

    return section;
  }

  private _buildCoefficientRow(
    axis: PolynomialCoefficientAxis,
    axisLabel: string,
    value: number,
    index: number,
  ): HTMLElement {
    const row = document.createElement("div");
    row.className = "path-point-row coefficient-row";

    const idx = document.createElement("span");
    idx.className = "point-index";
    idx.textContent = `c${index}`;
    row.appendChild(idx);

    const label = document.createElement("span");
    label.className = "point-coord-label";
    label.textContent = axisLabel;
    row.appendChild(label);

    const input = document.createElement("input");
    input.type = "number";
    input.className = "point-coord-input coefficient-value-input";
    input.value = String(value);
    input.step = String(this.config.step ?? DEFAULT_COEFFICIENT_STEP);
    input.addEventListener("input", () => {
      const parsed = Number(input.value);
      if (Number.isFinite(parsed)) {
        this.coefficients[axis][index] = parsed;
        this._notify();
      }
    });
    row.appendChild(input);

    if (this._canRemoveCoefficient(axis, index)) {
      const del = document.createElement("button");
      del.type = "button";
      del.className = "point-delete-btn";
      del.title = "Remove coefficient";
      del.textContent = "x";
      del.addEventListener("click", () => {
        this.coefficients[axis].splice(index, 1);
        this._refresh();
        this._notify();
      });
      row.appendChild(del);
    } else {
      const placeholder = document.createElement("span");
      placeholder.className = "point-delete-placeholder";
      row.appendChild(placeholder);
    }

    return row;
  }

  private _canRemoveCoefficient(
    axis: PolynomialCoefficientAxis,
    index: number,
  ): boolean {
    return (
      index >= MIN_COEFFICIENT_COUNT &&
      this.coefficients[axis].length > MIN_COEFFICIENT_COUNT
    );
  }

  private _refresh(): void {
    this._render();
  }
}
