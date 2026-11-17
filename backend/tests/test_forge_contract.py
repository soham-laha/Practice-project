"""Provider-flow regressions: synthetic keys + MockTransport only, never live Gemini."""

import base64
import io
import json
from pathlib import Path

import httpx
import pytest
from fastapi.testclient import TestClient
from PIL import Image
from pypdf import PdfWriter

from backend.app import gemini
from backend.app.main import app

KEY = "audit_fixture_not_a_real_key_123456789"
MODELS = ["gemini-flash-latest", "gemini-flash-lite-latest"]
client = TestClient(app)


def seed(exam="main"):
    return next(
        i for i in json.loads(Path("data/seed-items.json").read_text()) if i["exam"] == exam
    )


def provider(monkeypatch, body=None, error=None):
    calls = []

    def handler(request):
        calls.append(request)
        if error:
            raise error(KEY, request=request)
        return httpx.Response(200, json=body)

    original = httpx.AsyncClient
    monkeypatch.setattr(
        gemini.httpx,
        "AsyncClient",
        lambda **kwargs: original(transport=httpx.MockTransport(handler), **kwargs),
    )
    return calls


def envelope(item):
    return {
        "candidates": [
            {
                "finishReason": "STOP",
                "content": {"parts": [{"text": json.dumps({"items": [item]})}]},
            }
        ]
    }


def assert_header_only(request):
    assert request.headers["x-goog-api-key"] == KEY
    assert KEY not in str(request.url)
    assert KEY not in request.content.decode()


def assert_schema(request, exam):
    config = json.loads(request.content)["generationConfig"]
    assert config["responseMimeType"] == "application/json"
    schema = config["responseJsonSchema"]
    assert schema["additionalProperties"] is False
    assert schema["required"] == ["items"]
    items = schema["properties"]["items"]
    assert (items["minItems"], items["maxItems"]) == (1, 25)
    item = schema["$defs"][items["items"]["$ref"].split("/")[-1]]
    fields = item["properties"]
    assert fields["options"]["minItems"] == 4
    assert fields["options"]["maxItems"] == 4
    assert fields["exam"]["enum"] == [exam]
    assert fields["correct_id"]["enum"] == list("ABCD")
    assert fields["negative_marks"]["enum"] == ([1] if exam == "main" else [1, 2])
    assert (fields["beta_seconds"]["minimum"], fields["beta_seconds"]["maximum"]) == (
        (90, 180) if exam == "main" else (180, 300)
    )
    assert fields["schema_version"]["enum"] == ["targetjee.item.v2"]
    assert fields["positive_marks"]["enum"] == [4]
    assert schema["$defs"]["Option"]["properties"]["id"]["enum"] == list("ABCD")
    assert item["additionalProperties"] is False

    # All local references must resolve at the response root, not an embedded
    # Item subschema whose $defs ended up in the wrong place.
    def walk(value):
        if isinstance(value, dict):
            if "$ref" in value:
                assert value["$ref"].startswith("#/$defs/")
                assert value["$ref"].split("/")[-1] in schema["$defs"]
            for child in value.values():
                walk(child)
        elif isinstance(value, list):
            for child in value:
                walk(child)

    walk(schema)


@pytest.mark.parametrize("model", MODELS)
@pytest.mark.parametrize("exam", ["main", "advanced"])
def test_both_models_and_exams_request_constrained_json_and_check_real_algebra(
    monkeypatch, model, exam
):
    calls = provider(monkeypatch, envelope(seed(exam)))
    response = client.post(
        "/v1/extractions",
        headers={"X-Gemini-Api-Key": KEY},
        json={
            "text": "A complete synthetic textbook problem for a mocked provider.",
            "model": model,
            "exam": exam,
        },
    )
    assert response.status_code == 200, response.text
    assert response.json()["verification"][0]["valid"]
    assert response.json()["items"][0]["exam"] == exam
    assert len(calls) == 1
    assert_header_only(calls[0])
    assert_schema(calls[0], exam)


@pytest.mark.parametrize("model", MODELS)
@pytest.mark.parametrize("exam", ["main", "advanced"])
@pytest.mark.parametrize("mime", ["image/png", "image/jpeg", "application/pdf"])
def test_real_file_decoding_and_exact_inline_bytes_with_mock_provider(
    monkeypatch, model, exam, mime
):
    content = io.BytesIO()
    if mime == "application/pdf":
        writer = PdfWriter()
        writer.add_blank_page(width=100, height=100)
        writer.write(content)
    else:
        Image.new("RGB", (12, 12)).save(content, format="PNG" if mime == "image/png" else "JPEG")
    data = content.getvalue()
    calls = provider(monkeypatch, envelope(seed(exam)))
    response = client.post(
        "/v1/extractions/upload",
        headers={"X-Gemini-Api-Key": KEY},
        files={"file": ("synthetic-fixture", data, mime)},
        data={"model": model, "exam": exam},
    )
    assert response.status_code == 200, response.text
    assert response.json()["verification"][0]["valid"]
    assert len(calls) == 1
    assert_header_only(calls[0])
    assert_schema(calls[0], exam)
    inline = json.loads(calls[0].content)["contents"][0]["parts"][1]["inlineData"]
    assert inline["mimeType"] == mime
    assert base64.b64decode(inline["data"]) == data
    assert KEY not in response.text


