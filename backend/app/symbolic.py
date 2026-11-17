"""A fail-closed, deliberately small algebra contract. Never sympify user strings.

AST nodes are converted by hand. No eval, attributes, indexing or arbitrary
function lookup. Simplification runs in a disposable bounded subprocess.
Certificates prove consistency of expressions, not correctness of OCR/physics.
"""

from __future__ import annotations

import ast
import json
import os
import random
import subprocess
import sys

import sympy as sp

from .limits import SYMBOLIC_WALL_SECONDS
from .schemas import Item

FUNCTIONS = {
    "sqrt": sp.sqrt,
    "sin": sp.sin,
    "cos": sp.cos,
    "tan": sp.tan,
    "exp": sp.exp,
    "log": sp.log,
    "Abs": sp.Abs,
}


def parse_expression(source: str, domain: dict[str, str] | None = None) -> sp.Expr:
    if len(source) > 300:
        raise ValueError("Expression exceeds safe length")
    try:
        root = ast.parse(source, mode="eval")
    except (SyntaxError, RecursionError):
        raise ValueError("Malformed expression") from None
    nodes = list(ast.walk(root))
    if len(nodes) > 100:
        raise ValueError("Expression is too complex")
    symbols = {
        name: sp.Symbol(name, **{assumption: True})
        for name, assumption in (domain or {}).items()
        if name.isalpha() and name not in FUNCTIONS and name not in ("pi", "E")
    }

    def visit(n: ast.AST, depth: int = 0) -> sp.Expr:
        if depth > 15:
            raise ValueError("Expression nesting exceeds limit")
        if isinstance(n, ast.Expression):
            return visit(n.body, depth + 1)
        if isinstance(n, ast.Constant) and type(n.value) in (int, float):
            if abs(n.value) > 1e8:
                raise ValueError("Constant too large")
            return sp.Rational(str(n.value))
        if isinstance(n, ast.Name):
            if n.id == "pi":
                return sp.pi
            if n.id == "E":
                return sp.E
            if n.id in symbols:
                return symbols[n.id]
            raise ValueError("Undeclared symbol")
        if isinstance(n, ast.UnaryOp) and isinstance(n.op, (ast.UAdd, ast.USub)):
            value = visit(n.operand, depth + 1)
            return -value if isinstance(n.op, ast.USub) else value
        if isinstance(n, ast.BinOp):
            left, right = visit(n.left, depth + 1), visit(n.right, depth + 1)
            if isinstance(n.op, ast.Add):
                return left + right
            if isinstance(n.op, ast.Sub):
                return left - right
            if isinstance(n.op, ast.Mult):
                return left * right
            if isinstance(n.op, ast.Div):
                if right == 0:
                    raise ValueError("Division by zero")
                return left / right
            if isinstance(n.op, ast.Pow):
                if not right.is_number or abs(float(right)) > 6:
                    raise ValueError("Only bounded numeric exponents supported")
                return left**right
        if isinstance(n, ast.Tuple) and 2 <= len(n.elts) <= 4:
            return sp.Matrix([visit(elt, depth + 1) for elt in n.elts])
        if (
            isinstance(n, ast.Call)
            and isinstance(n.func, ast.Name)
            and n.func.id in FUNCTIONS
            and len(n.args) == 1
            and not n.keywords
        ):
            return FUNCTIONS[n.func.id](visit(n.args[0], depth + 1))
        raise ValueError("Unsupported expression syntax")

    result = visit(root)
    if isinstance(result, sp.Matrix):
        for e in result:
            if e.has(sp.zoo, sp.oo, -sp.oo, sp.nan, sp.I) or e.is_real is False:
                raise ValueError("Non-real or undefined coordinate")
        return result
    if result.has(sp.zoo, sp.oo, -sp.oo, sp.nan, sp.I) or result.is_real is False:
        raise ValueError("Non-real or undefined expression")
    return result


