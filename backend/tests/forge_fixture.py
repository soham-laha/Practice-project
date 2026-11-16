"""Author-owned generator fixtures for the browser's successful forge path.

Run: python -m backend.tests.forge_fixture
Only Google's transport is mocked. Each response passes the real FastAPI,
Pydantic and bounded SymPy pipeline. No key/config is read from the environment,
no source is sent over a network and these items are NEVER a production fallback.
"""

import json
from unittest.mock import patch

import httpx
from fastapi.testclient import TestClient

from backend.app import gemini
from backend.app.main import app

KEY = "forge_browser_fixture_not_a_real_key_012345"
MODELS = ("gemini-flash-latest", "gemini-flash-lite-latest")


def fixture_item(exam):
    advanced = exam == "advanced"
    source = (
        "An ideal spring of stiffness 120 N/m supports a 3 kg block inside a lift "
        "accelerating upward at 2 m/s^2. Take g=10 m/s^2. Find the equilibrium extension."
        if advanced
        else "A 3 kg block rests on the floor of a lift accelerating upward at 2 m/s^2. "
        "Take g=10 m/s^2. Find the normal force on the block."
    )
    unit = [0, 1, 0] if advanced else [1, 1, -2]
    suffix = "/120" if advanced else ""
    specs = [
        (
            "A",
            "3*10",
            "30",
            "Ignoring acceleration",
            "The lift acceleration was omitted.",
            "When the lift has zero acceleration.",
            "Include g plus upward acceleration.",
            "2*(10+1)",
            "20+2",
            "22",
            "A 2 kg block accelerates upward at 1 m/s^2 in a lift. With g=10, find its normal force.",
        ),
        ("B", "3*(10+2)", "30+6", None, None, None, None, None, None, None, None),
        (
            "C",
            "3*(10-2)",
            "30-6",
            "Reversing the sign",
            "Upward acceleration was subtracted from g.",
            "When the lift accelerates downward at 2 m/s^2.",
            "Write the force equation before substituting.",
            "2*(10+3)",
            "20+6",
            "26",
            "A 2 kg block accelerates upward at 3 m/s^2 in a lift. With g=10, find its normal force.",
        ),
        (
            "D",
            "3*2",
            "6",
            "Dropping weight",
            "The normal force was confused with the net force.",
            "When only the increase over the stationary spring extension is requested."
            if advanced
            else "When only the required net upward force is requested.",
            "Separate the normal force from net force.",
            "2*10",
            "20",
            "20",
            "A 2 kg block is at rest in a stationary lift. With g=10, find its normal force.",
        ),
    ]
    options = []
    for (
        option_id,
        expression,
        derived,
        label,
        pivot,
        counterfactual,
        rule,
        recovery,
        target,
        answer,
        question,
    ) in specs:
        trap = None
        if label:
            trap = {
                "label": label,
                "why_plausible": "The arithmetic looks familiar, but the chosen force equation misses part of the setup.",
                "first_wrong_pivot": pivot,
                "counterfactual_valid_when": counterfactual,
                "avoidance_rule": rule,
                "recovery_check": {
                    "question": question,
                    "answer": answer,
                    "expression": recovery,
                    "target_expression": target,
                    "explanation": "Use N - mg = ma with upward positive, and then substitute the stated values.",
                },
            }
        options.append(
            {
                "id": option_id,
                "latex": "0",  # The real verifier must replace this with canonical checked math.
                "expression": f"({expression}){suffix}",
                "derived_expression": f"({derived}){suffix}",
                "unit": unit,
                "slope": 1 if option_id == "B" else -0.4,
                "intercept": 0,
                "trap": trap,
            }
        )
    item = {
        "schema_version": "targetjee.item.v2",
        "id": f"fixture-generated-lift-{exam}",
        "exam": exam,
        "subject": "Physics",
        "topic": "Accelerating frames and springs" if advanced else "Normal force in a lift",
        "prompt": source,
        "context": "A controlled generator regression fixture, not a live provider acceptance result.",
        "options": options,
        "correct_id": "B",
        "answer_expression": "(3*10+3*2)/120" if advanced else "3*10+3*2",
        "solution": "The upward force balance gives N=3*(10+2)=36 N. "
        + (
            "Hooke's law gives extension N/k=36/120=0.3 m."
            if advanced
            else "The normal force is not the 6 N net force."
        ),
        "domain": {},
        "expected_unit": unit,
        "diagram_anchors": [],
        "beta_seconds": 210 if advanced else 120,
        "alpha": 1,
        "a": 1,
        "b": 0,
        "c": 0.25,
        "positive_marks": 4,
        "negative_marks": 2 if advanced else 1,
        "parameter_source": "model-proposed",
    }
    return source, item


def checked_responses():
    results = []
    original = httpx.AsyncClient
    for exam in ("main", "advanced"):
        source, item = fixture_item(exam)
        for model in MODELS:
            calls = []

            def handler(request, *, calls=calls, model=model, exam=exam, item=item):
                calls.append(request)
                assert request.url.path.endswith(f"/{model}:generateContent")
                assert request.headers["x-goog-api-key"] == KEY
                assert KEY not in str(request.url) and KEY not in request.content.decode()
                config = json.loads(request.content)["generationConfig"]
                schema = config["responseJsonSchema"]["$defs"]["Item"]["properties"]
                assert schema["exam"]["enum"] == [exam]
                return httpx.Response(
                    200,
                    json={
                        "candidates": [
                            {
                                "finishReason": "STOP",
                                "content": {"parts": [{"text": json.dumps({"items": [item]})}]},
                            }
                        ]
                    },
                )

            with patch.object(
                gemini.httpx,
                "AsyncClient",
                lambda **kwargs: original(transport=httpx.MockTransport(handler), **kwargs),
            ):
                response = TestClient(app, base_url="https://fixture.invalid").post(
                    "/v1/extractions",
                    headers={"X-Gemini-Api-Key": KEY},
                    json={"text": source, "exam": exam, "model": model},
                )
            assert response.status_code == 200, "The real backend rejected a generator fixture"
            assert len(calls) == 1
            assert KEY not in response.text
            result = response.json()
            assert result["source"] == "gemini" and result["verification"][0]["valid"]
            assert next(o for o in result["items"][0]["options"] if o["id"] == "B")["latex"] != "0"
            results.append({"exam": exam, "model": model, "source": source, "response": result})
    return results


if __name__ == "__main__":
    print(json.dumps(checked_responses()))
