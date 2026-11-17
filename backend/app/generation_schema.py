"""Gemini's supported JSON-Schema projection of the unchanged public item contract.

Do not send Pydantic's JSON Schema verbatim. In particular, Gemini does not
support ``const`` or ``pattern`` as decoding constraints. That left the A–D IDs,
key, schema version and fixed marks unconstrained even in structured mode.
The final Pydantic validation and isolated symbolic verifier remain authoritative.

Supported keywords: googleapis/googleapis at bc7e3baa28fbb223fa93782e130260fab8205bfc,
google/ai/generativelanguage/v1beta/generative_service.proto, GenerationConfig.
"""

from copy import deepcopy

from .schemas import Exam, ExtractionResult

# Keep the provider surface deliberate and small. Validation-only restrictions
# (e.g. text lengths/domain size) are retained as instructions, not silently
# mistaken for decoding guarantees. Do not weaken their Pydantic counterparts.
_SUPPORTED = {
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


def _project(node: dict) -> dict:
    projected = {}
    for name, value in node.items():
        if name not in _SUPPORTED:
            continue
        if name in ("$defs", "properties"):
            projected[name] = {key: _project(child) for key, child in value.items()}
        elif name in ("items", "additionalProperties") and isinstance(value, dict):
            projected[name] = _project(value)
        elif name == "anyOf":
            projected[name] = [_project(child) for child in value]
        else:
            projected[name] = deepcopy(value)
    if "const" in node:
        projected["enum"] = [node["const"]]
    if node.get("pattern") == r"^[A-D]$":
        projected["enum"] = list("ABCD")
    hints = []
    if "pattern" in node and "enum" not in projected:
        hints.append(f"Must match {node['pattern']}.")
    for keyword, label in (
        ("minLength", "Minimum characters"),
        ("maxLength", "Maximum characters"),
        ("maxProperties", "Maximum entries"),
        ("exclusiveMinimum", "Must be strictly greater than"),
        ("exclusiveMaximum", "Must be strictly less than"),
    ):
        if keyword in node:
            hints.append(f"{label}: {node[keyword]}.")
    if hints:
        projected["description"] = " ".join([node.get("description", ""), *hints]).strip()
    return projected


def extraction_schema(exam: Exam) -> dict:
    """Fresh per-call schema: mode constraints must not leak between requests."""
    if exam not in ("main", "advanced"):
        raise ValueError("Unsupported exam mode")
    schema = _project(ExtractionResult.model_json_schema())
    schema["properties"]["items"]["minItems"] = 1
    schema["properties"]["items"]["maxItems"] = 25
    item = schema["$defs"]["Item"]
    properties = item["properties"]
    properties["exam"]["enum"] = [exam]
    properties["beta_seconds"].update(
        minimum=90 if exam == "main" else 180, maximum=180 if exam == "main" else 300
    )
    properties["negative_marks"]["enum"] = [1] if exam == "main" else [1, 2]
    properties["parameter_source"]["enum"] = ["model-proposed"]
    # These were already the system prompt's conservative, uncalibrated values.
    # Enforce them in decoding too; unsupported exclusive bounds are not enough.
    for name, value in {"a": 1, "b": 0, "c": 0.25, "alpha": 1}.items():
        properties[name]["enum"] = [value]
    item["required"] = list(properties)  # Include literal fields with public defaults.
    return schema
