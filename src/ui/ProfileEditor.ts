import type {
  IfcProfileDef,
  IfcRectangleProfileDef,
  IfcCircleProfileDef,
  IfcEllipseProfileDef,
  IfcRectangleHollowProfileDef,
  IfcCircleHollowProfileDef,
  IfcCShapeProfileDef,
  IfcIShapeProfileDef,
  IfcLShapeProfileDef,
  IfcTShapeProfileDef,
  IfcUShapeProfileDef,
  IfcArbitraryClosedProfileDef,
  Vec2,
} from "../types.ts";
import type { ProfileEditorConfig, ProfileType } from "../types.ts";

const DEFAULT_ARBITRARY_CURVE: Vec2[] = [
  { x: 0, y: 0 },
  { x: 3, y: 0 },
  { x: 3, y: 1 },
  { x: 1, y: 1 },
  { x: 1, y: 4 },
  { x: 0, y: 4 },
];

export class ProfileEditor {
  private container: HTMLElement;
  private config: ProfileEditorConfig;
  private currentProfile: IfcProfileDef;
  private changeCallbacks: Array<(profile: IfcProfileDef) => void> = [];

  // Create a deep clone of a profile so that mutations do not affect shared defaults.
  private _cloneProfile(profile: IfcProfileDef): IfcProfileDef {
    return JSON.parse(JSON.stringify(profile)) as IfcProfileDef;
  }

  constructor(container: HTMLElement, config: ProfileEditorConfig) {
    this.container = container;
    this.config = config;
    this.currentProfile = this._cloneProfile(config.defaultProfile);
    this._render();
  }

  getProfile(): IfcProfileDef {
    return this.currentProfile;
  }

  onChange(callback: (profile: IfcProfileDef) => void): void {
    this.changeCallbacks.push(callback);
  }

  private _notify(): void {
    for (const cb of this.changeCallbacks) {
      cb(this.currentProfile);
    }
  }

  private _activeType(): ProfileType {
    switch (this.currentProfile.type) {
      case "IfcRectangleProfileDef":
        return "rectangle";
      case "IfcCircleProfileDef":
        return "circle";
      case "IfcEllipseProfileDef":
        return "ellipse";
      case "IfcRectangleHollowProfileDef":
        return "rect-hollow";
      case "IfcCircleHollowProfileDef":
        return "circle-hollow";
      case "IfcCShapeProfileDef":
        return "c-shape";
      case "IfcIShapeProfileDef":
        return "i-shape";
      case "IfcLShapeProfileDef":
        return "l-shape";
      case "IfcTShapeProfileDef":
        return "t-shape";
      case "IfcUShapeProfileDef":
        return "u-shape";
      case "IfcArbitraryClosedProfileDef":
      case "IfcArbitraryProfileDefWithVoids":
        return "arbitrary";
      default:
        // Unsupported generated profile type — fall back to rectangle tab
        return this.config.allowedTypes[0] ?? "rectangle";
    }
  }

