import type { Mesh } from "@babylonjs/core";
import type {
  SampleDef,
  ParamValues,
  IfcProfileDef,
  IfcAxis2Placement3D,
  ExtrusionParams,
  Vec3,
  SweepViewState,
  PolynomialCoefficients,
} from "../types.ts";
import type { IfcIndexedPolyCurve } from "../ifc/generated/schema.ts";
import { SceneManager } from "../engine/scene.ts";
import { ViewportCamera } from "../engine/viewport-camera.ts";
import { ViewportControls } from "../ui/ViewportControls.ts";
import { ParameterPanel } from "../ui/ParameterPanel.ts";
import { Stepper } from "../ui/Stepper.ts";
import { ProfileEditor } from "../ui/ProfileEditor.ts";
import { PathEditor } from "../ui/PathEditor.ts";
import { IndexedPolyCurveEditor } from "../ui/IndexedPolyCurveEditor.ts";
import { ExtrusionEditor } from "../ui/ExtrusionEditor.ts";
import { PlacementEditor } from "../ui/PlacementEditor.ts";
import { SweepViewToggles } from "../ui/SweepViewToggles.ts";
import { PolynomialCoefficientEditor } from "../ui/PolynomialCoefficientEditor.ts";
import { buildPlacementAxesOverlay } from "../engine/overlays.ts";

export class ExamplePage {
  private appContainer: HTMLElement;
  private sceneManager: SceneManager | null = null;
  private viewportCamera: ViewportCamera | null = null;
  private viewportControls: ViewportControls | null = null;
  private currentMeshes: Mesh[] = [];
  private currentSample: SampleDef | null = null;
  private currentParams: ParamValues = {};
  private currentStep = 0;
  private currentProfile: IfcProfileDef | undefined = undefined;
  private currentPath: Vec3[] | undefined = undefined;
  private currentIndexedPolyCurve: IfcIndexedPolyCurve | undefined = undefined;
  private currentExtrusion: ExtrusionParams | undefined = undefined;
  private currentPlacement: IfcAxis2Placement3D | undefined = undefined;
  private currentSweepView: SweepViewState | undefined = undefined;
  private currentPolynomialCoefficients: PolynomialCoefficients | undefined =
    undefined;
  private _debounceTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(appContainer: HTMLElement) {
    this.appContainer = appContainer;
  }

