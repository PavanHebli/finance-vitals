import streamlit as st
from modules.health import calculate_metrics, score_metrics, calculate_overall_score


def _seed_sim_values():
    # Read from _snap_* keys — manually set at form submission, never wiped by Streamlit.
    # Falls back to the widget-bound keys in case snapshot hasn't been written yet.
    def _get(key):
        return st.session_state.get(f"_snap_{key}") or st.session_state.get(key, 0.0)

    income = _get("income_main") + _get("income_additional")
    dining = _get("expenses_dining")
    shopping = _get("expenses_shopping")
    subs = _get("expenses_subscriptions")
    debt = _get("debt_monthly")

    st.session_state.sim_income        = int(income)
    st.session_state.sim_dining        = int(dining)
    st.session_state.sim_shopping      = int(shopping)
    st.session_state.sim_subscriptions = int(subs)
    st.session_state.sim_debt_payment  = int(debt)

    st.session_state.sim_income_max        = int(max(income * 2, 10000))
    st.session_state.sim_dining_max        = int(max(dining * 3, 600))
    st.session_state.sim_shopping_max      = int(max(shopping * 3, 600))
    st.session_state.sim_subscriptions_max = int(max(subs * 3, 300))
    st.session_state.sim_debt_payment_max  = int(max(debt * 3, 1500))


def _metric_delta_color(delta: float, inverse: bool = False) -> str:
    if abs(delta) < 0.01:
        return "off"
    return "inverse" if inverse else "normal"


