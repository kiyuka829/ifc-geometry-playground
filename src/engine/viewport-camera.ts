import { ArcRotateCamera, Camera, Vector3 } from "@babylonjs/core";
import type {
  Scene,
  AbstractMesh,
  Observer,
  AbstractEngine,
} from "@babylonjs/core";

export type ProjectionMode = "perspective" | "orthographic";
export type AxisView = "+x" | "-x" | "+y" | "-y" | "+z" | "-z";

// ArcRotateCamera position formula:
//   x = target.x + radius * cos(alpha) * sin(beta)
//   y = target.y + radius * cos(beta)
//   z = target.z + radius * sin(alpha) * sin(beta)

// A small offset from the exact pole (beta = 0 / π) to avoid gimbal lock
// in the camera's up-vector calculation for top/bottom views.
const GIMBAL_EPSILON = 0.01;

const AXIS_ANGLES: Record<AxisView, { alpha: number; beta: number }> = {
  "+x": { alpha: 0, beta: Math.PI / 2 },
  "-x": { alpha: Math.PI, beta: Math.PI / 2 },
  "+y": { alpha: 0, beta: GIMBAL_EPSILON },
  "-y": { alpha: 0, beta: Math.PI - GIMBAL_EPSILON },
  "+z": { alpha: Math.PI / 2, beta: Math.PI / 2 },
  "-z": { alpha: -Math.PI / 2, beta: Math.PI / 2 },
};

export class ViewportCamera {
  readonly camera: ArcRotateCamera;

  private _mode: ProjectionMode = "perspective";
  private _scene: Scene;
  private _modeCallbacks: Array<(mode: ProjectionMode) => void> = [];
  // Stored so they can be removed in dispose()
  private _viewMatrixObserver: Observer<Camera> | null = null;
  private _resizeObserver: Observer<AbstractEngine> | null = null;

  constructor(scene: Scene, canvas: HTMLCanvasElement) {
    this._scene = scene;
    this.camera = new ArcRotateCamera(
      "camera",
      -Math.PI / 4,
      Math.PI / 3,
      10,
      Vector3.Zero(),
      scene,
    );
    this.camera.attachControl(canvas, true);
    this.camera.lowerRadiusLimit = 2;
    this.camera.upperRadiusLimit = 50;

    // Keep ortho bounds synchronised with the current radius and viewport size
    this._viewMatrixObserver = this.camera.onViewMatrixChangedObservable.add(
      () => {
        if (this._mode === "orthographic") {
          this._syncOrthoBounds();
        }
      },
    );
    this._resizeObserver = scene.getEngine().onResizeObservable.add(() => {
      if (this._mode === "orthographic") {
        this._syncOrthoBounds();
      }
    });
  }

  get mode(): ProjectionMode {
    return this._mode;
  }

  setPerspective(): void {
    if (this._mode === "perspective") return;
    this._mode = "perspective";
    this.camera.mode = Camera.PERSPECTIVE_CAMERA;
    this._notifyMode();
  }

  setOrthographic(): void {
    if (this._mode === "orthographic") return;
    this._mode = "orthographic";
    this._syncOrthoBounds();
    this.camera.mode = Camera.ORTHOGRAPHIC_CAMERA;
    this._notifyMode();
  }

  toggleProjection(): void {
    if (this._mode === "perspective") {
      this.setOrthographic();
    } else {
      this.setPerspective();
    }
  }

  snapToView(dir: AxisView): void {
    const { alpha, beta } = AXIS_ANGLES[dir];
    this.camera.alpha = alpha;
    this.camera.beta = beta;
  }

