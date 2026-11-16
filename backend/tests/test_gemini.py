import json
from pathlib import Path

import httpx
import pytest
from fastapi.testclient import TestClient

from backend.app import gemini
from backend.app.main import app

client = TestClient(app)
KEY = "transport_fixture_not_a_real_key_123456"
MODELS = ["gemini-flash-latest", "gemini-flash-lite-latest"]


def mock_provider(monkeypatch, handler):
    original = httpx.AsyncClient
    monkeypatch.setattr(
        gemini.httpx,
        "AsyncClient",
        lambda **kwargs: original(transport=httpx.MockTransport(handler), **kwargs),
    )


def provider_body(text):
    return {"candidates": [{"content": {"parts": [{"text": text}]}}]}


@pytest.mark.parametrize("model", MODELS)
def test_request_scoped_header_only_provider_transport(monkeypatch, model, caplog):
    item = json.loads(Path("data/seed-items.json").read_text())[0]

    def handler(request):
        assert request.headers["x-goog-api-key"] == KEY
        assert KEY not in str(request.url)
        assert KEY not in request.content.decode()
        assert request.url.path.endswith(f"/{model}:generateContent")
        return httpx.Response(200, json=provider_body(json.dumps({"items": [item]})))

    mock_provider(monkeypatch, handler)
    response = client.post(
        "/v1/extractions",
        headers={"X-Gemini-Api-Key": KEY},
        json={
            "text": "A complete real textbook problem for validation.",
            "exam": "main",
            "model": model,
        },
    )
    assert response.status_code == 200, response.text
    assert response.json()["items"][0]["parameter_source"] == "model-proposed"
    assert KEY not in response.text
    assert KEY not in caplog.text


@pytest.mark.parametrize("output", ["[]", "null", '{"items": []}', "not JSON"])
def test_invalid_provider_root_fails_closed(monkeypatch, output):
    mock_provider(monkeypatch, lambda _: httpx.Response(200, json=provider_body(output)))
    response = client.post(
        "/v1/extractions",
        headers={"X-Gemini-Api-Key": KEY},
        json={"text": "A complete textbook problem is supplied here.", "exam": "main"},
    )
    assert response.status_code == 422
    assert KEY not in response.text


def test_duplicate_provider_item_ids_rejected(monkeypatch):
    item = json.loads(Path("data/seed-items.json").read_text())[0]
    output = json.dumps({"items": [item, item]})
    mock_provider(monkeypatch, lambda _: httpx.Response(200, json=provider_body(output)))
    response = client.post(
        "/v1/extractions",
        headers={"X-Gemini-Api-Key": KEY},
        json={"text": "A complete textbook problem is supplied here.", "exam": "main"},
    )
    assert response.status_code == 422


@pytest.mark.parametrize(
    "status,expected",
    [(400, 502), (401, 401), (403, 401), (404, 502), (429, 429), (500, 502), (503, 502)],
)
def test_provider_error_body_never_forwarded(monkeypatch, status, expected):
    mock_provider(monkeypatch, lambda _: httpx.Response(status, json={"error": {"message": KEY}}))
    response = client.post(
        "/v1/coach",
        headers={"X-Gemini-Api-Key": KEY},
        json={
            "message": "Suggest a short focused drill.",
            "context": "Domain errors",
            "exam": "main",
        },
    )
    assert response.status_code == expected
    assert KEY not in response.text


def test_provider_network_error_sanitized(monkeypatch):
    def handler(request):
        raise httpx.RemoteProtocolError(KEY, request=request)

    mock_provider(monkeypatch, handler)
    response = client.post(
        "/v1/coach",
        headers={"X-Gemini-Api-Key": KEY},
        json={
            "message": "Suggest a short focused drill.",
            "context": "Domain errors",
            "exam": "main",
        },
    )
    assert response.status_code == 503
    assert KEY not in response.text


@pytest.mark.parametrize(
    "status,code",
    [
        (400, "provider_request"),
        (401, "provider_access"),
        (404, "provider_model"),
        (429, "provider_quota"),
        (503, "provider_unavailable"),
    ],
)
def test_diagnostics_are_bounded_and_only_quota_response_is_quota(monkeypatch, status, code):
    mock_provider(monkeypatch, lambda _: httpx.Response(status, json={"error": {"message": KEY}}))
    response = client.post(
        "/v1/coach",
        headers={"X-Gemini-Api-Key": KEY},
        json={"message": "One study hint.", "context": ""},
    )
    diagnostic = response.json()["diagnostic"]
    assert set(diagnostic) == {"code", "stage", "request_id", "revision"}
    assert diagnostic["code"] == code
    assert diagnostic["stage"] == "provider"
    assert len(diagnostic["request_id"]) == 12
    assert KEY not in response.text


@pytest.mark.parametrize("style", ["reason", "message", "message_null_details"])
def test_google_invalid_key_400_is_not_mislabelled_as_source_or_quota(monkeypatch, style):
    error = (
        {"message": "API key not valid. " + KEY}
        if style.startswith("message")
        else {"message": KEY, "details": [{"reason": "API_KEY_INVALID"}]}
    )
    if style == "message_null_details":
        error["details"] = None
    mock_provider(monkeypatch, lambda _: httpx.Response(400, json={"error": error}))
    response = client.post(
        "/v1/coach",
        headers={"X-Gemini-Api-Key": KEY},
        json={"message": "One study hint.", "context": ""},
    )
    assert response.status_code == 401
    assert response.json()["diagnostic"]["code"] == "provider_access"
    assert KEY not in response.text


def test_format_diagnostic_does_not_echo_pydantic_paths_values_or_context(monkeypatch, caplog):
    item = json.loads(Path("data/seed-items.json").read_text())[0]
    item[KEY] = KEY
    mock_provider(
        monkeypatch,
        lambda _: httpx.Response(200, json=provider_body(json.dumps({"items": [item]}))),
    )
    response = client.post(
        "/v1/extractions",
        headers={"X-Gemini-Api-Key": KEY},
        json={"text": "A complete problem for a mocked provider."},
    )
    assert response.status_code == 422
    assert response.json()["diagnostic"]["stage"] == "format"
    assert response.json()["diagnostic"]["code"] == "item_contract"
    assert "not a rate-limit" in response.json()["detail"]
    assert KEY not in response.text
    assert KEY not in caplog.text


def test_health_exposes_only_a_safe_release_revision(monkeypatch):
    monkeypatch.setenv("RENDER_GIT_COMMIT", "a" * 40)
    assert client.get("/health").json()["revision"] == "a" * 8
    monkeypatch.setenv("RENDER_GIT_COMMIT", KEY)
    response = client.get("/health")
    assert response.json()["revision"] == "workspace"
    assert KEY not in response.text