def render_whatif_simulator(current_score: int, current_metric_scores: dict):
    st.caption(
        "Adjust any value to see how it would affect your score. "
        "Your original data is not changed."
    )

    # Reset button must sit BEFORE sliders so clearing keys happens before
    # sliders are instantiated — no st.rerun() needed, no tab position reset.
    if st.button("Reset to my current values", type="secondary"):
        for _k in ["sim_income", "sim_dining", "sim_shopping", "sim_subscriptions",
                   "sim_debt_payment", "sim_income_max", "sim_dining_max",
                   "sim_shopping_max", "sim_subscriptions_max", "sim_debt_payment_max"]:
            st.session_state.pop(_k, None)

    if "sim_income" not in st.session_state or "sim_income_max" not in st.session_state:
        _seed_sim_values()

    col1, col2 = st.columns(2)

    with col1:
        st.slider(
            "Total monthly income",
            min_value=0,
            max_value=st.session_state.sim_income_max,
            step=100,
            key="sim_income",
            help="Affects all 4 metrics — savings rate, debt-to-income, emergency fund, and housing ratio all divide by income."
        )
        st.slider(
            "Dining out / Food delivery",
            min_value=0,
            max_value=st.session_state.sim_dining_max,
            step=25,
            key="sim_dining",
            help="Affects savings rate and emergency fund months. Does not affect debt-to-income or housing ratio."
        )
        st.slider(
            "Shopping / Personal",
            min_value=0,
            max_value=st.session_state.sim_shopping_max,
            step=25,
            key="sim_shopping",
            help="Affects savings rate and emergency fund months. Does not affect debt-to-income or housing ratio."
        )

    with col2:
        st.slider(
            "Subscriptions",
            min_value=0,
            max_value=st.session_state.sim_subscriptions_max,
            step=5,
            key="sim_subscriptions",
            help="Affects savings rate and emergency fund months. Does not affect debt-to-income or housing ratio."
        )
        st.slider(
            "Monthly debt payment",
            min_value=0,
            max_value=st.session_state.sim_debt_payment_max,
            step=25,
            key="sim_debt_payment",
            help="Affects debt-to-income ratio only. DTI is calculated from your monthly payment amount, not total debt balance."
        )

    st.caption(
        "Housing ratio is not a slider — rent/mortgage is fixed. "
        "To see housing ratio change, adjust the income slider."
    )

    # All non-slider fields must come from _snap_ keys — widget-bound keys are wiped
    # on the results page because the form widgets are not rendering.
    _non_slider = [
        "expenses_rent", "expenses_groceries", "expenses_transport", "expenses_other",
        "savings_total", "investments_total", "debt_total",
    ]

    sim_state = dict(st.session_state)
    for k in _non_slider:
        snap = st.session_state.get(f"_snap_{k}")
        if snap is not None:
            sim_state[k] = snap
    sim_state["income_main"]            = float(st.session_state.sim_income)
    sim_state["income_additional"]      = 0.0
    sim_state["expenses_dining"]        = float(st.session_state.sim_dining)
    sim_state["expenses_shopping"]      = float(st.session_state.sim_shopping)
    sim_state["expenses_subscriptions"] = float(st.session_state.sim_subscriptions)
    sim_state["debt_monthly"]           = float(st.session_state.sim_debt_payment)

    sim_metrics       = calculate_metrics(sim_state)
    sim_metric_scores = score_metrics(sim_metrics)
    sim_score         = calculate_overall_score(sim_metric_scores)

    # cur_state uses original (pre-slider) values entirely from _snap_ keys.
    cur_state = dict(st.session_state)
    for k in _non_slider + ["income_main", "income_additional", "expenses_dining",
                             "expenses_shopping", "expenses_subscriptions", "debt_monthly"]:
        snap = st.session_state.get(f"_snap_{k}")
        if snap is not None:
            cur_state[k] = snap
    cur_metrics = calculate_metrics(cur_state)

    score_delta = sim_score - current_score
    cur_flow    = current_metric_scores["net_monthly_flow"]["value"]
    sim_flow    = sim_metrics["net_monthly_flow"]
    flow_delta  = sim_flow - cur_flow

    st.markdown("---")

    col1, col2, col3 = st.columns(3)
    with col1:
        st.metric("Current Score", f"{current_score} / 100")
    with col2:
        st.metric(
            "Simulated Score",
            f"{sim_score} / 100",
            delta=f"{score_delta:+d} pts" if score_delta != 0 else None,
        )
    with col3:
        st.metric(
            "Cash left / month",
            f"${sim_flow:,.0f}",
            delta=f"${flow_delta:+,.0f}" if abs(flow_delta) >= 1 else None,
        )

    st.markdown("##### How your metrics shift")
    st.caption("Green = improving · Red = worsening · Grey = unchanged.")

    d_sr  = round(sim_metrics["savings_rate"]          - cur_metrics["savings_rate"],          1)
    d_dti = round(sim_metrics["debt_to_income"]        - cur_metrics["debt_to_income"],         1)
    d_ef  = round(sim_metrics["emergency_fund_months"] - cur_metrics["emergency_fund_months"],  1)
    d_hr  = round(sim_metrics["housing_ratio"]         - cur_metrics["housing_ratio"],          1)

    m1, m2, m3, m4 = st.columns(4)
    with m1:
        st.metric(
            "Savings Rate",
            f"{sim_metrics['savings_rate']}%",
            delta=f"{d_sr:+.1f}%" if d_sr != 0 else None,
            delta_color=_metric_delta_color(d_sr),
            help="% of income left after expenses. Target: ≥20%."
        )
    with m2:
        st.metric(
            "Debt-to-Income",
            f"{sim_metrics['debt_to_income']}%",
            delta=f"{d_dti:+.1f}%" if d_dti != 0 else None,
            delta_color=_metric_delta_color(d_dti, inverse=True),
            help="Monthly debt payments as % of take-home income. Target: <20%."
        )
    with m3:
        st.metric(
            "Emergency Fund",
            f"{sim_metrics['emergency_fund_months']} mo",
            delta=f"{d_ef:+.1f} mo" if d_ef != 0 else None,
            delta_color=_metric_delta_color(d_ef),
            help="Months your savings would last if income stopped. Target: 3–6 mo."
        )
    with m4:
        st.metric(
            "Housing Ratio",
            f"{sim_metrics['housing_ratio']}%",
            delta=f"{d_hr:+.1f}%" if d_hr != 0 else None,
            delta_color=_metric_delta_color(d_hr, inverse=True),
            help="Rent as % of income. Target: ≤30%. Only income slider moves this."
        )
