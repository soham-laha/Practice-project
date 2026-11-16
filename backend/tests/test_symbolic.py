import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from backend.app.schemas import Item
from backend.app.symbolic import parse_expression, verify_bounded, verify_item


@pytest.fixture
def items():
    return [Item.model_validate(i) for i in json.loads(Path("data/seed-items.json").read_text())]


def test_every_reference_certificate_passes(items):
    assert len(items) == 12
    assert all(r["valid"] for r in verify_bounded(items))


def test_equivalent_distractors_rejected(items):
    i = items[0].model_copy(deep=True)
    i.options[2].expression = i.options[2].derived_expression = "1/sqrt(2)"
    i.options[3].expression = i.options[3].derived_expression = "sqrt(2)/2"
    with pytest.raises(ValueError, match="Equivalent distractors"):
        verify_item(i)


def test_wrong_key_and_derivation_rejected(items):
    i = items[0].model_copy(deep=True)
    i.answer_expression = "99"
    with pytest.raises(ValueError, match="Key"):
        verify_item(i)
    i = items[0].model_copy(deep=True)
    i.options[0].derived_expression = "99"
    with pytest.raises(ValueError, match="derivation"):
        verify_item(i)


def test_dimension_and_recovery_certificates(items):
    i = items[0].model_copy(deep=True)
    i.options[0].unit = [1, 0, 0]
    with pytest.raises(ValueError, match="dimensional"):
        verify_item(i)
    i = items[0].model_copy(deep=True)
    i.options[0].trap.recovery_check.target_expression = "999"
    with pytest.raises(ValueError, match="Recovery"):
        verify_item(i)


def test_domain_assumptions_and_real_values():
    assert str(parse_expression("sqrt(x**2)", {"x": "positive"})) == "x"
    assert str(parse_expression("sqrt(x**2)", {"x": "real"})) == "Abs(x)"
    with pytest.raises(ValueError):
        parse_expression("x", {})


@pytest.mark.parametrize(
    "expression",
    [
        '__import__("os").system("id")',
        "(1).__class__",
        "[1][0]",
        "lambda:1",
        "1/0",
        "sqrt(-1)",
        "2**999999",
        "x**x",
        "9" * 305,
        "sum([1,2])",
        "log(0)",
        "10**6**6",
    ],
)
def test_unsafe_or_malformed_input_is_rejected(expression):
    with pytest.raises(ValueError):
        parse_expression(expression, {"x": "real"})


def test_contract_requires_one_key_three_traps(items):
    raw = items[0].model_dump()
    raw["options"][0]["trap"] = None
    with pytest.raises(ValidationError):
        Item.model_validate(raw)
    raw = items[0].model_dump()
    raw["exam"] = "advanced"
    with pytest.raises(ValidationError):
        Item.model_validate(raw)
