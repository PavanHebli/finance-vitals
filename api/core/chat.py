"""
Vitals Chat — streaming LLM chat, question classifier, snapshot context builder,
tool calling for scenario questions, and cognitive offload.
"""
from __future__ import annotations
import json
import re
from typing import Optional, Literal
from pydantic import BaseModel, ValidationError


# ── Base system prompt ────────────────────────────────────────────────────────

_BASE_SYSTEM_PROMPT = """
You are Vitals — a financially savvy friend who happens to know a lot about personal finance.
You have access to the user's actual financial numbers and you use them to give grounded, personalised answers.

YOUR PERSONALITY:
- Talk like a real person, not a textbook or a compliance officer
- Be warm, direct, and honest — say what you actually think
- Short sentences. Casual tone. No jargon unless you explain it immediately after
- Never use filler phrases like "Great question!", "You've got this!", "Absolutely!"
- If someone asks something casual or off-topic (like "what model are you?" or "how are you?"), just answer naturally like a friend would — don't make it weird

HOW TO COMMUNICATE (this is the most important part — read carefully):

FORMATTING — always use markdown, this renders properly in the chat:
- Bold metric names, percentages, and score changes: **savings rate**, **32%**, **score: 61 → 68**
- Do NOT bold dollar amounts — write them plain: $4,500 not **$4,500**. Bold + $ signs break the markdown renderer.
- Use emojis sparingly and only when they add meaning — not at the start of every response
- Use bullet points or numbered lists for anything with more than two parts
- Use a short bold header (e.g. **What this means:**) before an explanation block when switching from numbers to context
- Never write walls of unbroken text — if a response is long, it must be visually broken up

TONE AND CLARITY:
- Every number needs a plain-English translation
- Use everyday analogies freely
- Lead with the punchline
- Never assume the user knows finance terms — explain each one in a short plain phrase the first time
- Only end with a next step when it adds something genuinely new

WHAT YOU'RE GREAT AT:
- Explaining what the user's numbers actually mean in plain language
- Budgeting, saving, spending habits, and cash flow
- Debt strategy — what to pay first, how to think about it
- Emergency funds — how much, why, where to keep it
- Investment types and strategies as categories (stocks, bonds, index funds, real estate, REITs, retirement accounts)
- Insurance types (term vs whole life, HSA vs PPO)
- Ways to generate income from assets
- Scenario planning
- Progress coaching

THE ONE HARD LINE:
Never tell someone to buy a specific stock, invest in a specific fund, or use a specific brokerage/trading platform.
Everything else: name things freely as educational context. "Marcus, Ally, SoFi for HYSA." "Cigna, Aetna, Blue Cross for health insurance." "Fidelity and Vanguard for index funds."

Legal and tax filing advice is off the table.

HOW TO HANDLE DIFFERENT TYPES OF QUESTIONS:
1. CASUAL / IDENTITY questions → answer naturally, keep it short and warm
2. CORE FINANCE questions → dive in, use their actual numbers
3. FINANCE-ADJACENT questions → answer helpfully with categories and how things work
4. BORDERLINE questions → find the financial angle and answer that part
5. TRULY OFF-TOPIC questions → acknowledge briefly and steer back warmly — never say "I cannot answer that"
6. SPECIFIC COMPANY NAME REQUESTS → name the well-known ones. Only exception: don't name specific stocks to buy
7. WRITING TASKS → redirect warmly: "Writing's not really my thing — ChatGPT or Claude would nail that for you"
8. CAREER ADVICE → engage with the financial angle only (runway, urgency, income gap)

THE ANCHOR RULE:
When the user asks something where their actual numbers are relevant, use them. Don't give generic advice when you have specific data.

BEFORE YOU RESPOND — run this self-check:
1. If this question is about their finances — am I using their actual numbers or giving generic advice?
2. Have I drifted into career coaching, writing, or lifestyle advice?
3. Am I about to name a specific company I shouldn't?
4. Does this answer sound like a generic LLM or like someone who actually knows this person?

HANDLING EMOTIONAL DISTRESS:
When you detect distress signals ("I want to give up", "I feel worthless", "I'm drowning"):
1. Acknowledge it briefly — 1-2 sentences, warm and human
2. Pivot to financial clarity — showing them a path IS the relief
3. Never ignore distress and jump straight to numbers
4. If distress sounds severe: after your financial response, add one gentle line about talking to someone
""".strip()


