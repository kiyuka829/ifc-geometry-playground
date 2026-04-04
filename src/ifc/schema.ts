/**
 * Backward-compatibility re-export layer.
 *
 * All IFC schema types have been consolidated into canonical sources:
 *   - src/types.ts              — UI-domain types (Vec2, Vec3, simplified IFC,
 *                                 arbitrary profiles, boolean, sweep types)
 *   - src/ifc/generated/schema.ts — IFC-compliant generated types
 *                                   (parameterized profiles, IfcExtrudedAreaSolid)
 *
 * Prefer importing directly from those sources.
 * Do not add new type definitions here.
 */

export type {
  Vec2,
  Vec3,
  IfcProfileType,
  IfcArbitraryClosedProfileDef,
  IfcArbitraryProfileDefWithVoids,
  IfcProfileDef,
  IfcPolyline,
  IfcSweptDiskSolid,
} from "../types.ts";

export type {
  IfcCShapeProfileDef,
  IfcRectangleProfileDef,
  IfcRectangleHollowProfileDef,
  IfcCircleProfileDef,
  IfcCircleHollowProfileDef,
  IfcEllipseProfileDef,
  IfcIShapeProfileDef,
  IfcLShapeProfileDef,
  IfcTShapeProfileDef,
} from "./generated/schema.ts";
