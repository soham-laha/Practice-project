"""Provider-schema compatibility regressions, not a claim of live API acceptance."""

import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from backend.app.generation_schema import extraction_schema
from backend.app.schemas import ExtractionResult, Item

# Independently transcribed from the pinned Google API declaration documented
# in generation_schema.py. Do not import the implementation's allowlist here.
SUPPORTED = {
    "$defs",
    "$ref",
    "type",
    "description",
    "enum",
    "items",
    "minItems",
    "maxItems",
    "minimum",
    "maximum",
    "anyOf",
    "properties",
    "additionalProperties",
    "required",
}


def nodes(node):
    yield node
    for name in ("$defs", "properties"):
        for child in node.get(name, {}).values():
            yield from nodes(child)
    for name in ("items", "additionalProperties"):
        if isinstance(node.get(name), dict):
            yield from nodes(node[name])
    for child in node.get("anyOf", []):
        yield from nodes(child)


@pytest.mark.parametrize("exam", ["main", "advanced"])
def test_schema_uses_only_supported_keywords_and_keeps_resolving_local_refs(exam):
    schema = extraction_schema(exam)
    for node in nodes(schema):
        assert set(node) <= SUPPORTED
        if "$ref" in node:
            assert set(node) == {"$ref"}
            assert node["$ref"].startswith("#/$defs/")
            assert node["$ref"].split("/")[-1] in schema["$defs"]
        if node.get("type") == "object" and "properties" in node:
            assert node["additionalProperties"] is False
            assert set(node["required"]) == set(node["properties"])
    assert schema["properties"]["items"]["minItems"] == 1
    assert schema["properties"]["items"]["maxItems"] == 1


def test_literal_and_id_constraints_are_provider_enums_not_ignored_const_or_pattern():
    raw = ExtractionResult.model_json_schema()
    assert raw["$defs"]["Item"]["properties"]["schema_version"]["const"] == "targetjee.item.v2"
    assert raw["$defs"]["Option"]["properties"]["id"]["pattern"] == "^[A-D]$"
    schema = extraction_schema("main")
    item = schema["$defs"]["Item"]["properties"]
    assert item["schema_version"]["enum"] == ["targetjee.item.v2"]
    assert item["positive_marks"]["enum"] == [4]
    assert item["correct_id"]["enum"] == list("ABCD")
    assert schema["$defs"]["Option"]["properties"]["id"]["enum"] == list("ABCD")
    for name, value in {"a": 1, "b": 0, "c": 0.25, "alpha": 1}.items():
        assert item[name]["enum"] == [value]
    assert item["parameter_source"]["enum"] == ["model-proposed"]


def test_each_call_has_independent_mode_constraints_without_mutating_public_schema():
    before = ExtractionResult.model_json_schema()
    main, advanced = extraction_schema("main"), extraction_schema("advanced")
    m, a = main["$defs"]["Item"]["properties"], advanced["$defs"]["Item"]["properties"]
    assert m["exam"]["enum"] == ["main"]
    assert a["exam"]["enum"] == ["advanced"]
    assert m["beta_seconds"]["maximum"] == 180
    assert a["beta_seconds"]["minimum"] == 180
    assert m["negative_marks"]["enum"] == [1]
    assert a["negative_marks"]["enum"] == [1, 2]
    m["exam"]["enum"].append("advanced")
    assert extraction_schema("main")["$defs"]["Item"]["properties"]["exam"]["enum"] == ["main"]
    assert ExtractionResult.model_json_schema() == before
    assert before["properties"]["items"]["maxItems"] == 5
    with pytest.raises(ValueError, match="Unsupported exam"):
        extraction_schema("invalid")


@pytest.mark.parametrize("name", ["label", "description"])
def test_backend_rejects_empty_diagram_fields_instead_of_issuing_unusable_client_items(name):
    item = json.loads(Path("data/seed-items.json").read_text())[0]
    anchor = {"label": "Block", "description": "The supported block.", "x": 0.5, "y": 0.5}
    item["diagram_anchors"] = [anchor]
    Item.model_validate(item)
    anchor[name] = ""
    with pytest.raises(ValidationError):
        Item.model_validate(item)


def test_unsupported_string_constraints_remain_instructions_and_strict_final_validation():
    schema = extraction_schema("main")
    recovery = schema["$defs"]["Recovery"]["properties"]
    assert "Maximum characters: 300." in recovery["expression"]["description"]
    assert "Minimum characters: 5." in recovery["question"]["description"]
    assert "Maximum entries: 8." in schema["$defs"]["Item"]["properties"]["domain"]["description"]
    raw = ExtractionResult.model_json_schema()
    assert raw["$defs"]["Recovery"]["properties"]["expression"]["maxLength"] == 300
    assert raw["$defs"]["Item"]["properties"]["domain"]["maxProperties"] == 8
