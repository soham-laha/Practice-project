"""Transparent, bounded estimators. Item parameters require empirical calibration.

beta_log and beta_seconds are deliberately different names: confusing them
would invalidate the log-normal speed estimate. No inference of confidence.
"""

from __future__ import annotations

import math
from collections.abc import Sequence
from dataclasses import dataclass


@dataclass(frozen=True)
class ItemResponse:
    a: float
    b: float
    c: float
    correct: bool


def _finite(*xs: float) -> None:
    if any(not math.isfinite(x) for x in xs):
        raise ValueError("Expected finite parameters")


def three_pl(theta: float, a: float, b: float, c: float = 0.25) -> float:
    _finite(theta, a, b, c)
    if a <= 0 or not 0 <= c < 1:
        raise ValueError("a > 0 and 0 <= c < 1 required")
    z = max(-700, min(700, 1.702 * a * (theta - b)))
    return c + (1 - c) / (1 + math.exp(-z))


def ability_mle(responses: Sequence[ItemResponse]) -> dict:
    if not responses:
        return {
            "theta": 0.0,
            "se": None,
            "information": 0.0,
            "stability": "Early estimate",
        }

    def ll(t: float) -> float:
        total = 0.0
        for r in responses:
            p = max(1e-12, min(1 - 1e-12, three_pl(t, r.a, r.b, r.c)))
            total += math.log(p if r.correct else 1 - p)
        return total

    # Coarse search avoids a wrong local stationary point in non-concave 3PL
    # likelihoods. Then use bounded finite-difference Newton with line search.
    grid = [-3 + i * 0.025 for i in range(241)]
    theta = max(grid, key=ll)
    h = 1e-4
    for _ in range(60):
        f = ll(theta)
        gradient = (ll(theta + h) - ll(theta - h)) / (2 * h)
        curvature = (ll(theta + h) - 2 * f + ll(theta - h)) / (h * h)
        if curvature >= -1e-10:
            break
        step = max(-0.5, min(0.5, gradient / curvature))
        candidate = max(-3.0, min(3.0, theta - step))
        for _ in range(16):
            if ll(candidate) >= f - 1e-12:
                break
            candidate = (candidate + theta) / 2
        if abs(candidate - theta) < 1e-7:
            theta = candidate
            break
        theta = candidate
    information = 0.0
    for r in responses:
        p = three_pl(theta, r.a, r.b, r.c)
        dp = (three_pl(theta + h, r.a, r.b, r.c) - three_pl(theta - h, r.a, r.b, r.c)) / (2 * h)
        information += dp * dp / max(1e-12, p * (1 - p))
    return {
        "theta": theta,
        "se": 1 / math.sqrt(information) if information else None,
        "information": information,
        "stability": "Provisional"
        if len(responses) >= 10 and information >= 4
        else "Early estimate",
    }


def nominal_response(
    theta: float, slopes: Sequence[float], intercepts: Sequence[float]
) -> list[float]:
    if len(slopes) != 4 or len(intercepts) != 4:
        raise ValueError("Exactly four options required")
    _finite(theta, *slopes, *intercepts)
    logits = [a * theta + c for a, c in zip(slopes, intercepts, strict=True)]
    top = max(logits)
    weights = [math.exp(x - top) for x in logits]
    return [w / sum(weights) for w in weights]


def log_time_speed(
    times: Sequence[float], beta_logs: Sequence[float], alphas: Sequence[float]
) -> dict:
    if not times or len(times) != len(beta_logs) or len(times) != len(alphas):
        raise ValueError("Matching nonempty observations required")
    _finite(*times, *beta_logs, *alphas)
    if any(t <= 0 for t in times) or any(a <= 0 for a in alphas):
        raise ValueError("Positive times and precisions required")
    precision = sum(a * a for a in alphas)
    tau = (
        sum(a * a * (b - math.log(t)) for a, b, t in zip(alphas, beta_logs, times, strict=True))
        / precision
    )
    return {"tau": tau, "se": 1 / math.sqrt(precision)}


def pressure_adjusted(
    theta: float,
    t: float,
    beta_seconds: float,
    grace: float = 0,
    haste_lambda: float = 0.15,
    delta: float = 0.22,
) -> float:
    _finite(theta, t, beta_seconds, grace, haste_lambda, delta)
    if t <= 0 or beta_seconds <= 0 or min(grace, haste_lambda, delta) < 0:
        raise ValueError("Invalid timing parameters")
    # Do not clamp: the exact SATO formula can fall outside the base theta bounds.
    return (
        theta
        - haste_lambda * max(0.0, beta_seconds / t - 1)
        - delta * math.log1p(grace / beta_seconds)
    )


def calibration(confidences: Sequence[float], outcomes: Sequence[int]) -> dict:
    if len(confidences) != len(outcomes) or not confidences:
        raise ValueError("Matching nonempty observations required")
    _finite(*confidences, *outcomes)
    if any(not 0 <= f <= 1 for f in confidences) or any(o not in (0, 1) for o in outcomes):
        raise ValueError("Invalid probabilities or outcomes")
    n = len(outcomes)
    bins = [[] for _ in range(5)]
    for f, o in zip(confidences, outcomes, strict=True):
        bins[min(4, int(f * 5))].append((f, o))
    ece = sum(
        len(b) / n * abs(sum(o for _, o in b) / len(b) - sum(f for f, _ in b) / len(b))
        for b in bins
        if b
    )
    return {
        "brier": sum((f - o) ** 2 for f, o in zip(confidences, outcomes, strict=True)) / n,
        "ece": ece,
    }
