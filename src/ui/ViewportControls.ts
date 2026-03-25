import { Vector3 } from "@babylonjs/core";
import type { AbstractMesh, Observer, Camera } from "@babylonjs/core";
import type { ViewportCamera, AxisView } from "../engine/viewport-camera.ts";

const AXIS_DEFS: Array<{ dir: AxisView; label: string; title: string }> = [
  { dir: "+x", label: "+X", title: "View from +X axis" },
  { dir: "-x", label: "−X", title: "View from −X axis" },
  { dir: "+y", label: "+Y", title: "View from +Y axis (top)" },
  { dir: "-y", label: "−Y", title: "View from −Y axis (bottom)" },
  { dir: "+z", label: "+Z", title: "View from +Z axis" },
  { dir: "-z", label: "−Z", title: "View from −Z axis" },
];

export class ViewportControls {
  private _container: HTMLElement;
  private _camera: ViewportCamera;
  private _getMeshes: () => AbstractMesh[];
  private _overlay: HTMLElement | null = null;
  private _projBtn: HTMLButtonElement | null = null;
  private _axisButtons = new Map<AxisView, HTMLButtonElement>();
  private _activeAxis: AxisView | null = null;
  private _indicatorSvg: SVGSVGElement | null = null;
  // One-shot RAF: only scheduled when _indicatorDirty is set
  private _rafId: number | null = null;
  private _indicatorDirty = true;
  // Stored for cleanup in dispose()
  private _viewMatrixObserver: Observer<Camera> | null = null;
  private _unsubscribeMode: (() => void) | null = null;

  constructor(
    container: HTMLElement,
    camera: ViewportCamera,
    getMeshes: () => AbstractMesh[],
  ) {
    this._container = container;
    this._camera = camera;
    this._getMeshes = getMeshes;
    this._render();
    // Draw the initial indicator
    this._scheduleIndicator();
  }

  // ── private helpers ────────────────────────────────────────────────────────

  private _render(): void {
    const overlay = document.createElement("div");
    overlay.className = "viewport-controls";
    this._overlay = overlay;

    // ── Projection toggle ──────────────────────────────────────────────────
    const projBtn = document.createElement("button");
    projBtn.className = "vp-btn vp-proj-btn";
    projBtn.title = "Toggle perspective / orthographic projection";
    this._projBtn = projBtn;
    this._syncProjLabel();

    projBtn.addEventListener("click", () => {
      this._camera.toggleProjection();
      this._activeAxis = null;
      this._syncProjLabel();
      this._syncAxisHighlight();
    });
    overlay.appendChild(projBtn);

    // ── Axis-view buttons ──────────────────────────────────────────────────
    const axisGrid = document.createElement("div");
    axisGrid.className = "vp-axis-grid";

    for (const { dir, label, title } of AXIS_DEFS) {
      const btn = document.createElement("button");
      btn.className = "vp-btn vp-axis-btn";
      btn.textContent = label;
      btn.title = title;
      btn.addEventListener("click", () => {
        // Always snap to the chosen view; buttons do not toggle off
        this._activeAxis = dir;
        this._camera.snapToView(dir);
        this._syncAxisHighlight();
      });
      axisGrid.appendChild(btn);
      this._axisButtons.set(dir, btn);
    }
    overlay.appendChild(axisGrid);

    // ── Fit button ─────────────────────────────────────────────────────────
    const fitBtn = document.createElement("button");
    fitBtn.className = "vp-btn vp-fit-btn";
    fitBtn.textContent = "Fit";
    fitBtn.title = "Fit geometry in view";
    fitBtn.addEventListener("click", () => {
      this._camera.fitToMeshes(this._getMeshes());
    });
    overlay.appendChild(fitBtn);

    // ── Axis indicator SVG ─────────────────────────────────────────────────
    const indicatorWrap = document.createElement("div");
    indicatorWrap.className = "vp-axis-indicator";
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", "54");
    svg.setAttribute("height", "54");
    svg.setAttribute("viewBox", "0 0 54 54");
    this._indicatorSvg = svg;
    indicatorWrap.appendChild(svg);
    overlay.appendChild(indicatorWrap);

    this._container.appendChild(overlay);

    // Schedule a one-shot redraw when the camera moves (dirty-flag pattern)
    this._viewMatrixObserver =
      this._camera.camera.onViewMatrixChangedObservable.add(() => {
        this._indicatorDirty = true;
        this._scheduleIndicator();
      });

    // React to external projection-mode changes (e.g. programmatic)
    this._unsubscribeMode = this._camera.onModeChange(() => {
      this._syncProjLabel();
      this._indicatorDirty = true;
      this._scheduleIndicator();
    });
  }

  private _syncProjLabel(): void {
    if (!this._projBtn) return;
    const isOrtho = this._camera.mode === "orthographic";
    this._projBtn.textContent = isOrtho ? "Ortho" : "Persp";
    this._projBtn.classList.toggle("active", isOrtho);
  }