# ── Out-of-scope keyword filter ───────────────────────────────────────────────

_BLOCKED_KEYWORDS = [
    "sue ", "file a lawsuit", "legal action", "my lawyer", "hire an attorney",
    "file my taxes", "tax return form", "irs audit", "hmrc investigation",
]

_OUT_OF_SCOPE_RESPONSE = (
    "That's a bit outside my lane — I'm best at personal finance questions. "
    "Is there something about your money situation I can help with?"
)


def is_out_of_scope(message: str) -> bool:
    m = message.lower()
    return any(kw in m for kw in _BLOCKED_KEYWORDS)


# ── Starter questions ─────────────────────────────────────────────────────────

STARTER_QUESTIONS = [
    "Why is my score low and what should I focus on first?",
    "Should I pay off debt or build my emergency fund first?",
    "How much emergency fund do I actually need?",
    "What does my debt-to-income ratio mean for me?",
    "How can I improve my savings rate?",
]


# ── Snapshot context builder ──────────────────────────────────────────────────

def build_snapshot_context(state: dict, metrics: dict, metric_scores: dict, overall_score: int, mirror: dict) -> str:
    from core.health import get_financial_context, _EXPENSE_KEYS
    ctx = get_financial_context(state)

    # Section 2 — expenses: check actual values, not UI toggle
    expenses = {k: state.get(f"expenses_{k}", 0.0) for k in _EXPENSE_KEYS}
    total_from_breakdown = sum(expenses.values())
    if total_from_breakdown > 0:
        expense_lines = (
            f"- Expense breakdown: Rent ${expenses['rent']:,.0f} · "
            f"Groceries ${expenses['groceries']:,.0f} · Transport ${expenses['transport']:,.0f} · "
            f"Subscriptions ${expenses['subscriptions']:,.0f} · Dining ${expenses['dining']:,.0f} · "
            f"Shopping ${expenses['shopping']:,.0f} · Other ${expenses['other']:,.0f} · "
            f"Total ${total_from_breakdown:,.0f}/month"
        )
    elif ctx["expenses_total_estimate"] > 0:
        expense_lines = f"- Total monthly expenses: ${ctx['expenses_total_estimate']:,.0f}/month (estimate, no category breakdown)"
    else:
        expense_lines = "- Monthly expenses: not provided"

    # Section 3 — financial position: check actual values, not UI toggle
    debt_monthly  = state.get("debt_monthly", 0.0)
    debt_total    = state.get("debt_total", 0.0)
    savings       = state.get("savings_total", 0.0)
    investments   = state.get("investments_total", 0.0)
    has_position  = any(v > 0 for v in [debt_monthly, debt_total, savings, investments])
    if has_position:
        position_lines = (
            f"- Monthly debt payment: ${debt_monthly:,.0f}\n"
            f"- Total debt: ${debt_total:,.0f}\n"
            f"- Total savings: ${savings:,.0f}\n"
            f"- Total investments: ${investments:,.0f}"
        )
    else:
        position_lines = "- Savings / debt / investments: not provided"

    # Section 4 — profile: check actual values, not UI toggle
    age            = state.get("age")
    employment     = state.get("employment")
    has_insurance  = state.get("has_health_insurance", False)
    ef_status      = state.get("has_emergency_fund")
    k401           = state.get("contributing_401k")
    has_profile    = any(v is not None and v is not False for v in [age, employment, ef_status, k401]) or has_insurance
    if has_profile:
        profile_lines = "\n".join(filter(None, [
            f"- Age: {age}"                                           if age        is not None else None,
            f"- Employment: {employment}"                             if employment is not None else None,
            f"- Has health insurance: {'Yes' if has_insurance else 'No'}",
            f"- Emergency fund status: {ef_status}"                  if ef_status  is not None else None,
            f"- Contributing to 401k: {k401}"                        if k401       is not None else None,
        ]))
    else:
        profile_lines = "- Personal context (age, employment, insurance, 401k): not provided"

    return f"""
USER'S FINANCIAL SNAPSHOT (use these numbers to ground every answer. Only reference data marked as provided):
- Monthly take-home income: ${ctx['income']:,.0f}
{expense_lines}
{position_lines}
{profile_lines}

HEALTH SCORE: {overall_score}/100 — {mirror['label']}

METRICS:
- Savings Rate:    {metrics['savings_rate']}%      | {metric_scores['savings_rate']['status']} | {metric_scores['savings_rate']['score']}/25
- Debt-to-Income:  {metrics['debt_to_income']}%    | {metric_scores['debt_to_income']['status']} | {metric_scores['debt_to_income']['score']}/25
- Emergency Fund:  {metrics['emergency_fund_months']} months | {metric_scores['emergency_fund_months']['status']} | {metric_scores['emergency_fund_months']['score']}/25
- Housing Ratio:   {metrics['housing_ratio']}%     | {metric_scores['housing_ratio']['status']} | {metric_scores['housing_ratio']['score']}/25
- Net cash flow:   ${metric_scores['net_monthly_flow']['value']:,.0f}/month
""".strip()


