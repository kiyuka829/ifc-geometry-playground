# IFC Geometry Playground

An interactive web application for learning how IFC shapes are constructed.
Uses Babylon.js for 3D visualization, allowing you to modify parameters in real-time and understand how IFC geometry is built.

## Purpose

Designed for developers and anyone looking to deepen their understanding of IFC, this app visualizes:

- IFC shape generation operations (extrusion, boolean operations, etc.)
- Parameters of each operation and their effects
- The relationship between IFC representations (pseudo-JSON) and 3D shapes

## Supported Shape Types

- [x] **IfcExtrudedAreaSolid** – Extrusion (basic rectangular profile)
- [x] **IfcBooleanResult** – Boolean difference (DIFFERENCE)
- [ ] IfcRevolvedAreaSolid – Revolved solid
- [ ] IfcSweptDiskSolid – Sweep
- [ ] IfcBooleanResult (UNION / INTERSECTION)
- [ ] IfcMappedItem – Repeated placement
- [ ] IfcArbitraryClosedProfileDef – Arbitrary profile shape

## Design Principles

- Handles **learning-oriented abstractions** rather than strict IFC parsing
- Each example is implemented as an independent sample definition (`src/ifc/samples/`)
- UI is auto-generated from sample definitions

## Directory Structure

```
src/
  engine/         Babylon.js wrappers and common 3D utilities
    scene.ts      Scene, engine, lights
    camera.ts     Camera setup
    materials.ts  Material definitions
    gizmos.ts     Direction vector and axis gizmos
  ifc/
    schema.ts     IFC type definitions (for learning)
    operations/   IFC shape operation implementations
      extrusion.ts
      boolean.ts
      placement.ts
    samples/      Example definitions (parameters, generation pipeline, descriptions)
      extrusion.basic.ts
      boolean.difference.ts
  ui/
    ParameterPanel.ts   Slider and numeric input UI
    Stepper.ts          Step display UI
    TreeView.ts         IFC structure tree
    CodeView.ts         IFC code display
  pages/
    HomePage.ts         Top page
    ExamplePage.ts      Example page (2-column layout: left panel + canvas)
  app/
    routes.ts           Hash routing definitions
    App.ts              Application controller
  types.ts              Shared type definitions
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
