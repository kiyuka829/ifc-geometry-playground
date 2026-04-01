import type { ExtrusionEditorConfig, ExtrusionParams, Vec3 } from "../types.ts";

const DEPTH_MIN = 0.1;
const DEPTH_MAX = 20;
const DEPTH_STEP = 0.1;
const DIRECTION_MIN = -1;
const DIRECTION_MAX = 1;
const DIRECTION_STEP = 0.01;
const AZIMUTH_MIN = -180;
const AZIMUTH_MAX = 180;
const AZIMUTH_STEP = 1;
const ELEVATION_MIN = -90;
const ELEVATION_MAX = 90;
const ELEVATION_STEP = 1;
const ANGLE_EPSILON = 1e-6;

type DirectionMode = "angles" | "xyz";

interface DirectionAngles {
  azimuthDeg: number;
  elevationDeg: number;
}

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
    dirDetails.open = true;
    const dirSummary = document.createElement("summary");
    dirSummary.className = "inner-collapsible-title";
    dirSummary.textContent = "Extruded Direction";
    dirDetails.appendChild(dirSummary);
    const dirContent = document.createElement("div");
    dirContent.className = "inner-collapsible-content";
    dirDetails.appendChild(dirContent);
    wrapper.appendChild(dirDetails);

    let directionMode: DirectionMode = "angles";
    const normalizedInitial = this._normalizeDirection(this.extrusion.extrudedDirection);
    let lastAzimuthDeg = this._directionToAngles(normalizedInitial).azimuthDeg;

    const directionReadoutValue = document.createElement("div");
    directionReadoutValue.className = "param-label";

    const modeTabs = document.createElement("div");
    modeTabs.className = "profile-type-tabs";
    dirContent.appendChild(modeTabs);

    const modeBtnAngles = document.createElement("button");
    modeBtnAngles.type = "button";
    modeBtnAngles.className = "profile-tab active";
    modeBtnAngles.textContent = "Angles";

    const modeBtnXyz = document.createElement("button");
    modeBtnXyz.type = "button";
    modeBtnXyz.className = "profile-tab";
    modeBtnXyz.textContent = "XYZ";

    modeTabs.appendChild(modeBtnAngles);
    modeTabs.appendChild(modeBtnXyz);

    const anglesPanel = document.createElement("div");
    const xyzPanel = document.createElement("div");
    dirContent.appendChild(anglesPanel);
    dirContent.appendChild(xyzPanel);

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

    const angleInputs: Record<"azimuth" | "elevation", HTMLInputElement> = {
      azimuth: document.createElement("input"),
      elevation: document.createElement("input"),
    };

    const angleValueSpans: Record<"azimuth" | "elevation", HTMLSpanElement> = {
      azimuth: document.createElement("span"),
      elevation: document.createElement("span"),
    };

    const syncDirectionUI = (dir: Vec3) => {
      dirInputs.x.value = String(dir.x);
      dirInputs.y.value = String(dir.y);
      dirInputs.z.value = String(dir.z);
      dirValueSpans.x.textContent = dir.x.toFixed(2);
      dirValueSpans.y.textContent = dir.y.toFixed(2);
      dirValueSpans.z.textContent = dir.z.toFixed(2);

      const normalized = this._normalizeDirection(dir);
      const angles = this._directionToAngles(normalized, lastAzimuthDeg);
      lastAzimuthDeg = angles.azimuthDeg;
      angleInputs.azimuth.value = String(angles.azimuthDeg);
      angleInputs.elevation.value = String(angles.elevationDeg);
      angleValueSpans.azimuth.textContent = `${angles.azimuthDeg.toFixed(0)}°`;
      angleValueSpans.elevation.textContent = `${angles.elevationDeg.toFixed(0)}°`;

      const directionText = `(${normalized.x.toFixed(3)}, ${normalized.y.toFixed(3)}, ${normalized.z.toFixed(3)})`;
      directionReadoutValue.innerHTML = "";
      const left = document.createElement("span");
      left.textContent = "XYZ";
      const right = document.createElement("span");
      right.textContent = directionText;
      directionReadoutValue.append(left, right);
    };

    const applyDirection = (dir: Vec3) => {
      const sanitized = this._sanitizeDirection(dir);
      this.extrusion.extrudedDirection = sanitized;
      syncDirectionUI(sanitized);
      this._notify();
    };

    const setDirectionMode = (mode: DirectionMode) => {
      directionMode = mode;
      modeBtnAngles.classList.toggle("active", mode === "angles");
      modeBtnXyz.classList.toggle("active", mode === "xyz");
      anglesPanel.style.display = mode === "angles" ? "block" : "none";
      xyzPanel.style.display = mode === "xyz" ? "block" : "none";
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
        applyDirection(raw);
      };

      input.addEventListener("input", handleDirInput);
      input.addEventListener("change", handleDirInput);

      group.appendChild(label);
      group.appendChild(input);
      return group;
    };

    const bindAngleSlider = (
      key: "azimuth" | "elevation",
      labelText: string,
      min: number,
      max: number,
      step: number,
    ) => {
      const group = document.createElement("div");
      group.className = "param-group";

      const label = document.createElement("div");
      label.className = "param-label";
      label.append(labelText, angleValueSpans[key]);

      const input = angleInputs[key];
      input.className = "param-slider";
      input.type = "range";
      input.min = String(min);
      input.max = String(max);
      input.step = String(step);

      const handleAngleInput = () => {
        const azimuthDeg = Number.parseFloat(angleInputs.azimuth.value) || 0;
        const elevationDeg =
          Number.parseFloat(angleInputs.elevation.value) || 0;
        const nextDirection = this._anglesToDirection({
          azimuthDeg,
          elevationDeg,
        });
        applyDirection(nextDirection);
      };

      input.addEventListener("input", handleAngleInput);
      input.addEventListener("change", handleAngleInput);

      group.appendChild(label);
      group.appendChild(input);
      return group;
    };

    anglesPanel.appendChild(
      bindAngleSlider(
        "azimuth",
        "Azimuth",
        AZIMUTH_MIN,
        AZIMUTH_MAX,
        AZIMUTH_STEP,
      ),
    );
    anglesPanel.appendChild(
      bindAngleSlider(
        "elevation",
        "Elevation",
        ELEVATION_MIN,
        ELEVATION_MAX,
        ELEVATION_STEP,
      ),
    );

    xyzPanel.appendChild(bindDirectionSlider("x"));
    xyzPanel.appendChild(bindDirectionSlider("y"));
    xyzPanel.appendChild(bindDirectionSlider("z"));

    dirContent.appendChild(directionReadoutValue);

    modeBtnAngles.addEventListener("click", () => setDirectionMode("angles"));
    modeBtnXyz.addEventListener("click", () => setDirectionMode("xyz"));

    syncDirectionUI(this._sanitizeDirection(this.extrusion.extrudedDirection));
    setDirectionMode(directionMode);

    this.container.appendChild(wrapper);
  }

  private _anglesToDirection(angles: DirectionAngles): Vec3 {
    const az = this._degToRad(angles.azimuthDeg);
    const el = this._degToRad(angles.elevationDeg);
    const cosEl = Math.cos(el);
    return this._sanitizeDirection({
      x: cosEl * Math.cos(az),
      y: cosEl * Math.sin(az),
      z: Math.sin(el),
    });
  }

  private _directionToAngles(
    direction: Vec3,
    fallbackAzimuthDeg = 0,
  ): DirectionAngles {
    const n = this._normalizeDirection(direction);
    const horizontal = Math.sqrt(n.x * n.x + n.y * n.y);
    const atPole = horizontal < ANGLE_EPSILON;
    const azimuthDeg = atPole
      ? fallbackAzimuthDeg
      : this._radToDeg(Math.atan2(n.y, n.x));
    const elevationDeg = this._radToDeg(Math.atan2(n.z, horizontal));
    return {
      azimuthDeg: this._clamp(azimuthDeg, AZIMUTH_MIN, AZIMUTH_MAX),
      elevationDeg: this._clamp(elevationDeg, ELEVATION_MIN, ELEVATION_MAX),
    };
  }

  private _normalizeDirection(direction: Vec3): Vec3 {
    const sanitized = this._sanitizeDirection(direction);
    const len = Math.sqrt(
      sanitized.x * sanitized.x +
        sanitized.y * sanitized.y +
        sanitized.z * sanitized.z,
    );
    return {
      x: sanitized.x / len,
      y: sanitized.y / len,
      z: sanitized.z / len,
    };
  }

  private _degToRad(value: number): number {
    return (value * Math.PI) / 180;
  }

  private _radToDeg(value: number): number {
    return (value * 180) / Math.PI;
  }

  private _clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
  }

  private _sanitizeDirection(direction: Vec3): Vec3 {
    const len = Math.sqrt(
      direction.x * direction.x +
        direction.y * direction.y +
        direction.z * direction.z,
    );
    if (len < ANGLE_EPSILON) {
      return { x: 0, y: 0, z: 1 };
    }
    return direction;
  }
}
