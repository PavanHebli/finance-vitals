import streamlit as st
from modules.health import calculate_metrics, score_metrics, calculate_overall_score, get_mirror_label
from modules.narrative import build_prompt, call_llm
from modules.education import render_education


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


def render_results_panel():
    if st.button("← Edit my data"):
        st.session_state.current_page = "form"
        st.rerun()

    if st.session_state.get("sample_input_active", False):
        st.warning("You're viewing sample input data. Enter your real numbers for an accurate picture.")

    st.markdown("---")

    metrics = calculate_metrics(st.session_state)
    metric_scores = score_metrics(metrics)
    overall_score = calculate_overall_score(metric_scores)
    mirror = get_mirror_label(overall_score)

    render_health_score(overall_score, mirror)

    st.markdown("---")

    render_metrics_breakdown(metrics, metric_scores)

    st.markdown("---")
    st.markdown("### Your Financial Story")
    st.markdown(
        "<style> section[data-testid='stMain'] .stMarkdown p { font-size: 1.1rem; line-height: 1.8; } </style>",
        unsafe_allow_html=True
    )

    prompt = build_prompt(
        st.session_state,
        metrics,
        metric_scores,
        overall_score,
        mirror
    )

    try:
        st.write_stream(call_llm(
            prompt,
            st.session_state.llm_provider,
            st.session_state.api_key
        ))
    except Exception as e:
        st.error(f"Could not generate narrative: {str(e)}")

    st.markdown("---")
    render_education(metric_scores)
