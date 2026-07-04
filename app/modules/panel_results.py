import streamlit as st
import plotly.graph_objects as go
from datetime import datetime
from modules.health import calculate_metrics, score_metrics, calculate_overall_score, get_mirror_label
from modules.narrative import build_prompt, call_llm
from modules.education import render_education
from modules.simulator import render_whatif_simulator
from modules.storage import create_snapshot, append_or_overwrite, to_vit
from modules.export_pdf import generate_pdf
from modules.goal import extract_goal, render_goal_card
from modules.progress import render_progress
from modules.chat import (
    is_out_of_scope, _OUT_OF_SCOPE_RESPONSE,
    STARTER_QUESTIONS, build_snapshot_context,
    build_messages, call_llm_chat, classify_question,
    maybe_summarise,
)
from modules.analytics import (
    log_results_viewed, log_narrative_done, log_whatif_used,
    log_snapshot_saved, log_snapshot_loaded, log_chat_message,
)


_SIM_KEYS = ["sim_income", "sim_dining", "sim_shopping", "sim_subscriptions", "sim_debt_payment"]


def render_health_score(score: int, mirror: dict):
    color_map = {
        "Critical": "#FF4B4B",
        "At Risk":  "#FF8C00",
        "Fair":     "#FFD700",
        "Good":     "#1C83E1",
        "Healthy":  "#00C853",
    }
    color = color_map.get(mirror["label"], "#FFFFFF")
    st.markdown(f"""
<div style="text-align:center; padding:28px 16px 20px; font-family:'Inter',sans-serif;">
  <div style="font-size:0.8rem; font-weight:500; color:var(--text-color); opacity:0.5; letter-spacing:0.1em; text-transform:uppercase; margin-bottom:10px;">Financial Health Score</div>
  <div class="vitals-score-number" style="font-size:5.5rem; font-weight:700; color:var(--text-color); line-height:1; letter-spacing:-3px; display:inline-block;">{score}</div>
  <div style="font-size:1rem; color:var(--text-color); opacity:0.35; margin-bottom:14px;">/ 100</div>
  <div style="display:inline-block; font-size:1.25rem; font-weight:600; color:{color}; background:{color}1a; border:1px solid {color}44; padding:5px 22px; border-radius:20px; margin-bottom:10px;">{mirror['label']}</div>
  <div style="font-size:0.9rem; color:var(--text-color); opacity:0.6; max-width:380px; margin:0 auto; line-height:1.5;">{mirror['description']}</div>
</div>
""", unsafe_allow_html=True)


