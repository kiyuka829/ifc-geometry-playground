import type { BSplineCurveWithKnotsEditorConfig, Vec3 } from "../types.ts";
import type { IfcBSplineCurveWithKnots } from "../ifc/generated/schema.ts";
import { validateBSplineCurveWithKnots } from "../ifc/operations/curve-bspline.ts";

const DEFAULT_COORD_STEP = 0.5;
const DEFAULT_KNOT_STEP = 0.5;

function cloneCurve(
  curve: IfcBSplineCurveWithKnots,
): IfcBSplineCurveWithKnots {
  return {
    ...curve,
    controlPointsList: curve.controlPointsList.map((point) => ({
      type: "IfcCartesianPoint",
      coordinates: [...point.coordinates],
    })),
    knotMultiplicities: [...curve.knotMultiplicities],
    knots: [...curve.knots],
  };
}

function pointToVec3(point: { coordinates: number[] }): Vec3 {
  return {
    x: point.coordinates[0] ?? 0,
    y: point.coordinates[1] ?? 0,
    z: point.coordinates[2] ?? 0,
  };
}

function vec3ToPoint(point: Vec3) {
  return {
    type: "IfcCartesianPoint" as const,
    coordinates: [point.x, point.y, point.z],
  };
}

export class BSplineCurveWithKnotsEditor {
  private container: HTMLElement;
  private curve: IfcBSplineCurveWithKnots;
  private changeCallbacks: Array<(curve: IfcBSplineCurveWithKnots) => void> = [];
  private validationPanel: HTMLElement | undefined = undefined;

  constructor(
    container: HTMLElement,
    config: BSplineCurveWithKnotsEditorConfig,
  ) {
    this.container = container;
    this.curve = cloneCurve(config.defaultCurve);
    this._render();
  }

  getCurve(): IfcBSplineCurveWithKnots {
    return cloneCurve(this.curve);
  }

  onChange(callback: (curve: IfcBSplineCurveWithKnots) => void): void {
    this.changeCallbacks.push(callback);
  }

  private get points(): Vec3[] {
    return this.curve.controlPointsList.map(pointToVec3);
  }

  private _setPoints(points: Vec3[]): void {
    this.curve.controlPointsList = points.map(vec3ToPoint);
  }

  private _notify(): void {
    const copy = this.getCurve();
    for (const cb of this.changeCallbacks) cb(copy);
  }

  private _render(): void {
    this.container.innerHTML = "";

    const wrapper = document.createElement("div");
    wrapper.className = "bspline-editor";

    const basisSection = document.createElement("div");
    basisSection.className = "bspline-section";
    basisSection.appendChild(this._buildSectionTitle("Basis"));
    basisSection.appendChild(this._buildDegreeRow());
    wrapper.appendChild(basisSection);

    const pointsSection = document.createElement("div");
    pointsSection.className = "bspline-section";
    pointsSection.appendChild(this._buildSectionTitle("ControlPointsList"));
    pointsSection.appendChild(this._buildPointsList());
    pointsSection.appendChild(this._buildAddPointButton());
    wrapper.appendChild(pointsSection);

    const knotsSection = document.createElement("div");
    knotsSection.className = "bspline-section";
    knotsSection.appendChild(this._buildSectionTitle("Knots"));
    knotsSection.appendChild(this._buildKnotList());
    knotsSection.appendChild(this._buildAddKnotButton());
    wrapper.appendChild(knotsSection);

    this.validationPanel = this._buildValidationPanel();
    wrapper.appendChild(this.validationPanel);

    this.container.appendChild(wrapper);
  }

  private _buildSectionTitle(label: string): HTMLElement {
    const title = document.createElement("div");
    title.className = "indexed-polycurve-section-title";
    title.textContent = label;
    return title;
  }

  private _buildDegreeRow(): HTMLElement {
    const row = document.createElement("div");
    row.className = "bspline-degree-row";

    const label = document.createElement("label");
    label.className = "bspline-degree-label";
    label.textContent = "Degree";
    row.appendChild(label);

    const input = document.createElement("input");
    input.type = "number";
    input.min = "1";
    input.step = "1";
    input.className = "bspline-number-input";
    input.value = String(this.curve.degree);
    input.addEventListener("input", () => {
      const parsed = Number(input.value);
      if (!Number.isFinite(parsed)) return;
      this.curve.degree = Math.max(1, Math.round(parsed));
      input.value = String(this.curve.degree);
      this._syncValidation();
      this._notify();
    });
    row.appendChild(input);

    return row;
  }

  private _buildPointsList(): HTMLElement {
    const list = document.createElement("div");
    list.className = "bspline-points-list";
    this.points.forEach((point, index) => {
      list.appendChild(this._buildPointRow(point, index));
    });
    return list;
  }