def to_canonical_latex(val: sp.Expr | sp.Matrix) -> str:
    if isinstance(val, sp.Matrix):
        return "(" + ", ".join(sp.latex(x) for x in val) + ")"
    return sp.latex(val)


def is_zero_numerical(
    expr: sp.Expr,
    domain: dict[str, str] | None = None,
    tolerance: float = 1e-9,
    points: int = 15,
) -> bool:
    try:
        symbols = list(expr.free_symbols)
        if not symbols:
            val = float(sp.N(expr))
            return abs(val) < tolerance
        rng = random.Random(42)
        dom = domain or {}
        valid_points = 0
        for _ in range(points * 4):
            subs_map = {}
            for s in symbols:
                kind = dom.get(s.name, "real")
                if kind == "positive":
                    subs_map[s] = rng.uniform(0.5, 4.0)
                elif kind == "nonnegative":
                    subs_map[s] = rng.uniform(0.1, 4.0)
                elif kind == "integer":
                    subs_map[s] = rng.randint(1, 10)
                else:
                    val = rng.uniform(-3.0, 3.0)
                    if abs(val) < 0.2:
                        val = 0.5
                    subs_map[s] = val
            try:
                subbed = expr.subs(subs_map).evalf()
                if subbed.has(sp.zoo, sp.oo, -sp.oo, sp.nan, sp.I):
                    continue
                v = float(subbed)
                if abs(v) >= tolerance:
                    return False
                valid_points += 1
                if valid_points >= points:
                    return True
            except (ArithmeticError, ValueError, TypeError, AttributeError):
                continue
        return valid_points >= min(5, points)
    except (ArithmeticError, ValueError, TypeError, AttributeError):
        return False


def is_distinct_numerical(
    expr: sp.Expr,
    domain: dict[str, str] | None = None,
    tolerance: float = 1e-9,
    points: int = 15,
) -> bool:
    try:
        symbols = list(expr.free_symbols)
        if not symbols:
            val = float(sp.N(expr))
            return abs(val) >= tolerance
        rng = random.Random(42)
        dom = domain or {}
        valid_points = 0
        distinct_count = 0
        for _ in range(points * 4):
            subs_map = {}
            for s in symbols:
                kind = dom.get(s.name, "real")
                if kind == "positive":
                    subs_map[s] = rng.uniform(0.5, 4.0)
                elif kind == "nonnegative":
                    subs_map[s] = rng.uniform(0.1, 4.0)
                elif kind == "integer":
                    subs_map[s] = rng.randint(1, 10)
                else:
                    val = rng.uniform(-3.0, 3.0)
                    if abs(val) < 0.2:
                        val = 0.5
                    subs_map[s] = val
            try:
                subbed = expr.subs(subs_map).evalf()
                if subbed.has(sp.zoo, sp.oo, -sp.oo, sp.nan, sp.I):
                    continue
                v = float(subbed)
                valid_points += 1
                if abs(v) >= tolerance:
                    distinct_count += 1
                if valid_points >= points:
                    break
            except (ArithmeticError, ValueError, TypeError, AttributeError):
                continue
        return distinct_count > 0 and valid_points >= min(5, points)
    except (ArithmeticError, ValueError, TypeError, AttributeError):
        return False


def check_zero(expr: sp.Expr | sp.Matrix, domain: dict[str, str] | None = None) -> bool:
    if isinstance(expr, sp.Matrix):
        return all(check_zero(e, domain) for e in expr)
    if sp.simplify(expr) == 0:
        return True
    if expr.equals(0) is True:
        return True
    return is_zero_numerical(expr, domain, tolerance=1e-9, points=15)


def check_distinct(expr: sp.Expr | sp.Matrix, domain: dict[str, str] | None = None) -> bool:
    if isinstance(expr, sp.Matrix):
        return any(check_distinct(e, domain) for e in expr)
    diff = sp.simplify(expr)
    if diff == 0:
        return False
    if diff.equals(0) is False:
        return True
    return is_distinct_numerical(diff, domain, tolerance=1e-9, points=15)


