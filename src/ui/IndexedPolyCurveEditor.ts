import type { IndexedPolyCurveEditorConfig, Vec3 } from "../types.ts";
import type {
  IfcArcIndex,
  IfcIndexedPolyCurve,
  IfcLineIndex,
  IfcSegmentIndexSelect,
} from "../ifc/generated/schema.ts";

const DEFAULT_COORD_STEP = 0.5;

function cloneSegment(segment: IfcSegmentIndexSelect): IfcSegmentIndexSelect {
  return segment.type === "IfcArcIndex"
    ? { type: "IfcArcIndex", indices: [...segment.indices] }
    : { type: "IfcLineIndex", indices: [...segment.indices] };
}

function cloneCurve(curve: IfcIndexedPolyCurve): IfcIndexedPolyCurve {
  return {
    type: "IfcIndexedPolyCurve",
    points: {
      type: curve.points.type,
      coordList: curve.points.coordList.map((coords) => [...coords]),
      tagList: curve.points.tagList ? [...curve.points.tagList] : undefined,
    },
    segments: curve.segments?.map(cloneSegment),
    selfIntersect: curve.selfIntersect,
  };
}

function coordToVec3(coords: number[], is3D: boolean): Vec3 {
  return {
    x: coords[0] ?? 0,
    y: coords[1] ?? 0,
    z: is3D ? (coords[2] ?? 0) : 0,
  };
}

function vec3ToCoords(point: Vec3, is3D: boolean): number[] {
  return is3D ? [point.x, point.y, point.z] : [point.x, point.y];
}

function clampIndex(index: number, pointCount: number): number {
  if (pointCount <= 0) return 1;
  return Math.min(Math.max(Math.round(index), 1), pointCount);
}

function normalizeSegment(
  segment: IfcSegmentIndexSelect,
  pointCount: number,
): IfcSegmentIndexSelect {
  if (segment.type === "IfcArcIndex") {
    const indices = [0, 1, 2].map((offset) =>
      clampIndex(segment.indices[offset] ?? offset + 1, pointCount),
    ) as [number, number, number];
    return { type: "IfcArcIndex", indices };
  }

  const source =
    segment.indices.length >= 2 ? segment.indices : [1, Math.min(2, pointCount)];
  const indices = source.map((index) => clampIndex(index, pointCount)) as [
    number,
    number,
    ...number[],
  ];
  return { type: "IfcLineIndex", indices };
}

function makeDefaultSegment(pointCount: number): IfcLineIndex {
  const end = Math.max(2, pointCount);
  return {
    type: "IfcLineIndex",
    indices: [Math.max(1, end - 1), end],
  };
}

export class IndexedPolyCurveEditor {
  private container: HTMLElement;
  private curve: IfcIndexedPolyCurve;
  private changeCallbacks: Array<(curve: IfcIndexedPolyCurve) => void> = [];

  constructor(container: HTMLElement, config: IndexedPolyCurveEditorConfig) {
    this.container = container;
    this.curve = cloneCurve(config.defaultCurve);
    this._normalizeSegments();
    this._render();
  }

  getCurve(): IfcIndexedPolyCurve {
    return cloneCurve(this.curve);
  }

  onChange(callback: (curve: IfcIndexedPolyCurve) => void): void {
    this.changeCallbacks.push(callback);
  }

  private get is3D(): boolean {
    return this.curve.points.type === "IfcCartesianPointList3D";
  }

  private get points(): Vec3[] {
    return this.curve.points.coordList.map((coords) =>
      coordToVec3(coords, this.is3D),
    );
  }

  private _setPoints(points: Vec3[]): void {
    this.curve.points.coordList = points.map((point) =>
      vec3ToCoords(point, this.is3D),
    );
    this._normalizeSegments();
  }

  private _normalizeSegments(): void {
    const pointCount = this.curve.points.coordList.length;
    this.curve.segments = (this.curve.segments ?? [makeDefaultSegment(pointCount)])
      .map((segment) => normalizeSegment(segment, pointCount));
  }

  private _notify(): void {
    const copy = this.getCurve();
    for (const cb of this.changeCallbacks) cb(copy);
  }

  private _render(): void {
    this.container.innerHTML = "";

    const wrapper = document.createElement("div");
    wrapper.className = "indexed-polycurve-editor";

    const pointsSection = document.createElement("div");
    pointsSection.className = "indexed-polycurve-section";
    pointsSection.appendChild(this._buildSectionTitle("Points"));
    pointsSection.appendChild(this._buildPointsList());
    pointsSection.appendChild(this._buildAddPointButton());
    wrapper.appendChild(pointsSection);

    const segmentsSection = document.createElement("div");
    segmentsSection.className = "indexed-polycurve-section";
    segmentsSection.appendChild(this._buildSectionTitle("Segments"));
    segmentsSection.appendChild(this._buildSegmentsList());
    segmentsSection.appendChild(this._buildAddSegmentButton());
    wrapper.appendChild(segmentsSection);

    this.container.appendChild(wrapper);
  }

