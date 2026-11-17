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


def test_coordinate_options_and_vectors_supported(items):
    coord_item = items[0].model_copy(deep=True)
    coord_item.prompt = "Find the coordinates of the point of intersection of the straight lines $2x - 3y = 1$ and $5y - x = 3$."
    coord_item.answer_expression = "(2, 1)"
    coord_item.options[0].latex = "(1, 2)"
    coord_item.options[0].expression = "(1, 2)"
    coord_item.options[0].derived_expression = "(1, 2)"
    coord_item.options[1].latex = "(2, 1)"
    coord_item.options[1].expression = "(2, 1)"
    coord_item.options[1].derived_expression = "(2, 1)"
    coord_item.options[2].latex = "(2, -1)"
    coord_item.options[2].expression = "(2, -1)"
    coord_item.options[2].derived_expression = "(2, -1)"
    coord_item.options[3].latex = "(-2, 1)"
    coord_item.options[3].expression = "(-2, 1)"
    coord_item.options[3].derived_expression = "(-2, 1)"
    result = verify_item(coord_item)
    assert result["valid"] is True
    assert result["canonical_options"]["A"] == "(1, 2)"
    assert result["canonical_options"]["B"] == "(2, 1)"
    assert result["canonical_options"]["C"] == "(2, -1)"
    assert result["canonical_options"]["D"] == "(-2, 1)"


def test_qualitative_mode_organic_chemistry(items):
    chem_item = items[0].model_copy(deep=True)
    chem_item.subject = "Chemistry"
    chem_item.topic = "Organic Reactions"
    chem_item.prompt = (
        "Identify the major product obtained when 2-bromobutane is heated with alcoholic KOH."
    )
    chem_item.verification_mode = "qualitative"
    chem_item.options[0].latex = "butan-1-ol"
    chem_item.options[0].expression = "1"
    chem_item.options[1].latex = "but-2-ene"
    chem_item.options[1].expression = "2"
    chem_item.options[2].latex = "but-1-ene"
    chem_item.options[2].expression = "3"
    chem_item.options[3].latex = "butan-2-ol"
    chem_item.options[3].expression = "4"
    result = verify_item(chem_item)
    assert result["valid"] is True
    assert "qualitative-mode" in result["checks"]
    assert result["canonical_options"]["B"] == "but-2-ene"


def test_calculus_dual_display_evaluated_fields(items):
    calc_item = items[0].model_copy(deep=True)
    calc_item.subject = "Mathematics"
    calc_item.topic = "Definite Integrals"
    calc_item.prompt = "Evaluate the definite integral $\\int_0^1 3x^2 dx$."
    calc_item.answer_expression = "1"
    calc_item.evaluated_answer_expression = "1"
    calc_item.options[0].display_latex = "\\int_0^1 2x dx = 1"
    calc_item.options[0].expression = "1"
    calc_item.options[0].evaluated_expression = "1"
    calc_item.options[0].derived_expression = "1"
    calc_item.options[1].display_latex = "\\int_0^1 3x^2 dx = 1"
    calc_item.options[1].expression = "1"
    calc_item.options[1].evaluated_expression = "1"
    calc_item.options[1].derived_expression = "1"
    calc_item.options[2].display_latex = "\\int_0^1 4x^3 dx = 1"
    calc_item.options[2].expression = "2"
    calc_item.options[2].evaluated_expression = "2"
    calc_item.options[2].derived_expression = "2"
    calc_item.options[3].display_latex = "\\int_0^1 x dx = 1/2"
    calc_item.options[3].expression = "3"
    calc_item.options[3].evaluated_expression = "3"
    calc_item.options[3].derived_expression = "3"
    # Option B is correct key
    calc_item.options[0].expression = "4"
    calc_item.options[0].evaluated_expression = "4"
    calc_item.options[0].derived_expression = "4"
    result = verify_item(calc_item)
    assert result["valid"] is True
    assert result["canonical_options"]["B"] == "\\int_0^1 3x^2 dx = 1"


def test_numerical_fallback_trigonometric_logarithmic():
    import sympy as sp

    from backend.app.symbolic import check_distinct, check_zero

    x = sp.Symbol("x", positive=True)
    # Logarithmic identity: log(2*x) - log(x) - log(2) == 0
    log_id = sp.log(2 * x) - sp.log(x) - sp.log(2)
    assert check_zero(log_id, {"x": "positive"}) is True

    # Trigonometric identity: sin(x)**2 + cos(x)**2 - 1 == 0
    trig_id = sp.sin(x) ** 2 + sp.cos(x) ** 2 - 1
    assert check_zero(trig_id, {"x": "positive"}) is True

    # Distinct non-zero check
    diff = sp.sin(x) - sp.cos(x)
    assert check_distinct(diff, {"x": "positive"}) is True