  private _syncAxisHighlight(): void {
    for (const [dir, btn] of this._axisButtons) {
      btn.classList.toggle("active", dir === this._activeAxis);
    }
  }

  // ── SVG axis indicator ──────────────────────────────────────────────────

  /**
   * Schedule a single RAF to redraw the indicator. Does nothing if one is
   * already pending, keeping CPU usage at one draw per changed frame.
   */
  private _scheduleIndicator(): void {
    if (this._rafId !== null) return;
    this._rafId = requestAnimationFrame(() => {
      this._rafId = null;
      if (this._indicatorDirty) {
        this._indicatorDirty = false;
        this._drawIndicator();
      }
    });
  }

  private _drawIndicator(): void {
    const svg = this._indicatorSvg;
    if (!svg) return;

    // TransformNormal with the view matrix projects a world-space axis vector
    // into view space: result.x = screen-right component, result.y = screen-up.
    const vm = this._camera.camera.getViewMatrix();

    const SIZE = 54;
    const cx = SIZE / 2;
    const cy = SIZE / 2;
    const R = 18;

    const worldAxes = [
      { vec: new Vector3(1, 0, 0), color: "#f55", label: "X" },
      { vec: new Vector3(0, 1, 0), color: "#5c5", label: "Y" },
      { vec: new Vector3(0, 0, 1), color: "#55f", label: "Z" },
    ];

    const projected = worldAxes.map(({ vec, color, label }) => {
      const v = Vector3.TransformNormal(vec, vm);
      // SVG Y is flipped relative to 3D Y-up
      return {
        sx: cx + v.x * R,
        sy: cy - v.y * R,
        nx: cx - v.x * R,
        ny: cy + v.y * R,
        depth: v.z,
        color,
        label,
      };
    });

    // Paint back-facing axes first so front ones are drawn on top
    projected.sort((a, b) => b.depth - a.depth);

    // Clear
    while (svg.firstChild) svg.removeChild(svg.firstChild);

    // Background circle
    const bg = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    bg.setAttribute("cx", String(cx));
    bg.setAttribute("cy", String(cy));
    bg.setAttribute("r", String(cx - 1));
    bg.setAttribute("fill", "rgba(13,27,46,0.88)");
    bg.setAttribute("stroke", "#1a2a4a");
    bg.setAttribute("stroke-width", "1");
    svg.appendChild(bg);

    // Negative-end stems (faded)
    for (const p of projected) {
      const line = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "line",
      );
      line.setAttribute("x1", String(cx));
      line.setAttribute("y1", String(cy));
      line.setAttribute("x2", String(p.nx));
      line.setAttribute("y2", String(p.ny));
      line.setAttribute("stroke", p.color);
      line.setAttribute("stroke-width", "1.5");
      line.setAttribute("stroke-opacity", "0.3");
      svg.appendChild(line);
    }

    // Positive-end stems + dot + label
    for (const p of projected) {
      const line = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "line",
      );
      line.setAttribute("x1", String(cx));
      line.setAttribute("y1", String(cy));
      line.setAttribute("x2", String(p.sx));
      line.setAttribute("y2", String(p.sy));
      line.setAttribute("stroke", p.color);
      line.setAttribute("stroke-width", "2");
      svg.appendChild(line);

      const dot = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "circle",
      );
      dot.setAttribute("cx", String(p.sx));
      dot.setAttribute("cy", String(p.sy));
      dot.setAttribute("r", "5");
      dot.setAttribute("fill", p.color);
      svg.appendChild(dot);

      const text = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "text",
      );
      text.setAttribute("x", String(p.sx));
      text.setAttribute("y", String(p.sy + 0.5));
      text.setAttribute("text-anchor", "middle");
      text.setAttribute("dominant-baseline", "middle");
      text.setAttribute("fill", "#fff");
      text.setAttribute("font-size", "7");
      text.setAttribute("font-weight", "bold");
      text.setAttribute("font-family", "system-ui, sans-serif");
      text.textContent = p.label;
      svg.appendChild(text);
    }
  }

  dispose(): void {
    // Cancel any pending RAF
    if (this._rafId !== null) {
      cancelAnimationFrame(this._rafId);
      this._rafId = null;
    }
    // Unregister camera observers to prevent retention after disposal
    if (this._viewMatrixObserver !== null) {
      this._camera.camera.onViewMatrixChangedObservable.remove(
        this._viewMatrixObserver,
      );
      this._viewMatrixObserver = null;
    }
    if (this._unsubscribeMode !== null) {
      this._unsubscribeMode();
      this._unsubscribeMode = null;
    }
    if (this._overlay && this._container.contains(this._overlay)) {
      this._container.removeChild(this._overlay);
    }
    this._overlay = null;
  }
}
