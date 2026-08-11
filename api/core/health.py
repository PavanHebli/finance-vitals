_EXPENSE_KEYS = ["rent", "groceries", "transport", "subscriptions", "dining", "shopping", "other"]


def get_financial_context(state: dict) -> dict:
    s2 = state.get("section2_visible", False)
    s3 = state.get("section3_visible", False)
    s4 = state.get("section4_visible", False)

    total_expenses = sum(state.get(f"expenses_{k}", 0.0) for k in _EXPENSE_KEYS)

    ctx: dict = {
        "income":                  state.get("income_main", 0.0) + state.get("income_additional", 0.0),
        "total_expenses":          total_expenses,
        "expenses_total_estimate": state.get("expenses_total_estimate", total_expenses),
        "debt_monthly":            state.get("debt_monthly", 0.0),
        "s2": s2, "s3": s3, "s4": s4,
    }

    if s2:
        ctx["expenses"] = {k: state.get(f"expenses_{k}", 0.0) for k in _EXPENSE_KEYS}

    if s3:
        ctx["savings"]     = state.get("savings_total", 0.0)
        ctx["investments"] = state.get("investments_total", 0.0)
        ctx["debt_total"]  = state.get("debt_total", 0.0)

    if s4:
        ctx["age"]                  = state.get("age")
        ctx["employment"]           = state.get("employment")
        ctx["has_health_insurance"] = state.get("has_health_insurance", False)
        ctx["has_emergency_fund"]   = state.get("has_emergency_fund")
        ctx["contributing_401k"]    = state.get("contributing_401k")

    return ctx


def calculate_metrics(state: dict) -> dict:
    income = state.get("income_main", 0.0) + state.get("income_additional", 0.0)

    monthly_expenses = sum(state.get(f"expenses_{k}", 0.0) for k in _EXPENSE_KEYS)

    debt_payments = state.get("debt_monthly", 0.0)
    if state.get("debt_total", 0.0) == 0:
        debt_payments = 0.0
    savings = state.get("savings_total", 0.0)
    rent    = state.get("expenses_rent", 0.0)

    savings_rate   = ((income - monthly_expenses) / income * 100) if income > 0 else 0.0
    debt_to_income = (debt_payments / income * 100) if income > 0 else 0.0
    housing_ratio  = (rent / income * 100) if income > 0 else 0.0
    net_monthly_flow = income - monthly_expenses - debt_payments

    if monthly_expenses > 0:
        emergency_fund_months = savings / monthly_expenses
    elif income > 0:
        emergency_fund_months = savings / income
    else:
        emergency_fund_months = 0.0

    debt_payment_missing = (state.get("debt_total", 0.0) > 0 and debt_payments == 0.0)

    return {
        "savings_rate":          round(savings_rate, 1),
        "debt_to_income":        round(debt_to_income, 1),
        "emergency_fund_months": round(emergency_fund_months, 1),
        "housing_ratio":         round(housing_ratio, 1),
        "net_monthly_flow":      round(net_monthly_flow, 2),
        "debt_payment_missing":  debt_payment_missing,
    }


def score_metrics(metrics: dict) -> dict:
    scores = {}

    sr = metrics["savings_rate"]
    if sr < 0:
        scores["savings_rate"] = {"score": 0, "status": "danger"}
    elif sr < 10:
        scores["savings_rate"] = {"score": 10, "status": "warning"}
    elif sr < 20:
        scores["savings_rate"] = {"score": 18, "status": "ok"}
    else:
        scores["savings_rate"] = {"score": 25, "status": "good"}

    dti = metrics["debt_to_income"]
    if dti > 43:
        scores["debt_to_income"] = {"score": 0, "status": "danger"}
    elif dti > 20:
        scores["debt_to_income"] = {"score": 10, "status": "warning"}
    elif dti > 10:
        scores["debt_to_income"] = {"score": 18, "status": "ok"}
    elif metrics.get("debt_payment_missing"):
        scores["debt_to_income"] = {"score": 0, "status": "danger"}
    else:
        scores["debt_to_income"] = {"score": 25, "status": "good"}

    efm = metrics["emergency_fund_months"]
    if efm < 1:
        scores["emergency_fund_months"] = {"score": 0, "status": "danger"}
    elif efm < 3:
        scores["emergency_fund_months"] = {"score": 10, "status": "warning"}
    elif efm < 6:
        scores["emergency_fund_months"] = {"score": 18, "status": "ok"}
    else:
        scores["emergency_fund_months"] = {"score": 25, "status": "good"}

    hr = metrics["housing_ratio"]
    if hr > 50:
        scores["housing_ratio"] = {"score": 0, "status": "danger"}
    elif hr > 35:
        scores["housing_ratio"] = {"score": 10, "status": "warning"}
    elif hr > 25:
        scores["housing_ratio"] = {"score": 18, "status": "ok"}
    else:
        scores["housing_ratio"] = {"score": 25, "status": "good"}

    scores["net_monthly_flow"] = {"value": metrics["net_monthly_flow"]}

    return scores


def calculate_overall_score(metric_scores: dict) -> int:
    return (
        metric_scores["savings_rate"]["score"] +
        metric_scores["debt_to_income"]["score"] +
        metric_scores["emergency_fund_months"]["score"] +
        metric_scores["housing_ratio"]["score"]
    )


def get_mirror_label(score: int) -> dict:
    if score <= 30:
        return {"label": "Critical",  "description": "Your finances are under serious stress and need immediate attention."}
    elif score <= 50:
        return {"label": "At Risk",   "description": "You're vulnerable to financial shocks. Key areas need improvement."}
    elif score <= 70:
        return {"label": "Fair",      "description": "You're on the right track but there are gaps that need addressing."}
    elif score <= 85:
        return {"label": "Good",      "description": "Solid financial habits. Keep building on this foundation."}
    else:
        return {"label": "Healthy",   "description": "Your finances are in great shape. Stay consistent."}