  /**
   * Adjust the camera target and radius so that the given meshes are
   * comfortably framed in the current viewport.
   */
  fitToMeshes(meshes: AbstractMesh[]): void {
    const visible = meshes.filter(
      (m) => m.isEnabled() && m.getTotalVertices() > 0,
    );
    if (visible.length === 0) return;

    let minX = Infinity,
      minY = Infinity,
      minZ = Infinity;
    let maxX = -Infinity,
      maxY = -Infinity,
      maxZ = -Infinity;

    for (const mesh of visible) {
      mesh.computeWorldMatrix(true);
      const { minimumWorld: wMin, maximumWorld: wMax } =
        mesh.getBoundingInfo().boundingBox;
      if (wMin.x < minX) minX = wMin.x;
      if (wMin.y < minY) minY = wMin.y;
      if (wMin.z < minZ) minZ = wMin.z;
      if (wMax.x > maxX) maxX = wMax.x;
      if (wMax.y > maxY) maxY = wMax.y;
      if (wMax.z > maxZ) maxZ = wMax.z;
    }

    const center = new Vector3(
      (minX + maxX) / 2,
      (minY + maxY) / 2,
      (minZ + maxZ) / 2,
    );
    const diag = Math.sqrt(
      (maxX - minX) ** 2 + (maxY - minY) ** 2 + (maxZ - minZ) ** 2,
    );
    const sphereRadius = Math.max(diag * 0.5, 0.1);
    const minFov = this._getMinFovRadians();
    const baseRadius = sphereRadius / Math.sin(minFov / 2);
    const newRadius = Math.max(baseRadius * 1.15, 3);
    const lo = this.camera.lowerRadiusLimit ?? 2;
    const hi = this.camera.upperRadiusLimit ?? 50;

    this.camera.target = center;
    this.camera.radius = Math.min(Math.max(newRadius, lo), hi);

    if (this._mode === "orthographic") {
      this._syncOrthoBounds();
    }
  }

  /**
   * Register a callback to be notified when the projection mode changes.
   * Returns an unsubscribe function to deregister the callback.
   */
  onModeChange(callback: (mode: ProjectionMode) => void): () => void {
    this._modeCallbacks.push(callback);
    let active = true;
    return () => {
      if (!active) return;
      active = false;
      const idx = this._modeCallbacks.indexOf(callback);
      if (idx !== -1) this._modeCallbacks.splice(idx, 1);
    };
  }

  dispose(): void {
    // Remove engine/camera observers before disposing to prevent retention
    if (this._viewMatrixObserver !== null) {
      this.camera.onViewMatrixChangedObservable.remove(
        this._viewMatrixObserver,
      );
      this._viewMatrixObserver = null;
    }
    if (this._resizeObserver !== null) {
      this._scene.getEngine().onResizeObservable.remove(this._resizeObserver);
      this._resizeObserver = null;
    }
    this._modeCallbacks.length = 0;
    this.camera.dispose();
  }

  private _syncOrthoBounds(): void {
    const engine = this._scene.getEngine();
    const w = engine.getRenderWidth();
    const h = engine.getRenderHeight();
    const aspect = h > 0 ? w / h : 1;
    const halfH =
      this.camera.radius * Math.tan(this._getVerticalFovRadians() / 2);
    const halfW = halfH * aspect;
    this.camera.orthoLeft = -halfW;
    this.camera.orthoRight = halfW;
    this.camera.orthoTop = halfH;
    this.camera.orthoBottom = -halfH;
  }

  private _getVerticalFovRadians(): number {
    const fov = this.camera.fov;
    if (this.camera.fovMode !== Camera.FOVMODE_HORIZONTAL_FIXED) {
      return fov;
    }

    const engine = this._scene.getEngine();
    const w = engine.getRenderWidth();
    const h = engine.getRenderHeight();
    if (w <= 0 || h <= 0) {
      return fov;
    }

    const aspect = w / h;
    return 2 * Math.atan(Math.tan(fov / 2) / aspect);
  }

  private _getMinFovRadians(): number {
    const verticalFov = this._getVerticalFovRadians();
    const engine = this._scene.getEngine();
    const w = engine.getRenderWidth();
    const h = engine.getRenderHeight();
    if (w <= 0 || h <= 0) {
      return verticalFov;
    }

    const aspect = w / h;
    const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * aspect);
    return Math.min(verticalFov, horizontalFov);
  }

  private _notifyMode(): void {
    for (const cb of this._modeCallbacks) cb(this._mode);
  }
}