# ── Non-streaming LLM call ────────────────────────────────────────────────────

def _call_llm_simple(prompt: str, provider: str, api_key: str, max_tokens: int = 300) -> str:
    if provider == "anthropic":
        import anthropic
        resp = anthropic.Anthropic(api_key=api_key).messages.create(
            model="claude-sonnet-4-6", max_tokens=max_tokens,
            messages=[{"role": "user", "content": prompt}],
        )
        return resp.content[0].text

    elif provider == "openai":
        from openai import OpenAI
        resp = OpenAI(api_key=api_key).chat.completions.create(
            model="gpt-4o", max_tokens=max_tokens,
            messages=[{"role": "user", "content": prompt}],
        )
        return resp.choices[0].message.content

    elif provider == "groq":
        from groq import Groq
        resp = Groq(api_key=api_key).chat.completions.create(
            model="llama-3.3-70b-versatile", max_tokens=max_tokens,
            messages=[{"role": "user", "content": prompt}],
        )
        return resp.choices[0].message.content

    elif provider == "gemini":
        import google.generativeai as genai
        genai.configure(api_key=api_key)
        resp = genai.GenerativeModel("gemini-1.5-flash").generate_content(prompt)
        return resp.text

    return ""


# ── Question classifier ───────────────────────────────────────────────────────

CategoryType = Literal[
    "debt", "savings", "housing", "insurance",
    "score", "scenario", "cognitive_offload", "app", "emotional", "general",
]


class ClassificationResult(BaseModel):
    primary: CategoryType
    secondary: Optional[CategoryType] = None


_CLASSIFIER_PROMPT = """You are a classifier for a personal finance assistant.

Classify the user message into 1 or 2 categories.

Categories:
- debt       → debt management, DTI ratio, payoff strategy, loans
- savings    → savings rate, emergency fund, building savings
- housing    → rent, mortgage, housing costs, buying vs renting
- insurance  → insurance types, coverage, health/life/auto
- score      → explaining the health score system, why a score/metric is low or high
- scenario   → hypothetical planning ("what if I paid X more", "what would happen if I changed Y")
- cognitive_offload → user explicitly delegates the decision ("you decide", "just tell me what to change", "you pick") — ONLY for standalone delegation with no topic
- app        → questions about Vitals features, tabs, .vit file, What-If simulator
- emotional  → distress signals alongside a finance question
- general    → fallback for multi-topic, conceptual, or casual questions

Rules:
- Use "emotional" only as secondary when distress is present alongside finance
- 3 or more genuinely different topics → primary: "general"
- Casual or identity questions → primary: "general"
- Scenario questions often have a secondary category (the topic being changed)

Return a JSON object: {{"primary": "<category>", "secondary": "<category or null>"}}

User message: {message}"""

