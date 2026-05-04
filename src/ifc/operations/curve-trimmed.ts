import type { IfcCartesianPoint, IfcTrimmedCurve } from "../generated/schema.ts";
import type { ResolvedCurveSegment } from "./curve-types.ts";
import { resolveConicCurveSegment } from "./curve-conic.ts";
import { resolveLineCurveSegment } from "./curve-line.ts";

function isCartesianPoint(value: unknown): value is IfcCartesianPoint {
  return Boolean(
    value &&
      typeof value === "object" &&
      "type" in value &&
      value.type === "IfcCartesianPoint",
  );
}

function cartesianPointToVec3(point: IfcCartesianPoint) {
  return {
    x: point.coordinates[0] ?? 0,
    y: point.coordinates[1] ?? 0,
    z: point.coordinates[2] ?? 0,
  };
}

function getTrimParameter(trim: IfcTrimmedCurve["trim1"]): number | undefined {
  return trim.find((value): value is number => typeof value === "number");
}

function getTrimPoint(
  trim: IfcTrimmedCurve["trim1"],
): IfcCartesianPoint | undefined {
  return trim.find(isCartesianPoint);
}

function resolveLineTrimmedCurveSegment(
  curve: IfcTrimmedCurve,
): ResolvedCurveSegment {
  if (curve.basisCurve.type !== "IfcLine") {
    throw new Error(`Expected IfcLine basis, got ${curve.basisCurve.type}`);
  }

  const startParameter = getTrimParameter(curve.trim1);
  const endParameter = getTrimParameter(curve.trim2);

  if (startParameter !== undefined && endParameter !== undefined) {
    return resolveLineCurveSegment(curve.basisCurve, {
      startParameter,
      endParameter,
      senseAgreement: curve.senseAgreement,
    });
  }

  const startPoint = getTrimPoint(curve.trim1);
  const endPoint = getTrimPoint(curve.trim2);

  if (startPoint && endPoint) {
    const points = [
      cartesianPointToVec3(startPoint),
      cartesianPointToVec3(endPoint),
    ];

    return {
      kind: "line",
      points: curve.senseAgreement ? points : points.reverse(),
    };
  }

  throw new Error(
    "IfcTrimmedCurve + IfcLine requires numeric parameter trims or cartesian point trims",
  );
}

export function resolveTrimmedCurveSegments(
  curve: IfcTrimmedCurve,
): ResolvedCurveSegment[] {
  switch (curve.basisCurve.type) {
    case "IfcCircle":
    case "IfcEllipse":
      return [resolveConicCurveSegment(curve.basisCurve, curve)];
    case "IfcLine":
      return [resolveLineTrimmedCurveSegment(curve)];
    default:
      throw new Error(
        `IfcTrimmedCurve basis ${curve.basisCurve.type} is not supported yet`,
      );
  }
}
