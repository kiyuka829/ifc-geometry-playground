import type { ExtrusionEditorConfig, ExtrusionParams, Vec3 } from "../types.ts";

const DEFAULT_DEPTH_STEP = 0.1;
const DEFAULT_VECTOR_STEP = 0.1;

const AXIS_PRESETS: Array<{ label: string; direction: Vec3 }> = [
  { label: "+X", direction: { x: 1, y: 0, z: 0 } },
  { label: "-X", direction: { x: -1, y: 0, z: 0 } },
  { label: "+Y", direction: { x: 0, y: 1, z: 0 } },
  { label: "-Y", direction: { x: 0, y: -1, z: 0 } },
  { label: "+Z", direction: { x: 0, y: 0, z: 1 } },
  { label: "-Z", direction: { x: 0, y: 0, z: -1 } },
];

export class ExtrusionEditor {
  private container: HTMLElement;
  private extrusion: ExtrusionParams;
  private changeCallbacks: Array<(extrusion: ExtrusionParams) => void> = [];

  constructor(container: HTMLElement, config: ExtrusionEditorConfig) {
    this.container = container;
    this.extrusion = this._cloneExtrusion(config.defaultExtrusion);
    this._render();
  }

  getExtrusion(): ExtrusionParams {
    return this._cloneExtrusion(this.extrusion);
  }

  onChange(callback: (extrusion: ExtrusionParams) => void): void {
    this.changeCallbacks.push(callback);
  }

  private _cloneExtrusion(value: ExtrusionParams): ExtrusionParams {
    return {
      depth: value.depth,
      extrudedDirection: { ...value.extrudedDirection },
    };
  }

  private _notify(): void {
    const snapshot = this.getExtrusion();
    for (const cb of this.changeCallbacks) cb(snapshot);
  }

  private _render(): void {
    this.container.innerHTML = "";

    const wrapper = document.createElement("div");
    wrapper.className = "extrusion-editor";

    const depthSection = document.createElement("div");
    depthSection.className = "extrusion-section";

    const depthLabel = document.createElement("label");
    depthLabel.className = "extrusion-label";
    depthLabel.textContent = "Depth";

    const depthInput = document.createElement("input");
    depthInput.className = "extrusion-input";
    depthInput.type = "number";
    depthInput.min = "0.01";
    depthInput.step = String(DEFAULT_DEPTH_STEP);
    depthInput.value = String(this.extrusion.depth);

    const handleDepthInput = () => {
      const parsed = Number.parseFloat(depthInput.value);
      this.extrusion.depth = Number.isFinite(parsed) && parsed > 0 ? parsed : 0.01;
      this._notify();
    };

    depthInput.addEventListener("input", handleDepthInput);
    depthInput.addEventListener("change", handleDepthInput);

    depthSection.appendChild(depthLabel);
    depthSection.appendChild(depthInput);
    wrapper.appendChild(depthSection);

    const dirSection = document.createElement("div");
    dirSection.className = "extrusion-section";

    const dirLabel = document.createElement("div");
    dirLabel.className = "extrusion-label";
    dirLabel.textContent = "Extruded Direction";
    dirSection.appendChild(dirLabel);

    const dirFields = document.createElement("div");
    dirFields.className = "extrusion-vector-grid";

    const dirInputs: Record<"x" | "y" | "z", HTMLInputElement> = {
      x: document.createElement("input"),
      y: document.createElement("input"),
      z: document.createElement("input"),
    };

    const bindDirectionInput = (key: "x" | "y" | "z") => {
      const row = document.createElement("div");
      row.className = "extrusion-vector-row";

      const label = document.createElement("label");
      label.className = "extrusion-axis-label";
      label.textContent = key.toUpperCase();

      const input = dirInputs[key];
      input.className = "extrusion-input";
      input.type = "number";
      input.step = String(DEFAULT_VECTOR_STEP);
      input.value = String(this.extrusion.extrudedDirection[key]);

      const handleDirInput = () => {
        const raw: Vec3 = {
          x: Number.parseFloat(dirInputs.x.value) || 0,
          y: Number.parseFloat(dirInputs.y.value) || 0,
          z: Number.parseFloat(dirInputs.z.value) || 0,
        };
        const normalized = this._normalizeDirection(raw);
        this.extrusion.extrudedDirection = normalized;
        dirInputs.x.value = normalized.x.toFixed(4);
        dirInputs.y.value = normalized.y.toFixed(4);
        dirInputs.z.value = normalized.z.toFixed(4);
        this._notify();
      };

      input.addEventListener("input", handleDirInput);
      input.addEventListener("change", handleDirInput);

      row.appendChild(label);
      row.appendChild(input);
      return row;
    };

    dirFields.appendChild(bindDirectionInput("x"));
    dirFields.appendChild(bindDirectionInput("y"));
    dirFields.appendChild(bindDirectionInput("z"));
    dirSection.appendChild(dirFields);

    const presets = document.createElement("div");
    presets.className = "extrusion-presets";

    for (const preset of AXIS_PRESETS) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "extrusion-preset-btn";
      btn.textContent = preset.label;
      btn.addEventListener("click", () => {
        this.extrusion.extrudedDirection = { ...preset.direction };
        dirInputs.x.value = String(preset.direction.x);
        dirInputs.y.value = String(preset.direction.y);
        dirInputs.z.value = String(preset.direction.z);
        this._notify();
      });
      presets.appendChild(btn);
    }

    dirSection.appendChild(presets);
    wrapper.appendChild(dirSection);

    this.container.appendChild(wrapper);
  }

  private _normalizeDirection(direction: Vec3): Vec3 {
    const len = Math.sqrt(
      direction.x * direction.x +
        direction.y * direction.y +
        direction.z * direction.z,
    );
    if (len < 1e-6) {
      return { x: 0, y: 1, z: 0 };
    }
    return {
      x: direction.x / len,
      y: direction.y / len,
      z: direction.z / len,
    };
  }
}