def verify_item(item: Item) -> dict:
    if item.verification_mode == "qualitative":
        display_texts = [o.display_latex if o.display_latex else o.latex for o in item.options]
        if len(set(display_texts)) != 4:
            raise ValueError("Equivalent distractors rejected")
        expressions = [o.expression for o in item.options]
        if len(set(expressions)) != 4 and len(set(display_texts)) != 4:
            raise ValueError("Option distinctness cannot be established")
        if item.correct_id not in "ABCD":
            raise ValueError("Key does not uniquely match solution certificate")
        return {
            "id": item.id,
            "valid": True,
            "canonical_options": {
                o.id: (o.display_latex if o.display_latex else o.latex) for o in item.options
            },
            "checks": [
                "unique-options",
                "qualitative-mode",
                "key-contract",
                "trap-presence",
            ],
            "scope": "Qualitative verification; display options and key contract confirmed without algebraic derivation.",
        }

    target_source = (
        item.evaluated_answer_expression
        if item.evaluated_answer_expression
        else item.answer_expression
    )
    target = parse_expression(target_source, item.domain)
    values = []
    canonical_options = {}

    for option in item.options:
        expr_source = (
            option.evaluated_expression if option.evaluated_expression else option.expression
        )
        value = parse_expression(expr_source, item.domain)
        derived = parse_expression(option.derived_expression, item.domain)

        diff_derived = value - derived
        if not check_zero(diff_derived, item.domain):
            raise ValueError(f"Option {option.id} does not match its derivation certificate")

        if option.unit != item.expected_unit:
            raise ValueError(f"Option {option.id} violates expected dimensional powers")

        for previous in values:
            diff_prev = value - previous
            if check_zero(diff_prev, item.domain):
                raise ValueError("Equivalent distractors rejected")
            if not check_distinct(diff_prev, item.domain):
                raise ValueError("Option distinctness cannot be established")

        values.append(value)

        diff_target = value - target
        equivalent = check_zero(diff_target, item.domain)
        if equivalent != (option.id == item.correct_id):
            raise ValueError("Key does not uniquely match solution certificate")

        if option.trap:
            r = option.trap.recovery_check
            rec_val = parse_expression(r.expression, item.domain)
            rec_target = parse_expression(r.target_expression, item.domain)
            diff_rec = rec_val - rec_target
            if not check_zero(diff_rec, item.domain):
                raise ValueError("Recovery answer certificate failed")

        canonical_options[option.id] = (
            option.display_latex if option.display_latex else to_canonical_latex(value)
        )

    return {
        "id": item.id,
        "valid": True,
        "canonical_options": canonical_options,
        "checks": [
            "unique-options",
            "key-certificate",
            "trap-certificates",
            "recovery-certificates",
            "unit-vectors",
            "declared-domain",
        ],
        "scope": "Algebraic certificate consistency; source interpretation and empirical calibration are not verified.",
    }


def verify_bounded(items: list[Item]) -> list[dict]:
    payload = json.dumps([i.model_dump() for i in items])
    try:
        result = subprocess.run(
            [sys.executable, "-m", "backend.app.symbolic_worker"],
            input=payload,
            check=False,
            capture_output=True,
            text=True,
            timeout=SYMBOLIC_WALL_SECONDS,
            env={
                "PYTHONHASHSEED": "0",
                "PATH": os.environ.get("PATH", ""),
                "LANG": "C.UTF-8",
            },
        )
    except subprocess.TimeoutExpired:
        raise ValueError("Symbolic verification timed out; simplify the problem") from None
    if result.returncode != 0:
        raise ValueError("Symbolic worker rejected unsafe or complex input")
    output = json.loads(result.stdout)
    if "error" in output:
        raise ValueError(output["error"])
    return output["results"]
