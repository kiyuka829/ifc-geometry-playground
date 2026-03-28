import type { Mesh } from "@babylonjs/core";
import type {
  SampleDef,
  ParamValues,
  IfcProfileDef,
  IfcAxis2Placement3D,
  Vec3,
  SweepViewState,
} from "../types.ts";
import { SceneManager } from "../engine/scene.ts";
import { ViewportCamera } from "../engine/viewport-camera.ts";
import { ViewportControls } from "../ui/ViewportControls.ts";
import { ParameterPanel } from "../ui/ParameterPanel.ts";
import { Stepper } from "../ui/Stepper.ts";
import { ProfileEditor } from "../ui/ProfileEditor.ts";
import { PathEditor } from "../ui/PathEditor.ts";
import { PlacementEditor } from "../ui/PlacementEditor.ts";
import { SweepViewToggles } from "../ui/SweepViewToggles.ts";

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
  private currentPlacement: IfcAxis2Placement3D | undefined = undefined;
  private currentSweepView: SweepViewState | undefined = undefined;
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

    // Seed placement from config default (if any)
    this.currentPlacement = sample.placementEditorConfig
      ? (JSON.parse(
          JSON.stringify(sample.placementEditorConfig.defaultPlacement),
        ) as IfcAxis2Placement3D)
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
    const hasPlacementEditor = Boolean(sample.placementEditorConfig);
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
              <div class="params-title">Profile</div>
              <div id="profile-editor-panel"></div>
            `
                : ""
            }
            ${
              hasPathEditor
                ? `
              <div class="params-title${hasProfileEditor ? " left-panel-section-mt" : ""}">
                ${sample.pathEditorConfig!.label ?? "Path"}
              </div>
              <div id="path-editor-panel"></div>
            `
                : ""
            }
            ${
              hasPlacementEditor
                ? `
              <div class="params-title${hasProfileEditor || hasPathEditor ? " left-panel-section-mt" : ""}">
                ${sample.placementEditorConfig!.label ?? "Placement"}
              </div>
              <div id="placement-editor-panel"></div>
            `
                : ""
            }
            ${
              hasSweepToggles
                ? `
              <div class="params-title left-panel-section-mt">View</div>
              <div id="sweep-view-toggles"></div>
            `
                : ""
            }
            ${
              sample.parameters.length > 0
                ? `
              <div class="params-title${hasProfileEditor || hasPathEditor || hasPlacementEditor || hasSweepToggles ? " left-panel-section-mt" : ""}">Parameters</div>
              <div id="param-panel"></div>
            `
                : ""
            }
            <div class="params-title left-panel-steps-title">Steps</div>
            <div id="stepper"></div>
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
      this.currentPlacement,
      this.currentSweepView,
    );
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
