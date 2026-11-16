import io
import json
from pathlib import Path

from fastapi.testclient import TestClient
from PIL import Image

from backend.app.main import app

client = TestClient(app)
KEY = "unit_test_key_not_a_real_credential_123"


def test_health_and_both_seed_modes():
    assert client.get("/health").json()["persistence"] == "none"
    for mode in ("main", "advanced"):
        r = client.get("/v1/reference", params={"exam": mode})
        assert r.status_code == 200
        assert len(r.json()["items"]) == 6
        assert all(i["exam"] == mode for i in r.json()["items"])
    assert client.get("/v1/reference?exam=neet").status_code == 422


def test_strict_cors():
    good = client.options(
        "/v1/extractions",
        headers={
            "origin": "http://localhost:3000",
            "access-control-request-method": "POST",
            "access-control-request-headers": "X-Gemini-Api-Key",
        },
    )
    assert good.status_code == 200
    assert good.headers["access-control-allow-origin"] == "http://localhost:3000"
    bad = client.options(
        "/v1/extractions",
        headers={
            "origin": "https://untrusted.invalid",
            "access-control-request-method": "POST",
        },
    )
    assert bad.status_code == 400
    assert "access-control-allow-origin" not in bad.headers


def test_missing_key_and_model_allowlist():
    r = client.post(
        "/v1/extractions",
        json={
            "text": "A complete textbook problem is here.",
            "exam": "main",
            "model": "gemini-flash-latest",
        },
    )
    assert r.status_code == 401
    r = client.post(
        "/v1/coach",
        headers={"X-Gemini-Api-Key": KEY},
        json={"message": "Hi", "context": "test", "model": "evil-model"},
    )
    assert r.status_code == 422
    assert KEY not in r.text
    assert "input" not in r.text


def test_key_never_echoed_in_validation_error():
    r = client.post(
        "/v1/extractions",
        headers={"X-Gemini-Api-Key": KEY},
        json={"text": KEY, "model": "invalid"},
    )
    assert r.status_code == 422
    assert KEY not in r.text


def test_upload_mime_signature_and_size():
    headers = {"X-Gemini-Api-Key": KEY}
    assert (
        client.post(
            "/v1/extractions/upload",
            headers=headers,
            files={"file": ("a.txt", b"data", "text/plain")},
        ).status_code
        == 415
    )
    assert (
        client.post(
            "/v1/extractions/upload",
            headers=headers,
            files={"file": ("a.png", b"not png", "image/png")},
        ).status_code
        == 422
    )
    assert (
        client.post(
            "/v1/extractions/upload",
            headers=headers,
            files={"file": ("a.pdf", b"%PDF- invalid", "application/pdf")},
        ).status_code
        == 422
    )
    assert (
        client.post(
            "/v1/extractions/upload",
            headers=headers,
            files={"file": ("a.png", b"x" * (20 * 1024 * 1024 + 1), "image/png")},
        ).status_code
        == 413
    )
    assert (
        client.post(
            "/v1/extractions/upload",
            headers=headers,
            files={"file": ("a.png", b"", "image/png")},
        ).status_code
        == 413
    )


def test_real_upload_and_extraction_contract(monkeypatch):
    from backend.app import gemini

    seed = json.loads(Path("data/seed-items.json").read_text())[0]
    # An AI display string must not override the checked algebraic expression.
    seed["options"][0]["latex"] = "999999"
    from backend.app.schemas import Item

    async def mocked(request, key, data=None, mime=None):
        assert key == KEY
        if data:
            assert mime == "image/png"
        return [Item.model_validate(seed)]

    monkeypatch.setattr(gemini, "extract", mocked)
    image = Image.new("RGB", (10, 10))
    data = io.BytesIO()
    image.save(data, format="PNG")
    r = client.post(
        "/v1/extractions/upload",
        headers={"X-Gemini-Api-Key": KEY},
        files={"file": ("a.png", data.getvalue(), "image/png")},
        data={"exam": "main"},
    )
    assert r.status_code == 200, r.text
    assert r.json()["verification"][0]["valid"]
    assert next(o for o in r.json()["items"][0]["options"] if o["id"] == "A")["latex"] == "-3"
    assert KEY not in r.text
    assert r.headers["cache-control"] == "no-store"


def test_public_symbolic_validation():
    seed = json.loads(Path("data/seed-items.json").read_text())[0]
    r = client.post("/v1/items/validate", json={"items": [seed]})
    assert r.status_code == 200, r.text
    seed["options"][0]["expression"] = '__import__("os").system("id")'
    seed["options"][0]["derived_expression"] = seed["options"][0]["expression"]
    assert client.post("/v1/items/validate", json={"items": [seed]}).status_code == 422


def test_coach_provider_response_no_secret(monkeypatch):
    from backend.app import gemini

    async def mocked(request, key):
        return "Try checking the domain before squaring."

    monkeypatch.setattr(gemini, "coach", mocked)
    r = client.post(
        "/v1/coach",
        json={
            "message": "Help me",
            "context": "Lost absolute value",
            "model": "gemini-flash-lite-latest",
            "exam": "main",
        },
        headers={"X-Gemini-Api-Key": KEY},
    )
    assert r.status_code == 200, r.text
    assert KEY not in r.text
