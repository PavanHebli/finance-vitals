import streamlit as st
import plotly.graph_objects as go
from modules.health import calculate_metrics, score_metrics, calculate_overall_score, get_mirror_label
from modules.narrative import build_prompt, call_llm
from modules.education import render_education
from modules.simulator import render_whatif_simulator
from modules.storage import create_snapshot, append_or_overwrite, to_finfd


_SIM_KEYS = ["sim_income", "sim_dining", "sim_shopping", "sim_subscriptions", "sim_debt_payment"]


def render_health_score(score: int, mirror: dict):
    """
    Displays the overall health score and mirror label, centered.
    """
    st.markdown("<h2 style='text-align: center;'>Your Financial Score</h2>", unsafe_allow_html=True)

    col1, col2, col3 = st.columns([1, 2, 1])
    with col2:
        st.markdown(f"<h1 style='text-align: center;'>{score} / 100</h1>", unsafe_allow_html=True)

        color_map = {
            "Critical": "#FF4B4B",
            "At Risk":  "#FF8C00",
            "Fair":     "#FFD700",
            "Good":     "#1C83E1",
            "Healthy":  "#00C853",
        }
        color = color_map.get(mirror["label"], "#FFFFFF")

        st.markdown(
            f"<h3 style='text-align: center; color: {color};'>{mirror['label']}</h3>",
            unsafe_allow_html=True
        )
        st.markdown(
            f"<p style='text-align: center;'>{mirror['description']}</p>",
            unsafe_allow_html=True
        )


def render_metrics_breakdown(metrics: dict, metric_scores: dict):
    """
    Displays each scored metric as a row with raw value, status, and score.
    Net monthly flow shown separately at the bottom.
    """
    st.markdown("### Breakdown")

    color_map = {
        "danger":  "#FF4B4B",
        "warning": "#FF8C00",
        "ok":      "#FFD700",
        "good":    "#00C853",
    }

    rows = [
        ("Savings Rate",   f"{metrics['savings_rate']}%",           metric_scores["savings_rate"]),
        ("Debt-to-Income", f"{metrics['debt_to_income']}%",          metric_scores["debt_to_income"]),
        ("Emergency Fund", f"{metrics['emergency_fund_months']} mo", metric_scores["emergency_fund_months"]),
        ("Housing Ratio",  f"{metrics['housing_ratio']}%",           metric_scores["housing_ratio"]),
    ]

    for name, value, score_data in rows:
        col1, col2, col3, col4 = st.columns([3, 2, 2, 1])
        color = color_map[score_data["status"]]
        dot = f"<span style='color:{color}; font-size:18px;'>&#9679;</span>"
        with col1:
            st.markdown(f"**{name}**")
        with col2:
            st.markdown(value)
        with col3:
            st.markdown(f"{dot} {score_data['status'].capitalize()}", unsafe_allow_html=True)
        with col4:
            st.markdown(f"{score_data['score']}/25")

    st.markdown("---")

    flow = metric_scores["net_monthly_flow"]["value"]
    flow_color = "#00C853" if flow >= 0 else "#FF4B4B"
    st.markdown(
        f"<b>Cash left this month:</b> <span style='color:{flow_color};'>${flow:,.2f}</span>",
        unsafe_allow_html=True
    )


def render_expense_chart(state: dict, metrics: dict, metric_scores: dict):
    """
    Horizontal bar chart showing each expense category as % of income.
    Bars sorted largest to smallest. Housing bar colored by its status.
    Dashed reference line at 30% (HUD housing benchmark).
    """
    income = state.get("income_main", 0.0) + state.get("income_additional", 0.0)
    if income == 0:
        return

    raw = {
        "Rent / Mortgage":  state.get("expenses_rent", 0.0),
        "Groceries":        state.get("expenses_groceries", 0.0),
        "Transport":        state.get("expenses_transport", 0.0),
        "Subscriptions":    state.get("expenses_subscriptions", 0.0),
        "Dining out":       state.get("expenses_dining", 0.0),
        "Shopping":         state.get("expenses_shopping", 0.0),
        "Other":            state.get("expenses_other", 0.0),
    }

    # Drop zero-value categories
    raw = {k: v for k, v in raw.items() if v > 0}
    if not raw:
        return

    # Sort largest to smallest so the longest bar is at the top
    raw = dict(sorted(raw.items(), key=lambda x: x[1], reverse=True))

    labels      = list(raw.keys())
    amounts     = list(raw.values())
    percentages = [v / income * 100 for v in amounts]

    status_colors = {
        "danger":  "#FF4B4B",
        "warning": "#FF8C00",
        "ok":      "#1C83E1",
        "good":    "#00C853",
    }

    colors = []
    for label in labels:
        if label == "Rent / Mortgage":
            colors.append(status_colors[metric_scores["housing_ratio"]["status"]])
        else:
            colors.append("#4A90D9")

    fig = go.Figure()

    fig.add_trace(go.Bar(
        y=labels,
        x=percentages,
        orientation="h",
        marker_color=colors,
        text=[f"${a:,.0f}  ({p:.1f}%)" for a, p in zip(amounts, percentages)],
        textposition="outside",
        cliponaxis=False,
    ))

    # HUD housing benchmark reference line
    fig.add_vline(
        x=30,
        line_dash="dash",
        line_color="rgba(255,255,255,0.25)",
        annotation_text="30% housing limit",
        annotation_font_color="rgba(255,255,255,0.45)",
        annotation_position="top right",
    )

    fig.update_layout(
        xaxis_title="% of Monthly Income",
        xaxis=dict(range=[0, max(max(percentages) * 1.45, 35)]),
        yaxis=dict(autorange="reversed"),
        plot_bgcolor="rgba(0,0,0,0)",
        paper_bgcolor="rgba(0,0,0,0)",
        font=dict(color="white", size=13),
        height=50 + len(labels) * 45,
        margin=dict(l=10, r=10, t=10, b=30),
        showlegend=False,
    )

    st.plotly_chart(fig, width="stretch")


