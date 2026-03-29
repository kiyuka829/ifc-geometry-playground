import type { ExtrusionEditorConfig, ExtrusionParams, Vec3 } from "../types.ts";

const DEPTH_MIN = 0.1;
const DEPTH_MAX = 20;
const DEPTH_STEP = 0.1;
const DIRECTION_MIN = -1;
const DIRECTION_MAX = 1;
const DIRECTION_STEP = 0.01;

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

    const depthGroup = document.createElement("div");
    depthGroup.className = "param-group";
    const depthLabel = document.createElement("div");
    depthLabel.className = "param-label";
    const depthValue = document.createElement("span");
    depthValue.textContent = this.extrusion.depth.toFixed(2);
    depthLabel.append("Depth", depthValue);

    const depthInput = document.createElement("input");
    depthInput.className = "param-slider";
    depthInput.type = "range";
    depthInput.min = String(DEPTH_MIN);
    depthInput.max = String(DEPTH_MAX);
    depthInput.step = String(DEPTH_STEP);
    depthInput.value = String(this.extrusion.depth);

    const handleDepthInput = () => {
      const parsed = Number.parseFloat(depthInput.value);
      this.extrusion.depth =
        Number.isFinite(parsed) && parsed > 0 ? parsed : DEPTH_MIN;
      depthValue.textContent = this.extrusion.depth.toFixed(2);
      this._notify();
    };

    depthInput.addEventListener("input", handleDepthInput);
    depthInput.addEventListener("change", handleDepthInput);

    depthGroup.appendChild(depthLabel);
    depthGroup.appendChild(depthInput);
    wrapper.appendChild(depthGroup);

    const dirDetails = document.createElement("details");
    dirDetails.className = "inner-collapsible";
    const dirSummary = document.createElement("summary");
    dirSummary.className = "inner-collapsible-title";
    dirSummary.textContent = "Extruded Direction";
    dirDetails.appendChild(dirSummary);
    const dirContent = document.createElement("div");
    dirContent.className = "inner-collapsible-content";
    dirDetails.appendChild(dirContent);
    wrapper.appendChild(dirDetails);

    const dirInputs: Record<"x" | "y" | "z", HTMLInputElement> = {
      x: document.createElement("input"),
      y: document.createElement("input"),
      z: document.createElement("input"),
    };

    const dirValueSpans: Record<"x" | "y" | "z", HTMLSpanElement> = {
      x: document.createElement("span"),
      y: document.createElement("span"),
      z: document.createElement("span"),
    };

    const syncDirectionUI = (dir: Vec3) => {
      dirInputs.x.value = String(dir.x);
      dirInputs.y.value = String(dir.y);
      dirInputs.z.value = String(dir.z);
      dirValueSpans.x.textContent = dir.x.toFixed(2);
      dirValueSpans.y.textContent = dir.y.toFixed(2);
      dirValueSpans.z.textContent = dir.z.toFixed(2);
    };

    const bindDirectionSlider = (key: "x" | "y" | "z") => {
      const group = document.createElement("div");
      group.className = "param-group";

      const label = document.createElement("div");
      label.className = "param-label";
      label.append(key.toUpperCase(), dirValueSpans[key]);

      const input = dirInputs[key];
      input.className = "param-slider";
      input.type = "range";
      input.min = String(DIRECTION_MIN);
      input.max = String(DIRECTION_MAX);
      input.step = String(DIRECTION_STEP);
      input.value = String(this.extrusion.extrudedDirection[key]);

      const handleDirInput = () => {
        const raw: Vec3 = {
          x: Number.parseFloat(dirInputs.x.value) || 0,
          y: Number.parseFloat(dirInputs.y.value) || 0,
          z: Number.parseFloat(dirInputs.z.value) || 0,
        };
        const sanitized = this._sanitizeDirection(raw);
        this.extrusion.extrudedDirection = sanitized;
        syncDirectionUI(sanitized);
        this._notify();
      };

      input.addEventListener("input", handleDirInput);
      input.addEventListener("change", handleDirInput);

      group.appendChild(label);
      group.appendChild(input);
      return group;
    };

    dirContent.appendChild(bindDirectionSlider("x"));
    dirContent.appendChild(bindDirectionSlider("y"));
    dirContent.appendChild(bindDirectionSlider("z"));

    syncDirectionUI(this._sanitizeDirection(this.extrusion.extrudedDirection));

    this.container.appendChild(wrapper);
  }

  private _sanitizeDirection(direction: Vec3): Vec3 {
    const len = Math.sqrt(
      direction.x * direction.x +
        direction.y * direction.y +
        direction.z * direction.z,
    );
    if (len < 1e-6) {
      return { x: 0, y: 1, z: 0 };
    }
    return direction;
  }
}