  private _switchType(newType: ProfileType): void {
    if (this._activeType() === newType) return;
    switch (newType) {
      case "rectangle":
        this.currentProfile = this._cloneProfile({
          type: "IfcRectangleProfileDef",
          profileType: "AREA",
          xDim: 4,
          yDim: 3,
        } satisfies IfcRectangleProfileDef);
        break;
      case "circle":
        this.currentProfile = this._cloneProfile({
          type: "IfcCircleProfileDef",
          profileType: "AREA",
          radius: 2,
        } satisfies IfcCircleProfileDef);
        break;
      case "ellipse":
        this.currentProfile = this._cloneProfile({
          type: "IfcEllipseProfileDef",
          profileType: "AREA",
          semiAxis1: 3,
          semiAxis2: 2,
        } satisfies IfcEllipseProfileDef);
        break;
      case "rect-hollow":
        this.currentProfile = this._cloneProfile({
          type: "IfcRectangleHollowProfileDef",
          profileType: "AREA",
          xDim: 4,
          yDim: 3,
          wallThickness: 0.3,
        } satisfies IfcRectangleHollowProfileDef);
        break;
      case "circle-hollow":
        this.currentProfile = this._cloneProfile({
          type: "IfcCircleHollowProfileDef",
          profileType: "AREA",
          radius: 2,
          wallThickness: 0.3,
        } satisfies IfcCircleHollowProfileDef);
        break;
      case "c-shape":
        this.currentProfile = this._cloneProfile({
          type: "IfcCShapeProfileDef",
          profileType: "AREA",
          depth: 5,
          width: 3,
          wallThickness: 0.35,
          girth: 1.3,
          internalFilletRadius: 0.15,
        } satisfies IfcCShapeProfileDef);
        break;
      case "i-shape":
        this.currentProfile = this._cloneProfile({
          type: "IfcIShapeProfileDef",
          profileType: "AREA",
          overallWidth: 3,
          overallDepth: 5,
          webThickness: 0.2,
          flangeThickness: 0.3,
        } satisfies IfcIShapeProfileDef);
        break;
      case "l-shape":
        this.currentProfile = this._cloneProfile({
          type: "IfcLShapeProfileDef",
          profileType: "AREA",
          depth: 4,
          width: 3,
          thickness: 0.4,
        } satisfies IfcLShapeProfileDef);
        break;
      case "t-shape":
        this.currentProfile = this._cloneProfile({
          type: "IfcTShapeProfileDef",
          profileType: "AREA",
          depth: 5,
          flangeWidth: 4,
          webThickness: 0.8,
          flangeThickness: 1.2,
          filletRadius: 0.2,
          flangeEdgeRadius: 0.15,
          webEdgeRadius: 0.15,
        } satisfies IfcTShapeProfileDef);
        break;
      case "u-shape":
        this.currentProfile = this._cloneProfile({
          type: "IfcUShapeProfileDef",
          profileType: "AREA",
          depth: 5,
          flangeWidth: 4,
          webThickness: 0.6,
          flangeThickness: 0.8,
          filletRadius: 0.2,
          edgeRadius: 0.15,
        } satisfies IfcUShapeProfileDef);
        break;
      case "arbitrary":
        this.currentProfile = this._cloneProfile({
          type: "IfcArbitraryClosedProfileDef",
          profileType: "AREA",
          outerCurve: DEFAULT_ARBITRARY_CURVE.map((p) => ({ ...p })),
        } satisfies IfcArbitraryClosedProfileDef);
        break;
    }
    this._render();
    this._notify();
  }

  // ── Parameter controls HTML ─────────────────────────────────────────────