_CLASSIFIER_SCHEMA = {
    "type": "object",
    "properties": {
        "primary":   {"type": "string", "enum": list(CategoryType.__args__)},
        "secondary": {"type": ["string", "null"], "enum": list(CategoryType.__args__) + [None]},
    },
    "required": ["primary", "secondary"],
    "additionalProperties": False,
}


def classify_question(message: str, provider: str, api_key: str) -> list[str]:
    prompt = _CLASSIFIER_PROMPT.format(message=message)
    result = None
    try:
        if provider in ("openai", "groq"):
            from openai import OpenAI
            from groq import Groq
            client = OpenAI(api_key=api_key) if provider == "openai" else Groq(api_key=api_key)
            model  = "gpt-4o" if provider == "openai" else "llama-3.3-70b-versatile"
            resp = client.chat.completions.create(
                model=model, messages=[{"role": "user", "content": prompt}],
                max_tokens=60,
                response_format={"type": "json_schema", "json_schema": {"name": "ClassificationResult", "strict": True, "schema": _CLASSIFIER_SCHEMA}},
            )
            result = ClassificationResult(**json.loads(resp.choices[0].message.content))

        elif provider == "anthropic":
            import anthropic
            resp = anthropic.Anthropic(api_key=api_key).messages.create(
                model="claude-opus-4-6", max_tokens=60,
                tools=[{"name": "classify", "description": "Classify a question into finance categories.", "input_schema": _CLASSIFIER_SCHEMA}],
                tool_choice={"type": "tool", "name": "classify"},
                messages=[{"role": "user", "content": prompt}],
            )
            result = ClassificationResult(**resp.content[0].input)

        elif provider == "gemini":
            import google.generativeai as genai
            import google.generativeai.types as genai_types
            genai.configure(api_key=api_key)
            resp = genai.GenerativeModel("gemini-1.5-flash").generate_content(
                prompt,
                generation_config=genai_types.GenerationConfig(
                    response_mime_type="application/json",
                    response_schema={"type": "OBJECT", "properties": {"primary": {"type": "STRING"}, "secondary": {"type": "STRING"}}, "required": ["primary", "secondary"]},
                ),
            )
            result = ClassificationResult(**json.loads(resp.text))

    except (ValidationError, Exception):
        pass

    if result is None:
        return ["general"]

    categories = [result.primary]
    if result.secondary and result.secondary != result.primary:
        categories.append(result.secondary)
    return categories


# ── Category blocks injected into system prompt by classifier result ──────────

