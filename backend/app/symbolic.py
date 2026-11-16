"""A fail-closed, deliberately small algebra contract. Never sympify user strings.

AST nodes are converted by hand. No eval, attributes, indexing or arbitrary
function lookup. Simplification runs in a disposable bounded subprocess.
Certificates prove consistency of expressions, not correctness of OCR/physics.
"""

from __future__ import annotations

import ast
import json
import os
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
    if result.has(sp.zoo, sp.oo, -sp.oo, sp.nan, sp.I) or result.is_real is False:
        raise ValueError("Non-real or undefined expression")
    return result


def verify_item(item: Item) -> dict:
    target = parse_expression(item.answer_expression, item.domain)
    values = []
    for option in item.options:
        value = parse_expression(option.expression, item.domain)
        derived = parse_expression(option.derived_expression, item.domain)
        if sp.simplify(value - derived) != 0:
            raise ValueError(f"Option {option.id} does not match its derivation certificate")
        if option.unit != item.expected_unit:
            raise ValueError(f"Option {option.id} violates expected dimensional powers")
        for previous in values:
            difference = sp.simplify(value - previous)
            if difference == 0:
                raise ValueError("Equivalent distractors rejected")
            # Require a proof of non-identity, not merely an unproven != 0.
            if difference.equals(0) is not False:
                raise ValueError("Option distinctness cannot be established")
        values.append(value)
        equivalent = sp.simplify(value - target) == 0
        if equivalent != (option.id == item.correct_id):
            raise ValueError("Key does not uniquely match solution certificate")
        if option.trap:
            r = option.trap.recovery_check
            if (
                sp.simplify(
                    parse_expression(r.expression, item.domain)
                    - parse_expression(r.target_expression, item.domain)
                )
                != 0
            ):
                raise ValueError("Recovery answer certificate failed")
    return {
        "id": item.id,
        "valid": True,
        "canonical_options": {o.id: sp.latex(v) for o, v in zip(item.options, values, strict=True)},
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
