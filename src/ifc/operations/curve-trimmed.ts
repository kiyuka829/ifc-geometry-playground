import type { IfcTrimmedCurve } from "../generated/schema.ts";
import type { ResolvedCurveSegment } from "./curve-types.ts";
import { resolveConicCurveSegment } from "./curve-conic.ts";

export function resolveTrimmedCurveSegments(
  curve: IfcTrimmedCurve,
): ResolvedCurveSegment[] {
  switch (curve.basisCurve.type) {
    case "IfcCircle":
    case "IfcEllipse":
      return [resolveConicCurveSegment(curve.basisCurve, curve)];
    default:
      throw new Error(
        `IfcTrimmedCurve basis ${curve.basisCurve.type} is not supported yet`,
      );
  }
}