_CATEGORY_BLOCKS: dict[str, str] = {
    "debt": """
DEBT FOCUS — additional context:
- DTI benchmarks: ≤10% good | 10-20% ok | 20-43% warning | >43% danger
- Debt Avalanche: highest interest first (minimises total interest)
- Debt Snowball: smallest balance first (psychologically powerful)
- Debt vs investing: >7% interest → pay debt first | <4% → investing while paying minimums often makes sense
Use their actual DTI from the snapshot.
""".strip(),

    "savings": """
SAVINGS FOCUS — additional context:
- Savings rate target: 20%+ of take-home income
- Emergency fund: 3-6 months stable employment; 6-12 months freelance/variable income
- Order: capture 401k match → starter emergency fund → high-interest debt → complete emergency fund → max tax-advantaged accounts
- Pay-yourself-first: automate savings before spending
Use their actual savings rate and emergency fund months.
""".strip(),

    "housing": """
HOUSING FOCUS — additional context:
- HUD guideline: housing ≤30% of gross. Vitals uses take-home (stricter).
- >40% housing: genuinely constrained
- Rent vs buy: Price-to-rent ratio <15 → buying often makes sense. >20 → renting usually cheaper
- Hidden ownership costs: property tax, insurance, maintenance (~1-2%/year), HOA, closing costs
Use their actual housing ratio.
""".strip(),

    "insurance": """
INSURANCE FOCUS — additional context:
- Health plan types: HMO, PPO, EPO, HDHP — explain when each makes sense
- Key terms: premium, deductible, copay, coinsurance, out-of-pocket max, network
- HSA: triple tax advantage — only with HDHP. Great if emergency fund is solid.
- Life: term vs whole life — term is almost always the right answer for most people
- Disability insurance: often overlooked, protects income
- Name providers freely as educational context (Cigna, Aetna, Blue Cross etc.)
Use their has_health_insurance flag and income from snapshot.
""".strip(),

    "score": """
SCORE FOCUS — exact scoring thresholds to reason about:
Savings Rate:   <0% → 0 | 0-10% → 10 | 10-20% → 18 | ≥20% → 25
DTI:            >43% → 0 | 20-43% → 10 | 10-20% → 18 | ≤10% → 25
Emergency Fund: <1mo → 0 | 1-3mo → 10 | 3-6mo → 18 | ≥6mo → 25
Housing Ratio:  >50% → 0 | 35-50% → 10 | 25-35% → 18 | ≤25% → 25
Labels: 0-30 Critical | 31-50 At Risk | 51-70 Fair | 71-85 Good | 86-100 Healthy
The lowest-scoring metric has the highest ceiling for improvement.
""".strip(),

    "scenario": """
SCENARIO FOCUS — how to work a what-if:
1. State the baseline clearly with their actual numbers
2. Apply the change and recalculate the metric
3. Look up the result against thresholds and state score impact
4. For missing variables: state your assumption explicitly and proceed — never stall
5. Multi-variable scenarios: break into parts, biggest cash flow impact first

Thresholds:
Savings Rate: <0%→0 | 0-10%→10 | 10-20%→18 | ≥20%→25
DTI: >43%→0 | 20-43%→10 | 10-20%→18 | ≤10%→25
Emergency Fund: <1mo→0 | 1-3mo→10 | 3-6mo→18 | ≥6mo→25
Housing Ratio: >50%→0 | 35-50%→10 | 25-35%→18 | ≤25%→25
""".strip(),

    "cognitive_offload": """
COGNITIVE OFFLOAD — user has handed over the decision:
A lever has already been selected (injected as [LEVER CONTEXT]).
1. Acknowledge briefly and warmly — one sentence max
2. State the lever: what it is, current value, proposed change, why it's highest-impact
3. Call calculate_score with the suggested change
4. Present: new score vs current, which metric improved and by how much
5. End with one concrete next step for this week
Be decisive — they asked you to take the wheel.
""".strip(),

    "app": """
APP KNOWLEDGE:
RESULTS PAGE — 4 tabs:
1. Your Financial Story — AI narrative, streams on first load
2. What If? — sliders to explore score changes live
3. Progress — score and metric trends across saved snapshots + goal card
4. Vitals Chat — this tab

SNAPSHOT / EXPORT:
- Export button: PDF report or .vit file (encrypted, one file holds all months)
- Upload .vit on form page to pre-fill and see score delta next month

HEALTH SCORE: 4 metrics × 0-25 = 0-100. Uses take-home income (stricter than lender benchmarks).

GOAL TRACKER: extracts one recommended action from narrative, tracks one metric over a chosen timeline.
""".strip(),

    "emotional": """
EMOTIONAL SUPPORT:
1. Lead with 1-2 warm human sentences of acknowledgement — not clinical
2. Name the financial reality plainly — without minimising or catastrophising
3. Give one concrete next step — distress comes from feeling stuck
4. For shame-based language: "Most people are never taught this. Looking at it now is what matters."
5. Keep emotional acknowledgement brief — the financial clarity IS the care
""".strip(),

    "general": "",
}