@pytest.mark.parametrize(
    "failure,expected",
    [
        (httpx.ReadTimeout, 504),
        (httpx.ConnectTimeout, 504),
        (httpx.ConnectError, 503),
        (httpx.RemoteProtocolError, 503),
    ],
)
def test_timeouts_and_transport_failures_are_distinct_sanitized_and_not_retried(
    monkeypatch, failure, expected, caplog
):
    calls = provider(monkeypatch, error=failure)
    response = client.post(
        "/v1/coach",
        headers={"X-Gemini-Api-Key": KEY},
        json={"message": "Suggest a short drill.", "context": ""},
    )
    assert response.status_code == expected
    assert ("time limit" in response.json()["detail"]) is (expected == 504)
    assert KEY not in response.text
    assert KEY not in caplog.text
    assert len(calls) == 1


@pytest.mark.parametrize(
    "reason,expected", [("MAX_TOKENS", 502), ("SAFETY", 422), ("RECITATION", 422)]
)
def test_incomplete_or_blocked_provider_output_is_not_accepted_or_retried(
    monkeypatch, reason, expected
):
    body = envelope(seed())
    body["candidates"][0]["finishReason"] = reason
    calls = provider(monkeypatch, body)
    response = client.post(
        "/v1/extractions",
        headers={"X-Gemini-Api-Key": KEY},
        json={"text": "A complete synthetic problem for a mocked provider."},
    )
    assert response.status_code == expected
    assert "items" not in response.json()
    assert len(calls) == 1


@pytest.mark.parametrize("blocked", [True, False])
def test_prompt_feedback_distinguishes_blocked_from_unspecified(monkeypatch, blocked):
    body = envelope(seed())
    body["promptFeedback"] = {"blockReason": "SAFETY" if blocked else "BLOCK_REASON_UNSPECIFIED"}
    calls = provider(monkeypatch, body)
    response = client.post(
        "/v1/extractions",
        headers={"X-Gemini-Api-Key": KEY},
        json={"text": "A complete synthetic problem for a mocked provider."},
    )
    assert response.status_code == (422 if blocked else 200)
    assert len(calls) == 1


def test_thought_parts_do_not_corrupt_final_json(monkeypatch):
    body = envelope(seed())
    body["candidates"][0]["content"]["parts"].insert(
        0, {"thought": True, "text": "Private reasoning, not JSON"}
    )
    provider(monkeypatch, body)
    response = client.post(
        "/v1/extractions",
        headers={"X-Gemini-Api-Key": KEY},
        json={"text": "A complete synthetic problem for a mocked provider."},
    )
    assert response.status_code == 200, response.text
    assert "Private reasoning" not in response.text


@pytest.mark.parametrize(
    "body",
    [
        None,
        [],
        {},
        {"candidates": []},
        {"candidates": [{"content": {"parts": [None]}}]},
        {"candidates": [{"content": {"parts": [{"text": ""}]}}]},
    ],
)
def test_empty_or_malformed_provider_envelopes_fail_safely(monkeypatch, body):
    calls = provider(monkeypatch, body)
    response = client.post(
        "/v1/coach",
        headers={"X-Gemini-Api-Key": KEY},
        json={"message": "Suggest a short drill.", "context": ""},
    )
    assert response.status_code == 502
    assert KEY not in response.text
    assert len(calls) == 1


