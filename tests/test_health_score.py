"""
Scoring tests for api/core/health.py. No server, no API keys.

Run from the repo root:
    python tests/test_health_score.py
Or, if pytest is installed:
    pytest tests/test_health_score.py
"""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "api"))

from core.health import (
    calculate_metrics,
    calculate_overall_score,
    get_mirror_label,
    score_metrics,
)


def person(**overrides):
    """A person's monthly numbers. Everything not given is zero."""
    base = dict(
        income_main=0, income_additional=0,
        expenses_rent=0, expenses_groceries=0, expenses_transport=0, expenses_subscriptions=0,
        expenses_dining=0, expenses_shopping=0, expenses_other=0,
        debt_total=0, debt_monthly=0, savings_total=0,
    )
    base.update(overrides)
    return base


def overall(state):
    metrics = calculate_metrics(state)
    return calculate_overall_score(score_metrics(metrics))


def test_no_savings_no_debt_cheap_rent_is_capped_at_at_risk():
    # Spends everything, $0 saved, rent 20% of pay. Used to score 60 ("Fair").
    state = person(income_main=4000, expenses_rent=800, expenses_groceries=1200, expenses_other=2000)
    score = overall(state)
    assert score == 50, score
    assert get_mirror_label(score)["label"] == "At Risk"


def test_no_savings_with_card_debt_is_capped_too():
    state = person(income_main=4000, expenses_rent=800, expenses_groceries=1200, expenses_other=1850,
                   debt_total=5000, debt_monthly=150)
    assert overall(state) <= 50


def test_a_good_saver_with_under_one_month_saved_is_capped():
    # Saves 20% of pay but only $500 in the bank (0.2 months). Used to score 75 ("Good").
    state = person(income_main=4000, expenses_rent=1000, expenses_groceries=800, expenses_other=1400,
                   savings_total=500)
    assert overall(state) == 50


def test_one_month_saved_lifts_the_cap():
    state = person(income_main=4000, expenses_rent=1000, expenses_groceries=800, expenses_other=1400,
                   savings_total=3200)  # exactly 1 month of the 3,200 spent
    metrics = calculate_metrics(state)
    scores = score_metrics(metrics)
    assert scores["emergency_fund_months"]["score"] == 10
    assert calculate_overall_score(scores) > 50


def test_example_on_the_landing_page_is_64_fair():
    # The made-up example on the landing page: keep this in step with web/src/app/page.tsx.
    metrics = {
        "savings_rate": 15, "debt_to_income": 12, "emergency_fund_months": 2.1,
        "housing_ratio": 31, "net_monthly_flow": 0, "debt_payment_missing": False,
    }
    scores = score_metrics(metrics)
    points = [scores[k]["score"] for k in
              ("savings_rate", "debt_to_income", "emergency_fund_months", "housing_ratio")]
    assert points == [18, 18, 10, 18], points
    total = calculate_overall_score(scores)
    assert total == 64, total
    assert get_mirror_label(total)["label"] == "Fair"


def test_thresholds_match_the_documented_steps():
    def pts(metric, value):
        base = {"savings_rate": 25, "debt_to_income": 0, "emergency_fund_months": 6,
                "housing_ratio": 0, "net_monthly_flow": 0, "debt_payment_missing": False}
        base[metric] = value
        return score_metrics(base)[metric]["score"]

    assert [pts("savings_rate", v) for v in (-1, 5, 15, 20)] == [0, 10, 18, 25]
    assert [pts("debt_to_income", v) for v in (50, 30, 15, 5)] == [0, 10, 18, 25]
    assert [pts("emergency_fund_months", v) for v in (0.5, 2, 4, 6)] == [0, 10, 18, 25]
    assert [pts("housing_ratio", v) for v in (60, 40, 30, 20)] == [0, 10, 18, 25]


if __name__ == "__main__":
    tests = [(name, fn) for name, fn in sorted(globals().items()) if name.startswith("test_")]
    failed = 0
    for name, fn in tests:
        try:
            fn()
            print(f"PASS  {name}")
        except AssertionError as e:
            failed += 1
            print(f"FAIL  {name}: {e}")
    print(f"\n{len(tests) - failed} passed, {failed} failed")
    sys.exit(1 if failed else 0)
