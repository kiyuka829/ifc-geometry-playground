#!/usr/bin/env python3
"""Generate IFC schema JSON and TypeScript type definitions from IfcOpenShell.

Extracts attribute metadata for IfcExtrudedAreaSolid, IfcRevolvedAreaSolid,
all supported subclasses of IfcParameterizedProfileDef (excluding explicitly
unsupported entities such as IfcTrapeziumProfileDef), schema-complete IfcCurve
interfaces, and the supporting geometry entities.

Outputs:
  src/ifc/generated/schema.json  — raw IFC4 attribute schema (PascalCase)
  src/ifc/generated/schema.ts    — TypeScript interfaces (camelCase)

Usage:
    python scripts/generate_ifc_schema.py
"""

import json
import sys
from pathlib import Path

import ifcopenshell
import ifcopenshell.ifcopenshell_wrapper as w

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

SCHEMA_NAME = "IFC4X3_ADD2"

REPO_ROOT = Path(__file__).parent.parent
OUTPUT_DIR = REPO_ROOT / "src" / "ifc" / "generated"

# Entities for which we emit TypeScript interfaces (order matters for the
# generated file: dependencies come before dependants).
GEOMETRY_ENTITIES = [
    "IfcCartesianPoint",
    "IfcDirection",
    "IfcVector",
    "IfcAxis1Placement",
    "IfcAxis2Placement2D",
    "IfcAxis2Placement3D",
    "IfcAxis2PlacementLinear",
    "IfcCartesianPointList2D",
    "IfcCartesianPointList3D",
    "IfcPointByDistanceExpression",
    "IfcPointOnCurve",
    "IfcPointOnSurface",
]

CURVE_SEGMENT_ENTITIES = [
    "IfcCompositeCurveSegment",
    "IfcReparametrisedCompositeCurveSegment",
    "IfcCurveSegment",
]

# Parameterized profile entities that exist in IFC4 but are not yet implemented
# in the playground runtime, so they remain excluded from generated TS unions.
UNSUPPORTED_PROFILE_ENTITIES = frozenset({"IfcTrapeziumProfileDef"})

# Curve entities that the generated runtime-facing union may accept. The schema
# interfaces below are broader than this list, but unsupported curve families
# stay out of IfcSupportedCurve until operations can interpret them.
SUPPORTED_CURVE_ENTITIES = [
    "IfcPolyline",
    "IfcIndexedPolyCurve",
    "IfcLine",
    "IfcCircle",
    "IfcEllipse",
    "IfcTrimmedCurve",
    "IfcPolynomialCurve",
    "IfcCompositeCurve",
]

SOLID_ENTITIES = [
    "IfcExtrudedAreaSolid",
    "IfcRevolvedAreaSolid",
]

# Swept-area solids require an AREA profile by formal proposition, so we
# narrow SweptArea from the broad IfcProfileDef select to supported area
# parameterized profiles in generated TypeScript interfaces.
AREA_PROFILE_SOLID_ENTITIES = frozenset({"IfcExtrudedAreaSolid", "IfcRevolvedAreaSolid"})

# IFC attribute names that carry no geometric meaning and are omitted from
# the generated TypeScript (e.g. human-readable labels).
ATTRS_TO_SKIP = frozenset({"ProfileName"})

# TS-side aliases for schema entities that are intentionally outside this
# generator's current concrete entity set.
TS_ENTITY_TYPE_OVERRIDES = {
    "IfcSurface": "IfcSurface",
}

# Abstract schema entities and selects that need named TS aliases because
# concrete curve definitions refer to them. Opaque aliases intentionally mark
# dependencies outside the curve/profile scope of this generator.
OPAQUE_TS_ALIASES = {
    "IfcSurface": "unknown",
}

# IFC named type/select wrappers whose names carry runtime semantics. These
# must not collapse to their primitive representation in TypeScript.
TS_NAMED_ARRAY_TYPE_OVERRIDES = {
    "IfcArcIndex": "IfcArcIndex",
    "IfcLineIndex": "IfcLineIndex",
}

TS_SELECT_TYPE_OVERRIDES = {
    "IfcSegmentIndexSelect": "IfcSegmentIndexSelect",
}

