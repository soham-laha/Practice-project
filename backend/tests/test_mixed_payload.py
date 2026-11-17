"""Verification test for mixed Calculus + Organic Chemistry + Physics payload."""

import json
from pathlib import Path

import httpx
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.schemas import Item
from backend.app.symbolic import verify_bounded, verify_item

client = TestClient(app)
KEY = "audit_fixture_not_a_real_key_123456789"


def make_seed():
    return json.loads(Path("data/seed-items.json").read_text())[0]


def test_mixed_subjects_individual_and_batch_verification():
    raw_seed = make_seed()

    # 1. Calculus Item with dual display_latex and evaluated_expression
    calc = Item.model_validate(raw_seed)
    calc.id = "calc_integral_01"
    calc.subject = "Mathematics"
    calc.topic = "Definite Integrals"
    calc.prompt = "Evaluate the definite integral $\\int_0^1 (3x^2 + 2x) dx$."
    calc.answer_expression = "2"
    calc.evaluated_answer_expression = "2"
    calc.expected_unit = [0, 0, 0]
    calc.options[0].display_latex = "\\int_0^1 (3x^2 + 2x) dx = 1"
    calc.options[0].expression = "1"
    calc.options[0].evaluated_expression = "1"
    calc.options[0].derived_expression = "1"
    calc.options[0].unit = [0, 0, 0]

    calc.options[1].display_latex = "\\int_0^1 (3x^2 + 2x) dx = 2"
    calc.options[1].expression = "2"
    calc.options[1].evaluated_expression = "2"
    calc.options[1].derived_expression = "2"
    calc.options[1].unit = [0, 0, 0]

    calc.options[2].display_latex = "\\int_0^1 (3x^2 + 2x) dx = 3"
    calc.options[2].expression = "3"
    calc.options[2].evaluated_expression = "3"
    calc.options[2].derived_expression = "3"
    calc.options[2].unit = [0, 0, 0]

    calc.options[3].display_latex = "\\int_0^1 (3x^2 + 2x) dx = 5"
    calc.options[3].expression = "5"
    calc.options[3].evaluated_expression = "5"
    calc.options[3].derived_expression = "5"
    calc.options[3].unit = [0, 0, 0]

    calc_res = verify_item(calc)
    assert calc_res["valid"] is True
    assert calc_res["canonical_options"]["B"] == "\\int_0^1 (3x^2 + 2x) dx = 2"

    # 2. Organic Chemistry Item with qualitative mode
    chem = Item.model_validate(raw_seed)
    chem.id = "chem_organic_01"
    chem.subject = "Chemistry"
    chem.topic = "Hydrocarbons & Mechanisms"
    chem.prompt = "What is the major Markovnikov product of acid-catalyzed hydration of propene?"
    chem.verification_mode = "qualitative"
    chem.options[0].latex = "propan-1-ol"
    chem.options[0].expression = "1"
    chem.options[1].latex = "propan-2-ol"
    chem.options[1].expression = "2"
    chem.options[2].latex = "methoxyethane"
    chem.options[2].expression = "3"
    chem.options[3].latex = "propanoic acid"
    chem.options[3].expression = "4"
    chem.answer_expression = "2"

    chem_res = verify_item(chem)
    assert chem_res["valid"] is True
    assert chem_res["canonical_options"]["B"] == "propan-2-ol"

    # 3. Physics Item with work-energy dimensional units
    phys = Item.model_validate(raw_seed)
    phys.id = "phys_work_01"
    phys.subject = "Physics"
    phys.topic = "Work, Energy and Power"
    phys.prompt = "A constant horizontal force of 10 N acts on a 2 kg block over a displacement of 5 m on a frictionless plane. Find work done."
    phys.expected_unit = [1, 2, -2]
    phys.answer_expression = "50"
    phys.options[0].latex = "25"
    phys.options[0].expression = "25"
    phys.options[0].derived_expression = "25"
    phys.options[0].unit = [1, 2, -2]
    phys.options[1].latex = "50"
    phys.options[1].expression = "50"
    phys.options[1].derived_expression = "50"
    phys.options[1].unit = [1, 2, -2]
    phys.options[2].latex = "100"
    phys.options[2].expression = "100"
    phys.options[2].derived_expression = "100"
    phys.options[2].unit = [1, 2, -2]
    phys.options[3].latex = "10"
    phys.options[3].expression = "10"
    phys.options[3].derived_expression = "10"
    phys.options[3].unit = [1, 2, -2]

    phys_res = verify_item(phys)
    assert phys_res["valid"] is True

    # Batch verification of all 3 distinct subjects simultaneously
    batch_results = verify_bounded([calc, chem, phys])
    assert len(batch_results) == 3
    assert all(r["valid"] for r in batch_results)


def test_mixed_subjects_extraction_flow(monkeypatch):
    from backend.app import gemini

    raw_seed = make_seed()
    calc = Item.model_validate(raw_seed)
    calc.id = "calc_mixed"
    calc.subject = "Mathematics"
    calc.evaluated_answer_expression = "2"
    calc.options[1].display_latex = "\\int_0^1 2 dx = 2"
    calc.options[1].expression = "2"
    calc.options[1].evaluated_expression = "2"
    calc.options[1].derived_expression = "2"

    chem = Item.model_validate(raw_seed)
    chem.id = "chem_mixed"
    chem.subject = "Chemistry"
    chem.verification_mode = "qualitative"
    chem.options[1].latex = "propan-2-ol"

    phys = Item.model_validate(raw_seed)
    phys.id = "phys_mixed"
    phys.subject = "Physics"

    body = {
        "candidates": [
            {
                "finishReason": "STOP",
                "content": {
                    "parts": [
                        {
                            "text": json.dumps(
                                {
                                    "items": [
                                        calc.model_dump(),
                                        chem.model_dump(),
                                        phys.model_dump(),
                                    ]
                                }
                            )
                        }
                    ]
                },
            }
        ]
    }

    original = httpx.AsyncClient
    monkeypatch.setattr(
        gemini.httpx,
        "AsyncClient",
        lambda **kwargs: original(
            transport=httpx.MockTransport(lambda _: httpx.Response(200, json=body)), **kwargs
        ),
    )

    response = client.post(
        "/v1/extractions",
        headers={"X-Gemini-Api-Key": KEY},
        json={"text": "Mixed calculus, chemistry, and physics test sheet."},
    )
    assert response.status_code == 200, response.text
    payload = response.json()
    assert len(payload["verified_items"]) == 3
    assert {i["subject"] for i in payload["verified_items"]} == {
        "Mathematics",
        "Chemistry",
        "Physics",
    }