  private _buildParamsHTML(): string {
    const p = this.currentProfile;

    if (p.type === "IfcRectangleProfileDef") {
      return `
        ${this._sliderHTML("rect-w", "xDim", p.xDim, 0.5, 10, 0.1)}
        ${this._sliderHTML("rect-h", "yDim", p.yDim, 0.5, 10, 0.1)}
      `;
    }

    if (p.type === "IfcCircleProfileDef") {
      return this._sliderHTML("circle-r", "Radius", p.radius, 0.1, 10, 0.1);
    }

    if (p.type === "IfcEllipseProfileDef") {
      return `
        ${this._sliderHTML("ellipse-a", "Semi Axis 1", p.semiAxis1, 0.1, 10, 0.1)}
        ${this._sliderHTML("ellipse-b", "Semi Axis 2", p.semiAxis2, 0.1, 10, 0.1)}
      `;
    }

    if (p.type === "IfcRectangleHollowProfileDef") {
      const rhWallMin = 0.05;
      const rhWallRawMax = Math.min(p.xDim, p.yDim) / 2 - rhWallMin;
      const rhWallMax = Math.max(rhWallMin, rhWallRawMax);
      const rhWall = Math.min(Math.max(p.wallThickness, rhWallMin), rhWallMax);
      p.wallThickness = rhWall;
      return `
        ${this._sliderHTML("rh-w", "xDim", p.xDim, 1, 10, 0.1)}
        ${this._sliderHTML("rh-h", "yDim", p.yDim, 1, 10, 0.1)}
        ${this._sliderHTML("rh-t", "Wall Thickness", rhWall, rhWallMin, rhWallMax, 0.05)}
      `;
    }

    if (p.type === "IfcCircleHollowProfileDef") {
      const chWallMin = 0.05;
      const chWallRawMax = p.radius - chWallMin;
      const chWallMax = Math.max(chWallMin, chWallRawMax);
      const chWall = Math.min(Math.max(p.wallThickness, chWallMin), chWallMax);
      p.wallThickness = chWall;
      return `
        ${this._sliderHTML("ch-r", "Radius", p.radius, 0.5, 10, 0.1)}
        ${this._sliderHTML("ch-t", "Wall Thickness", chWall, chWallMin, chWallMax, 0.05)}
      `;
    }

    if (p.type === "IfcCShapeProfileDef") {
      const csWallMin = 0.05;
      const csWallRawMax = Math.min(p.width / 2, p.depth / 2) - csWallMin;
      const csWallMax = Math.max(csWallMin, csWallRawMax);
      const csWall = Math.min(Math.max(p.wallThickness, csWallMin), csWallMax);
      p.wallThickness = csWall;

      const csGirthMin = csWall + 0.05;
      const csGirthRawMax = p.depth / 2;
      const csGirthMax = Math.max(csGirthMin, csGirthRawMax);
      const csGirth = Math.min(Math.max(p.girth, csGirthMin), csGirthMax);
      p.girth = csGirth;

      const csFilletMin = 0;
      const csFilletRawMax = Math.min(
        csGirth - csWall,
        (p.width - 2 * csWall) / 2,
        (p.depth - 2 * csWall) / 2,
      );
      const csFilletMax = Math.max(csFilletMin, csFilletRawMax);
      const csFillet = Math.min(
        Math.max(p.internalFilletRadius ?? 0, csFilletMin),
        csFilletMax,
      );
      p.internalFilletRadius = csFillet;

      return `
        ${this._sliderHTML("cs-d", "Depth", p.depth, 1, 10, 0.1)}
        ${this._sliderHTML("cs-w", "Width", p.width, 0.5, 10, 0.1)}
        ${this._sliderHTML("cs-t", "Wall Thickness", csWall, csWallMin, csWallMax, 0.05)}
        ${this._sliderHTML("cs-g", "Girth", csGirth, csGirthMin, csGirthMax, 0.05)}
        ${this._sliderHTML("cs-r", "Internal Fillet", csFillet, csFilletMin, csFilletMax, 0.05)}
      `;
    }

    if (p.type === "IfcIShapeProfileDef") {
      const isWebMin = 0.05;
      const isWebRawMax = p.overallWidth / 2 - isWebMin;
      const isWebMax = Math.max(isWebMin, isWebRawMax);
      const isWeb = Math.min(Math.max(p.webThickness, isWebMin), isWebMax);

      const isFlangeMin = 0.05;
      const isFlangeRawMax = p.overallDepth / 2 - isFlangeMin;
      const isFlangeMax = Math.max(isFlangeMin, isFlangeRawMax);
      const isFlange = Math.min(
        Math.max(p.flangeThickness, isFlangeMin),
        isFlangeMax,
      );

      p.webThickness = isWeb;
      p.flangeThickness = isFlange;
      return `
        ${this._sliderHTML("is-ow", "Overall Width", p.overallWidth, 0.5, 8, 0.1)}
        ${this._sliderHTML("is-od", "Overall Depth", p.overallDepth, 0.5, 10, 0.1)}
        ${this._sliderHTML("is-wt", "Web Thickness", isWeb, isWebMin, isWebMax, 0.05)}
        ${this._sliderHTML("is-ft", "Flange Thickness", isFlange, isFlangeMin, isFlangeMax, 0.05)}
      `;
    }

    if (p.type === "IfcLShapeProfileDef") {
      const lsThkMin = 0.05;
      const lsThkRawMax = Math.min(p.depth, p.width ?? p.depth) / 2;
      const lsThkMax = Math.max(lsThkMin, lsThkRawMax);
      const lsThk = Math.min(Math.max(p.thickness, lsThkMin), lsThkMax);
      p.thickness = lsThk;
      return `
        ${this._sliderHTML("ls-d", "Depth", p.depth, 0.5, 10, 0.1)}
        ${this._sliderHTML("ls-w", "Width", p.width ?? p.depth, 0.5, 10, 0.1)}
        ${this._sliderHTML("ls-t", "Thickness", lsThk, lsThkMin, lsThkMax, 0.05)}
      `;
    }

    if (p.type === "IfcTShapeProfileDef") {
      const tsWebMin = 0.05;
      const tsWebRawMax = p.flangeWidth;
      const tsWebMax = Math.max(tsWebMin, tsWebRawMax);
      const tsWeb = Math.min(Math.max(p.webThickness, tsWebMin), tsWebMax);

      const tsFlangeMin = 0.05;
      const tsFlangeRawMax = p.depth;
      const tsFlangeMax = Math.max(tsFlangeMin, tsFlangeRawMax);
      const tsFlange = Math.min(
        Math.max(p.flangeThickness, tsFlangeMin),
        tsFlangeMax,
      );

      p.webThickness = tsWeb;
      p.flangeThickness = tsFlange;
      const tsFilletMax = this._maxTShapeFilletRadius();
      const tsFillet = Math.min(
        Math.max(p.filletRadius ?? 0, 0),
        tsFilletMax,
      );
      p.filletRadius = tsFillet;

      const tsFlangeEdgeMax = this._maxTShapeFlangeEdgeRadius();
      const tsFlangeEdge = Math.min(
        Math.max(p.flangeEdgeRadius ?? 0, 0),
        tsFlangeEdgeMax,
      );
      p.flangeEdgeRadius = tsFlangeEdge;

      const tsWebEdgeMax = this._maxTShapeWebEdgeRadius();
      const tsWebEdge = Math.min(
        Math.max(p.webEdgeRadius ?? 0, 0),
        tsWebEdgeMax,
      );
      p.webEdgeRadius = tsWebEdge;

      return `
        ${this._sliderHTML("ts-d", "Depth", p.depth, 0.5, 10, 0.1)}
        ${this._sliderHTML("ts-fw", "Flange Width", p.flangeWidth, 0.5, 10, 0.1)}
        ${this._sliderHTML("ts-wt", "Web Thickness", tsWeb, tsWebMin, tsWebMax, 0.05)}
        ${this._sliderHTML("ts-ft", "Flange Thickness", tsFlange, tsFlangeMin, tsFlangeMax, 0.05)}
        ${this._sliderHTML("ts-fr", "Fillet Radius", tsFillet, 0, tsFilletMax, 0.05)}
        ${this._sliderHTML("ts-fer", "Flange Edge Radius", tsFlangeEdge, 0, tsFlangeEdgeMax, 0.05)}
        ${this._sliderHTML("ts-wer", "Web Edge Radius", tsWebEdge, 0, tsWebEdgeMax, 0.05)}
      `;
    }

    if (p.type === "IfcUShapeProfileDef") {
      const usWebMin = 0.05;
      const usWebRawMax = p.flangeWidth - usWebMin;
      const usWebMax = Math.max(usWebMin, usWebRawMax);
      const usWeb = Math.min(Math.max(p.webThickness, usWebMin), usWebMax);

      const usFlangeMin = 0.05;
      const usFlangeRawMax = p.depth / 2 - usFlangeMin;
      const usFlangeMax = Math.max(usFlangeMin, usFlangeRawMax);
      const usFlange = Math.min(
        Math.max(p.flangeThickness, usFlangeMin),
        usFlangeMax,
      );

      p.webThickness = usWeb;
      p.flangeThickness = usFlange;

      p.edgeRadius = this._normalizeUShapeEdgeRadius();
      p.filletRadius = this._normalizeUShapeFilletRadius();
      p.edgeRadius = this._normalizeUShapeEdgeRadius();

      const usFilletMax = this._maxUShapeFilletRadius();
      const usEdgeMax = this._maxUShapeEdgeRadius();
      const usFillet = p.filletRadius ?? 0;
      const usEdge = p.edgeRadius ?? 0;

      return `
        ${this._sliderHTML("us-d", "Depth", p.depth, 0.5, 10, 0.1)}
        ${this._sliderHTML("us-fw", "Flange Width", p.flangeWidth, 0.5, 10, 0.1)}
        ${this._sliderHTML("us-wt", "Web Thickness", usWeb, usWebMin, usWebMax, 0.05)}
        ${this._sliderHTML("us-ft", "Flange Thickness", usFlange, usFlangeMin, usFlangeMax, 0.05)}
        ${this._sliderHTML("us-fr", "Fillet Radius", usFillet, 0, usFilletMax, 0.05)}
        ${this._sliderHTML("us-er", "Edge Radius", usEdge, 0, usEdgeMax, 0.05)}
      `;
    }

    if (
      p.type === "IfcArbitraryClosedProfileDef" ||
      p.type === "IfcArbitraryProfileDefWithVoids"
    ) {
      const rows = p.outerCurve
        .map(
          (pt, i) => `
        <div class="profile-point-row" data-index="${i}">
          <span class="point-index">P${i}</span>
          <label class="point-coord-label">X</label>
          <input type="number" class="point-coord-input point-x-input"
                 data-index="${i}" value="${pt.x}" step="0.1">
          <label class="point-coord-label">Y</label>
          <input type="number" class="point-coord-input point-y-input"
                 data-index="${i}" value="${pt.y}" step="0.1">
          ${
            p.outerCurve.length > 3
              ? `<button class="point-delete-btn" data-index="${i}" title="Remove point">×</button>`
              : `<span class="point-delete-placeholder"></span>`
          }
        </div>
      `,
        )
        .join("");
      return `
        <div class="profile-points-list">${rows}</div>
        <button class="profile-add-point-btn">+ Add Point</button>
      `;
    }

    return "";
  }