  mount(sample: SampleDef) {
    this.currentSample = sample;
    this.currentStep = 0;

    for (const p of sample.parameters) {
      this.currentParams[p.key] = p.defaultValue;
    }

    // Seed the current profile from the config default (if any)
    this.currentProfile = sample.profileEditorConfig?.defaultProfile;

    // Seed path from config default (if any)
    this.currentPath = sample.pathEditorConfig
      ? (JSON.parse(
          JSON.stringify(sample.pathEditorConfig.defaultPath),
        ) as Vec3[])
      : undefined;

    this.currentIndexedPolyCurve = sample.indexedPolyCurveEditorConfig
      ? (JSON.parse(
          JSON.stringify(sample.indexedPolyCurveEditorConfig.defaultCurve),
        ) as IfcIndexedPolyCurve)
      : undefined;

    // Seed extrusion from config default (if any)
    this.currentExtrusion = sample.extrusionEditorConfig
      ? (JSON.parse(
          JSON.stringify(sample.extrusionEditorConfig.defaultExtrusion),
        ) as ExtrusionParams)
      : undefined;

    // Seed placement from config default (if any)
    this.currentPlacement = sample.placementEditorConfig
      ? (JSON.parse(
          JSON.stringify(sample.placementEditorConfig.defaultPlacement),
        ) as IfcAxis2Placement3D)
      : undefined;

    this.currentPolynomialCoefficients = sample.polynomialCoefficientEditorConfig
      ? (JSON.parse(
          JSON.stringify(
            sample.polynomialCoefficientEditorConfig.defaultCoefficients,
          ),
        ) as PolynomialCoefficients)
      : undefined;

    // Seed sweep view state from config defaults (if any)
    this.currentSweepView = sample.sweepViewConfig
      ? {
          showPath: sample.sweepViewConfig.defaults?.showPath ?? true,
          showFrames: sample.sweepViewConfig.defaults?.showFrames ?? false,
          showResult: sample.sweepViewConfig.defaults?.showResult ?? true,
        }
      : undefined;

    const hasProfileEditor = Boolean(sample.profileEditorConfig);
    const hasPathEditor = Boolean(sample.pathEditorConfig);
    const hasIndexedPolyCurveEditor = Boolean(sample.indexedPolyCurveEditorConfig);
    const hasExtrusionEditor = Boolean(sample.extrusionEditorConfig);
    const hasPlacementEditor = Boolean(sample.placementEditorConfig);
    const hasPolynomialCoefficientEditor = Boolean(
      sample.polynomialCoefficientEditorConfig,
    );
    const hasSweepToggles = Boolean(sample.sweepViewConfig);

    this.appContainer.innerHTML = `
      <nav class="nav">
        <a href="#/" class="nav-brand">IFC Geometry Playground</a>
        <span class="nav-sep"> › </span>
        <span class="nav-current">${sample.title}</span>
      </nav>
      <div class="example-page">
        <div class="example-main">
          <div class="left-panel">
            <div class="sample-title">${sample.title}</div>
            <div class="sample-desc">${sample.description}</div>
            ${
              hasProfileEditor
                ? `
              <details class="left-collapsible" open>
                <summary class="params-title">Profile</summary>
                <div class="left-collapsible-content" id="profile-editor-panel"></div>
              </details>
            `
                : ""
            }
            ${
              hasPathEditor
                ? `
              <details class="left-collapsible${hasProfileEditor ? " left-panel-section-mt" : ""}" open>
                <summary class="params-title">${sample.pathEditorConfig!.label ?? "Path"}</summary>
                <div class="left-collapsible-content" id="path-editor-panel"></div>
              </details>
            `
                : ""
            }
            ${
              hasIndexedPolyCurveEditor
                ? `
              <details class="left-collapsible${hasProfileEditor || hasPathEditor ? " left-panel-section-mt" : ""}" open>
                <summary class="params-title">${sample.indexedPolyCurveEditorConfig!.label ?? "Indexed PolyCurve"}</summary>
                <div class="left-collapsible-content" id="indexed-polycurve-editor-panel"></div>
              </details>
            `
                : ""
            }
            ${
              hasExtrusionEditor
                ? `
              <details class="left-collapsible${hasProfileEditor || hasPathEditor || hasIndexedPolyCurveEditor ? " left-panel-section-mt" : ""}" open>
                <summary class="params-title">${sample.extrusionEditorConfig!.label ?? "Extrusion"}</summary>
                <div class="left-collapsible-content" id="extrusion-editor-panel"></div>
              </details>
            `
                : ""
            }
            ${
              hasSweepToggles
                ? `
              <details class="left-collapsible left-panel-section-mt" open>
                <summary class="params-title">View</summary>
                <div class="left-collapsible-content" id="sweep-view-toggles"></div>
              </details>
            `
                : ""
            }
            ${
              sample.parameters.length > 0
                ? `
              <details class="left-collapsible${hasProfileEditor || hasPathEditor || hasIndexedPolyCurveEditor || hasExtrusionEditor || hasSweepToggles ? " left-panel-section-mt" : ""}" open>
                <summary class="params-title">Parameters</summary>
                <div class="left-collapsible-content" id="param-panel"></div>
              </details>
            `
                : ""
            }
            ${
              hasPolynomialCoefficientEditor
                ? `
              <details class="left-collapsible${hasProfileEditor || hasPathEditor || hasIndexedPolyCurveEditor || hasExtrusionEditor || hasSweepToggles || sample.parameters.length > 0 ? " left-panel-section-mt" : ""}" open>
                <summary class="params-title">${sample.polynomialCoefficientEditorConfig!.label ?? "Coefficients"}</summary>
                <div class="left-collapsible-content" id="polynomial-coefficient-editor-panel"></div>
              </details>
            `
                : ""
            }
            ${
              hasPlacementEditor
                ? `
              <details class="left-collapsible${hasProfileEditor || hasPathEditor || hasIndexedPolyCurveEditor || hasExtrusionEditor || hasPolynomialCoefficientEditor || hasSweepToggles || sample.parameters.length > 0 ? " left-panel-section-mt" : ""}">
                <summary class="params-title">${sample.placementEditorConfig!.label ?? "Placement"}</summary>
                <div class="left-collapsible-content" id="placement-editor-panel"></div>
              </details>
            `
                : ""
            }
            <details class="left-collapsible left-panel-steps-title" open>
              <summary class="params-title">Steps</summary>
              <div class="left-collapsible-content" id="stepper"></div>
            </details>
          </div>
          <div class="canvas-container" id="canvas-container">
            <canvas id="renderCanvas"></canvas>
          </div>
        </div>
      </div>
    `;

    const canvas = document.getElementById("renderCanvas") as HTMLCanvasElement;
    this.sceneManager = new SceneManager(canvas);
    this.viewportCamera = new ViewportCamera(this.sceneManager.scene, canvas);
    this.sceneManager.startRenderLoop();

    const canvasContainer = document.getElementById(
      "canvas-container",
    ) as HTMLElement;
    this.viewportControls = new ViewportControls(
      canvasContainer,
      this.viewportCamera,
      () => this.currentMeshes,
    );

    // Profile editor (optional)
    const profileEditorContainer = document.getElementById(
      "profile-editor-panel",
    );
    if (profileEditorContainer && sample.profileEditorConfig) {
      const profileEditor = new ProfileEditor(
        profileEditorContainer,
        sample.profileEditorConfig,
      );
      profileEditor.onChange((profile) => {
        this.currentProfile = profile;
        this._scheduleRebuild(sample.debounceMs ?? 0);
      });
    }

    // Path editor (optional)
    const pathEditorContainer = document.getElementById("path-editor-panel");
    if (pathEditorContainer && sample.pathEditorConfig) {
      const pathEditor = new PathEditor(
        pathEditorContainer,
        sample.pathEditorConfig,
      );
      pathEditor.onChange((path) => {
        this.currentPath = path;
        this._scheduleRebuild(sample.debounceMs ?? 0);
      });
    }

    const indexedPolyCurveEditorContainer = document.getElementById(
      "indexed-polycurve-editor-panel",
    );
    if (
      indexedPolyCurveEditorContainer &&
      sample.indexedPolyCurveEditorConfig
    ) {
      const indexedPolyCurveEditor = new IndexedPolyCurveEditor(
        indexedPolyCurveEditorContainer,
        sample.indexedPolyCurveEditorConfig,
      );
      indexedPolyCurveEditor.onChange((curve) => {
        this.currentIndexedPolyCurve = curve;
        this._scheduleRebuild(sample.debounceMs ?? 0);
      });
    }

    // Extrusion editor (optional)
    const extrusionEditorContainer = document.getElementById(
      "extrusion-editor-panel",
    );
    if (extrusionEditorContainer && sample.extrusionEditorConfig) {
      const extrusionEditor = new ExtrusionEditor(
        extrusionEditorContainer,
        sample.extrusionEditorConfig,
      );
      extrusionEditor.onChange((extrusion) => {
        this.currentExtrusion = extrusion;
        this._scheduleRebuild(sample.debounceMs ?? 0);
      });
    }

    // Placement editor (optional)
    const placementEditorContainer = document.getElementById(
      "placement-editor-panel",
    );
    if (placementEditorContainer && sample.placementEditorConfig) {
      const placementEditor = new PlacementEditor(
        placementEditorContainer,
        sample.placementEditorConfig,
      );
      placementEditor.onChange((placement) => {
        this.currentPlacement = placement;
        this._scheduleRebuild(sample.debounceMs ?? 0);
      });
    }

    // Sweep view toggles (optional)
    const sweepToggleContainer = document.getElementById("sweep-view-toggles");
    if (sweepToggleContainer && sample.sweepViewConfig) {
      const sweepToggles = new SweepViewToggles(
        sweepToggleContainer,
        sample.sweepViewConfig,
      );
      sweepToggles.onChange((state) => {
        this.currentSweepView = state;
        this._scheduleRebuild(0);
      });
    }

    // Parameter panel (optional – only rendered when there are params)
    const paramContainer = document.getElementById("param-panel");
    if (paramContainer && sample.parameters.length > 0) {
      const paramPanel = new ParameterPanel(paramContainer, sample);
      paramPanel.onChange((values) => {
        this.currentParams = values;
        this._scheduleRebuild(sample.debounceMs ?? 0);
      });
    }

    const polynomialCoefficientEditorContainer = document.getElementById(
      "polynomial-coefficient-editor-panel",
    );
    if (
      polynomialCoefficientEditorContainer &&
      sample.polynomialCoefficientEditorConfig
    ) {
      const coefficientEditor = new PolynomialCoefficientEditor(
        polynomialCoefficientEditorContainer,
        sample.polynomialCoefficientEditorConfig,
      );
      coefficientEditor.onChange((coefficients) => {
        this.currentPolynomialCoefficients = coefficients;
        this._scheduleRebuild(sample.debounceMs ?? 0);
      });
    }

    const stepperContainer = document.getElementById("stepper")!;
    const stepper = new Stepper(stepperContainer, sample.steps);

    this._rebuildGeometry();

    stepper.onStepChange((index) => {
      this.currentStep = index;
      this._scheduleRebuild(0);
    });
  }

