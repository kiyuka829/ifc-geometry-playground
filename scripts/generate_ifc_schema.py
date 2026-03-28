#!/usr/bin/env python3
"""Generate IFC schema JSON and TypeScript type definitions from IfcOpenShell.

Extracts attribute metadata for IfcExtrudedAreaSolid and all supported
subclasses of IfcParameterizedProfileDef (excluding explicitly unsupported
entities such as IfcTrapeziumProfileDef), plus the supporting geometry entities.

Outputs:
  src/ifc/generated/schema.json  — raw IFC4 attribute schema (PascalCase)
  src/ifc/generated/schema.ts    — TypeScript interfaces (camelCase)

Usage:
    python scripts/generate_ifc_schema.py
"""

import json
import sys
from datetime import datetime, timezone
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
    "IfcAxis2Placement2D",
    "IfcAxis2Placement3D",
]

# Parameterized profile entities that exist in IFC4 but are not yet implemented
# in the playground runtime, so they remain excluded from generated TS unions.
UNSUPPORTED_PROFILE_ENTITIES = frozenset({"IfcTrapeziumProfileDef"})

SOLID_ENTITIES = [
    "IfcExtrudedAreaSolid",
]

# IFC attribute names that carry no geometric meaning and are omitted from
# the generated TypeScript (e.g. human-readable labels).
ATTRS_TO_SKIP = frozenset({"ProfileName"})

# TS-side narrowing for abstract IFC geometry base types that this playground
# always materializes as concrete Cartesian points.
TS_ENTITY_TYPE_OVERRIDES = {
    "IfcPoint": "IfcCartesianPoint",
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
            "options": [s.name() for s in t.select_list()],
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


# ---------------------------------------------------------------------------
# JSON schema generation
# ---------------------------------------------------------------------------


def generate_schema_json(schema, profile_entities: list[str]) -> dict:
    """Build the full schema dict for all target entities."""
    all_target_entities = GEOMETRY_ENTITIES + profile_entities + SOLID_ENTITIES
    entities: dict[str, dict] = {}
    for name in all_target_entities:
        try:
            entities[name] = get_entity_info(schema, name)
        except Exception as exc:  # noqa: BLE001
            print(f"Warning: could not process {name}: {exc}", file=sys.stderr)
            entities[name] = {"name": name, "error": str(exc)}

    return {
        "schemaVersion": SCHEMA_NAME,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
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
        element_ts = type_info_to_ts(type_info.get("element", {"kind": "unknown"}))
        return f"{element_ts}[]"
    if kind == "select":
        options = type_info.get("options", [])
        return " | ".join(options)
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


def generate_ts_file(schema, profile_entities: list[str]) -> str:
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
            # the parameterized profiles we actually support.
            if ifc_name == "IfcExtrudedAreaSolid" and attr_name == "SweptArea":
                ts_type = "IfcParameterizedProfileDef"
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

    # -- JSON output -------------------------------------------------------
    json_path = OUTPUT_DIR / "schema.json"
    schema_data = generate_schema_json(schema, profile_entities)
    json_path.write_text(json.dumps(schema_data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Wrote {json_path.relative_to(REPO_ROOT)}")

    # -- TypeScript output -------------------------------------------------
    ts_path = OUTPUT_DIR / "schema.ts"
    ts_content = generate_ts_file(schema, profile_entities)
    ts_path.write_text(ts_content, encoding="utf-8")
    print(f"Wrote {ts_path.relative_to(REPO_ROOT)}")

    print("Done.")


if __name__ == "__main__":
    main()