  private _sliderHTML(
    elementId: string,
    label: string,
    value: number,
    min: number,
    max: number,
    step: number,
  ): string {
    return `
      <div class="param-group">
        <div class="param-label">
          <span>${label}</span>
          <span id="${elementId}-val">${value.toFixed(2)}</span>
        </div>
        <input type="range" class="param-slider" id="${elementId}"
               min="${min}" max="${max}" step="${step}" value="${value}">
      </div>
    `;
  }

  private _typeLabel(t: ProfileType): string {
    const labels: Record<ProfileType, string> = {
      rectangle: "Rectangle",
      circle: "Circle",
      ellipse: "Ellipse",
      "rect-hollow": "Rect Hollow",
      "circle-hollow": "Circle Hollow",
      "c-shape": "C-Shape",
      "i-shape": "I-Shape",
      "l-shape": "L-Shape",
      "t-shape": "T-Shape",
      "u-shape": "U-Shape",
      arbitrary: "Arbitrary",
    };
    return labels[t];
  }

  // ── Render ───────────────────────────────────────────────────────────────

  private _render(): void {
    const activeType = this._activeType();

    this.container.innerHTML = `
      <div class="profile-editor">
        <div class="profile-type-tabs">
          ${this.config.allowedTypes
            .map(
              (t) => `
            <button class="profile-tab${t === activeType ? " active" : ""}"
                    data-type="${t}">
              ${this._typeLabel(t)}
            </button>
          `,
            )
            .join("")}
        </div>
        <div class="profile-params">
          ${this._buildParamsHTML()}
        </div>
      </div>
    `;

    // Tab buttons
    for (const btn of this.container.querySelectorAll<HTMLButtonElement>(
      ".profile-tab",
    )) {
      btn.addEventListener("click", () =>
        this._switchType(btn.dataset.type as ProfileType),
      );
    }

    // ── Rectangle ──
    this._bindSlider("rect-w", (v) => {
      (this.currentProfile as IfcRectangleProfileDef).xDim = v;
    });
    this._bindSlider("rect-h", (v) => {
      (this.currentProfile as IfcRectangleProfileDef).yDim = v;
    });

    // ── Circle ──
    this._bindSlider("circle-r", (v) => {
      (this.currentProfile as IfcCircleProfileDef).radius = v;
    });

    // ── Ellipse ──
    this._bindSlider("ellipse-a", (v) => {
      (this.currentProfile as IfcEllipseProfileDef).semiAxis1 = v;
    });
    this._bindSlider("ellipse-b", (v) => {
      (this.currentProfile as IfcEllipseProfileDef).semiAxis2 = v;
    });

    // ── Rectangle Hollow ──
    this._bindSlider("rh-w", (v) => {
      const prof = this.currentProfile as IfcRectangleHollowProfileDef;
      prof.xDim = v;
      const max = Math.max(0.05, Math.min(prof.xDim, prof.yDim) / 2 - 0.05);
      prof.wallThickness = this._clampDependentSlider("rh-t", max);
    });
    this._bindSlider("rh-h", (v) => {
      const prof = this.currentProfile as IfcRectangleHollowProfileDef;
      prof.yDim = v;
      const max = Math.max(0.05, Math.min(prof.xDim, prof.yDim) / 2 - 0.05);
      prof.wallThickness = this._clampDependentSlider("rh-t", max);
    });
    this._bindSlider("rh-t", (v) => {
      (this.currentProfile as IfcRectangleHollowProfileDef).wallThickness = v;
    });

    // ── Circle Hollow ──
    this._bindSlider("ch-r", (v) => {
      const prof = this.currentProfile as IfcCircleHollowProfileDef;
      prof.radius = v;
      const max = Math.max(0.05, prof.radius - 0.05);
      prof.wallThickness = this._clampDependentSlider("ch-t", max);
    });
    this._bindSlider("ch-t", (v) => {
      (this.currentProfile as IfcCircleHollowProfileDef).wallThickness = v;
    });

    // ── C-Shape ──
    this._bindSlider("cs-d", (v) => {
      const prof = this.currentProfile as IfcCShapeProfileDef;
      prof.depth = v;
      const wallMax = Math.max(0.05, Math.min(prof.width / 2, prof.depth / 2) - 0.05);
      prof.wallThickness = this._clampDependentSlider("cs-t", wallMax);
      const girthMin = prof.wallThickness + 0.05;
      const girthMax = Math.max(girthMin, prof.depth / 2);
      prof.girth = Math.max(girthMin, this._clampDependentSlider("cs-g", girthMax));
      prof.internalFilletRadius = this._clampCShapeFilletRadius();
    });
    this._bindSlider("cs-w", (v) => {
      const prof = this.currentProfile as IfcCShapeProfileDef;
      prof.width = v;
      const wallMax = Math.max(0.05, Math.min(prof.width / 2, prof.depth / 2) - 0.05);
      prof.wallThickness = this._clampDependentSlider("cs-t", wallMax);
      prof.internalFilletRadius = this._clampCShapeFilletRadius();
    });
    this._bindSlider("cs-t", (v) => {
      const prof = this.currentProfile as IfcCShapeProfileDef;
      prof.wallThickness = v;
      const girthMin = prof.wallThickness + 0.05;
      const girthMax = Math.max(girthMin, prof.depth / 2);
      prof.girth = Math.max(girthMin, this._clampDependentSlider("cs-g", girthMax));
      prof.internalFilletRadius = this._clampCShapeFilletRadius();
    });
    this._bindSlider("cs-g", (v) => {
      const prof = this.currentProfile as IfcCShapeProfileDef;
      prof.girth = v;
      prof.internalFilletRadius = this._clampCShapeFilletRadius();
    });
    this._bindSlider("cs-r", (v) => {
      (this.currentProfile as IfcCShapeProfileDef).internalFilletRadius = v;
    });

    // ── I-Shape ──
    this._bindSlider("is-ow", (v) => {
      const prof = this.currentProfile as IfcIShapeProfileDef;
      prof.overallWidth = v;
      const max = Math.max(0.05, prof.overallWidth / 2 - 0.05);
      prof.webThickness = this._clampDependentSlider("is-wt", max);
    });
    this._bindSlider("is-od", (v) => {
      const prof = this.currentProfile as IfcIShapeProfileDef;
      prof.overallDepth = v;
      const max = Math.max(0.05, prof.overallDepth / 2 - 0.05);
      prof.flangeThickness = this._clampDependentSlider("is-ft", max);
    });
    this._bindSlider("is-wt", (v) => {
      (this.currentProfile as IfcIShapeProfileDef).webThickness = v;
    });
    this._bindSlider("is-ft", (v) => {
      (this.currentProfile as IfcIShapeProfileDef).flangeThickness = v;
    });

    // ── L-Shape ──
    this._bindSlider("ls-d", (v) => {
      const prof = this.currentProfile as IfcLShapeProfileDef;
      prof.depth = v;
      const max = Math.max(
        0.05,
        Math.min(prof.depth, prof.width ?? prof.depth) / 2,
      );
      prof.thickness = this._clampDependentSlider("ls-t", max);
    });
    this._bindSlider("ls-w", (v) => {
      const prof = this.currentProfile as IfcLShapeProfileDef;
      prof.width = v;
      const max = Math.max(
        0.05,
        Math.min(prof.depth, prof.width ?? prof.depth) / 2,
      );
      prof.thickness = this._clampDependentSlider("ls-t", max);
    });
    this._bindSlider("ls-t", (v) => {
      (this.currentProfile as IfcLShapeProfileDef).thickness = v;
    });

    // ── T-Shape ──
    this._bindSlider("ts-d", (v) => {
      const prof = this.currentProfile as IfcTShapeProfileDef;
      prof.depth = v;
      const max = Math.max(0.05, prof.depth);
      prof.flangeThickness = this._clampDependentSlider("ts-ft", max);
      prof.filletRadius = this._clampTShapeFilletRadius();
      prof.flangeEdgeRadius = this._clampTShapeFlangeEdgeRadius();
      prof.webEdgeRadius = this._clampTShapeWebEdgeRadius();
    });
    this._bindSlider("ts-fw", (v) => {
      const prof = this.currentProfile as IfcTShapeProfileDef;
      prof.flangeWidth = v;
      const max = Math.max(0.05, prof.flangeWidth);
      prof.webThickness = this._clampDependentSlider("ts-wt", max);
      prof.filletRadius = this._clampTShapeFilletRadius();
      prof.flangeEdgeRadius = this._clampTShapeFlangeEdgeRadius();
      prof.webEdgeRadius = this._clampTShapeWebEdgeRadius();
    });
    this._bindSlider("ts-wt", (v) => {
      const prof = this.currentProfile as IfcTShapeProfileDef;
      prof.webThickness = v;
      prof.filletRadius = this._clampTShapeFilletRadius();
      prof.flangeEdgeRadius = this._clampTShapeFlangeEdgeRadius();
      prof.webEdgeRadius = this._clampTShapeWebEdgeRadius();
    });
    this._bindSlider("ts-ft", (v) => {
      const prof = this.currentProfile as IfcTShapeProfileDef;
      prof.flangeThickness = v;
      prof.filletRadius = this._clampTShapeFilletRadius();
      prof.flangeEdgeRadius = this._clampTShapeFlangeEdgeRadius();
      prof.webEdgeRadius = this._clampTShapeWebEdgeRadius();
    });
    this._bindSlider("ts-fr", (v) => {
      (this.currentProfile as IfcTShapeProfileDef).filletRadius = v;
      (this.currentProfile as IfcTShapeProfileDef).flangeEdgeRadius =
        this._clampTShapeFlangeEdgeRadius();
      (this.currentProfile as IfcTShapeProfileDef).webEdgeRadius =
        this._clampTShapeWebEdgeRadius();
    });
    this._bindSlider("ts-fer", (v) => {
      (this.currentProfile as IfcTShapeProfileDef).flangeEdgeRadius = v;
    });
    this._bindSlider("ts-wer", (v) => {
      (this.currentProfile as IfcTShapeProfileDef).webEdgeRadius = v;
    });

    // ── U-Shape ──
    this._bindSlider("us-d", (v) => {
      const prof = this.currentProfile as IfcUShapeProfileDef;
      prof.depth = v;
      const flangeMax = Math.max(0.05, prof.depth / 2 - 0.05);
      prof.flangeThickness = this._clampDependentSlider("us-ft", flangeMax);
      this._syncUShapeRadii();
    });
    this._bindSlider("us-fw", (v) => {
      const prof = this.currentProfile as IfcUShapeProfileDef;
      prof.flangeWidth = v;
      const webMax = Math.max(0.05, prof.flangeWidth - 0.05);
      prof.webThickness = this._clampDependentSlider("us-wt", webMax);
      this._syncUShapeRadii();
    });
    this._bindSlider("us-wt", (v) => {
      (this.currentProfile as IfcUShapeProfileDef).webThickness = v;
      this._syncUShapeRadii();
    });
    this._bindSlider("us-ft", (v) => {
      (this.currentProfile as IfcUShapeProfileDef).flangeThickness = v;
      this._syncUShapeRadii();
    });
    this._bindSlider("us-fr", (v) => {
      (this.currentProfile as IfcUShapeProfileDef).filletRadius = v;
      (this.currentProfile as IfcUShapeProfileDef).edgeRadius =
        this._clampUShapeEdgeRadius();
    });
    this._bindSlider("us-er", (v) => {
      (this.currentProfile as IfcUShapeProfileDef).edgeRadius = v;
      (this.currentProfile as IfcUShapeProfileDef).filletRadius =
        this._clampUShapeFilletRadius();
    });

    // ── Arbitrary point inputs ──
    for (const input of this.container.querySelectorAll<HTMLInputElement>(
      ".point-x-input, .point-y-input",
    )) {
      input.addEventListener("input", () => {
        const newVal = Number(input.value);
        if (!Number.isFinite(newVal)) return;
        const idx = Number(input.dataset.index);
        const profile = this.currentProfile as IfcArbitraryClosedProfileDef;
        if (input.classList.contains("point-x-input")) {
          profile.outerCurve[idx] = { ...profile.outerCurve[idx], x: newVal };
        } else {
          profile.outerCurve[idx] = { ...profile.outerCurve[idx], y: newVal };
        }
        this._notify();
      });
    }

    // Delete point buttons
    for (const btn of this.container.querySelectorAll<HTMLButtonElement>(
      ".point-delete-btn",
    )) {
      btn.addEventListener("click", () => {
        const idx = Number(btn.dataset.index);
        const profile = this.currentProfile as IfcArbitraryClosedProfileDef;
        profile.outerCurve.splice(idx, 1);
        this._render();
        this._notify();
      });
    }

    // Add point button
    const addBtn = this.container.querySelector<HTMLButtonElement>(
      ".profile-add-point-btn",
    );
    if (addBtn) {
      addBtn.addEventListener("click", () => {
        const profile = this.currentProfile as IfcArbitraryClosedProfileDef;
        const last = profile.outerCurve.at(-1) ?? { x: 0, y: 0 };
        profile.outerCurve.push({ x: last.x + 1, y: last.y });
        this._render();
        this._notify();
      });
    }
  }