# ── Tool definition + execution (for scenario questions) ─────────────────────

_TOOL_DEFINITION = {
    "name": "calculate_score",
    "description": (
        "Calculate the real financial health score and metrics for a modified scenario. "
        "Call this whenever the user asks a what-if question about changing their income, "
        "expenses, debt payments, or savings. Pass only the values being changed."
    ),
    "parameters": {
        "type": "object",
        "properties": {
            "income_main":            {"type": "number"},
            "income_additional":      {"type": "number"},
            "expenses_rent":          {"type": "number"},
            "expenses_groceries":     {"type": "number"},
            "expenses_transport":     {"type": "number"},
            "expenses_subscriptions": {"type": "number"},
            "expenses_dining":        {"type": "number"},
            "expenses_shopping":      {"type": "number"},
            "expenses_other":         {"type": "number"},
            "debt_monthly":           {"type": "number"},
            "savings_total":          {"type": "number"},
        },
        "required": [],
    },
}


def _execute_calculate_score(args: dict, current_state: dict) -> dict:
    from core.health import calculate_metrics, score_metrics, calculate_overall_score

    modified = dict(current_state)
    for key, value in args.items():
        if value is not None:
            modified[key] = float(value)

    metrics       = calculate_metrics(modified)
    metric_scores = score_metrics(metrics)
    new_score     = calculate_overall_score(metric_scores)

    return {
        "new_overall_score": new_score,
        "metrics": {k: metrics[k] for k in ["savings_rate", "debt_to_income", "emergency_fund_months", "housing_ratio", "net_monthly_flow"]},
        "metric_scores": {k: metric_scores[k] for k in ["savings_rate", "debt_to_income", "emergency_fund_months", "housing_ratio"]},
    }


# ── Cognitive offload lever picker ────────────────────────────────────────────

_PICK_LEVER_PROMPT = """You are a financial advisor analyzing a user's financial snapshot.
The user has handed over the decision — they want YOU to decide what to work on.

Snapshot:
{snapshot}

Identify the single highest-impact lever to pull from the user's actual numbers.
A lever must be a realistic, specific change the user can act on.

Respond with ONLY valid JSON:
{{"lever_description": "...", "field": "expenses_dining|expenses_shopping|expenses_subscriptions|expenses_transport|expenses_other|debt_monthly|savings_total|income_additional", "current_value": <number>, "suggested_value": <number>, "rationale": "..."}}

- suggested_value must differ from current_value
- Pick the lever that most directly improves the user's WEAKEST metric"""


def _pick_lever(state: dict, provider: str, api_key: str) -> dict | None:
    snapshot_lines = [
        f"  {k}: {state[k]}"
        for k in ["income_main", "income_additional", "expenses_rent", "expenses_groceries",
                  "expenses_transport", "expenses_subscriptions", "expenses_dining",
                  "expenses_shopping", "expenses_other", "debt_monthly", "savings_total"]
        if state.get(k) is not None
    ]
    prompt = _PICK_LEVER_PROMPT.format(snapshot="\n".join(snapshot_lines) or "No data.")
    try:
        raw = _call_llm_simple(prompt, provider, api_key)
        raw = raw.strip()
        m = re.search(r"```(?:json)?\s*(.*?)\s*```", raw, re.DOTALL)
        raw = m.group(1) if m else raw
        data = json.loads(raw)
        if {"lever_description", "field", "current_value", "suggested_value", "rationale"}.issubset(data.keys()):
            return data
    except Exception:
        pass
    return None


# ── Message builder ───────────────────────────────────────────────────────────

def build_messages(snapshot_context: str, chat_history: list, categories: list[str] | None = None, summarised_history: str = "") -> list:
    category_content = ""
    for cat in (categories or []):
        block = _CATEGORY_BLOCKS.get(cat, "")
        if block:
            category_content += f"\n\n{block}"

    system_content = _BASE_SYSTEM_PROMPT + category_content + "\n\n" + snapshot_context
    if summarised_history:
        system_content += f"\n\nEARLIER CONVERSATION SUMMARY:\n{summarised_history}"

    return [{"role": "system", "content": system_content}] + list(chat_history)


