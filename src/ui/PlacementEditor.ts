import type { Vec3, IfcAxis2Placement3D } from "../types.ts";
import type { PlacementEditorConfig } from "../types.ts";

const LOCATION_MIN = -20;
const LOCATION_MAX = 20;
const LOCATION_STEP = 0.1;
const DIRECTION_MIN = -1;
const DIRECTION_MAX = 1;
const DIRECTION_STEP = 0.01;

export class PlacementEditor {
  private container: HTMLElement;
  private placement: IfcAxis2Placement3D;
  private changeCallbacks: Array<(placement: IfcAxis2Placement3D) => void> = [];

  constructor(container: HTMLElement, config: PlacementEditorConfig) {
    this.container = container;
    this.placement = this._clonePlacement(config.defaultPlacement);
    this._render();
  }

  getPlacement(): IfcAxis2Placement3D {
    return this._clonePlacement(this.placement);
  }

  onChange(callback: (placement: IfcAxis2Placement3D) => void): void {
    this.changeCallbacks.push(callback);
  }

  private _clonePlacement(p: IfcAxis2Placement3D): IfcAxis2Placement3D {
    return {
      type: "IfcAxis2Placement3D",
      location: { ...p.location },
      axis: p.axis ? { ...p.axis } : undefined,
      refDirection: p.refDirection ? { ...p.refDirection } : undefined,
    };
  }

  private _notify(): void {
    for (const cb of this.changeCallbacks) {
      cb(this._clonePlacement(this.placement));
    }
  }

  // ── Rendering ────────────────────────────────────────────────────────────

  private _render(): void {
    this.container.innerHTML = "";

    const wrapper = document.createElement("div");
    wrapper.className = "placement-editor";

    /** Create a collapsible sub-section and return its content container. */
    const makeSection = (title: string, open = true): HTMLElement => {
      const details = document.createElement("details");
      details.className = "inner-collapsible";
      if (open) details.open = true;
      const summary = document.createElement("summary");
      summary.className = "inner-collapsible-title";
      summary.textContent = title;
      details.appendChild(summary);
      const content = document.createElement("div");
      content.className = "inner-collapsible-content";
      details.appendChild(content);
      wrapper.appendChild(details);
      return content;
    };

    const addSlider = (
      target: HTMLElement,
      labelText: string,
      value: number,
      min: number,
      max: number,
      step: number,
      onChange: (next: number) => void,
    ) => {
      const group = document.createElement("div");
      group.className = "param-group";

      const label = document.createElement("div");
      label.className = "param-label";
      const valueSpan = document.createElement("span");
      valueSpan.textContent = value.toFixed(2);
      label.append(labelText, valueSpan);

      const slider = document.createElement("input");
      slider.className = "param-slider";
      slider.type = "range";
      slider.min = String(min);
      slider.max = String(max);
      slider.step = String(step);
      slider.value = String(value);

      const handle = () => {
        const parsed = Number.parseFloat(slider.value);
        const next = Number.isFinite(parsed) ? parsed : value;
        valueSpan.textContent = next.toFixed(2);
        onChange(next);
        this._notify();
      };

      slider.addEventListener("input", handle);
      slider.addEventListener("change", handle);

      group.appendChild(label);
      group.appendChild(slider);
      target.appendChild(group);
    };

    const locationSection = makeSection("Location");
    addSlider(
      locationSection,
      "X",
      this.placement.location.x,
      LOCATION_MIN,
      LOCATION_MAX,
      LOCATION_STEP,
      (next) => {
        this.placement.location.x = next;
      },
    );
    addSlider(
      locationSection,
      "Y",
      this.placement.location.y,
      LOCATION_MIN,
      LOCATION_MAX,
      LOCATION_STEP,
      (next) => {
        this.placement.location.y = next;
      },
    );
    addSlider(
      locationSection,
      "Z",
      this.placement.location.z,
      LOCATION_MIN,
      LOCATION_MAX,
      LOCATION_STEP,
      (next) => {
        this.placement.location.z = next;
      },
    );

    const axis = this.placement.axis ?? { x: 0, y: 0, z: 1 };
    const axisSection = makeSection("Axis (Z direction)");
    addSlider(
      axisSection,
      "X",
      axis.x,
      DIRECTION_MIN,
      DIRECTION_MAX,
      DIRECTION_STEP,
      (next) => {
        const current = this.placement.axis ?? { x: 0, y: 0, z: 1 };
        this.placement.axis = this._sanitizeDirection(
          { ...current, x: next },
          { x: 0, y: 0, z: 1 },
        );
      },
    );
    addSlider(
      axisSection,
      "Y",
      axis.y,
      DIRECTION_MIN,
      DIRECTION_MAX,
      DIRECTION_STEP,
      (next) => {
        const current = this.placement.axis ?? { x: 0, y: 0, z: 1 };
        this.placement.axis = this._sanitizeDirection(
          { ...current, y: next },
          { x: 0, y: 0, z: 1 },
        );
      },
    );
    addSlider(
      axisSection,
      "Z",
      axis.z,
      DIRECTION_MIN,
      DIRECTION_MAX,
      DIRECTION_STEP,
      (next) => {
        const current = this.placement.axis ?? { x: 0, y: 0, z: 1 };
        this.placement.axis = this._sanitizeDirection(
          { ...current, z: next },
          { x: 0, y: 0, z: 1 },
        );
      },
    );

    const refDirection = this.placement.refDirection ?? { x: 1, y: 0, z: 0 };
    const refDirSection = makeSection("RefDirection (X direction)");
    addSlider(
      refDirSection,
      "X",
      refDirection.x,
      DIRECTION_MIN,
      DIRECTION_MAX,
      DIRECTION_STEP,
      (next) => {
        const current = this.placement.refDirection ?? { x: 1, y: 0, z: 0 };
        this.placement.refDirection = this._sanitizeDirection(
          { ...current, x: next },
          { x: 1, y: 0, z: 0 },
        );
      },
    );
    addSlider(
      refDirSection,
      "Y",
      refDirection.y,
      DIRECTION_MIN,
      DIRECTION_MAX,
      DIRECTION_STEP,
      (next) => {
        const current = this.placement.refDirection ?? { x: 1, y: 0, z: 0 };
        this.placement.refDirection = this._sanitizeDirection(
          { ...current, y: next },
          { x: 1, y: 0, z: 0 },
        );
      },
    );
    addSlider(
      refDirSection,
      "Z",
      refDirection.z,
      DIRECTION_MIN,
      DIRECTION_MAX,
      DIRECTION_STEP,
      (next) => {
        const current = this.placement.refDirection ?? { x: 1, y: 0, z: 0 };
        this.placement.refDirection = this._sanitizeDirection(
          { ...current, z: next },
          { x: 1, y: 0, z: 0 },
        );
      },
    );

    this.container.appendChild(wrapper);
  }

  private _sanitizeDirection(v: Vec3, fallback: Vec3): Vec3 {
    const len = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
    if (len < 0.0001) {
      return fallback;
    }
    return v;
  }
}