  private _buildPointRow(point: Vec3, index: number): HTMLElement {
    const row = document.createElement("div");
    row.className = "path-point-row";

    const idx = document.createElement("span");
    idx.className = "point-index";
    idx.textContent = `P${index + 1}`;
    row.appendChild(idx);

    const coords: Array<{ label: string; axis: keyof Vec3 }> = [
      { label: "x", axis: "x" },
      { label: "y", axis: "y" },
      { label: "z", axis: "z" },
    ];

    for (const { label, axis } of coords) {
      const coordLabel = document.createElement("span");
      coordLabel.className = "point-coord-label";
      coordLabel.textContent = label;
      row.appendChild(coordLabel);

      const input = document.createElement("input");
      input.type = "number";
      input.className = "point-coord-input";
      input.value = String(point[axis]);
      input.step = String(DEFAULT_COORD_STEP);
      input.addEventListener("input", () => {
        const parsed = Number(input.value);
        if (!Number.isFinite(parsed)) return;

        const points = this.points;
        points[index] = { ...points[index], [axis]: parsed };
        this._setPoints(points);
        this._syncValidation();
        this._notify();
      });
      row.appendChild(input);
    }

    if (this.curve.controlPointsList.length > 2) {
      const del = document.createElement("button");
      del.className = "point-delete-btn";
      del.title = "Remove control point";
      del.textContent = "x";
      del.addEventListener("click", () => {
        const points = this.points;
        points.splice(index, 1);
        this._setPoints(points);
        this._refreshAndNotify();
      });
      row.appendChild(del);
    } else {
      const placeholder = document.createElement("span");
      placeholder.className = "point-delete-placeholder";
      row.appendChild(placeholder);
    }

    return row;
  }

  private _buildAddPointButton(): HTMLElement {
    const addBtn = document.createElement("button");
    addBtn.className = "path-add-point-btn";
    addBtn.textContent = "+ Add control point";
    addBtn.addEventListener("click", () => {
      const points = this.points;
      const last = points.at(-1) ?? { x: 0, y: 0, z: 0 };
      points.push({ x: last.x + 1, y: last.y, z: last.z });
      this._setPoints(points);
      this._refreshAndNotify();
    });
    return addBtn;
  }

  private _buildKnotList(): HTMLElement {
    const list = document.createElement("div");
    list.className = "bspline-knots-list";
    this.curve.knots.forEach((_knot, index) => {
      list.appendChild(this._buildKnotRow(index));
    });
    return list;
  }

  private _buildKnotRow(index: number): HTMLElement {
    const row = document.createElement("div");
    row.className = "bspline-knot-row";

    const idx = document.createElement("span");
    idx.className = "indexed-segment-label";
    idx.textContent = `K${index + 1}`;
    row.appendChild(idx);

    const multiplicityLabel = document.createElement("span");
    multiplicityLabel.className = "point-coord-label";
    multiplicityLabel.textContent = "m";
    row.appendChild(multiplicityLabel);

    const multiplicityInput = document.createElement("input");
    multiplicityInput.type = "number";
    multiplicityInput.min = "1";
    multiplicityInput.step = "1";
    multiplicityInput.className = "bspline-number-input";
    multiplicityInput.value = String(this.curve.knotMultiplicities[index] ?? 1);
    multiplicityInput.addEventListener("input", () => {
      const parsed = Number(multiplicityInput.value);
      if (!Number.isFinite(parsed)) return;
      this.curve.knotMultiplicities[index] = Math.max(1, Math.round(parsed));
      multiplicityInput.value = String(this.curve.knotMultiplicities[index]);
      this._syncValidation();
      this._notify();
    });
    row.appendChild(multiplicityInput);

    const knotLabel = document.createElement("span");
    knotLabel.className = "point-coord-label";
    knotLabel.textContent = "u";
    row.appendChild(knotLabel);

    const knotInput = document.createElement("input");
    knotInput.type = "number";
    knotInput.step = String(DEFAULT_KNOT_STEP);
    knotInput.className = "bspline-number-input";
    knotInput.value = String(this.curve.knots[index]);
    knotInput.addEventListener("input", () => {
      const parsed = Number(knotInput.value);
      if (!Number.isFinite(parsed)) return;
      this.curve.knots[index] = parsed;
      this._syncValidation();
      this._notify();
    });
    row.appendChild(knotInput);

    if (this.curve.knots.length > 2) {
      const del = document.createElement("button");
      del.className = "point-delete-btn";
      del.title = "Remove knot";
      del.textContent = "x";
      del.addEventListener("click", () => {
        this.curve.knotMultiplicities.splice(index, 1);
        this.curve.knots.splice(index, 1);
        this._refreshAndNotify();
      });
      row.appendChild(del);
    } else {
      const placeholder = document.createElement("span");
      placeholder.className = "point-delete-placeholder";
      row.appendChild(placeholder);
    }

    return row;
  }

  private _buildAddKnotButton(): HTMLElement {
    const addBtn = document.createElement("button");
    addBtn.className = "path-add-point-btn";
    addBtn.textContent = "+ Add knot";
    addBtn.addEventListener("click", () => {
      const last = this.curve.knots.at(-1) ?? 0;
      this.curve.knots.push(last + 1);
      this.curve.knotMultiplicities.push(1);
      this._refreshAndNotify();
    });
    return addBtn;
  }

  private _buildValidationPanel(): HTMLElement {
    const panel = document.createElement("div");
    panel.className = "bspline-validation";
    this._syncValidation(panel);
    return panel;
  }

  private _syncValidation(panel = this.validationPanel): void {
    if (!panel) return;

    const validation = validateBSplineCurveWithKnots(this.curve);
    panel.classList.toggle("bspline-validation-ok", validation.valid);
    panel.classList.toggle("bspline-validation-error", !validation.valid);

    if (validation.valid) {
      panel.textContent = "ConsistentBSpline: valid";
      return;
    }

    panel.textContent = validation.errors.join(" ");
  }

  private _refreshAndNotify(): void {
    this._render();
    this._notify();
  }
}
