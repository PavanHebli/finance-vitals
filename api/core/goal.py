from __future__ import annotations
import json
import re

_METRIC_LABELS = {
    "savings_rate":          "Savings Rate",
    "debt_to_income":        "Debt-to-Income",
    "emergency_fund_months": "Emergency Fund",
    "housing_ratio":         "Housing Ratio",
}

_BENCHMARKS = {
    "savings_rate":          (20,  "up",   "Target: >= 20%",    lambda v: v >= 20),
    "debt_to_income":        (20,  "down", "Safe zone: < 20%",  lambda v: v <= 20),
    "emergency_fund_months": (3,   "up",   "Goal: 3-6 months",  lambda v: v >= 3),
    "housing_ratio":         (30,  "down", "HUD limit: <= 30%", lambda v: v <= 30),
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


def extract_goal(narrative_text: str, metrics: dict, provider: str, api_key: str) -> dict | None:
    """Small non-streaming LLM call that extracts a goal from the narrative."""
    from core.chat import _call_llm_simple

    prompt = _EXTRACT_PROMPT.format(narrative=narrative_text[:3000])
    try:
        raw  = _call_llm_simple(prompt, provider, api_key)
        raw  = raw.strip()
        m    = re.search(r"```(?:json)?\s*(.*?)\s*```", raw, re.DOTALL)
        raw  = m.group(1) if m else raw
        data = json.loads(raw)
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


def goal_achieved(goal: dict, current_metrics: dict) -> bool:
    _, _, _, achieved_fn = _BENCHMARKS[goal["metric"]]
    return achieved_fn(current_metrics.get(goal["metric"], 0))


def get_benchmark_label(metric: str) -> str:
    return _BENCHMARKS[metric][2] if metric in _BENCHMARKS else ""


def get_metric_label(metric: str) -> str:
    return _METRIC_LABELS.get(metric, metric)
