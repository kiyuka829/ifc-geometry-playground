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
  IfcDirection,
  IfcAxis2Placement3D,
  IfcArbitraryClosedProfileDef,
  IfcArbitraryProfileDefWithVoids,
  IfcProfileDef,
  IfcExtrudedAreaSolid,
  IfcBooleanResult,
  IfcPolyline,
  IfcSweptDiskSolid,
} from '../types.ts'

export type {
  IfcRectangleProfileDef,
  IfcRectangleHollowProfileDef,
  IfcCircleProfileDef,
  IfcCircleHollowProfileDef,
  IfcIShapeProfileDef,
  IfcLShapeProfileDef,
} from './generated/schema.ts'
