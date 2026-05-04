import type { IfcCartesianPoint, IfcTrimmedCurve } from "../generated/schema.ts";
import type { ResolvedCurveSegment } from "./curve-types.ts";
import { resolveConicCurveSegment } from "./curve-conic.ts";
import { cartesianPointToVec3, resolveLineCurveSegment } from "./curve-line.ts";

function isCartesianPoint(value: unknown): value is IfcCartesianPoint {
  return Boolean(
    value &&
      typeof value === "object" &&
      "type" in value &&
      value.type === "IfcCartesianPoint",
  );
}

function getTrimParameter(trim: IfcTrimmedCurve["trim1"]): number | undefined {
  return trim.find((value): value is number => typeof value === "number");
}

function getTrimPoint(
  trim: IfcTrimmedCurve["trim1"],
): IfcCartesianPoint | undefined {
  return trim.find(isCartesianPoint);
}

function getPreferredTrimValue(
  trim: IfcTrimmedCurve["trim1"],
  masterRepresentation: IfcTrimmedCurve["masterRepresentation"],
): number | IfcCartesianPoint | undefined {
  const parameterValue = getTrimParameter(trim);
  const cartesianValue = getTrimPoint(trim);
  if (masterRepresentation === "CARTESIAN") {
    return cartesianValue ?? parameterValue;
  }
  return parameterValue ?? cartesianValue;
}

function resolveLineTrimmedCurveSegment(
  curve: IfcTrimmedCurve,
): ResolvedCurveSegment {
  if (curve.basisCurve.type !== "IfcLine") {
    throw new Error(`Expected IfcLine basis, got ${curve.basisCurve.type}`);
  }

  const { trim1, trim2, senseAgreement, masterRepresentation } = curve;
  const startValue = getPreferredTrimValue(trim1, masterRepresentation);
  const endValue = getPreferredTrimValue(trim2, masterRepresentation);

  if (typeof startValue === "number" && typeof endValue === "number") {
    return resolveLineCurveSegment(curve.basisCurve, {
      startParameter: startValue,
      endParameter: endValue,
      senseAgreement,
    });
  }

  if (isCartesianPoint(startValue) && isCartesianPoint(endValue)) {
    const points = [
      cartesianPointToVec3(startValue),
      cartesianPointToVec3(endValue),
    ];
    return {
      kind: "line",
      points: senseAgreement ? points : points.reverse(),
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
