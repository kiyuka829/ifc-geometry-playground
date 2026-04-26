import { routes } from "./routes.ts";
import { HomePage } from "../pages/HomePage.ts";
import { ExamplePage } from "../pages/ExamplePage.ts";
import { extrusionRectangleSample } from "../ifc/samples/extrusion.rectangle.ts";
import { extrusionRoundedRectangleSample } from "../ifc/samples/extrusion.rounded-rectangle.ts";
import { booleanDifferenceSample } from "../ifc/samples/boolean.difference.ts";
import { extrusionCircleSample } from "../ifc/samples/extrusion.circle.ts";
import { extrusionEllipseSample } from "../ifc/samples/extrusion.ellipse.ts";
import { extrusionRectHollowSample } from "../ifc/samples/extrusion.rect-hollow.ts";
import { extrusionCircleHollowSample } from "../ifc/samples/extrusion.circle-hollow.ts";
import { extrusionCShapeSample } from "../ifc/samples/extrusion.c-shape.ts";
import { extrusionAsymmetricIShapeSample } from "../ifc/samples/extrusion.asymmetric-i-shape.ts";
import { extrusionIShapeSample } from "../ifc/samples/extrusion.i-shape.ts";
import { extrusionLShapeSample } from "../ifc/samples/extrusion.l-shape.ts";
import { extrusionTShapeSample } from "../ifc/samples/extrusion.t-shape.ts";
import { extrusionUShapeSample } from "../ifc/samples/extrusion.u-shape.ts";
import { extrusionZShapeSample } from "../ifc/samples/extrusion.z-shape.ts";
import { sweptDiskBasicSample } from "../ifc/samples/swept-disk.basic.ts";
import { revolvedRectangleSample } from "../ifc/samples/revolved.rectangle.ts";
import { curvePolylineSample } from "../ifc/samples/curve.polyline.ts";
import { curveIndexedPolyCurveSample } from "../ifc/samples/curve.indexed-polycurve.ts";
import { curveCircleSample } from "../ifc/samples/curve.circle.ts";
import { curveEllipseSample } from "../ifc/samples/curve.ellipse.ts";
import { curveTrimmedSample } from "../ifc/samples/curve.trimmed.ts";
import type { SampleDef } from "../types.ts";

const samples: Record<string, SampleDef> = {
  "curve-polyline": curvePolylineSample,
  "curve-indexed-polycurve": curveIndexedPolyCurveSample,
  "curve-circle": curveCircleSample,
  "curve-ellipse": curveEllipseSample,
  "curve-trimmed": curveTrimmedSample,
  "extrusion-rectangle": extrusionRectangleSample,
  "extrusion-rounded-rectangle": extrusionRoundedRectangleSample,
  "boolean-difference": booleanDifferenceSample,
  "extrusion-circle": extrusionCircleSample,
  "extrusion-ellipse": extrusionEllipseSample,
  "extrusion-rect-hollow": extrusionRectHollowSample,
  "extrusion-circle-hollow": extrusionCircleHollowSample,
  "extrusion-c-shape": extrusionCShapeSample,
  "extrusion-asymmetric-i-shape": extrusionAsymmetricIShapeSample,
  "extrusion-i-shape": extrusionIShapeSample,
  "extrusion-l-shape": extrusionLShapeSample,
  "extrusion-t-shape": extrusionTShapeSample,
  "extrusion-u-shape": extrusionUShapeSample,
  "extrusion-z-shape": extrusionZShapeSample,
  "swept-disk-basic": sweptDiskBasicSample,
  "revolved-rectangle": revolvedRectangleSample,
};

export class App {
  private container: HTMLElement;
  private examplePage: ExamplePage | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
    window.addEventListener("hashchange", () => this._navigate());
  }

  start() {
    this._navigate();
  }

  private _navigate() {
    const hash = window.location.hash || "#/";

    const route = routes.find((r) => r.hash === hash);

    if (this.examplePage) {
      this.examplePage.unmount();
      this.examplePage = null;
    }

    if (route?.sampleId) {
      const sample = samples[route.sampleId];
      if (sample) {
        this.examplePage = new ExamplePage(this.container);
        this.examplePage.mount(sample);
        return;
      }
    }

    const homePage = new HomePage();
    homePage.render(this.container);
  }
}
