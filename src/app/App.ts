import { routes } from "./routes.ts";
import { HomePage } from "../pages/HomePage.ts";
import { ExamplePage } from "../pages/ExamplePage.ts";
import { extrusionRectangleSample } from "../ifc/samples/extrusion.rectangle.ts";
import { booleanDifferenceSample } from "../ifc/samples/boolean.difference.ts";
import { extrusionCircleSample } from "../ifc/samples/extrusion.circle.ts";
import { extrusionEllipseSample } from "../ifc/samples/extrusion.ellipse.ts";
import { extrusionRectHollowSample } from "../ifc/samples/extrusion.rect-hollow.ts";
import { extrusionCircleHollowSample } from "../ifc/samples/extrusion.circle-hollow.ts";
import { extrusionCShapeSample } from "../ifc/samples/extrusion.c-shape.ts";
import { extrusionIShapeSample } from "../ifc/samples/extrusion.i-shape.ts";
import { extrusionLShapeSample } from "../ifc/samples/extrusion.l-shape.ts";
import { extrusionTShapeSample } from "../ifc/samples/extrusion.t-shape.ts";
import { extrusionUShapeSample } from "../ifc/samples/extrusion.u-shape.ts";
import { sweptDiskBasicSample } from "../ifc/samples/swept-disk.basic.ts";
import type { SampleDef } from "../types.ts";

const samples: Record<string, SampleDef> = {
  "extrusion-rectangle": extrusionRectangleSample,
  "boolean-difference": booleanDifferenceSample,
  "extrusion-circle": extrusionCircleSample,
  "extrusion-ellipse": extrusionEllipseSample,
  "extrusion-rect-hollow": extrusionRectHollowSample,
  "extrusion-circle-hollow": extrusionCircleHollowSample,
  "extrusion-c-shape": extrusionCShapeSample,
  "extrusion-i-shape": extrusionIShapeSample,
  "extrusion-l-shape": extrusionLShapeSample,
  "extrusion-t-shape": extrusionTShapeSample,
  "extrusion-u-shape": extrusionUShapeSample,
  "swept-disk-basic": sweptDiskBasicSample,
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