# ---------------------------------------------------------------------------
# Schema resolution helpers
# ---------------------------------------------------------------------------


def resolve_attribute_type(t) -> dict:
    """Recursively resolve an IfcOpenShell attribute type to a plain dict.

    Returned dict always has a ``kind`` key, one of:
      "number"      — any numeric IFC measure or real/integer primitive
      "string"      — IFC string / label primitive
      "boolean"     — IFC boolean / logical primitive
      "enumeration" — IFC enumeration; includes "ifcType" and "values" keys
      "entity"      — reference to another IFC entity; includes "name" key
      "array"       — aggregation; includes "aggregation" and "element" keys
      "select"      — IFC select type; includes "ifcType" and "options" keys
      "unknown"     — unrecognised wrapper

    When an ``ifcType`` key is present it records the IFC type name that was
    unwrapped to reach the base kind (e.g. "IfcPositiveLengthMeasure").
    """
    if isinstance(t, w.named_type):
        return resolve_attribute_type(t.declared_type())

    if isinstance(t, w.simple_type):
        declared = str(t.declared_type())
        if declared in ("real", "integer", "number", "binary"):
            return {"kind": "number"}
        if declared == "string":
            return {"kind": "string"}
        if declared in ("boolean", "logical"):
            return {"kind": "boolean"}
        # Fallback: treat as number (covers any remaining numeric primitives).
        return {"kind": "number"}

    if isinstance(t, w.type_declaration):
        inner = resolve_attribute_type(t.declared_type())
        # Record the outermost type_declaration name (e.g. IfcPositiveLengthMeasure
        # rather than its underlying IfcLengthMeasure alias).
        result = dict(inner)
        result["ifcType"] = t.name()
        return result

    if isinstance(t, w.entity):
        return {"kind": "entity", "name": t.name()}

    if isinstance(t, w.aggregation_type):
        return {
            "kind": "array",
            "aggregation": t.type_of_aggregation_string(),
            "element": resolve_attribute_type(t.type_of_element()),
        }

    if isinstance(t, w.select_type):
        return {
            "kind": "select",
            "ifcType": t.name(),
            "options": [resolve_attribute_type(s) for s in t.select_list()],
            "optionNames": [s.name() for s in t.select_list()],
        }

    if isinstance(t, w.enumeration_type):
        return {
            "kind": "enumeration",
            "ifcType": t.name(),
            "values": list(t.enumeration_items()),
        }

    return {"kind": "unknown"}


def get_entity_info(schema, name: str) -> dict:
    """Return a dict describing all attributes of an IFC entity."""
    decl = schema.declaration_by_name(name)
    if not isinstance(decl, w.entity):
        return {"name": name, "error": "not an entity"}

    supertype = decl.supertype()
    attributes = []
    for attr in decl.all_attributes():
        attributes.append(
            {
                "name": attr.name(),
                "optional": attr.optional(),
                "type": resolve_attribute_type(attr.type_of_attribute()),
            }
        )

    return {
        "name": name,
        "supertype": supertype.name() if supertype else None,
        "attributes": attributes,
    }


def get_supported_profile_entities(schema) -> list[str]:
    """Return supported IfcParameterizedProfileDef subclasses in schema order."""
    root = schema.declaration_by_name("IfcParameterizedProfileDef")
    entities: list[str] = []

    def visit(decl) -> None:
        name = decl.name()
        if name in UNSUPPORTED_PROFILE_ENTITIES:
            return
        entities.append(name)
        for child in decl.subtypes():
            visit(child)

    for child in root.subtypes():
        visit(child)

    return entities


def get_concrete_subtypes(schema, name: str) -> list[str]:
    """Return all non-abstract descendants of an entity in schema order."""
    root = schema.declaration_by_name(name)
    entities: list[str] = []

    def visit(decl) -> None:
        if not decl.is_abstract():
            entities.append(decl.name())
        for child in decl.subtypes():
            visit(child)

    for child in root.subtypes():
        visit(child)

    return entities


# ---------------------------------------------------------------------------
# JSON schema generation
# ---------------------------------------------------------------------------