def render_metrics_breakdown(metrics: dict, metric_scores: dict):
    st.markdown("### Breakdown")

    color_map = {
        "danger":  "#FF4B4B",
        "warning": "#FF8C00",
        "ok":      "#FFD700",
        "good":    "#00C853",
    }

    tiles = [
        ("Savings Rate",   f"{metrics['savings_rate']}%",           metric_scores["savings_rate"], "Target ≥ 20%",      "50/30/20 rule"),
        ("Debt-to-Income", f"{metrics['debt_to_income']}%",          metric_scores["debt_to_income"], "Safe zone < 20%", "CFPB mortgage standard"),
        ("Emergency Fund", f"{metrics['emergency_fund_months']} mo", metric_scores["emergency_fund_months"], "Goal: 3–6 months", "Fidelity / Vanguard"),
        ("Housing Ratio",  f"{metrics['housing_ratio']}%",           metric_scores["housing_ratio"], "HUD limit ≤ 30%",  "HUD affordability standard"),
    ]

    tiles_html = '<div style="display:grid; grid-template-columns:1fr 1fr 1fr 1fr; gap:12px; margin-bottom:16px;">'
    for i, (name, value, score_data, benchmark, source) in enumerate(tiles):
        color = color_map[score_data["status"]]
        pct   = int(score_data["score"] / 25 * 100)
        tiles_html += f"""
<div style="
    background:var(--secondary-background-color);
    border-radius:14px;
    padding:16px 18px;
    border-top:3px solid {color};
    box-shadow:0 2px 8px rgba(0,0,0,0.06);
    animation:fadeSlideUp 0.35s ease {i * 0.07}s both;
    font-family:'Inter',sans-serif;
    display:flex;
    flex-direction:column;
    gap:8px;
">
  <div style="font-size:0.78rem; font-weight:500; color:var(--text-color); opacity:0.5; text-transform:uppercase; letter-spacing:0.05em;">{name}</div>
  <div style="font-size:2rem; font-weight:700; color:var(--text-color); line-height:1;">{value}</div>
  <div>
    <div style="height:4px; border-radius:2px; background:rgba(128,128,128,0.15); overflow:hidden;">
      <div style="height:100%; width:{pct}%; background:{color}; border-radius:2px;"></div>
    </div>
  </div>
  <div style="display:flex; justify-content:space-between; align-items:center;">
    <span style="font-size:0.8rem; font-weight:600; color:{color};">{score_data['status'].capitalize()}</span>
    <span style="font-size:0.75rem; color:var(--text-color); opacity:0.4;">{benchmark}</span>
  </div>
  <div style="font-size:0.68rem; color:var(--text-color); opacity:0.3; margin-top:2px;">Source: {source}</div>
</div>"""
    tiles_html += "</div>"

    st.markdown(tiles_html, unsafe_allow_html=True)

    st.markdown("---")

    flow = metric_scores["net_monthly_flow"]["value"]
    flow_color = "#00C853" if flow >= 0 else "#FF4B4B"
    st.markdown(
        f"<span style='color:var(--text-color);'><b>Cash left this month:</b></span> <span style='color:{flow_color}; font-weight:600;'>${flow:,.2f}</span>",
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
    from modules.nav import render_nav
    render_nav()
    # Compute metrics first — needed by both the save button and the rest of the page
    metrics       = calculate_metrics(st.session_state)
    metric_scores = score_metrics(metrics)
    overall_score = calculate_overall_score(metric_scores)
    mirror        = get_mirror_label(overall_score)

    # Log once per session when results page is first seen
    if not st.session_state.get("_logged_results_viewed"):
        log_results_viewed(score_band=mirror["label"])
        st.session_state._logged_results_viewed = True

    if st.session_state.get("sample_input_active", False):
        st.info("🧪 Viewing sample data — go back and enter your real numbers for an accurate picture.")

    # --- Top bar: back button on left, save button pinned to far right ---
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

    if st.button("← Edit my data"):
        st.session_state.pop("narrative_text", None)
        for key in _SIM_KEYS:
            st.session_state.pop(key, None)
        st.session_state.current_page = "form"
        st.rerun()

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

    tab1, tab2, tab3, tab4 = st.tabs(["Your Story", "What If?", "Progress", "Ask Vitals"])

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
                log_narrative_done()
            except Exception as e:
                st.error(f"Could not generate narrative: {str(e)}")
        else:
            st.markdown(st.session_state.narrative_text.replace("$", "\\$"))

        st.markdown("---")

        # Goal tracker opt-in — shown after narrative, skipped if goal already set or dismissed
        if (
            st.session_state.get("narrative_text")
            and not st.session_state.get("goal")
            and not st.session_state.get("goal_dismissed")
        ):
            st.markdown(
                "<div style='font-size:0.9rem; color:var(--text-color); opacity:0.75;'>"
                "🎯 <b>Want to track this month's recommended action as a goal?</b>"
                "</div>",
                unsafe_allow_html=True,
            )
            col_set, col_skip, _ = st.columns([1.2, 0.8, 4])
            with col_set:
                if st.button("Set as my goal", type="primary", use_container_width=True):
                    with st.spinner("Extracting your goal…"):
                        goal = extract_goal(
                            st.session_state.narrative_text,
                            metrics,
                            st.session_state.llm_provider,
                            st.session_state.api_key,
                        )
                    if goal:
                        st.session_state.goal = goal
                    else:
                        st.warning("Couldn't extract a goal from the narrative. Try again.")
                    st.rerun()
            with col_skip:
                if st.button("Skip", type="secondary", use_container_width=True):
                    st.session_state.goal_dismissed = True
                    st.rerun()
            st.markdown("")

        st.markdown("---")
        render_education(metric_scores)

    with tab2:
        if not st.session_state.get("_logged_whatif_used"):
            log_whatif_used()
            st.session_state._logged_whatif_used = True
        render_whatif_simulator(overall_score, metric_scores)

    with tab3:
        # Goal card — shown if a goal is set, before the charts
        if st.session_state.get("goal"):
            render_goal_card(
                st.session_state.goal,
                metrics,
                metric_scores,
                st.session_state.get("previous_snapshot"),
            )

        current_snapshot = {
            "saved_at": datetime.now().strftime("%Y-%m"),
            "outputs": {
                "overall_score": overall_score,
                "mirror_label":  mirror["label"],
                "metrics":       metrics,
                "metric_scores": metric_scores,
                "narrative":     st.session_state.get("narrative_text", ""),
            },
        }
        render_progress(st.session_state.get("loaded_snapshots", []), current_snapshot)

    with tab4:
        # --- Compact context bar ---
        st.caption(
            f"**Score:** {overall_score}/100 &nbsp;·&nbsp; "
            f"**Savings Rate:** {metrics['savings_rate']}% &nbsp;·&nbsp; "
            f"**DTI:** {metrics['debt_to_income']}% &nbsp;·&nbsp; "
            f"**Emergency Fund:** {metrics['emergency_fund_months']}mo &nbsp;·&nbsp; "
            f"**Housing:** {metrics['housing_ratio']}% &nbsp;·&nbsp; "
            f"*Every answer is grounded in your actual numbers.*"
        )
        st.markdown("---")

        # --- Initialise chat history ---
        if "chat_history" not in st.session_state:
            st.session_state.chat_history = []

        # --- Starter questions (shown only before first message) ---
        if not st.session_state.chat_history:
            st.markdown("**Not sure where to start? Try one of these:**")
            cols = st.columns(len(STARTER_QUESTIONS))
            for col, q in zip(cols, STARTER_QUESTIONS):
                with col:
                    if st.button(q, key=f"starter_{q}", use_container_width=True):
                        st.session_state.chat_history.append({"role": "user", "content": q})
                        st.rerun()
            st.markdown("")

        # --- Scrollable chat history container ---
        chat_container = st.container(height=480)
        with chat_container:
            for msg in st.session_state.chat_history:
                avatar = "🧑" if msg["role"] == "user" else "🩺"
                with st.chat_message(msg["role"], avatar=avatar):
                    st.markdown(msg["content"].replace("$", "\\$"))

        # --- Chat input always below the history container ---
        user_input = st.chat_input("Ask me anything about your finances…")

        # Determine pending message — either new input or starter question after rerun
        if user_input:
            st.session_state.chat_history.append({"role": "user", "content": user_input})

        pending = (
            st.session_state.chat_history
            and st.session_state.chat_history[-1]["role"] == "user"
        )

        if pending:
            pending_message = st.session_state.chat_history[-1]["content"]
            if is_out_of_scope(pending_message):
                st.session_state.chat_history.append({"role": "assistant", "content": _OUT_OF_SCOPE_RESPONSE})
                st.rerun()
            else:
                categories = classify_question(
                    pending_message,
                    st.session_state.llm_provider,
                    st.session_state.api_key,
                )
                log_chat_message(categories[0] if categories else "general")
                snapshot_context = build_snapshot_context(
                    dict(st.session_state), metrics, metric_scores, overall_score, mirror
                )
                messages = build_messages(
                    snapshot_context,
                    st.session_state.chat_history,
                    categories=categories,
                    summarised_history=st.session_state.get("chat_summary", ""),
                )
                try:
                    with chat_container:
                        with st.chat_message("assistant", avatar="🩺"):
                            response = st.write_stream(call_llm_chat(
                                messages,
                                st.session_state.llm_provider,
                                st.session_state.api_key,
                                state=dict(st.session_state),
                                categories=categories,
                            ))
                    st.session_state.chat_history.append({"role": "assistant", "content": response})
                    # Phase 5d: summarise older turns if threshold reached
                    updated_history, updated_summary = maybe_summarise(
                        st.session_state.chat_history,
                        st.session_state.get("chat_summary", ""),
                        st.session_state.llm_provider,
                        st.session_state.api_key,
                    )
                    st.session_state.chat_history = updated_history
                    st.session_state.chat_summary = updated_summary
                except Exception as e:
                    st.error(f"Could not get a response: {e}")
                st.rerun()

    st.markdown("---")

    col_feedback, col_export = st.columns([6, 1])
    with col_feedback:
        st.markdown(
            "<a href='/feedback' target='_blank' style='"
            "font-size:0.82rem; color:var(--text-color); opacity:0.45; text-decoration:none;"
            "letter-spacing:0.01em;'>"
            "How was your experience? Share feedback."
            "</a>",
            unsafe_allow_html=True,
        )
    with col_export:
        with st.popover("📤 Export"):
            narrative = st.session_state.get("narrative_text", "")
            try:
                pdf_bytes = generate_pdf(
                    dict(st.session_state),
                    metrics,
                    metric_scores,
                    overall_score,
                    mirror,
                    narrative,
                )
                st.download_button(
                    "📄 PDF report",
                    data=pdf_bytes,
                    file_name=f"vitals_report_{datetime.now().strftime('%Y_%m')}.pdf",
                    mime="application/pdf",
                    use_container_width=True,
                )
            except Exception:
                st.error("Could not generate PDF.")

            if st.download_button(
                "💾 Save data (.vit)",
                data=to_vit(snapshots),
                file_name="my_vitals.vit",
                mime="application/octet-stream",
                use_container_width=True,
            ):
                log_snapshot_saved()
