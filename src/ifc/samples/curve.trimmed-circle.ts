import { createTrimmedConicSample } from "./curve.trimmed.shared.ts";

export const curveTrimmedCircleSample = createTrimmedConicSample({
  id: "curve-trimmed-circle",
  title: "Trimmed Circle (IfcTrimmedCurve + IfcCircle)",
  description:
    "Build a circular arc by trimming an IfcCircle basis curve with parameter-based trim selectors.",
  basis: "circle",
});