def generate_schema_json(
    schema,
    profile_entities: list[str],
    curve_entities: list[str],
    errors: list[str],
) -> dict:
    """Build the full schema dict for all target entities.

    Any per-entity errors are appended to *errors* so the caller can decide
    whether to exit with a non-zero status.
    """
    all_target_entities = (
        GEOMETRY_ENTITIES
        + CURVE_SEGMENT_ENTITIES
        + curve_entities
        + profile_entities
        + SOLID_ENTITIES
    )
    entities: dict[str, dict] = {}
    for name in all_target_entities:
        try:
            entities[name] = get_entity_info(schema, name)
        except Exception as exc:  # noqa: BLE001
            msg = f"could not process {name}: {exc}"
            print(f"Error: {msg}", file=sys.stderr)
            errors.append(msg)
            entities[name] = {"name": name, "error": str(exc)}

    return {
        "schemaVersion": SCHEMA_NAME,
        "entities": entities,
    }


# ---------------------------------------------------------------------------
# TypeScript generation
# ---------------------------------------------------------------------------


def pascal_to_camel(name: str) -> str:
    """Convert a PascalCase IFC attribute name to a camelCase TS property."""
    if not name:
        return name
    return name[0].lower() + name[1:]


def unique_preserve_order(values: list[str]) -> list[str]:
    """Return values with duplicates removed while preserving first occurrence."""
    result: list[str] = []
    seen: set[str] = set()
    for value in values:
        if value not in seen:
            seen.add(value)
            result.append(value)
    return result


def parenthesize_union(ts_type: str) -> str:
    """Wrap a TS union before composing it into array syntax."""
    return f"({ts_type})" if " | " in ts_type else ts_type


def type_info_to_ts(type_info: dict) -> str:
    """Convert a resolved type_info dict to a TypeScript type expression."""
    kind = type_info.get("kind")

    if kind == "number":
        return "number"
    if kind == "string":
        return "string"
    if kind == "boolean":
        return "boolean"
    if kind == "enumeration":
        values = type_info.get("values", [])
        return " | ".join(f"'{v}'" for v in values)
    if kind == "entity":
        entity_name = type_info.get("name", "unknown")
        return TS_ENTITY_TYPE_OVERRIDES.get(entity_name, entity_name)
    if kind == "array":
        ifc_type = type_info.get("ifcType")
        if ifc_type in TS_NAMED_ARRAY_TYPE_OVERRIDES:
            return TS_NAMED_ARRAY_TYPE_OVERRIDES[ifc_type]
        element_ts = type_info_to_ts(type_info.get("element", {"kind": "unknown"}))
        return f"{parenthesize_union(element_ts)}[]"
    if kind == "select":
        ifc_type = type_info.get("ifcType")
        if ifc_type in TS_SELECT_TYPE_OVERRIDES:
            return TS_SELECT_TYPE_OVERRIDES[ifc_type]
        option_types: list[str] = []
        for option in type_info.get("options", []):
            if isinstance(option, dict):
                option_types.append(type_info_to_ts(option))
            else:
                option_types.append(str(option))
        return " | ".join(unique_preserve_order(option_types)) or "unknown"
    return "unknown"


def generate_ts_interface(entity_info: dict) -> str:
    """Render a TypeScript ``interface`` block for the given entity."""
    name = entity_info["name"]
    lines: list[str] = [f"export interface {name} {{"]
    lines.append(f"  type: '{name}';")

    for attr in entity_info.get("attributes", []):
        attr_name = attr["name"]
        if attr_name in ATTRS_TO_SKIP:
            continue
        ts_prop = pascal_to_camel(attr_name)
        optional = attr["optional"]
        ts_type = type_info_to_ts(attr["type"])
        opt_marker = "?" if optional else ""
        lines.append(f"  {ts_prop}{opt_marker}: {ts_type};")

    lines.append("}")
    return "\n".join(lines)


def generate_ts_union(name: str, members: list[str]) -> str:
    """Render an exported TypeScript union alias."""
    union_lines = [f"export type {name} ="]
    for i, member in enumerate(members):
        sep = "  | " if i > 0 else "    "
        union_lines.append(f"{sep}{member}")
    union_lines[-1] += ";"
    return "\n".join(union_lines)


