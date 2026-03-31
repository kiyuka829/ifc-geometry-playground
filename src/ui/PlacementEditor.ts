import type { Vec3, IfcAxis2Placement3D } from "../types.ts";
import type { PlacementEditorConfig } from "../types.ts";

const LOCATION_MIN = -20;
const LOCATION_MAX = 20;
const LOCATION_STEP = 0.1;
const ROTATION_MIN = -180;
const ROTATION_MAX = 180;
const ROTATION_STEP = 1;
const EPSILON = 1e-6;

/**
 * Euler angles (degrees).
 * R = Rx(rx) · Ry(ry) · Rz(rz)
 *
 * - Rotation X / Y control the tilt (where the local Z axis points).
 * - Rotation Z spins around the local Z axis (only affects RefDirection).
 *
 * Default (0, 0, 0) → Axis = (0, 0, 1), RefDirection = (1, 0, 0).
 */
interface EulerAngles {
  rx: number;
  ry: number;
  rz: number;
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

    const axis = this.placement.axis ?? { x: 0, y: 0, z: 1 };
    const refDir = this.placement.refDirection ?? { x: 1, y: 0, z: 0 };
    const initialEuler = this._axesToEuler(axis, refDir);

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
      const { axis: a, refDirection: r } = this._eulerToAxes(euler);
      this.placement.axis = a;
      this.placement.refDirection = r;

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
          euler[key] = next;
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

    // Initial sync (populate readouts without triggering notify)
    const { axis: initA, refDirection: initR } = this._eulerToAxes(euler);
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

  // ── Euler ↔ Axis/RefDirection conversion ─────────────────────────────────
  //
  // Rotation matrix R = Rx(rx) · Ry(ry) · Rz(rz)
  //
  // Rz is innermost → Rotation Z spins around the LOCAL Z axis.
  // Rx/Ry are outer  → they tilt the Z axis direction.
  //
  // Column 0 (RefDirection / X axis):
  //   ( cy·cz,  cx·sz + sx·sy·cz,  sx·sz − cx·sy·cz )
  //
  // Column 2 (Axis / Z axis):
  //   ( sy,  −sx·cy,  cx·cy )
  //
  // Key property: Axis does NOT depend on rz.

  private _eulerToAxes(e: EulerAngles): { axis: Vec3; refDirection: Vec3 } {
    const cx = Math.cos(this._degToRad(e.rx));
    const sx = Math.sin(this._degToRad(e.rx));
    const cy = Math.cos(this._degToRad(e.ry));
    const sy = Math.sin(this._degToRad(e.ry));
    const cz = Math.cos(this._degToRad(e.rz));
    const sz = Math.sin(this._degToRad(e.rz));

    const refDirection: Vec3 = {
      x: cy * cz,
      y: cx * sz + sx * sy * cz,
      z: sx * sz - cx * sy * cz,
    };

    const axis: Vec3 = {
      x: sy,
      y: -sx * cy,
      z: cx * cy,
    };

    return { axis, refDirection };
  }

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

  // ── Math helpers ─────────────────────────────────────────────────────────

  private _normalize(v: Vec3, fallback: Vec3): Vec3 {
    const len = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
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