def render_results_panel():
    # Compute metrics first — needed by both the save button and the rest of the page
    metrics       = calculate_metrics(st.session_state)
    metric_scores = score_metrics(metrics)
    overall_score = calculate_overall_score(metric_scores)
    mirror        = get_mirror_label(overall_score)

    # --- Top bar: back button + save button ---
    col_back, _, col_save = st.columns([2, 3, 2])
    with col_back:
        if st.button("← Edit my data"):
            st.session_state.pop("narrative_text", None)
            for key in _SIM_KEYS:
                st.session_state.pop(key, None)
            st.session_state.current_page = "form"
            st.rerun()
    with col_save:
        snapshot  = create_snapshot(
            dict(st.session_state),
            metrics,
            metric_scores,
            overall_score,
            mirror,
            st.session_state.get("narrative_text", ""),
        )
        snapshots = append_or_overwrite(
            list(st.session_state.get("loaded_snapshots", [])),
            snapshot,
        )
        st.download_button(
            "💾 Save snapshot",
            data=to_finfd(snapshots),
            file_name="my_finances.fin",
            mime="application/octet-stream",
            type="secondary",
        )

    if st.session_state.get("sample_input_active", False):
        st.warning("You're viewing sample input data. Enter your real numbers for an accurate picture.")

    st.markdown("---")

    render_health_score(overall_score, mirror)

    # Score delta vs previous snapshot
    if "previous_snapshot" in st.session_state:
        prev       = st.session_state.previous_snapshot
        prev_score = prev["outputs"]["overall_score"]
        prev_label = prev["outputs"]["mirror_label"]
        prev_date  = prev["saved_at"]
        delta      = overall_score - prev_score
        delta_str  = f"+{delta}" if delta > 0 else str(delta)
        color      = "#00C853" if delta > 0 else ("#FF4B4B" if delta < 0 else "#888888")
        st.markdown(
            f"<p style='text-align:center; color:{color};'>"
            f"vs {prev_date}: {prev_score}/100 ({prev_label}) &nbsp;·&nbsp; <b>{delta_str} pts</b>"
            f"</p>",
            unsafe_allow_html=True,
        )

    st.markdown("---")
    render_metrics_breakdown(metrics, metric_scores)
    st.caption("ℹ️ Ratios are calculated using take-home (after-tax) income — stricter than lender benchmarks, which use gross income.")
    st.markdown("---")
    render_expense_chart(st.session_state, metrics, metric_scores)
    st.markdown("---")

    tab1, tab2, tab3 = st.tabs(["Your Financial Story", "What If?", "Ask FinFriend"])

    with tab1:
        st.markdown(
            "<style> section[data-testid='stMain'] .stMarkdown p { font-size: 1.1rem; line-height: 1.8; } </style>",
            unsafe_allow_html=True
        )

        if "narrative_text" not in st.session_state:
            prompt = build_prompt(st.session_state, metrics, metric_scores, overall_score, mirror)
            try:
                result = st.write_stream(call_llm(
                    prompt,
                    st.session_state.llm_provider,
                    st.session_state.api_key
                ))
                st.session_state.narrative_text = result
            except Exception as e:
                st.error(f"Could not generate narrative: {str(e)}")
        else:
            st.markdown(st.session_state.narrative_text.replace("$", "\\$"))

        st.markdown("---")
        render_education(metric_scores)

    with tab2:
        render_whatif_simulator(overall_score, metric_scores)

    with tab3:
        st.info(
            "**Decision Helper coming soon.** "
            "You'll be able to ask FinFriend questions like 'I got a raise — what should I do with it?' "
            "or 'Should I pay off debt or invest first?' — answered with your actual numbers as context."
        )
