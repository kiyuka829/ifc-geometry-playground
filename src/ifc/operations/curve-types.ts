import type { Vec3 } from "../../types.ts";

export type CurveSegmentKind = "line" | "arc" | "curve";
export type IndexedPolyCurveSegmentKind = "line" | "arc";

export interface ResolvedCurveSegment {
  kind: CurveSegmentKind;
  points: Vec3[];
}

export interface IndexedPolyCurveResolvedSegment
  extends ResolvedCurveSegment {
  kind: IndexedPolyCurveSegmentKind;
  indices: number[];
}
