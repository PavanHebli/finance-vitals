import json
import re
from datetime import datetime
import streamlit as st


_METRIC_LABELS = {
    "savings_rate":          "Savings Rate",
    "debt_to_income":        "Debt-to-Income",
    "emergency_fund_months": "Emergency Fund",
    "housing_ratio":         "Housing Ratio",
}

_METRIC_FORMAT = {
    "savings_rate":          lambda v: f"{v}%",
    "debt_to_income":        lambda v: f"{v}%",
    "emergency_fund_months": lambda v: f"{v} mo",
    "housing_ratio":         lambda v: f"{v}%",
}

# (benchmark_value, direction, display label, achieved condition)
_BENCHMARKS = {
    "savings_rate":          (20,  "up",   "Target: ≥ 20%",    lambda v: v >= 20),
    "debt_to_income":        (20,  "down", "Safe zone: < 20%", lambda v: v <= 20),
    "emergency_fund_months": (3,   "up",   "Goal: 3–6 months", lambda v: v >= 3),
    "housing_ratio":         (30,  "down", "HUD limit: ≤ 30%", lambda v: v <= 30),
}

_EXTRACT_PROMPT = """You are extracting structured data from a financial health narrative.

From the narrative below, identify the single recommended action (usually in the final section).

Respond with ONLY valid JSON — no markdown, no explanation:
{{"action": "...", "metric": "savings_rate|debt_to_income|emergency_fund_months|housing_ratio", "direction": "up|down"}}

Rules:
- action: the specific recommended action in plain English, 1-2 sentences max
- metric: the ONE metric most directly improved by this action
- direction: "up" if the metric should increase, "down" if it should decrease

Narrative:
{narrative}"""


def _parse_json(text: str) -> dict | None:
    text = text.strip()
    # Strip markdown code fences if present
    match = re.search(r"```(?:json)?\s*(.*?)\s*```", text, re.DOTALL)
    if match:
        text = match.group(1)
    try:
        return json.loads(text)
    except Exception:
        return None


def extract_goal(narrative_text: str, metrics: dict, provider: str, api_key: str) -> dict | None:
    """
    Makes a small non-streaming LLM call to extract the goal from the narrative.
    Returns goal dict with baseline_value added, or None on failure.
    """
    from modules.chat import _call_llm_simple

    prompt = _EXTRACT_PROMPT.format(narrative=narrative_text[:3000])
    try:
        raw = _call_llm_simple(prompt, provider, api_key)
        data = _parse_json(raw)
        if not data:
            return None
        metric = data.get("metric", "")
        if metric not in _METRIC_LABELS:
            return None
        return {
            "action":         data.get("action", ""),
            "metric":         metric,
            "direction":      data.get("direction", _BENCHMARKS[metric][1]),
            "baseline_value": metrics.get(metric, 0),
        }
    except Exception:
        return None


def _goal_achieved(goal: dict, current_metrics: dict) -> bool:
    metric = goal["metric"]
    val    = current_metrics.get(metric, 0)
    _, _, _, achieved_fn = _BENCHMARKS[metric]
    return achieved_fn(val)


def render_goal_card(goal: dict, current_metrics: dict, metric_scores: dict, previous_snapshot: dict | None = None):
    """Renders the goal tracking card at the top of the Progress tab."""
    metric      = goal["metric"]
    action      = goal["action"]
    current_val = current_metrics.get(metric, 0)
    fmt         = _METRIC_FORMAT[metric]
    label       = _METRIC_LABELS[metric]
    _, _, benchmark_label, _ = _BENCHMARKS[metric]
    achieved    = _goal_achieved(goal, current_metrics)

    if achieved:
        st.success(
            f"**✅ Goal achieved!** {label} is now {fmt(current_val)} — you hit the target.  \n"
            f"*Scroll down to set a new goal from this month's narrative.*"
        )
        return

    # Timeline calculation
    target_months  = goal.get("target_months", 3)
    set_month_str  = goal.get("set_month", "")
    timeline_line  = ""
    deadline_passed = False
    if set_month_str:
        try:
            set_dt          = datetime.strptime(set_month_str, "%Y-%m")
            now_dt          = datetime.now()
            months_elapsed  = (now_dt.year - set_dt.year) * 12 + (now_dt.month - set_dt.month)
            months_remaining = target_months - months_elapsed
            if months_remaining <= 0:
                deadline_passed = True
                timeline_line   = f"⏰ Deadline passed ({target_months}-month goal)"
            elif months_remaining == 1:
                timeline_line = f"1 month remaining of {target_months}"
            else:
                timeline_line = f"{months_remaining} months remaining of {target_months}"
        except ValueError:
            pass

    deadline_color = "#FF8C00" if deadline_passed else "var(--primary-color)"
    timeline_html  = (
        f"<div style='font-size:0.78rem; color:{'#FF8C00' if deadline_passed else 'var(--text-color)'}; "
        f"opacity:{'1' if deadline_passed else '0.45'}; margin-top:6px;'>{timeline_line}</div>"
        if timeline_line else ""
    )

    st.markdown(
        f"<div style='background:var(--secondary-background-color); border-radius:12px; "
        f"padding:16px 20px; margin-bottom:16px; border-left:3px solid {deadline_color};'>"
        f"<div style='font-size:0.72rem; font-weight:600; letter-spacing:0.1em; "
        f"text-transform:uppercase; color:var(--text-color); opacity:0.45; margin-bottom:8px;'>"
        f"🎯 Your goal</div>"
        f"<div style='font-size:1rem; color:var(--text-color); line-height:1.55; margin-bottom:12px;'>"
        f"{action}</div>"
        f"<div style='font-size:0.82rem; color:var(--text-color); opacity:0.55;'>"
        f"Tracking: <b>{label}</b> &nbsp;·&nbsp; {benchmark_label}</div>"
        f"{timeline_html}"
        f"</div>",
        unsafe_allow_html=True,
    )

    # Progress bar using metric score (0–25 → 0–100%)
    score_pct = int(metric_scores.get(metric, {}).get("score", 0) / 25 * 100)
    st.progress(score_pct / 100, text=f"{label}: {fmt(current_val)}")

    # Delta vs previous snapshot
    if previous_snapshot:
        prev_metrics = previous_snapshot.get("outputs", {}).get("metrics", {})
        prev_val     = prev_metrics.get(metric)
        if prev_val is not None:
            delta = round(current_val - prev_val, 1)
            if delta == 0:
                st.caption(f"vs last snapshot: {fmt(prev_val)} — no change yet. Keep going.")
            else:
                direction   = goal.get("direction", "up")
                is_progress = (delta > 0 and direction == "up") or (delta < 0 and direction == "down")
                sign        = "+" if delta > 0 else ""
                color       = "#00C853" if is_progress else "#FF4B4B"
                st.markdown(
                    f"<p style='font-size:0.85rem; color:{color};'>"
                    f"vs last snapshot: {fmt(prev_val)} → {fmt(current_val)} "
                    f"(<b>{sign}{fmt(abs(delta))}</b>)</p>",
                    unsafe_allow_html=True,
                )

    with st.container(key="goal_card_btns"):
        col_change, col_cancel, _ = st.columns([1, 1, 4], gap="small")
    with col_change:
        if st.button("Change goal", key="goal_change_btn", type="secondary"):
            del st.session_state["goal"]
            st.session_state["goal_dismissed"] = False
            st.rerun()
    with col_cancel:
        if st.button("Cancel tracking", key="goal_cancel_btn", type="secondary"):
            del st.session_state["goal"]
            st.session_state["goal_dismissed"] = True
            st.rerun()

    st.markdown("---")
