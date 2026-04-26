import { Color3, Mesh, MeshBuilder } from "@babylonjs/core";
import type { Scene, StandardMaterial } from "@babylonjs/core";
import type { IfcPolyline } from "../generated/schema.ts";
import { ifcToBabylonVector } from "../../engine/ifc-coordinates.ts";

export function buildPolylineCurve(
  scene: Scene,
  curve: IfcPolyline,
  name: string,
  color = new Color3(0.2, 0.9, 0.2),
): Mesh {
  if (curve.points.length < 2) {
    return new Mesh(`${name}_empty`, scene);
  }

  const points = curve.points.map((point) =>
    ifcToBabylonVector({
      x: point.coordinates[0] ?? 0,
      y: point.coordinates[1] ?? 0,
      z: point.coordinates[2] ?? 0,
    }),
  );
  const lines = MeshBuilder.CreateLines(name, { points }, scene);
  lines.color = color;
  return lines;
}

export function buildCurvePointMarkers(
  scene: Scene,
  curve: IfcPolyline,
  material: StandardMaterial,
  name: string,
  radius = 0.12,
): Mesh[] {
  return curve.points.map((point, index) => {
    const marker = MeshBuilder.CreateSphere(
      `${name}_${index}`,
      { diameter: radius * 2, segments: 16 },
      scene,
    );
    marker.position = ifcToBabylonVector({
      x: point.coordinates[0] ?? 0,
      y: point.coordinates[1] ?? 0,
      z: point.coordinates[2] ?? 0,
    });
    marker.material = material;
    return marker;
  });
}
