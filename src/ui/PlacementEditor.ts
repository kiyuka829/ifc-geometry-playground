import type { Vec3, IfcAxis2Placement3D } from "../types.ts";
import type { PlacementEditorConfig } from "../types.ts";

const LOCATION_MIN = -20;
const LOCATION_MAX = 20;
const LOCATION_STEP = 0.1;
const ROTATION_MIN = -180;
const ROTATION_MAX = 180;
const ROTATION_STEP = 1;
const EPSILON = 1e-6;
const ORTHOGONAL_FALLBACK_THRESHOLD = 0.9;

/**
 * Slider values shown in the UI (degrees).
 *
 * They are seeded from the initial placement's intrinsic XYZ decomposition,
 * then used as accumulators so each slider change can apply only the delta
 * around the current local axis.
 */
interface EulerAngles {
  rx: number;
  ry: number;
  rz: number;
}

interface OrientationBasis {
  xAxis: Vec3;
  yAxis: Vec3;
  zAxis: Vec3;
}

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
      formatValue: (v: number) => string,
      onChange: (next: number) => void,
    ): { input: HTMLInputElement; valueSpan: HTMLSpanElement } => {
      const group = document.createElement("div");
      group.className = "param-group";

      const label = document.createElement("div");
      label.className = "param-label";
      const valueSpan = document.createElement("span");
      valueSpan.textContent = formatValue(value);
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
        valueSpan.textContent = formatValue(next);
        onChange(next);
      };

      slider.addEventListener("input", handle);
      slider.addEventListener("change", handle);

      group.appendChild(label);
      group.appendChild(slider);
      target.appendChild(group);
      return { input: slider, valueSpan };
    };

    const fmtDec = (v: number) => v.toFixed(2);
    const fmtDeg = (v: number) => `${v.toFixed(0)}°`;

    // ── Location ───────────────────────────────────────────────────────────

    const locationSection = makeSection("Location");
    addSlider(
      locationSection,
      "X",
      this.placement.location.x,
      LOCATION_MIN,
      LOCATION_MAX,
      LOCATION_STEP,
      fmtDec,
      (next) => {
        this.placement.location.x = next;
        this._notify();
      },
    );
    addSlider(
      locationSection,
      "Y",
      this.placement.location.y,
      LOCATION_MIN,
      LOCATION_MAX,
      LOCATION_STEP,
      fmtDec,
      (next) => {
        this.placement.location.y = next;
        this._notify();
      },
    );
    addSlider(
      locationSection,
      "Z",
      this.placement.location.z,
      LOCATION_MIN,
      LOCATION_MAX,
      LOCATION_STEP,
      fmtDec,
      (next) => {
        this.placement.location.z = next;
        this._notify();
      },
    );

    // ── Orientation ────────────────────────────────────────────────────────

    const orientSection = makeSection("Orientation");

    let basis = this._getPlacementBasis(this.placement);
    const initialEuler = this._axesToEuler(basis.zAxis, basis.xAxis);

    const euler: EulerAngles = { ...initialEuler };

    // Readouts for resulting Axis / RefDirection
    const axisReadout = document.createElement("div");
    axisReadout.className = "param-label";
    const refDirReadout = document.createElement("div");
    refDirReadout.className = "param-label";

    const sliderRefs: Record<
      "rx" | "ry" | "rz",
      { input: HTMLInputElement; valueSpan: HTMLSpanElement }
    > = {
      rx: {
        input: document.createElement("input"),
        valueSpan: document.createElement("span"),
      },
      ry: {
        input: document.createElement("input"),
        valueSpan: document.createElement("span"),
      },
      rz: {
        input: document.createElement("input"),
        valueSpan: document.createElement("span"),
      },
    };

    const syncOrientationUI = () => {
      const a = basis.zAxis;
      const r = basis.xAxis;
      this.placement.axis = { ...a };
      this.placement.refDirection = { ...r };

      for (const key of ["rx", "ry", "rz"] as const) {
        sliderRefs[key].input.value = String(euler[key]);
        sliderRefs[key].valueSpan.textContent = fmtDeg(euler[key]);
      }

      axisReadout.innerHTML = "";
      const axisLeft = document.createElement("span");
      axisLeft.textContent = "Axis";
      const axisRight = document.createElement("span");
      axisRight.textContent = `(${a.x.toFixed(3)}, ${a.y.toFixed(3)}, ${a.z.toFixed(3)})`;
      axisReadout.append(axisLeft, axisRight);

      refDirReadout.innerHTML = "";
      const refLeft = document.createElement("span");
      refLeft.textContent = "RefDirection";
      const refRight = document.createElement("span");
      refRight.textContent = `(${r.x.toFixed(3)}, ${r.y.toFixed(3)}, ${r.z.toFixed(3)})`;
      refDirReadout.append(refLeft, refRight);

      this._notify();
    };

    const addRotSlider = (key: "rx" | "ry" | "rz", label: string) => {
      const ref = addSlider(
        orientSection,
        label,
        euler[key],
        ROTATION_MIN,
        ROTATION_MAX,
        ROTATION_STEP,
        fmtDeg,
        (next) => {
          const delta = next - euler[key];
          euler[key] = next;
          if (Math.abs(delta) > EPSILON) {
            basis = this._applyLocalRotation(basis, key, delta);
          }
          syncOrientationUI();
        },
      );
      sliderRefs[key] = ref;
    };

    addRotSlider("rx", "Rotation X");
    addRotSlider("ry", "Rotation Y");
    addRotSlider("rz", "Rotation Z");

    orientSection.appendChild(axisReadout);
    orientSection.appendChild(refDirReadout);

    // Initial sync: update placement to the normalised/orthogonal frame and
    // populate readouts without firing _notify() before user interaction.
    const initA = basis.zAxis;
    const initR = basis.xAxis;
    this.placement.axis = { ...initA };
    this.placement.refDirection = { ...initR };

    axisReadout.innerHTML = "";
    const axL = document.createElement("span");
    axL.textContent = "Axis";
    const axR = document.createElement("span");
    axR.textContent = `(${initA.x.toFixed(3)}, ${initA.y.toFixed(3)}, ${initA.z.toFixed(3)})`;
    axisReadout.append(axL, axR);

    refDirReadout.innerHTML = "";
    const rdL = document.createElement("span");
    rdL.textContent = "RefDirection";
    const rdR = document.createElement("span");
    rdR.textContent = `(${initR.x.toFixed(3)}, ${initR.y.toFixed(3)}, ${initR.z.toFixed(3)})`;
    refDirReadout.append(rdL, rdR);

    this.container.appendChild(wrapper);
  }

  // ── Orientation helpers ──────────────────────────────────────────────────

  private _axesToEuler(axis: Vec3, refDirection: Vec3): EulerAngles {
    // Normalize inputs
    const a = this._normalize(axis, { x: 0, y: 0, z: 1 });
    const r = this._normalize(refDirection, { x: 1, y: 0, z: 0 });

    // ry from axis.x: sin(ry) = axis.x
    const sinRy = this._clamp(a.x, -1, 1);
    const ry = Math.asin(sinRy);
    const cy = Math.cos(ry);

    let rx: number;
    let rz: number;

    if (Math.abs(cy) > EPSILON) {
      // rx from axis: -sx·cy = a.y, cx·cy = a.z
      rx = Math.atan2(-a.y, a.z);

      // rz: Y-column x-component = -cy·sz
      // Y = cross(axis, refDirection)
      const yDirX = a.y * r.z - a.z * r.y;
      rz = Math.atan2(-yDirX, r.x);
    } else {
      // Gimbal lock: ry ≈ ±90°
      rz = 0;
      if (sinRy > 0) {
        // ry ≈ 90°: refDir ≈ (0, sx, -cx) when rz=0
        rx = Math.atan2(r.y, -r.z);
      } else {
        // ry ≈ -90°: refDir ≈ (0, -sx, cx) when rz=0
        rx = Math.atan2(-r.y, r.z);
      }
    }

    return {
      rx: this._roundNear(this._radToDeg(rx)),
      ry: this._roundNear(this._radToDeg(ry)),
      rz: this._roundNear(this._radToDeg(rz)),
    };
  }

  private _getPlacementBasis(placement: IfcAxis2Placement3D): OrientationBasis {
    const rawZ = placement.axis ?? { x: 0, y: 0, z: 1 };
    const rawX = placement.refDirection ?? { x: 1, y: 0, z: 0 };

    const zAxis = this._normalize(rawZ, { x: 0, y: 0, z: 1 });
    const xAxis = this._orthogonalizeXAxis(zAxis, rawX);
    const yAxis = this._normalize(
      this._cross(zAxis, xAxis),
      { x: 0, y: 1, z: 0 },
    );

    return { xAxis, yAxis, zAxis };
  }

  private _applyLocalRotation(
    basis: OrientationBasis,
    key: keyof EulerAngles,
    deltaDegrees: number,
  ): OrientationBasis {
    const angle = this._degToRad(deltaDegrees);
    const c = Math.cos(angle);
    const s = Math.sin(angle);

    switch (key) {
      case "rx":
        return this._orthonormalizeBasis({
          xAxis: basis.xAxis,
          yAxis: this._add(this._scale(basis.yAxis, c), this._scale(basis.zAxis, s)),
          zAxis: this._add(
            this._scale(basis.yAxis, -s),
            this._scale(basis.zAxis, c),
          ),
        });
      case "ry":
        return this._orthonormalizeBasis({
          xAxis: this._add(this._scale(basis.xAxis, c), this._scale(basis.zAxis, -s)),
          yAxis: basis.yAxis,
          zAxis: this._add(this._scale(basis.xAxis, s), this._scale(basis.zAxis, c)),
        });
      case "rz":
        return this._orthonormalizeBasis({
          xAxis: this._add(this._scale(basis.xAxis, c), this._scale(basis.yAxis, s)),
          yAxis: this._add(this._scale(basis.xAxis, -s), this._scale(basis.yAxis, c)),
          zAxis: basis.zAxis,
        });
    }
  }

  private _orthonormalizeBasis(basis: OrientationBasis): OrientationBasis {
    const zAxis = this._normalize(basis.zAxis, { x: 0, y: 0, z: 1 });
    const xAxis = this._orthogonalizeXAxis(zAxis, basis.xAxis);
    const yAxis = this._normalize(
      this._cross(zAxis, xAxis),
      { x: 0, y: 1, z: 0 },
    );

    return { xAxis, yAxis, zAxis };
  }

  // ── Math helpers ─────────────────────────────────────────────────────────

  private _add(a: Vec3, b: Vec3): Vec3 {
    return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z };
  }

  private _sub(a: Vec3, b: Vec3): Vec3 {
    return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z };
  }

  private _scale(v: Vec3, scalar: number): Vec3 {
    return { x: v.x * scalar, y: v.y * scalar, z: v.z * scalar };
  }

  private _dot(a: Vec3, b: Vec3): number {
    return a.x * b.x + a.y * b.y + a.z * b.z;
  }

  private _cross(a: Vec3, b: Vec3): Vec3 {
    return {
      x: a.y * b.z - a.z * b.y,
      y: a.z * b.x - a.x * b.z,
      z: a.x * b.y - a.y * b.x,
    };
  }

  private _orthogonalizeXAxis(zAxis: Vec3, candidate: Vec3): Vec3 {
    const projected = this._sub(candidate, this._scale(zAxis, this._dot(candidate, zAxis)));
    if (this._length(projected) >= EPSILON) {
      return this._normalize(projected, { x: 1, y: 0, z: 0 });
    }

    const fallbackSeed =
      Math.abs(zAxis.x) < ORTHOGONAL_FALLBACK_THRESHOLD
        ? { x: 1, y: 0, z: 0 }
        : { x: 0, y: 1, z: 0 };
    return this._normalize(this._cross(fallbackSeed, zAxis), { x: 1, y: 0, z: 0 });
  }

  private _length(v: Vec3): number {
    return Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
  }

  private _normalize(v: Vec3, fallback: Vec3): Vec3 {
    const len = this._length(v);
    if (len < EPSILON) return fallback;
    return { x: v.x / len, y: v.y / len, z: v.z / len };
  }

  /** Round values very close to an integer to eliminate floating-point noise. */
  private _roundNear(deg: number): number {
    const rounded = Math.round(deg);
    return Math.abs(deg - rounded) < 0.01 ? rounded : deg;
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
}