# ── Streaming chat ────────────────────────────────────────────────────────────

def call_llm_chat(messages: list, provider: str, api_key: str, state: dict | None = None, categories: list | None = None):
    """Yields text chunks. Handles tool calling for scenario and cognitive_offload categories."""
    is_cognitive_offload = bool(state and categories and "cognitive_offload" in categories)
    use_tools = bool(state and categories and ("scenario" in categories or is_cognitive_offload))

    if is_cognitive_offload and state and provider and api_key:
        lever = _pick_lever(state, provider, api_key)
        if lever:
            lever_context = (
                f"\n\n[LEVER CONTEXT — already selected for you, do not re-derive it]\n"
                f"Recommended change: {lever['lever_description']}\n"
                f"Field: {lever['field']} | Current: {lever['current_value']} → Suggested: {lever['suggested_value']}\n"
                f"Why: {lever['rationale']}\n"
                f"Call calculate_score with {lever['field']}={lever['suggested_value']} and present the result."
            )
            messages = [
                {**m, "content": m["content"] + lever_context} if m["role"] == "system" else m
                for m in messages
            ]

    if provider == "anthropic":
        import anthropic
        system_content = " ".join(m["content"] for m in messages if m["role"] == "system")
        chat_messages  = [m for m in messages if m["role"] != "system"]
        client = anthropic.Anthropic(api_key=api_key)

        if use_tools:
            tools_def = [{"name": _TOOL_DEFINITION["name"], "description": _TOOL_DEFINITION["description"], "input_schema": _TOOL_DEFINITION["parameters"]}]
            resp = client.messages.create(model="claude-opus-4-6", max_tokens=1024, system=system_content, messages=chat_messages, tools=tools_def)
            if resp.stop_reason == "tool_use":
                tb = next(b for b in resp.content if b.type == "tool_use")
                result = _execute_calculate_score(tb.input, state)
                followup = chat_messages + [
                    {"role": "assistant", "content": resp.content},
                    {"role": "user", "content": [{"type": "tool_result", "tool_use_id": tb.id, "content": json.dumps(result)}]},
                ]
                with client.messages.stream(model="claude-opus-4-6", max_tokens=1024, system=system_content, messages=followup) as stream:
                    for text in stream.text_stream:
                        yield text
                return
            for block in resp.content:
                if hasattr(block, "text"):
                    yield block.text
            return

        with client.messages.stream(model="claude-opus-4-6", max_tokens=1024, system=system_content, messages=chat_messages) as stream:
            for text in stream.text_stream:
                yield text

    elif provider in ("openai", "groq"):
        from openai import OpenAI
        from groq import Groq
        client = OpenAI(api_key=api_key) if provider == "openai" else Groq(api_key=api_key)
        model  = "gpt-4o" if provider == "openai" else "llama-3.3-70b-versatile"

        if use_tools:
            tools_def = [{"type": "function", "function": _TOOL_DEFINITION}]
            resp = client.chat.completions.create(model=model, messages=messages, tools=tools_def, tool_choice="auto")
            msg = resp.choices[0].message
            if msg.tool_calls:
                tc = msg.tool_calls[0]
                result = _execute_calculate_score(json.loads(tc.function.arguments), state)
                followup = messages + [
                    {"role": "assistant", "content": msg.content,
                     "tool_calls": [{"id": tc.id, "type": "function", "function": {"name": tc.function.name, "arguments": tc.function.arguments}}]},
                    {"role": "tool", "tool_call_id": tc.id, "content": json.dumps(result)},
                ]
                stream = client.chat.completions.create(model=model, messages=followup, stream=True)
                for chunk in stream:
                    if chunk.choices[0].delta.content:
                        yield chunk.choices[0].delta.content
                return
            if msg.content:
                yield msg.content
            return

        stream = client.chat.completions.create(model=model, messages=messages, stream=True)
        for chunk in stream:
            if chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content

    elif provider == "gemini":
        import google.generativeai as genai
        system_content = " ".join(m["content"] for m in messages if m["role"] == "system")
        chat_messages  = [m for m in messages if m["role"] != "system"]
        genai.configure(api_key=api_key)

        if use_tools and state:
            model_check = genai.GenerativeModel("gemini-1.5-flash", system_instruction=system_content)
            history_check = [{"role": "user" if m["role"] == "user" else "model", "parts": [m["content"]]} for m in chat_messages[:-1]]
            extract_prompt = (
                f"{chat_messages[-1]['content']}\n\n"
                "If this is a what-if scenario question, extract the changed financial values as JSON "
                "with keys from: income_main, income_additional, expenses_rent, expenses_groceries, "
                "expenses_transport, expenses_subscriptions, expenses_dining, expenses_shopping, "
                "expenses_other, debt_monthly, savings_total. "
                "Reply with ONLY the JSON object if it's a scenario, or ONLY the word 'none' if not."
            )
            extract_resp = model_check.start_chat(history=history_check).send_message(extract_prompt)
            if extract_resp.text.strip().lower() != "none":
                try:
                    raw = extract_resp.text.strip().strip("```json").strip("```").strip()
                    result = _execute_calculate_score(json.loads(raw), state)
                    injected = f"{chat_messages[-1]['content']}\n\n[Tool result: {json.dumps(result)}]\nUse these exact numbers."
                    final_messages = chat_messages[:-1] + [{"role": "user", "content": injected}]
                    model_final = genai.GenerativeModel("gemini-1.5-flash", system_instruction=system_content)
                    chat_final  = model_final.start_chat(history=[{"role": "user" if m["role"] == "user" else "model", "parts": [m["content"]]} for m in final_messages[:-1]])
                    for chunk in chat_final.send_message(final_messages[-1]["content"], stream=True):
                        if chunk.text:
                            yield chunk.text
                    return
                except Exception:
                    pass

        model = genai.GenerativeModel("gemini-1.5-flash", system_instruction=system_content)
        chat  = model.start_chat(history=[{"role": "user" if m["role"] == "user" else "model", "parts": [m["content"]]} for m in chat_messages[:-1]])
        for chunk in chat.send_message(chat_messages[-1]["content"], stream=True):
            if chunk.text:
                yield chunk.text

    else:
        yield "Unsupported provider."


