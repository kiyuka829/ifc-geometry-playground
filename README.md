# IFC Geometry Playground

An interactive web application for learning how IFC shapes are constructed.
Uses Babylon.js for 3D visualization, allowing you to modify parameters in real-time and understand how IFC geometry is built.

## Purpose

Designed for developers and anyone looking to deepen their understanding of IFC, this app visualizes:

- IFC shape generation operations (extrusion, boolean operations, etc.)
- Parameters of each operation and their effects
- The relationship between IFC representations (pseudo-JSON) and 3D shapes

## Supported Shape Types

See [docs/ifc-geometry-types.md](docs/ifc-geometry-types.md) for a comprehensive list of IFC geometry types and their implementation status.

### Currently Implemented

- [x] **IfcExtrudedAreaSolid** – Extrusion (rectangular / arbitrary closed profile)
- [x] **IfcBooleanResult** – Boolean operations (DIFFERENCE / UNION / INTERSECTION)

### Planned (Phase 1)

- [ ] IfcRevolvedAreaSolid – Revolved solid
- [ ] IfcExtrudedAreaSolidTapered – Tapered extrusion
- [ ] IfcCircleProfileDef / IfcCircleHollowProfileDef – Circular profiles
- [ ] IfcRectangleHollowProfileDef – Hollow rectangular profile
- [ ] IfcIShapeProfileDef – I-shape (H-beam)
- [ ] IfcLShapeProfileDef – L-shape (angle)
- [ ] IfcArbitraryProfileDefWithVoids – Profile with voids

### Planned (Phase 2)

- [ ] IfcSweptDiskSolid – Disk sweep (pipes)
- [ ] IfcSphere / IfcRightCircularCylinder – Primitive solids
- [ ] IfcHalfSpaceSolid / IfcPolygonalBoundedHalfSpace – Clipping
- [ ] IfcTriangulatedFaceSet / IfcPolygonalFaceSet – Tessellated meshes
- [ ] IfcMappedItem – Repeated placement

## Design Principles

- Handles **learning-oriented abstractions** rather than strict IFC parsing
- Each example is implemented as an independent sample definition (`src/ifc/samples/`)
- UI is auto-generated from sample definitions

## Sample Schema

Each sample is a `SampleDef` object (`src/types.ts`) with `parameters`, `steps`, `buildGeometry`, and `getIFCRepresentation`.

### Parameter types (`ParameterDef`)

`ParameterDef` is a discriminated union. The `type` field selects the UI control and value kind.

#### `type: 'number'` — slider + numeric input

```ts
{
  key: 'depth',
  label: 'Extrusion Depth',
  type: 'number',
  min: 0.5,
  max: 20,
  step: 0.1,
  defaultValue: 5,
}
```

#### `type: 'select'` — dropdown

```ts
{
  key: 'operator',
  label: 'Operator',
  type: 'select',
  options: [
    { value: 'DIFFERENCE',   label: 'DIFFERENCE' },
    { value: 'UNION',        label: 'UNION' },
    { value: 'INTERSECTION', label: 'INTERSECTION' },
  ],
  defaultValue: 'DIFFERENCE',
}
```

### Accessing parameter values safely

Callbacks receive a `ParamValues` (`Record<string, number | string>`). Use the provided helpers instead of `as`-casts:

```ts
import { getNumber, getSelect } from '../../types.ts'

const OPERATORS = ['DIFFERENCE', 'UNION', 'INTERSECTION'] as const

buildGeometry: (scene, params, stepIndex) => {
  const depth    = getNumber(params, 'depth')          // throws if not a number
  const operator = getSelect(params, 'operator', OPERATORS, 'DIFFERENCE')  // falls back to default
  // …
}
```

## Directory Structure

```
src/
  engine/         Babylon.js wrappers and common 3D utilities
    scene.ts      Scene, engine, lights
    camera.ts     Camera setup
    materials.ts  Material definitions
    gizmos.ts     Direction vector and axis gizmos
  ifc/
    schema.ts     Backward-compatibility re-export layer (do not import directly)
    normalize.ts  Normalization layer: generated types → renderer-friendly model
    generated/
      schema.ts   IFC-compliant type definitions (auto-generated, do not edit)
    operations/   IFC shape operation implementations
      extrusion.ts
      boolean.ts
      placement.ts
    samples/      Example definitions (parameters, generation pipeline, descriptions)
      extrusion.basic.ts
      boolean.difference.ts
  ui/
    ParameterPanel.ts   Slider, numeric input, and dropdown UI
    Stepper.ts          Step display UI
    TreeView.ts         IFC structure tree
    CodeView.ts         IFC code display
  pages/
    HomePage.ts         Top page
    ExamplePage.ts      Example page (2-column layout: left panel + canvas)
  app/
    routes.ts           Hash routing definitions
    App.ts              Application controller
  types.ts              Shared type definitions (UI-domain types, re-exports from generated)
```

## Development

```bash
npm install
npm run dev
```

## Build (GitHub Pages)

```bash
npm run build
# Deploy dist/ to GitHub Pages
```

## Tech Stack

- [Vite](https://vitejs.dev/) + TypeScript
- [Babylon.js](https://www.babylonjs.com/) v8 – 3D rendering
- GitHub Pages (hash routing)
