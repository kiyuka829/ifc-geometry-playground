---
name: ifc-geometry-implementation
description: "Implement IFC geometry shapes (extrusion, revolution, sweep, boolean, profile, etc.) in this project by consulting the reference C++ implementation in the web-ifc engine. Use when: adding a new IFC solid type, implementing an IFC profile, adding a new sample, debugging geometry output, or understanding how an IFC entity should be computed."
argument-hint: "IFC entity name or geometry type to implement (e.g. IfcExtrudedAreaSolid, IfcRevolvedAreaSolid, IfcSweptDiskSolid)"
---

# IFC Geometry Implementation

## Outcome

Implement an IFC geometry shape in this TypeScript/Babylon.js project with behavior that matches the reference C++ implementation in [ThatOpen/engine_web-ifc](https://github.com/ThatOpen/engine_web-ifc).

## Reference Repository

The canonical C++ implementation lives at:

```
../engine_web-ifc/               ← sibling directory, already cloned locally
  src/cpp/web-ifc/
    geometry/
      IfcGeometryProcessor.cpp   ← main dispatch / entry point per IFC entity
      IfcGeometryLoader.cpp      ← profile / curve loaders
      operations/
        bim-geometry/            ← per-operation implementations
          extrusion.cpp/.h
          revolution.cpp/.h
          sweep.cpp/.h
          circularSweep.cpp/.h
          boolean.cpp/.h
          profile.cpp/.h
          curve.cpp/.h
          face.cpp/.h
          geometry.cpp/.h
          ...
```

If the directory is not present, clone it first:

```bash
cd .. && git clone https://github.com/ThatOpen/engine_web-ifc.git
```

## When to Use

- Implementing a new IFC solid (e.g. `IfcRevolvedAreaSolid`, `IfcExtrudedAreaSolidTapered`)
- Implementing a new IFC profile (e.g. `IfcIShapeProfileDef`, `IfcCircleHollowProfileDef`)
- Adding a new sample under `src/ifc/samples/` that uses an IFC entity
- Verifying that existing geometry output matches IFC spec
- Understanding parameter semantics (axis conventions, winding order, coordinate frames)

## Procedure

### Step 1 — Identify the IFC entity

Determine the exact IFC entity name (e.g. `IFCEXTRUDEDAREASOLID`).

Search the dispatch table in `IfcGeometryProcessor.cpp`:

```bash
grep -n "case schema::IFC" ../engine_web-ifc/src/cpp/web-ifc/geometry/IfcGeometryProcessor.cpp
```

Locate the `case schema::IFCYOURTYPE:` block and read it to understand:

- Which attributes are read and in what order
- Which sub-loaders are called (`GetProfile`, `GetCurve`, `GetMesh`, etc.)
- Edge cases and error handling

### Step 2 — Read the bim-geometry implementation

Find the corresponding `.cpp` / `.h` under `operations/bim-geometry/` and read the full implementation. Key things to extract:

- Input structs / parameters
- Mathematical algorithm (coordinate frames, direction vectors, winding order)
- How profiles are tessellated into 2-D vertices
- How caps (top/bottom faces) are handled

Example:

```bash
cat ../engine_web-ifc/src/cpp/web-ifc/geometry/operations/bim-geometry/extrusion.cpp
cat ../engine_web-ifc/src/cpp/web-ifc/geometry/operations/bim-geometry/extrusion.h
```

### Step 3 — Read the profile loader if applicable

If the entity uses a profile, also read:

```bash
cat ../engine_web-ifc/src/cpp/web-ifc/geometry/operations/bim-geometry/profile.cpp
cat ../engine_web-ifc/src/cpp/web-ifc/geometry/IfcGeometryLoader.cpp   # GetProfile section
```

### Step 4 — Map to the project's TypeScript types

After understanding the C++ algorithm, map inputs to TypeScript:

| C++ concept          | TypeScript location                                                                                 |
| -------------------- | --------------------------------------------------------------------------------------------------- |
| Profile struct       | `src/types.ts` — `IfcProfileDef` union, or `src/ifc/generated/schema.ts` for parameterized profiles |
| Placement / axis     | `src/types.ts` — `IfcAxis2Placement3D` / `Vec3`                                                     |
| Solid implementation | `src/ifc/operations/` — create or extend an existing file                                           |
| Babylon.js mesh      | Return `Mesh[]` from `buildGeometry` in the sample                                                  |
| Materials            | Use factory functions from `src/engine/materials.ts`                                                |

### Step 5 — Implement in TypeScript

1. Create or extend a file in `src/ifc/operations/` (e.g. `revolution.ts`).
2. Translate the C++ math to TypeScript using `@babylonjs/core` vector / matrix types.
3. Maintain the same winding order and coordinate conventions as web-ifc (right-handed, Y-up in local profile space, Z = extrusion direction).
4. Do **not** call `.dispose()` inside `buildGeometry`; the caller handles cleanup.
5. Do **not** create materials inline; use `src/engine/materials.ts`.

### Step 6 — Create a sample

Add a sample under `src/ifc/samples/` following the `SampleDef` interface in `src/types.ts`:

- Export a `SampleDef` with `id`, `title`, `description`, `parameters`, `steps`, `buildGeometry`, `getIFCRepresentation`.
- Register it in `src/app/App.ts` and add a route in `src/app/routes.ts`.

### Step 7 — Validate

```bash
npm run dev    # visual check in browser
npm run build  # type-check + production build
```

Compare the visual output against the reference by inspecting identical parameter values shown in the IFC pseudo-JSON panel.

## Key Conventions (from web-ifc source)

| Topic             | Convention                                                                        |
| ----------------- | --------------------------------------------------------------------------------- |
| Coordinate system | Right-handed; profile is in XY plane; extrusion/sweep along Z                     |
| Profile winding   | Counter-clockwise for outer curves (CCW), clockwise for inner holes               |
| Placement         | `IfcAxis2Placement3D`: `Location` + `Axis` (Z) + `RefDirection` (X); Y is derived |
| Units             | Meters (IFC default); Babylon.js uses the same scale in this project              |
| Caps              | Top and bottom faces must be triangulated (earcut)                                |
| Boolean           | First operand is the solid body; second operand is the tool                       |

## Related Files in This Project

| File                              | Purpose                                           |
| --------------------------------- | ------------------------------------------------- |
| `src/ifc/operations/extrusion.ts` | Reference implementation — IfcExtrudedAreaSolid   |
| `src/ifc/operations/sweep.ts`     | Reference implementation — IfcSweptDiskSolid      |
| `src/ifc/operations/boolean.ts`   | Boolean difference / union                        |
| `src/ifc/operations/placement.ts` | Axis2Placement3D helpers                          |
| `src/ifc/normalize.ts`            | Converts schema types to renderer-friendly model  |
| `src/ifc/generated/schema.ts`     | Auto-generated IFC type definitions (do not edit) |
| `src/types.ts`                    | UI-domain IFC types + SampleDef interface         |
| `src/engine/materials.ts`         | Shared material factory functions                 |