  private _buildSectionTitle(label: string): HTMLElement {
    const title = document.createElement("div");
    title.className = "indexed-polycurve-section-title";
    title.textContent = label;
    return title;
  }

  private _buildPointsList(): HTMLElement {
    const list = document.createElement("div");
    list.className = "indexed-polycurve-points-list";
    this.points.forEach((point, index) => {
      list.appendChild(this._buildPointRow(point, index));
    });
    return list;
  }

  private _buildPointRow(point: Vec3, index: number): HTMLElement {
    const row = document.createElement("div");
    row.className = "path-point-row";

    const idx = document.createElement("span");
    idx.className = "point-index";
    idx.textContent = `P${index + 1}`;
    row.appendChild(idx);

    const coords: Array<{ label: string; axis: keyof Vec3 }> = [
      { label: "x", axis: "x" },
      { label: "y", axis: "y" },
      { label: "z", axis: "z" },
    ];

    for (const { label, axis } of coords) {
      if (!this.is3D && axis === "z") continue;

      const coordLabel = document.createElement("span");
      coordLabel.className = "point-coord-label";
      coordLabel.textContent = label;
      row.appendChild(coordLabel);

      const input = document.createElement("input");
      input.type = "number";
      input.className = "point-coord-input";
      input.value = String(point[axis]);
      input.step = String(DEFAULT_COORD_STEP);
      input.addEventListener("input", () => {
        const parsed = Number(input.value);
        if (!Number.isFinite(parsed)) return;

        const points = this.points;
        points[index] = { ...points[index], [axis]: parsed };
        this._setPoints(points);
        this._notify();
      });
      row.appendChild(input);
    }

    if (this.curve.points.coordList.length > 2) {
      const del = document.createElement("button");
      del.className = "point-delete-btn";
      del.title = "Remove point";
      del.textContent = "x";
      del.addEventListener("click", () => {
        this._deletePoint(index);
      });
      row.appendChild(del);
    } else {
      const placeholder = document.createElement("span");
      placeholder.className = "point-delete-placeholder";
      row.appendChild(placeholder);
    }

    return row;
  }

  private _buildAddPointButton(): HTMLElement {
    const addBtn = document.createElement("button");
    addBtn.className = "path-add-point-btn";
    addBtn.textContent = "+ Add point";
    addBtn.addEventListener("click", () => {
      const points = this.points;
      const last = points.at(-1) ?? { x: 0, y: 0, z: 0 };
      points.push({ x: last.x + 1, y: last.y, z: last.z });
      this._setPoints(points);
      this._refreshAndNotify();
    });
    return addBtn;
  }

  private _deletePoint(index: number): void {
    const removedIfcIndex = index + 1;
    const points = this.points;
    points.splice(index, 1);
    this.curve.points.coordList = points.map((point) =>
      vec3ToCoords(point, this.is3D),
    );

    this.curve.segments = (this.curve.segments ?? []).map((segment) => {
      const indices = segment.indices.map((ifcIndex) => {
        if (ifcIndex > removedIfcIndex) return ifcIndex - 1;
        if (ifcIndex === removedIfcIndex) return Math.min(ifcIndex, points.length);
        return ifcIndex;
      });
      return normalizeSegment(
        { type: segment.type, indices } as IfcSegmentIndexSelect,
        points.length,
      );
    });
    this._refreshAndNotify();
  }

  private _buildSegmentsList(): HTMLElement {
    const list = document.createElement("div");
    list.className = "indexed-polycurve-segments-list";
    (this.curve.segments ?? []).forEach((segment, index) => {
      list.appendChild(this._buildSegmentRow(segment, index));
    });
    return list;
  }

