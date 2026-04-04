
def calculate_metrics(state) -> dict:
    """
    Computes raw financial metrics from session state.
    Pure math — no scoring, no UI.

    Returns a dict with:
      - savings_rate          : % of income retained after expenses
      - debt_to_income        : % of income going to debt payments
      - emergency_fund_months : months of expenses covered by savings
      - housing_ratio         : % of income going to rent/mortgage
      - net_monthly_flow      : cash left after expenses and debt payments
    """
    income = state.get("income_main", 0.0) + state.get("income_additional", 0.0)

    monthly_expenses = (
        state.get("expenses_rent", 0.0) +
        state.get("expenses_groceries", 0.0) +
        state.get("expenses_transport", 0.0) +
        state.get("expenses_subscriptions", 0.0) +
        state.get("expenses_dining", 0.0) +
        state.get("expenses_shopping", 0.0) +
        state.get("expenses_other", 0.0)
    )

    debt_payments = state.get("debt_monthly", 0.0)
    savings = state.get("savings_total", 0.0)
    rent = state.get("expenses_rent", 0.0)

    savings_rate = ((income - monthly_expenses) / income * 100) if income > 0 else 0.0
    debt_to_income = (debt_payments / income * 100) if income > 0 else 0.0
    housing_ratio = (rent / income * 100) if income > 0 else 0.0
    net_monthly_flow = income - monthly_expenses - debt_payments

    if monthly_expenses > 0:
        emergency_fund_months = savings / monthly_expenses
    elif income > 0:
        emergency_fund_months = savings / income  # expenses=0, all income goes to savings
    else:
        emergency_fund_months = 0.0  # no data entered

    return {
        "savings_rate": round(savings_rate, 1),
        "debt_to_income": round(debt_to_income, 1),
        "emergency_fund_months": round(emergency_fund_months, 1),
        "housing_ratio": round(housing_ratio, 1),
        "net_monthly_flow": round(net_monthly_flow, 2),
    }


def score_metrics(metrics: dict) -> dict:
    """
    Converts raw metrics into 0-25 scores with status labels.
    Net monthly flow is not scored — returned as raw value only.

    Status labels: "danger", "warning", "ok", "good"
    Each of the 4 scored metrics: 0-25. Total possible = 100.
    """
    scores = {}

    # Savings Rate — based on 50/30/20 rule (20% target)
    sr = metrics["savings_rate"]
    if sr < 0:
        scores["savings_rate"] = {"score": 0, "status": "danger"}
    elif sr < 10:
        scores["savings_rate"] = {"score": 10, "status": "warning"}
    elif sr < 20:
        scores["savings_rate"] = {"score": 18, "status": "ok"}
    else:
        scores["savings_rate"] = {"score": 25, "status": "good"}

    # Debt-to-Income — CFPB qualified mortgage threshold is 43%
    dti = metrics["debt_to_income"]
    if dti > 43:
        scores["debt_to_income"] = {"score": 0, "status": "danger"}
    elif dti > 20:
        scores["debt_to_income"] = {"score": 10, "status": "warning"}
    elif dti > 10:
        scores["debt_to_income"] = {"score": 18, "status": "ok"}
    else:
        scores["debt_to_income"] = {"score": 25, "status": "good"}

    # Emergency Fund — Fidelity/Vanguard recommend 3-6 months
    efm = metrics["emergency_fund_months"]
    if efm < 1:
        scores["emergency_fund_months"] = {"score": 0, "status": "danger"}
    elif efm < 3:
        scores["emergency_fund_months"] = {"score": 10, "status": "warning"}
    elif efm < 6:
        scores["emergency_fund_months"] = {"score": 18, "status": "ok"}
    else:
        scores["emergency_fund_months"] = {"score": 25, "status": "good"}

    # Housing Ratio — HUD 30% affordability rule
    hr = metrics["housing_ratio"]
    if hr > 50:
        scores["housing_ratio"] = {"score": 0, "status": "danger"}
    elif hr > 35:
        scores["housing_ratio"] = {"score": 10, "status": "warning"}
    elif hr > 25:
        scores["housing_ratio"] = {"score": 18, "status": "ok"}
    else:
        scores["housing_ratio"] = {"score": 25, "status": "good"}

    # Net monthly flow — raw value only, not scored
    scores["net_monthly_flow"] = {"value": metrics["net_monthly_flow"]}

    return scores


def calculate_overall_score(metric_scores: dict) -> int:
    """
    Sums the 4 scored metrics into a single 0-100 health score.
    Equal weighting — each metric contributes 0-25 points.
    """
    total = (
        metric_scores["savings_rate"]["score"] +
        metric_scores["debt_to_income"]["score"] +
        metric_scores["emergency_fund_months"]["score"] +
        metric_scores["housing_ratio"]["score"]
    )
    return total


def get_mirror_label(score: int) -> dict:
    """
    Maps a 0-100 health score to a simple, honest label + description.
    Returns dict with 'label' and 'description'.
    """
    if score <= 30:
        return {"label": "Critical", "description": "Your finances are under serious stress and need immediate attention."}
    elif score <= 50:
        return {"label": "At Risk", "description": "You're vulnerable to financial shocks. Key areas need improvement."}
    elif score <= 70:
        return {"label": "Fair", "description": "You're on the right track but there are gaps that need addressing."}
    elif score <= 85:
        return {"label": "Good", "description": "Solid financial habits. Keep building on this foundation."}
    else:
        return {"label": "Healthy", "description": "Your finances are in great shape. Stay consistent."}
