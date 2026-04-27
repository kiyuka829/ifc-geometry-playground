import { createTrimmedConicSample } from "./curve.trimmed.shared.ts";

export const curveTrimmedEllipseSample = createTrimmedConicSample({
  id: "curve-trimmed-ellipse",
  title: "Trimmed Ellipse (IfcTrimmedCurve + IfcEllipse)",
  description:
    "Build an elliptical arc by trimming an IfcEllipse basis curve with parameter-based trim selectors.",
  basis: "ellipse",
});
