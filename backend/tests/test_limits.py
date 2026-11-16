import asyncio
import io
import json
import runpy
import subprocess
import sys
from pathlib import Path
from types import SimpleNamespace

import httpx
import pytest
from fastapi.testclient import TestClient

from backend.app import gemini, symbolic
from backend.app.limits import (
    GEMINI_WALL_SECONDS,
    SYMBOLIC_CPU_SECONDS,
    SYMBOLIC_MEMORY_BYTES,
    SYMBOLIC_WALL_SECONDS,
)
from backend.app.main import app
from backend.app.schemas import Item

KEY = "deadline_fixture_not_a_real_key_123456"


def reference_item():
    return Item.model_validate(json.loads(Path("data/seed-items.json").read_text())[0])


def test_fixed_budgets_preserve_compute_caps_and_fit_proxy_deadline():
    assert SYMBOLIC_WALL_SECONDS == 30
    assert SYMBOLIC_CPU_SECONDS == 6
    assert SYMBOLIC_MEMORY_BYTES == 512 * 1024 * 1024
    assert GEMINI_WALL_SECONDS == 75
    # Allow scheduler delay, not extra CPU, secrets or an unbounded provider call.
    assert GEMINI_WALL_SECONDS + SYMBOLIC_WALL_SECONDS + 1 < 110


def test_worker_receives_fixed_wall_deadline_and_no_deployment_secrets(monkeypatch):
    seen = {}
    monkeypatch.setenv("TARGETJEE_SECRET_FIXTURE", KEY)

    def run(command, **kwargs):
        seen.update(command=command, **kwargs)
        return SimpleNamespace(returncode=0, stdout='{"results": []}')

    monkeypatch.setattr(symbolic.subprocess, "run", run)
    assert symbolic.verify_bounded([reference_item()]) == []
    assert seen["command"] == [sys.executable, "-m", "backend.app.symbolic_worker"]
    assert seen["timeout"] == 30
    assert set(seen["env"]) == {"PYTHONHASHSEED", "PATH", "LANG"}
    assert KEY not in json.dumps(seen)
    assert seen["capture_output"] is True
    assert seen["check"] is False


def test_linux_worker_installs_same_cpu_and_memory_limits(monkeypatch, capsys):
    resource = pytest.importorskip("resource")
    limits = {}
    monkeypatch.setattr(resource, "setrlimit", lambda kind, bound: limits.update({kind: bound}))
    monkeypatch.setattr(sys, "stdin", io.StringIO("[]"))
    runpy.run_module("backend.app.symbolic_worker", run_name="__main__")
    assert limits[resource.RLIMIT_CPU] == (6, 6)
    assert limits[resource.RLIMIT_AS] == (512 * 1024 * 1024, 512 * 1024 * 1024)
    assert json.loads(capsys.readouterr().out) == {"results": []}


def test_symbolic_wall_deadline_still_fails_closed_without_echo(monkeypatch):
    def expired(command, **kwargs):
        raise subprocess.TimeoutExpired(command, kwargs["timeout"], output=KEY, stderr=KEY)

    monkeypatch.setattr(symbolic.subprocess, "run", expired)
    with pytest.raises(ValueError, match="Symbolic verification timed out") as error:
        symbolic.verify_bounded([reference_item()])
    assert KEY not in str(error.value)


def test_worker_resource_failure_still_fails_closed_without_echo(monkeypatch):
    monkeypatch.setattr(
        symbolic.subprocess,
        "run",
        lambda *args, **kwargs: SimpleNamespace(returncode=-9, stdout=KEY, stderr=KEY),
    )
    with pytest.raises(ValueError, match="Symbolic worker rejected") as error:
        symbolic.verify_bounded([reference_item()])
    assert KEY not in str(error.value)


def test_provider_has_total_wall_deadline_and_cancels_slow_transport(monkeypatch, caplog):
    cancelled = []

    async def delayed(request):
        try:
            await asyncio.sleep(1)
        except asyncio.CancelledError:
            cancelled.append(True)
            raise
        raise AssertionError("The provider should have been cancelled before completion")

    original = httpx.AsyncClient
    monkeypatch.setattr(gemini, "GEMINI_WALL_SECONDS", 0.01)
    monkeypatch.setattr(
        gemini.httpx,
        "AsyncClient",
        lambda **kwargs: original(transport=httpx.MockTransport(delayed), **kwargs),
    )
    response = TestClient(app).post(
        "/v1/coach",
        headers={"X-Gemini-Api-Key": KEY},
        json={"message": "Suggest a focused reference drill.", "context": "", "exam": "main"},
    )
    assert response.status_code == 504
    assert "time limit" in response.json()["detail"]
    assert cancelled == [True]
    assert KEY not in response.text
    assert KEY not in caplog.text
