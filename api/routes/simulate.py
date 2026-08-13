from __future__ import annotations
import json, re
from fastapi import APIRouter, HTTPException
from models import SimulateRequest, SimulateResponse, InterpretRequest, InterpretResponse, InterpretAdjustments
from core.health import calculate_metrics, score_metrics, calculate_overall_score
from config import get_config

router = APIRouter()


@router.post("/simulate", response_model=SimulateResponse)
def simulate(req: SimulateRequest):
    state = req.form_data.model_dump()
    overrides = {k: v for k, v in req.sim_overrides.model_dump().items() if v is not None}
    state.update(overrides)

    metrics       = calculate_metrics(state)
    metric_scores = score_metrics(metrics)
    sim_score     = calculate_overall_score(metric_scores)

    return SimulateResponse(
        sim_score=sim_score,
        sim_metrics=metrics,
        sim_metric_scores=metric_scores,
    )


_INTERPRET_PROMPT = """You are a financial scenario interpreter. The user described something they are planning or considering. Map it to new absolute dollar values for the relevant financial fields below.

Current monthly values:
- Monthly income: ${income_main:,.0f}
- Rent / mortgage: ${expenses_rent:,.0f}
- Groceries: ${expenses_groceries:,.0f}
- Transport: ${expenses_transport:,.0f}
- Subscriptions: ${expenses_subscriptions:,.0f}
- Dining out: ${expenses_dining:,.0f}
- Shopping: ${expenses_shopping:,.0f}
- Other expenses: ${expenses_other:,.0f}
- Monthly debt payments: ${debt_monthly:,.0f}
- Total savings (not monthly): ${savings_total:,.0f}

User scenario: "{scenario}"

Return ONLY valid JSON — no markdown, no explanation:
{{
  "income_main": <new absolute value or null if unchanged>,
  "expenses_rent": <new absolute value or null if unchanged>,
  "expenses_groceries": <new absolute value or null if unchanged>,
  "expenses_transport": <new absolute value or null if unchanged>,
  "expenses_subscriptions": <new absolute value or null if unchanged>,
  "expenses_dining": <new absolute value or null if unchanged>,
  "expenses_shopping": <new absolute value or null if unchanged>,
  "expenses_other": <new absolute value or null if unchanged>,
  "debt_monthly": <new absolute value or null if unchanged>,
  "savings_total": <new absolute value or null if unchanged>,
  "scenario_label": "<3-5 word label, e.g. Got a $500 raise>"
}}

Rules:
- Return absolute values only, never deltas or percentages
- Only set fields directly affected by the scenario — leave others null
- Round to sensible increments ($25–$50 for monthly, $500 for savings)
- If scenario mentions raise/extra income → increase income_main
- If paying off a debt → reduce debt_monthly; optionally reduce savings_total by payoff amount
- If moving cheaper → reduce expenses_rent
- If cutting food spending → reduce expenses_dining or expenses_groceries
- If cutting subscriptions → reduce expenses_subscriptions
- If switching transport → adjust expenses_transport
- If building savings → increase savings_total
- scenario_label must be short (3-5 words, sentence case)"""


@router.post("/simulate/interpret", response_model=InterpretResponse)
def interpret_scenario(req: InterpretRequest):
    from core.chat import _call_llm_simple

    config = get_config()
    if not req.api_key:
        provider = config.hosted_provider
        api_key  = config.hosted_api_key
    else:
        provider = req.provider or config.hosted_provider
        api_key  = req.api_key

    fd = req.form_data
    prompt = _INTERPRET_PROMPT.format(
        income_main           = fd.income_main,
        expenses_rent         = fd.expenses_rent,
        expenses_groceries    = fd.expenses_groceries,
        expenses_transport    = fd.expenses_transport,
        expenses_subscriptions= fd.expenses_subscriptions,
        expenses_dining       = fd.expenses_dining,
        expenses_shopping     = fd.expenses_shopping,
        expenses_other        = fd.expenses_other,
        debt_monthly          = fd.debt_monthly,
        savings_total         = fd.savings_total,
        scenario              = req.scenario.strip(),
    )

    try:
        raw = _call_llm_simple(prompt, provider, api_key)
        raw = raw.strip()
        m   = re.search(r"```(?:json)?\s*(.*?)\s*```", raw, re.DOTALL)
        raw = m.group(1) if m else raw
        data = json.loads(raw)
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Could not interpret scenario: {e}")

    return InterpretResponse(
        adjustments=InterpretAdjustments(
            income_main            = data.get("income_main"),
            expenses_rent          = data.get("expenses_rent"),
            expenses_groceries     = data.get("expenses_groceries"),
            expenses_transport     = data.get("expenses_transport"),
            expenses_subscriptions = data.get("expenses_subscriptions"),
            expenses_dining        = data.get("expenses_dining"),
            expenses_shopping      = data.get("expenses_shopping"),
            expenses_other         = data.get("expenses_other"),
            debt_monthly           = data.get("debt_monthly"),
            savings_total          = data.get("savings_total"),
        ),
        scenario_label=data.get("scenario_label", req.scenario[:40]),
    )