  /** Bind a range slider to a property update callback. */
  private _bindSlider(id: string, updater: (value: number) => void): void {
    const input = this.container.querySelector<HTMLInputElement>(`#${id}`);
    const valEl = this.container.querySelector<HTMLElement>(`#${id}-val`);
    if (!input) return;
    input.addEventListener("input", () => {
      const v = Number(input.value);
      updater(v);
      if (valEl) valEl.textContent = v.toFixed(2);
      this._notify();
    });
  }

  /**
   * Update a dependent slider's max to `newMax` and clamp its current value if
   * it exceeds that max. Returns the (possibly clamped) current value.
   */
  private _clampDependentSlider(elementId: string, newMax: number): number {
    const slider = this.container.querySelector<HTMLInputElement>(
      `#${elementId}`,
    );
    const valEl = this.container.querySelector<HTMLElement>(
      `#${elementId}-val`,
    );
    if (!slider) return newMax;
    const safeMax = Math.max(Number(slider.min), newMax);
    slider.max = String(safeMax);
    const current = Number(slider.value);
    if (current > safeMax) {
      slider.value = String(safeMax);
      if (valEl) valEl.textContent = safeMax.toFixed(2);
      return safeMax;
    }
    return current;
  }

  private _clampCShapeFilletRadius(): number {
    if (this.currentProfile.type !== "IfcCShapeProfileDef") return 0;
    const prof = this.currentProfile;
    const max = Math.max(
      0,
      Math.min(
        prof.girth - prof.wallThickness,
        (prof.width - 2 * prof.wallThickness) / 2,
        (prof.depth - 2 * prof.wallThickness) / 2,
      ),
    );
    return this._clampDependentSlider("cs-r", max);
  }