@pytest.mark.parametrize(
    "fault,detail",
    [
        ("duplicate", "equivalent answer options"),
        ("derivation", "derivation certificate"),
        ("unit", "unit vectors"),
        ("recovery", "recovery answer"),
        ("symbol", "declared domain"),
    ],
)
def test_generated_failures_keep_algebra_guardrails_and_return_safe_categories(
    monkeypatch, fault, detail
):
    item = seed()
    if fault == "duplicate":
        item["options"][2]["expression"] = item["options"][2]["derived_expression"] = item[
            "options"
        ][0]["expression"]
    elif fault == "derivation":
        item["options"][0]["derived_expression"] = "999"
    elif fault == "unit":
        item["options"][0]["unit"] = [1, 0, 0]
    elif fault == "recovery":
        item["options"][0]["trap"]["recovery_check"]["target_expression"] = "999"
    else:
        item["options"][0]["expression"] = item["options"][0]["derived_expression"] = "undeclared"
    calls = provider(monkeypatch, envelope(item))
    response = client.post(
        "/v1/extractions",
        headers={"X-Gemini-Api-Key": KEY},
        json={"text": "A complete synthetic problem for a mocked provider."},
    )
    assert response.status_code == 422, response.text
    assert detail in response.json()["detail"]
    assert "No unverified item was released" in response.json()["detail"]
    assert "items" not in response.json()
    assert KEY not in response.text
    assert len(calls) == 1


def test_unrecognized_worker_error_is_not_echoed_and_deadline_is_not_blame_on_source(monkeypatch):
    from backend.app import main

    calls = provider(monkeypatch, envelope(seed()))

    def reject(_items):
        raise ValueError(KEY)

    monkeypatch.setattr(main, "verify_bounded", reject)
    response = client.post(
        "/v1/extractions",
        headers={"X-Gemini-Api-Key": KEY},
        json={"text": "A complete synthetic problem for a mocked provider."},
    )
    assert response.status_code == 422
    assert KEY not in response.text
    assert len(calls) == 1

    def expire(_items):
        raise ValueError("Symbolic verification timed out; simplify the problem")

    monkeypatch.setattr(main, "verify_bounded", expire)
    response = client.post(
        "/v1/extractions",
        headers={"X-Gemini-Api-Key": KEY},
        json={"text": "A complete synthetic problem for a mocked provider."},
    )
    assert response.status_code == 503
    assert "algebra check reached its time limit" in response.json()["detail"]
    assert "items" not in response.json()


@pytest.mark.parametrize("field", ["label", "description"])
def test_empty_diagram_metadata_is_rejected_before_success_reaches_browser(monkeypatch, field):
    item = seed()
    anchor = {"label": "Block", "description": "The supported block.", "x": 0.5, "y": 0.5}
    anchor[field] = ""
    item["diagram_anchors"] = [anchor]
    calls = provider(monkeypatch, envelope(item))
    response = client.post(
        "/v1/extractions",
        headers={"X-Gemini-Api-Key": KEY},
        json={"text": "A complete synthetic problem for a mocked provider."},
    )
    assert response.status_code == 422
    assert response.json()["diagnostic"]["code"] == "item_contract"
    assert "items" not in response.json()
    assert KEY not in response.text
    assert len(calls) == 1


def test_coach_still_uses_unstructured_single_call_and_its_existing_budget(monkeypatch):
    calls = provider(
        monkeypatch,
        {"candidates": [{"content": {"parts": [{"text": "Check the acceleration sign."}]}}]},
    )
    response = client.post(
        "/v1/coach",
        headers={"X-Gemini-Api-Key": KEY},
        json={"message": "Suggest one guardrail.", "context": ""},
    )
    assert response.status_code == 200
    assert len(calls) == 1
    config = json.loads(calls[0].content)["generationConfig"]
    assert config == {"temperature": 0.2, "maxOutputTokens": 1800}
    assert_header_only(calls[0])


@pytest.mark.parametrize(
    "path,value",
    [
        (("schema_version",), "targetjee.item.v1"),
        (("correct_id",), "1"),
        (("options", 1, "id"), "A"),
        (("negative_marks",), 2),
        (("beta_seconds",), 181),
        (("a",), 0),
        (("c",), 1),
        (("solution",), "X"),
        (("domain",), dict.fromkeys("abcdefghi", "real")),
        (("options", 0, "trap", "recovery_check", "expression"), "x" * 301),
    ],
)
def test_provider_projection_does_not_relax_final_contract_or_trigger_repairs(
    monkeypatch, path, value
):
    from backend.app import main

    item = seed()
    parent = item
    for part in path[:-1]:
        parent = parent[part]
    parent[path[-1]] = value
    calls = provider(monkeypatch, envelope(item))

    def must_not_verify(_items):
        raise AssertionError("An invalid item reached symbolic verification")

    monkeypatch.setattr(main, "verify_bounded", must_not_verify)
    response = client.post(
        "/v1/extractions",
        headers={"X-Gemini-Api-Key": KEY},
        json={"text": "A complete synthetic problem for a mocked provider."},
    )
    assert response.status_code == 422
    assert response.json()["diagnostic"]["code"] == "item_contract"
    assert response.json()["diagnostic"]["stage"] == "format"
    assert "items" not in response.json()
    assert KEY not in response.text
    assert len(calls) == 1