  private _buildSegmentRow(
    segment: IfcSegmentIndexSelect,
    segmentIndex: number,
  ): HTMLElement {
    const row = document.createElement("div");
    row.className = "indexed-segment-row";

    const label = document.createElement("span");
    label.className = "indexed-segment-label";
    label.textContent = `S${segmentIndex + 1}`;
    row.appendChild(label);

    const typeSelect = document.createElement("select");
    typeSelect.className = "indexed-segment-type";
    typeSelect.value = segment.type;
    for (const option of [
      { value: "IfcLineIndex", label: "Line" },
      { value: "IfcArcIndex", label: "Arc" },
    ]) {
      const optionElement = document.createElement("option");
      optionElement.value = option.value;
      optionElement.textContent = option.label;
      typeSelect.appendChild(optionElement);
    }
    typeSelect.addEventListener("change", () => {
      this._setSegmentType(
        segmentIndex,
        typeSelect.value === "IfcArcIndex" ? "IfcArcIndex" : "IfcLineIndex",
      );
    });
    row.appendChild(typeSelect);

    const indexList = document.createElement("div");
    indexList.className = "indexed-segment-indices";
    segment.indices.forEach((ifcIndex, indexIndex) => {
      indexList.appendChild(
        this._buildSegmentIndexInput(segmentIndex, indexIndex, ifcIndex),
      );
    });
    row.appendChild(indexList);

    if (segment.type === "IfcLineIndex") {
      const addIndex = document.createElement("button");
      addIndex.className = "indexed-segment-mini-btn";
      addIndex.title = "Add line index";
      addIndex.textContent = "+";
      addIndex.addEventListener("click", () => {
        const pointCount = this.curve.points.coordList.length;
        const last = segment.indices.at(-1) ?? 1;
        const nextIndex = clampIndex(last + 1, pointCount);
        segment.indices.push(nextIndex);
        this._refreshAndNotify();
      });
      row.appendChild(addIndex);
    } else {
      const placeholder = document.createElement("span");
      placeholder.className = "point-delete-placeholder";
      row.appendChild(placeholder);
    }

    if ((this.curve.segments ?? []).length > 1) {
      const del = document.createElement("button");
      del.className = "point-delete-btn";
      del.title = "Remove segment";
      del.textContent = "x";
      del.addEventListener("click", () => {
        this.curve.segments?.splice(segmentIndex, 1);
        this._refreshAndNotify();
      });
      row.appendChild(del);
    } else {
      const placeholder = document.createElement("span");
      placeholder.className = "point-delete-placeholder";
      row.appendChild(placeholder);
    }

    return row;
  }

  private _buildSegmentIndexInput(
    segmentIndex: number,
    indexIndex: number,
    ifcIndex: number,
  ): HTMLElement {
    const wrap = document.createElement("span");
    wrap.className = "indexed-segment-index-wrap";

    const input = document.createElement("input");
    input.type = "number";
    input.min = "1";
    input.max = String(this.curve.points.coordList.length);
    input.step = "1";
    input.className = "indexed-segment-index-input";
    input.value = String(ifcIndex);
    input.addEventListener("input", () => {
      const parsed = Number(input.value);
      if (!Number.isFinite(parsed)) return;

      const segment = this.curve.segments?.[segmentIndex];
      if (!segment) return;
      segment.indices[indexIndex] = clampIndex(
        parsed,
        this.curve.points.coordList.length,
      );
      this._normalizeSegments();
      this._notify();
    });
    wrap.appendChild(input);

    const segment = this.curve.segments?.[segmentIndex];
    if (segment?.type === "IfcLineIndex" && segment.indices.length > 2) {
      const remove = document.createElement("button");
      remove.className = "indexed-segment-index-remove";
      remove.title = "Remove line index";
      remove.textContent = "x";
      remove.addEventListener("click", () => {
        segment.indices.splice(indexIndex, 1);
        this._refreshAndNotify();
      });
      wrap.appendChild(remove);
    }

    return wrap;
  }

  private _buildAddSegmentButton(): HTMLElement {
    const addBtn = document.createElement("button");
    addBtn.className = "path-add-point-btn";
    addBtn.textContent = "+ Add segment";
    addBtn.addEventListener("click", () => {
      const segments = this.curve.segments ?? [];
      segments.push(makeDefaultSegment(this.curve.points.coordList.length));
      this.curve.segments = segments;
      this._refreshAndNotify();
    });
    return addBtn;
  }

  private _setSegmentType(
    segmentIndex: number,
    type: IfcArcIndex["type"] | IfcLineIndex["type"],
  ): void {
    const segment = this.curve.segments?.[segmentIndex];
    if (!segment) return;

    const pointCount = this.curve.points.coordList.length;
    if (type === "IfcArcIndex") {
      const indices = [0, 1, 2].map((offset) =>
        clampIndex(segment.indices[offset] ?? offset + 1, pointCount),
      ) as [number, number, number];
      this.curve.segments![segmentIndex] = { type: "IfcArcIndex", indices };
    } else {
      this.curve.segments![segmentIndex] = normalizeSegment(
        { type: "IfcLineIndex", indices: [...segment.indices] },
        pointCount,
      );
    }

    this._refreshAndNotify();
  }

  private _refreshAndNotify(): void {
    this._normalizeSegments();
    this._render();
    this._notify();
  }
}