  private _maxTShapeFilletRadius(): number {
    if (this.currentProfile.type !== "IfcTShapeProfileDef") return 0;
    const prof = this.currentProfile;
    return Math.max(
      0,
      Math.min(
        prof.flangeWidth / 2 - prof.webThickness / 2,
        prof.flangeThickness,
        prof.depth - prof.flangeThickness,
      ),
    );
  }

  private _maxTShapeFlangeEdgeRadius(): number {
    if (this.currentProfile.type !== "IfcTShapeProfileDef") return 0;
    const prof = this.currentProfile;
    const filletRadius = prof.filletRadius ?? 0;
    return Math.max(
      0,
      Math.min(
        prof.flangeThickness,
        prof.flangeWidth / 2 - prof.webThickness / 2 - filletRadius,
      ),
    );
  }

  private _maxTShapeWebEdgeRadius(): number {
    if (this.currentProfile.type !== "IfcTShapeProfileDef") return 0;
    const prof = this.currentProfile;
    const filletRadius = prof.filletRadius ?? 0;
    return Math.max(
      0,
      Math.min(
        prof.webThickness / 2,
        prof.depth - prof.flangeThickness - filletRadius,
      ),
    );
  }

  private _clampTShapeFilletRadius(): number {
    return this._clampDependentSlider("ts-fr", this._maxTShapeFilletRadius());
  }