def generate_ts_file(schema, profile_entities: list[str], curve_entities: list[str]) -> str:
    """Generate the full TypeScript source file content."""
    blocks: list[str] = []

    blocks.append(
        f"// Auto-generated from the {SCHEMA_NAME} schema via IfcOpenShell.\n"
        "// Run `python scripts/generate_ifc_schema.py` to regenerate.\n"
        "// Do not edit this file manually."
    )

    # --- Shared enumeration type ----------------------------------------
    blocks.append(
        "/** Specifies whether a profile is intended for an area (solid) or a\n"
        " *  curve (boundary) representation. */\n"
        "export type IfcProfileTypeEnum = 'CURVE' | 'AREA';"
    )

    # --- Geometry support entities --------------------------------------
    blocks.append("// ── Geometry entities ─────────────────────────────────────────────")
    for name in GEOMETRY_ENTITIES:
        entity_info = get_entity_info(schema, name)
        blocks.append(generate_ts_interface(entity_info))

    blocks.append(
        generate_ts_union(
            "IfcCartesianPointList",
            ["IfcCartesianPointList2D", "IfcCartesianPointList3D"],
        )
    )
    blocks.append(
        generate_ts_union(
            "IfcPoint",
            ["IfcCartesianPoint", "IfcPointByDistanceExpression", "IfcPointOnCurve", "IfcPointOnSurface"],
        )
    )
    blocks.append(
        generate_ts_union(
            "IfcPlacement",
            ["IfcAxis1Placement", "IfcAxis2Placement2D", "IfcAxis2Placement3D", "IfcAxis2PlacementLinear"],
        )
    )
    for name, ts_type in OPAQUE_TS_ALIASES.items():
        blocks.append(f"export type {name} = {ts_type};")

    blocks.append("// ── Indexed curve select wrappers ────────────────────────────────")
    blocks.append(
        "export interface IfcArcIndex {\n"
        "  type: 'IfcArcIndex';\n"
        "  indices: [number, number, number];\n"
        "}"
    )
    blocks.append(
        "export interface IfcLineIndex {\n"
        "  type: 'IfcLineIndex';\n"
        "  indices: [number, number, ...number[]];\n"
        "}"
    )
    blocks.append(generate_ts_union("IfcSegmentIndexSelect", ["IfcArcIndex", "IfcLineIndex"]))

    # --- Curve entities --------------------------------------------------
    blocks.append("// ── Curve segment entities ────────────────────────────────────────")
    for name in CURVE_SEGMENT_ENTITIES:
        entity_info = get_entity_info(schema, name)
        blocks.append(generate_ts_interface(entity_info))

    blocks.append(generate_ts_union("IfcSegment", CURVE_SEGMENT_ENTITIES))

    blocks.append("// ── Curve entities ────────────────────────────────────────────────")
    for name in curve_entities:
        entity_info = get_entity_info(schema, name)
        blocks.append(generate_ts_interface(entity_info))

    blocks.append(generate_ts_union("IfcBoundedCurve", get_concrete_subtypes(schema, "IfcBoundedCurve")))
    blocks.append(generate_ts_union("IfcCurve", curve_entities))
    blocks.append(
        "/** Runtime-facing curve subset. This is intentionally narrower than\n"
        " *  schema-complete IfcCurve until operations support every family. */"
    )
    blocks.append(generate_ts_union("IfcSupportedCurve", SUPPORTED_CURVE_ENTITIES))

    # --- Profile entities -----------------------------------------------
    blocks.append("// ── Parameterized profile definitions ────────────────────────────")
    for name in profile_entities:
        entity_info = get_entity_info(schema, name)

        # Build the interface manually so we can substitute the shared
        # IfcProfileTypeEnum type for the ProfileType enumeration attribute.
        ifc_name = entity_info["name"]
        lines: list[str] = [f"export interface {ifc_name} {{"]
        lines.append(f"  type: '{ifc_name}';")

        for attr in entity_info.get("attributes", []):
            attr_name = attr["name"]
            if attr_name in ATTRS_TO_SKIP:
                continue
            ts_prop = pascal_to_camel(attr_name)
            optional = attr["optional"]
            opt_marker = "?" if optional else ""

            type_info = attr["type"]
            # Replace the per-attribute enum with the shared named type.
            if type_info.get("kind") == "enumeration" and type_info.get("ifcType") == "IfcProfileTypeEnum":
                ts_type = "IfcProfileTypeEnum"
            else:
                ts_type = type_info_to_ts(type_info)

            lines.append(f"  {ts_prop}{opt_marker}: {ts_type};")

        lines.append("}")
        blocks.append("\n".join(lines))

    # --- IfcParameterizedProfileDef union --------------------------------
    union_lines = ["export type IfcParameterizedProfileDef ="]
    for i, name in enumerate(profile_entities):
        sep = "  | " if i > 0 else "    "
        union_lines.append(f"{sep}{name}")
    union_lines[-1] += ";"
    blocks.append("\n".join(union_lines))

    blocks.append(
        "export type IfcAreaParameterizedProfileDef =\n"
        "    IfcParameterizedProfileDef extends infer T\n"
        "      ? T extends { profileType: IfcProfileTypeEnum }\n"
        "        ? Omit<T, 'profileType'> & { profileType: 'AREA' }\n"
        "        : never\n"
        "      : never;"
    )

    # --- Solid entities -------------------------------------------------
    blocks.append("// ── Solid entities ────────────────────────────────────────────────")
    for name in SOLID_ENTITIES:
        entity_info = get_entity_info(schema, name)

        ifc_name = entity_info["name"]
        lines = [f"export interface {ifc_name} {{"]
        lines.append(f"  type: '{ifc_name}';")

        for attr in entity_info.get("attributes", []):
            attr_name = attr["name"]
            if attr_name in ATTRS_TO_SKIP:
                continue
            ts_prop = pascal_to_camel(attr_name)
            optional = attr["optional"]
            opt_marker = "?" if optional else ""

            type_info = attr["type"]
            # SweptArea is IfcProfileDef (a broad select type); restrict to
            # supported parameterized AREA profiles; swept-area solids require
            # SweptArea.ProfileType = AREA by formal proposition.
            # Ref: https://ifc43-docs.standards.buildingsmart.org/IFC/RELEASE/IFC4x3/HTML/lexical/IfcSweptAreaSolid.htm#:~:text=SweptAreaType,IfcProfileTypeEnum.Area
            if ifc_name in AREA_PROFILE_SOLID_ENTITIES and attr_name == "SweptArea":
                ts_type = "IfcAreaParameterizedProfileDef"
            else:
                ts_type = type_info_to_ts(type_info)

            lines.append(f"  {ts_prop}{opt_marker}: {ts_type};")

        lines.append("}")
        blocks.append("\n".join(lines))

    return "\n\n".join(blocks) + "\n"


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    print(f"Loading {SCHEMA_NAME} schema …")
    schema = ifcopenshell.schema_by_name(SCHEMA_NAME)
    profile_entities = get_supported_profile_entities(schema)
    curve_entities = get_concrete_subtypes(schema, "IfcCurve")

    errors: list[str] = []

    # -- JSON output -------------------------------------------------------
    json_path = OUTPUT_DIR / "schema.json"
    schema_data = generate_schema_json(schema, profile_entities, curve_entities, errors)
    json_path.write_text(json.dumps(schema_data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Wrote {json_path.relative_to(REPO_ROOT)}")

    # -- TypeScript output -------------------------------------------------
    ts_path = OUTPUT_DIR / "schema.ts"
    ts_content = generate_ts_file(schema, profile_entities, curve_entities)
    ts_path.write_text(ts_content, encoding="utf-8")
    print(f"Wrote {ts_path.relative_to(REPO_ROOT)}")

    if errors:
        print(f"\n{len(errors)} error(s) occurred during generation:", file=sys.stderr)
        for err in errors:
            print(f"  - {err}", file=sys.stderr)
        sys.exit(1)

    print("Done.")


if __name__ == "__main__":
    main()
