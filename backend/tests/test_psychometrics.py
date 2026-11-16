import math

import pytest

from backend.app.psychometrics import (
    ItemResponse,
    ability_mle,
    calibration,
    log_time_speed,
    nominal_response,
    pressure_adjusted,
    three_pl,
)


def test_three_pl_reference():
    assert three_pl(0, 1, 0, 0.25) == pytest.approx(0.625)
    assert three_pl(3, 1, 0) > three_pl(0, 1, 0) > three_pl(-3, 1, 0)


def test_mle_bounds_extremes_and_empty():
    assert ability_mle([])["theta"] == 0
    assert ability_mle([ItemResponse(1, 0, 0.25, True)] * 10)["theta"] == 3
    assert ability_mle([ItemResponse(1, 0, 0.25, False)] * 10)["theta"] == -3


def test_mle_converges_at_known_probability():
    # 5/8 correct is exactly P(theta=0) with a=1,b=0,c=.25.
    responses = [ItemResponse(1, 0, 0.25, i < 50) for i in range(80)]
    result = ability_mle(responses)
    assert result["theta"] == pytest.approx(0, abs=1e-5)
    assert result["information"] > 0
    assert result["se"] > 0


def test_mle_mixed_difficulty_global_max():
    responses = [
        ItemResponse(1.2, -1, 0.25, True),
        ItemResponse(0.8, 1, 0.25, False),
    ] * 10
    result = ability_mle(responses)

    def ll(t):
        return sum(
            math.log(three_pl(t, r.a, r.b, r.c) if r.correct else 1 - three_pl(t, r.a, r.b, r.c))
            for r in responses
        )

    assert all(ll(result["theta"]) >= ll(-3 + i * 0.01) - 1e-6 for i in range(601))


def test_nrm_stable_normalization():
    p = nominal_response(3, [1000, 1001, -1000, 0], [0, 0, 0, 0])
    assert sum(p) == pytest.approx(1)
    assert all(0 <= x <= 1 for x in p)
    assert nominal_response(0, [1, 2, 3, 4], [0, 0, 0, 0]) == pytest.approx([0.25] * 4)


def test_van_der_linden_precision_weighted():
    result = log_time_speed([100, 200], [math.log(200), math.log(200)], [2, 1])
    assert result["tau"] == pytest.approx(4 * math.log(2) / 5)
    assert result["se"] == pytest.approx(1 / math.sqrt(5))


def test_sato_exact_haste_and_grace():
    assert pressure_adjusted(1, 90, 180, 60) == pytest.approx(
        1 - 0.15 - 0.22 * math.log1p(60 / 180)
    )
    assert pressure_adjusted(1, 200, 180, 0) == 1
    assert pressure_adjusted(1, 25, 180, 120) < pressure_adjusted(1, 25, 180, 0)
    assert pressure_adjusted(-3, 1, 180) < -3  # Formula must not be silently clipped.


def test_calibration_brier_ece_bins():
    assert calibration([1, 0], [1, 0]) == {"brier": 0, "ece": 0}
    r = calibration([0.9, 0.9, 0.1, 0.1], [1, 0, 1, 0])
    assert r["brier"] == pytest.approx(0.41)
    assert r["ece"] == pytest.approx(0.4)
    assert calibration([0.2, 0.4, 0.6, 0.8, 1], [0, 0, 1, 1, 1])["ece"] >= 0


@pytest.mark.parametrize(
    "fn,args",
    [
        (three_pl, (0, 0, 0, 0.25)),
        (three_pl, (float("nan"), 1, 0, 0.25)),
        (nominal_response, (0, [1], [0])),
        (log_time_speed, ([0], [1], [1])),
        (log_time_speed, ([1], [1], [0])),
        (log_time_speed, ([1], [], [1])),
        (pressure_adjusted, (1, 0, 180)),
        (pressure_adjusted, (1, 1, 180, -1)),
        (calibration, ([], [])),
        (calibration, ([1.1], [1])),
        (calibration, ([0.2], [2])),
    ],
)
def test_invalid_inputs_fail_closed(fn, args):
    with pytest.raises(ValueError):
        fn(*args)