  private _scheduleRebuild(debounceMs: number) {
    if (this._debounceTimer !== null) {
      clearTimeout(this._debounceTimer);
      this._debounceTimer = null;
    }
    if (debounceMs <= 0) {
      this._rebuildGeometry();
    } else {
      this._debounceTimer = setTimeout(() => {
        this._debounceTimer = null;
        this._rebuildGeometry();
      }, debounceMs);
    }
  }

  private _rebuildGeometry() {
    if (!this.sceneManager || !this.currentSample) return;

    for (const mesh of this.currentMeshes) {
      mesh.dispose();
    }
    this.currentMeshes = [];

    this.currentMeshes = this.currentSample.buildGeometry(
      this.sceneManager.scene,
      this.currentParams,
      this.currentStep,
      this.currentProfile,
      this.currentPath,
      this.currentExtrusion,
      this.currentPlacement,
      this.currentSweepView,
      this.currentIndexedPolyCurve,
      this.currentPolynomialCoefficients,
    );

    // Show local coordinate axes when a placement editor is active
    if (this.currentPlacement) {
      this.currentMeshes.push(
        ...buildPlacementAxesOverlay(
          this.sceneManager.scene,
          this.currentPlacement,
        ),
      );
    }
  }

  unmount() {
    if (this._debounceTimer !== null) {
      clearTimeout(this._debounceTimer);
      this._debounceTimer = null;
    }
    for (const mesh of this.currentMeshes) {
      mesh.dispose();
    }
    this.currentMeshes = [];
    // Dispose controls before camera since controls hold a reference to the camera
    this.viewportControls?.dispose();
    this.viewportControls = null;
    this.viewportCamera?.dispose();
    this.viewportCamera = null;
    if (this.sceneManager) {
      this.sceneManager.dispose();
      this.sceneManager = null;
    }
  }
}