  private _clampTShapeFlangeEdgeRadius(): number {
    return this._clampDependentSlider(
      "ts-fer",
      this._maxTShapeFlangeEdgeRadius(),
    );
  }

  private _clampTShapeWebEdgeRadius(): number {
    return this._clampDependentSlider(
      "ts-wer",
      this._maxTShapeWebEdgeRadius(),
    );
  }

  private _maxUShapeFilletRadius(): number {
    if (this.currentProfile.type !== "IfcUShapeProfileDef") return 0;
    const prof = this.currentProfile;
    const edgeRadius = prof.edgeRadius ?? 0;
    return Math.max(
      0,
      Math.min(
        prof.flangeWidth - prof.webThickness - edgeRadius,
        prof.depth / 2 - prof.flangeThickness,
      ),
    );
  }

  private _maxUShapeEdgeRadius(): number {
    if (this.currentProfile.type !== "IfcUShapeProfileDef") return 0;
    const prof = this.currentProfile;
    const filletRadius = prof.filletRadius ?? 0;
    return Math.max(
      0,
      Math.min(
        prof.flangeThickness,
        prof.flangeWidth - prof.webThickness - filletRadius,
      ),
    );
  }

  private _normalizeUShapeFilletRadius(): number {
    if (this.currentProfile.type !== "IfcUShapeProfileDef") return 0;
    const prof = this.currentProfile;
    const next = Math.min(
      Math.max(prof.filletRadius ?? 0, 0),
      this._maxUShapeFilletRadius(),
    );
    prof.filletRadius = next;
    return next;
  }

  private _normalizeUShapeEdgeRadius(): number {
    if (this.currentProfile.type !== "IfcUShapeProfileDef") return 0;
    const prof = this.currentProfile;
    const next = Math.min(
      Math.max(prof.edgeRadius ?? 0, 0),
      this._maxUShapeEdgeRadius(),
    );
    prof.edgeRadius = next;
    return next;
  }

  private _syncUShapeRadii(): void {
    const prof = this.currentProfile as IfcUShapeProfileDef;
    // edgeRadius and filletRadius are mutually dependent, so we clamp edge
    // first, then fillet (which may tighten edgeMax), then edge again to
    // ensure both constraints are satisfied simultaneously.
    prof.edgeRadius = this._clampUShapeEdgeRadius();
    prof.filletRadius = this._clampUShapeFilletRadius();
    prof.edgeRadius = this._clampUShapeEdgeRadius();
  }

  private _clampUShapeFilletRadius(): number {
    return this._clampDependentSlider("us-fr", this._maxUShapeFilletRadius());
  }

  private _clampUShapeEdgeRadius(): number {
    return this._clampDependentSlider("us-er", this._maxUShapeEdgeRadius());
  }
}