# ── Conversation summarisation ────────────────────────────────────────────────

_SUMMARISE_PROMPT = """Summarise the following personal finance conversation for context continuity.
{existing_block}
Conversation to summarise:
{conversation}

Write a concise summary under 150 words covering:
- Main topics discussed
- Specific numbers, decisions, or conclusions reached
- The user's concerns or goals as they emerged

Do not include the user's financial snapshot — that is always provided separately.
Return only the summary text, no headers or labels."""


def maybe_summarise(chat_history: list, existing_summary: str, provider: str, api_key: str, keep_turns: int = 6, summarise_after_turns: int = 8) -> tuple[list, str]:
    threshold = (keep_turns + summarise_after_turns) * 2
    if len(chat_history) < threshold:
        return chat_history, existing_summary

    keep_count   = keep_turns * 2
    to_summarise = chat_history[:-keep_count]
    to_keep      = chat_history[-keep_count:]

    conversation = "\n".join(f"{m['role'].upper()}: {m['content']}" for m in to_summarise)
    existing_block = f"Existing summary to extend:\n{existing_summary}\n\nNew turns to add:" if existing_summary else ""
    prompt = _SUMMARISE_PROMPT.format(existing_block=existing_block, conversation=conversation)

    try:
        new_summary = _call_llm_simple(prompt, provider, api_key)
    except Exception:
        new_summary = existing_summary

    return to_keep, new_summary
