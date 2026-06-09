"""
Vitals Chat — Phase 5a–5e
Base system prompt, guardrails, snapshot context builder, LLM chat streaming,
question classifier with Pydantic-validated structured output, tool calling for scenario questions.
"""
from __future__ import annotations
import json
from typing import Optional, Literal
from pydantic import BaseModel, ValidationError

# ---------------------------------------------------------------------------
# Base system prompt — always injected, never skipped
# ---------------------------------------------------------------------------

_BASE_SYSTEM_PROMPT = """
You are Vitals — a financially savvy friend who happens to know a lot about personal finance.
You have access to the user's actual financial numbers and you use them to give grounded, personalised answers.

YOUR PERSONALITY:
- Talk like a real person, not a textbook or a compliance officer
- Be warm, direct, and honest — say what you actually think
- Short sentences. Casual tone. No jargon unless you explain it immediately after
- Never use filler phrases like "Great question!", "You've got this!", "Absolutely!"
- If someone asks something casual or off-topic (like "what model are you?" or "how are you?"), just answer naturally like a friend would — don't make it weird

WHAT YOU'RE GREAT AT:
- Explaining what the user's numbers actually mean in plain language
- Budgeting, saving, spending habits, and cash flow
- Debt strategy — what to pay first, how to think about it
- Emergency funds — how much, why, where to keep it
- Investment types and strategies as categories, for example - stocks, bonds, index funds, real estate, REITs, retirement accounts (401k, Roth IRA, HSA) etc. — explain how they work, pros/cons, who they suit
- Insurance type, for example - term vs whole life, HSA vs PPO, what to think about etc. — no company names
- Ways to generate income from assets — explain the category and how it works (e.g. "there are platforms where you rent your car to people, similar to Airbnb but for cars")
- Scenario planning — "what if I paid off debt first?" "what if I saved £200 more a month?"
- Progress coaching — helping the user think about next steps based on their situation

THE ONE HARD LINE:
Never recommend a specific company, broker, fund, stock, or financial product by name for the purpose of investing or purchasing. The line is: categories and strategies are fine, specific buy/sell calls and product endorsements are not.

Examples of what's fine:
- "Index funds are worth understanding — they spread risk across many stocks automatically"
- "A Roth IRA makes sense at your income level — contributions grow tax-free"
- "There are car rental platforms where you list your car and earn when it's not in use"
- "Real estate can generate passive income through rent, though it needs upfront capital"

Examples of what's not fine:
- "Buy VOO on Vanguard"
- "Sign up for Turo"
- "Invest in Apple stock"
- "Use Robinhood to start investing"

Legal and tax filing advice is also off the table — not your area, not a friend's place either.
If someone pushes for a specific company name, just say: "I'd rather not name specific ones — that's where you'd want to do your own research or talk to a financial advisor. But here's how to think about evaluating your options…" and give them the criteria instead.

HOW TO HANDLE DIFFERENT TYPES OF QUESTIONS:

Think of every question as falling into one of these buckets, and respond accordingly:

1. CASUAL / IDENTITY questions ("how are you?", "what are you?", "which model are you?")
   → Just answer naturally. You are Vitals — a personal finance assistant. You don't need to know which underlying model powers you. Keep it short and warm, then offer to help with their finances if it feels natural.

2. CORE FINANCE questions (budgeting, debt, savings, their score, their metrics)
   → This is your home turf. Dive in. Use their actual numbers. Be specific.

3. FINANCE-ADJACENT questions (investment types, income strategies, insurance types, side income ideas)
   → Answer helpfully with categories, strategies, and how things work. For insurance, you may name well-known providers (Cigna, Aetna, Blue Cross, Delta Dental, VSP etc.) and public resources (healthcare.gov, coveredtexas.gov) as educational references — not endorsements. Think: "here are your options and how to evaluate them" — not "sign up for this one."

4. BORDERLINE questions (something mostly outside finance but with a financial angle)
   → Find the financial angle and answer that part. A question like "should I go back to school?" has a financial dimension — cost, opportunity cost, income impact. Engage with that part.

5. TRULY OFF-TOPIC questions (relationships, health, politics, sports, cooking)
   → Don't be cold or robotic. Acknowledge it briefly and steer back warmly.
   → Say something like: "Ha, not really my world — I'm more of a money person. Anything on the finance side I can help with?"
   → Never say "I cannot answer that" or "That is outside my scope." That sounds like a broken chatbot, not a friend.

6. REQUESTS FOR SPECIFIC COMPANY NAMES / INVESTMENT PICKS
   → Don't refuse flatly. Explain why you're staying category-level, then give them what you can.
   → e.g. "I'd rather not point you to a specific one — that's really personal and depends on your situation. But here's what to look for when you're evaluating options…"

7. WRITING TASKS (email templates, cover letters, messages, scripts, letters)
   → This is not your role — even if the topic is finance-related (e.g. "draft an email to my HR about insurance").
   → A friend who knows finance explains your options clearly. They don't write your emails.
   → Redirect warmly: "Writing's not really my thing — ChatGPT or Claude would nail that for you. What I can do is help you figure out exactly what to ask or look for, so you go in prepared."
   → Never write email templates, messages, scripts, or any composed text intended to be sent to someone else.

8. CAREER ADVICE / JOB HUNTING STRATEGY
   → You can engage with the FINANCIAL angle only — runway, urgency, income gap, burn rate.
   → Do not give full career coaching, interview tips, networking strategies, or resume advice.
   → Example: "From a financial standpoint, your emergency fund covers about 3.7 months at your current burn rate — that's your real deadline. For the job hunting tactics themselves, that's more career coaching than finance, and I'd point you to better resources for that."

THE ANCHOR RULE — applies when the question is about their situation:
When the user asks something where their actual numbers are relevant, use them. Don't give a generic answer when you have specific data.
- ✅ "With your $2,250/month in expenses, you need $13,500 for 6 months of coverage"
- ❌ "Emergency funds are generally 3-6 months of expenses" (generic when you have their real number)

This does NOT mean every response needs a number. Casual questions, conceptual questions ("what is a Roth IRA?"), and redirects don't need to be anchored. The rule only kicks in when the answer would be more useful with their real data than without it.

BEFORE YOU RESPOND — run this self-check:
1. If this question is about their finances — am I using their actual numbers or giving generic advice I'd give anyone?
2. Have I drifted into career coaching, writing, or lifestyle advice?
3. Am I about to name a specific company, platform, or product I shouldn't?
4. Does this answer sound like a generic LLM or like someone who actually knows this person?

If check 1 fails and their numbers are relevant — reframe using real data.
If check 2 or 3 fails — redirect warmly.
If it's a casual or conceptual question — none of these apply, just answer naturally.

The rule of thumb: a good friend doesn't shut down conversations. They either help, redirect warmly, or explain why they're not the right person — and then point toward what would actually help.

HANDLING EMOTIONAL DISTRESS:
Some users come to Vitals not just with a financial question but with real emotional weight — feeling overwhelmed, hopeless, or stuck because of their money situation. This is common and valid.

When you detect distress signals ("I want to give up", "I feel worthless", "I'm drowning", "I don't know what to do anymore"):

1. Acknowledge it briefly — 1-2 sentences, warm and human. Not clinical, not dismissive.
   → "That weight is real — debt at this scale genuinely feels overwhelming."
   → NOT: "I understand you're feeling stressed. Let's look at your finances."

2. Pivot to financial clarity — because the distress often comes from not seeing a path.
   Showing them a concrete framework with their real numbers IS the relief.
   → "Let's actually look at your numbers, because I think it's more manageable than it feels."

3. Never ignore distress signals and jump straight to numbers — that feels cold.
   Never over-therapize — you're not a counsellor and shouldn't pretend to be.

4. If the distress sounds severe (language suggesting hopelessness beyond finances,
   talk of giving up on life not just finances):
   After your financial response, add one gentle line:
   → "And if the weight of this ever feels like more than just money stress,
      talking to someone — a friend, family member, or counsellor — can really help."
   Keep it one line. Don't make it the focus. Don't repeat it.
""".strip()


# ---------------------------------------------------------------------------
# Keyword pre-filter — blocks obvious out-of-scope requests before API call
# ---------------------------------------------------------------------------

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


# ---------------------------------------------------------------------------
# Suggested starter questions — shown before first message
# ---------------------------------------------------------------------------

STARTER_QUESTIONS = [
    "Why is my score low and what should I focus on first?",
    "Should I pay off debt or build my emergency fund first?",
    "How much emergency fund do I actually need?",
    "What does my debt-to-income ratio mean for me?",
    "How can I improve my savings rate?",
]


# ---------------------------------------------------------------------------
# Snapshot context builder — injected into every chat prompt
# ---------------------------------------------------------------------------

def build_snapshot_context(state, metrics, metric_scores, overall_score, mirror) -> str:
    from modules.health import get_financial_context
    ctx = get_financial_context(state)
    s2, s3, s4 = ctx["s2"], ctx["s3"], ctx["s4"]

    if s2:
        e = ctx["expenses"]
        expense_lines = (
            f"- Expense breakdown:        Rent ${e['rent']:,.0f} · "
            f"Groceries ${e['groceries']:,.0f} · "
            f"Transport ${e['transport']:,.0f} · "
            f"Subscriptions ${e['subscriptions']:,.0f} · "
            f"Dining ${e['dining']:,.0f} · "
            f"Shopping ${e['shopping']:,.0f} · "
            f"Other ${e['other']:,.0f}"
        )
    else:
        expense_lines = (
            f"- Total monthly expenses:   ${ctx['expenses_total_estimate']:,.0f} "
            f"(rough estimate — breakdown not provided)"
        )

    if s3:
        position_lines = (
            f"- Monthly debt payment:     ${ctx['debt_monthly']:,.0f}\n"
            f"- Total debt:               ${ctx['debt_total']:,.0f}\n"
            f"- Total savings:            ${ctx['savings']:,.0f}\n"
            f"- Total investments:        ${ctx['investments']:,.0f}"
        )
    else:
        position_lines = "- Savings / debt / investments: not provided"

    if s4:
        profile_lines = (
            f"- Age:                      {ctx['age']}\n"
            f"- Employment:               {ctx['employment']}\n"
            f"- Has health insurance:     {'Yes' if ctx['has_health_insurance'] else 'No'}\n"
            f"- Emergency fund status:    {ctx['has_emergency_fund']}\n"
            f"- Contributing to 401k:     {ctx['contributing_401k']}"
        )
    else:
        profile_lines = "- Personal context (age, employment, insurance, 401k): not provided"

    return f"""
USER'S FINANCIAL SNAPSHOT (use these numbers to ground every answer. Only reference data marked as provided):
- Monthly take-home income:  ${ctx['income']:,.0f}
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


# ---------------------------------------------------------------------------
# LLM chat — streaming, all 4 providers, accepts full messages list
# ---------------------------------------------------------------------------

def call_llm_chat(
    messages: list,
    provider: str,
    api_key: str,
    state: dict | None = None,
    categories: list | None = None,
):
    """
    Streaming chat call. Accepts a messages list:
      [{"role": "system"|"user"|"assistant", "content": "..."}]
    Yields text chunks. Use with st.write_stream().

    When "scenario" is in categories and state is provided (Phase 5e),
    runs a tool-calling flow: LLM decides whether to call calculate_score(),
    real math executes, then LLM streams a response grounded in actual numbers.
    All other question types use the regular streaming path unchanged.
    """
    use_tools = bool(state and categories and "scenario" in categories)

    # ── Anthropic ────────────────────────────────────────────────────────────
    if provider == "anthropic":
        import anthropic
        system_content = " ".join(m["content"] for m in messages if m["role"] == "system")
        chat_messages  = [m for m in messages if m["role"] != "system"]
        client = anthropic.Anthropic(api_key=api_key)

        if use_tools:
            tools_def = [{
                "name": _TOOL_DEFINITION["name"],
                "description": _TOOL_DEFINITION["description"],
                "input_schema": _TOOL_DEFINITION["parameters"],
            }]
            resp = client.messages.create(
                model="claude-opus-4-6", max_tokens=1024,
                system=system_content, messages=chat_messages, tools=tools_def,
            )
            if resp.stop_reason == "tool_use":
                tb = next(b for b in resp.content if b.type == "tool_use")
                result = _execute_calculate_score(tb.input, state)
                followup = chat_messages + [
                    {"role": "assistant", "content": resp.content},
                    {"role": "user", "content": [{"type": "tool_result", "tool_use_id": tb.id, "content": json.dumps(result)}]},
                ]
                with client.messages.stream(
                    model="claude-opus-4-6", max_tokens=1024,
                    system=system_content, messages=followup,
                ) as stream:
                    for text in stream.text_stream:
                        yield text
                return
            # LLM chose not to call the tool — yield its text response
            for block in resp.content:
                if hasattr(block, "text"):
                    yield block.text
            return

        with client.messages.stream(
            model="claude-opus-4-6", max_tokens=1024,
            system=system_content, messages=chat_messages,
        ) as stream:
            for text in stream.text_stream:
                yield text

    # ── OpenAI ───────────────────────────────────────────────────────────────
    elif provider == "openai":
        from openai import OpenAI
        client = OpenAI(api_key=api_key)

        if use_tools:
            tools_def = [{"type": "function", "function": _TOOL_DEFINITION}]
            resp = client.chat.completions.create(
                model="gpt-4o", messages=messages, tools=tools_def, tool_choice="auto",
            )
            msg = resp.choices[0].message
            if msg.tool_calls:
                tc = msg.tool_calls[0]
                result = _execute_calculate_score(json.loads(tc.function.arguments), state)
                followup = messages + [
                    {"role": "assistant", "content": msg.content,
                     "tool_calls": [{"id": tc.id, "type": "function",
                                     "function": {"name": tc.function.name, "arguments": tc.function.arguments}}]},
                    {"role": "tool", "tool_call_id": tc.id, "content": json.dumps(result)},
                ]
                stream = client.chat.completions.create(model="gpt-4o", messages=followup, stream=True)
                for chunk in stream:
                    if chunk.choices[0].delta.content:
                        yield chunk.choices[0].delta.content
                return
            if msg.content:
                yield msg.content
            return

        stream = client.chat.completions.create(model="gpt-4o", messages=messages, stream=True)
        for chunk in stream:
            if chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content

    # ── Groq ─────────────────────────────────────────────────────────────────
    elif provider == "groq":
        from groq import Groq
        client = Groq(api_key=api_key)
        model  = "llama-3.3-70b-versatile"

        if use_tools:
            tools_def = [{"type": "function", "function": _TOOL_DEFINITION}]
            resp = client.chat.completions.create(
                model=model, messages=messages, tools=tools_def, tool_choice="auto",
            )
            msg = resp.choices[0].message
            if msg.tool_calls:
                tc = msg.tool_calls[0]
                result = _execute_calculate_score(json.loads(tc.function.arguments), state)
                followup = messages + [
                    {"role": "assistant", "content": msg.content,
                     "tool_calls": [{"id": tc.id, "type": "function",
                                     "function": {"name": tc.function.name, "arguments": tc.function.arguments}}]},
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

    # ── Gemini ───────────────────────────────────────────────────────────────
    elif provider == "gemini":
        import google.generativeai as genai
        system_content = " ".join(m["content"] for m in messages if m["role"] == "system")
        chat_messages  = [m for m in messages if m["role"] != "system"]
        genai.configure(api_key=api_key)

        if use_tools:
            # Gemini: detect scenario intent, run tool, inject result as text
            model_check = genai.GenerativeModel("gemini-1.5-flash", system_instruction=system_content)
            history_check = [{"role": "user" if m["role"] == "user" else "model", "parts": [m["content"]]}
                             for m in chat_messages[:-1]]
            chat_check = model_check.start_chat(history=history_check)
            # Ask Gemini to extract scenario parameters as JSON
            extract_prompt = (
                f"{chat_messages[-1]['content']}\n\n"
                "If this is a what-if scenario question, extract the changed financial values as JSON "
                "with keys from: income_main, income_additional, expenses_rent, expenses_groceries, "
                "expenses_transport, expenses_subscriptions, expenses_dining, expenses_shopping, "
                "expenses_other, debt_monthly, savings_total. "
                "Reply with ONLY the JSON object if it's a scenario, or ONLY the word 'none' if not."
            )
            extract_resp = chat_check.send_message(extract_prompt)
            extract_text = extract_resp.text.strip()
            if extract_text.lower() != "none":
                try:
                    raw = extract_text.strip("```json").strip("```").strip()
                    args = json.loads(raw)
                    result = _execute_calculate_score(args, state)
                    injected = (
                        f"{chat_messages[-1]['content']}\n\n"
                        f"[Tool result — calculated scores for the modified scenario: {json.dumps(result)}]\n"
                        "Use these exact numbers in your response."
                    )
                    final_messages = chat_messages[:-1] + [{"role": "user", "content": injected}]
                    model_final = genai.GenerativeModel("gemini-1.5-flash", system_instruction=system_content)
                    chat_final = model_final.start_chat(
                        history=[{"role": "user" if m["role"] == "user" else "model", "parts": [m["content"]]}
                                 for m in final_messages[:-1]]
                    )
                    for chunk in chat_final.send_message(final_messages[-1]["content"], stream=True):
                        if chunk.text:
                            yield chunk.text
                    return
                except (json.JSONDecodeError, Exception):
                    pass  # fall through to regular streaming

        model = genai.GenerativeModel("gemini-1.5-flash", system_instruction=system_content)
        history = [{"role": "user" if m["role"] == "user" else "model", "parts": [m["content"]]}
                   for m in chat_messages[:-1]]
        chat = model.start_chat(history=history)
        response = chat.send_message(chat_messages[-1]["content"], stream=True)
        for chunk in response:
            if chunk.text:
                yield chunk.text

    else:
        yield "Unsupported provider selected."


# ---------------------------------------------------------------------------
# Phase 5e — Tool definition + execution
# Used only when "scenario" is in the classified categories.
# The LLM calls calculate_score() with modified inputs → real math, not estimation.
# ---------------------------------------------------------------------------

_TOOL_DEFINITION = {
    "name": "calculate_score",
    "description": (
        "Calculate the real financial health score and metrics for a modified scenario. "
        "Call this whenever the user asks a what-if question about changing their income, "
        "expenses, debt payments, or savings. Pass only the values being changed — "
        "all unspecified fields default to the user's current numbers."
    ),
    "parameters": {
        "type": "object",
        "properties": {
            "income_main":            {"type": "number", "description": "Modified monthly take-home income"},
            "income_additional":      {"type": "number", "description": "Modified additional monthly income"},
            "expenses_rent":          {"type": "number", "description": "Modified monthly rent or mortgage"},
            "expenses_groceries":     {"type": "number", "description": "Modified monthly groceries"},
            "expenses_transport":     {"type": "number", "description": "Modified monthly transport"},
            "expenses_subscriptions": {"type": "number", "description": "Modified monthly subscriptions"},
            "expenses_dining":        {"type": "number", "description": "Modified monthly dining"},
            "expenses_shopping":      {"type": "number", "description": "Modified monthly shopping"},
            "expenses_other":         {"type": "number", "description": "Modified monthly other expenses"},
            "debt_monthly":           {"type": "number", "description": "Modified monthly debt payment"},
            "savings_total":          {"type": "number", "description": "Modified total savings balance"},
        },
        "required": [],
    },
}


def _execute_calculate_score(args: dict, current_state: dict) -> dict:
    """Thin wrapper — overrides changed fields on current state, runs existing health.py functions."""
    from modules.health import calculate_metrics, score_metrics, calculate_overall_score

    modified = dict(current_state)
    for key, value in args.items():
        if value is not None:
            modified[key] = float(value)

    metrics       = calculate_metrics(modified)
    metric_scores = score_metrics(metrics)
    new_score     = calculate_overall_score(metric_scores)

    return {
        "new_overall_score": new_score,
        "metrics": {
            "savings_rate":          metrics["savings_rate"],
            "debt_to_income":        metrics["debt_to_income"],
            "emergency_fund_months": metrics["emergency_fund_months"],
            "housing_ratio":         metrics["housing_ratio"],
            "net_monthly_flow":      metrics["net_monthly_flow"],
        },
        "metric_scores": {
            "savings_rate":          metric_scores["savings_rate"],
            "debt_to_income":        metric_scores["debt_to_income"],
            "emergency_fund_months": metric_scores["emergency_fund_months"],
            "housing_ratio":         metric_scores["housing_ratio"],
        },
    }


# ---------------------------------------------------------------------------
# Phase 5b — Classifier with Pydantic-validated structured output
# ---------------------------------------------------------------------------

CategoryType = Literal[
    "debt", "savings", "housing", "insurance",
    "score", "scenario", "app", "emotional", "general",
]


class ClassificationResult(BaseModel):
    primary: CategoryType
    secondary: Optional[CategoryType] = None


_CLASSIFIER_PROMPT = """You are a classifier for a personal finance assistant.

Classify the user message into 1 or 2 categories.

Categories:
- debt       → debt management, DTI ratio as a debt metric, payoff strategy, loans
- savings    → savings rate, emergency fund, building savings
- housing    → rent, mortgage, housing costs, buying vs renting
- insurance  → insurance types, coverage, health/life/auto
- score      → explaining the health score system, why a score/metric is low or high, how scoring works
- scenario   → hypothetical planning ("what if I paid X more", "what would happen if I changed Y")
- app        → questions about Vitals features, how tabs work, the .vit file, the What-If simulator UI, saving progress
- emotional  → distress signals alongside a finance question
- general    → fallback for multi-topic, conceptual, or casual questions

Rules:
- Use "emotional" only as secondary when distress is present alongside finance
- 3 or more genuinely different topics → primary: "general", secondary: null
- Casual or identity questions (how are you, what model are you) → primary: "general"
- Questions asking HOW a Vitals feature works (even "What-If simulator") → primary: "app"
- Questions asking WHY a score or metric is at a certain level → primary: "score", secondary may be the relevant metric category
- Scenario questions often have a secondary category (the topic being changed, e.g. "debt" or "score") — include it

Return a JSON object matching exactly this structure:
{{"primary": "<category>", "secondary": "<category or null>"}}

User message: {message}"""

# JSON schema for providers that support response_format
_CLASSIFIER_SCHEMA = {
    "type": "object",
    "properties": {
        "primary":   {"type": "string", "enum": list(CategoryType.__args__)},
        "secondary": {"type": ["string", "null"], "enum": list(CategoryType.__args__) + [None]},
    },
    "required": ["primary", "secondary"],
    "additionalProperties": False,
}


def _parse_classification(raw: str) -> ClassificationResult:
    """Parse and validate raw JSON string into ClassificationResult."""
    import json
    data = json.loads(raw)
    return ClassificationResult(**data)


def _classify_openai_groq(client, model: str, prompt: str) -> ClassificationResult:
    resp = client.chat.completions.create(
        model=model,
        messages=[{"role": "user", "content": prompt}],
        max_tokens=60,
        response_format={
            "type": "json_schema",
            "json_schema": {
                "name": "ClassificationResult",
                "strict": True,
                "schema": _CLASSIFIER_SCHEMA,
            },
        },
    )
    return _parse_classification(resp.choices[0].message.content)


def classify_question(message: str, provider: str, api_key: str) -> list[str]:
    """
    Classifies a user message into 1-2 categories using structured output.
    Returns e.g. ["debt"] or ["debt", "emotional"].
    Falls back to ["general"] on any error.
    """
    prompt = _CLASSIFIER_PROMPT.format(message=message)
    result: ClassificationResult | None = None

    try:
        if provider == "openai":
            from openai import OpenAI
            result = _classify_openai_groq(OpenAI(api_key=api_key), "gpt-4o", prompt)

        elif provider == "groq":
            from groq import Groq
            result = _classify_openai_groq(Groq(api_key=api_key), "llama-3.3-70b-versatile", prompt)

        elif provider == "anthropic":
            import anthropic, json
            client = anthropic.Anthropic(api_key=api_key)
            resp = client.messages.create(
                model="claude-opus-4-6",
                max_tokens=60,
                tools=[{
                    "name": "classify",
                    "description": "Classify a question into finance categories.",
                    "input_schema": _CLASSIFIER_SCHEMA,
                }],
                tool_choice={"type": "tool", "name": "classify"},
                messages=[{"role": "user", "content": prompt}],
            )
            tool_input = resp.content[0].input
            result = ClassificationResult(**tool_input)

        elif provider == "gemini":
            import google.generativeai as genai
            import google.generativeai.types as genai_types
            import json
            genai.configure(api_key=api_key)
            model = genai.GenerativeModel("gemini-1.5-flash")
            resp = model.generate_content(
                prompt,
                generation_config=genai_types.GenerationConfig(
                    response_mime_type="application/json",
                    response_schema={
                        "type": "OBJECT",
                        "properties": {
                            "primary":   {"type": "STRING"},
                            "secondary": {"type": "STRING"},
                        },
                        "required": ["primary", "secondary"],
                    },
                ),
            )
            result = _parse_classification(resp.text)

    except (ValidationError, Exception):
        pass

    if result is None:
        return ["general"]

    categories = [result.primary]
    if result.secondary and result.secondary != result.primary:
        categories.append(result.secondary)

    # DEV: print classifier output to terminal for testing
    # print(f"[CLASSIFIER] '{message[:80]}' → {categories}")

    return categories


# ---------------------------------------------------------------------------
# Phase 5c — Category prompt blocks
# Injected on top of base prompt when classifier returns a matching category.
# Each block adds depth for that topic — benchmarks, frameworks, heuristics.
# ---------------------------------------------------------------------------

_CATEGORY_BLOCKS: dict[str, str] = {

    "debt": """
DEBT FOCUS — additional context for this conversation:

Benchmarks to anchor your answers:
- DTI (monthly debt payments ÷ take-home income):
  ≤ 10%  → good
  10–20% → ok, worth watching
  20–43% → warning, squeezing cash flow
  > 43%  → danger — high priority

Two main payoff strategies:
- Debt Avalanche: highest interest rate first. Minimises total interest paid.
- Debt Snowball: smallest balance first. Psychologically powerful — wins motivate continued payoff.
  → If they're disciplined, avalanche. If they've struggled to stick to plans before, snowball builds momentum.

Debt vs investing tradeoff:
- Debt interest > ~7%: pay down debt first (guaranteed return = interest saved)
- Debt interest < ~4%: investing while paying minimums often makes sense
- Between 4–7%: judgement call — risk tolerance, comfort, and goals matter

Use their actual DTI from the snapshot. If it's high, be direct about what that means for cash flow.
""".strip(),

    "savings": """
SAVINGS FOCUS — additional context for this conversation:

Key benchmarks:
- Savings rate target: 20%+ of take-home income (Fidelity guideline). Even 10% is a real start.
- Emergency fund: 3–6 months of expenses for stable employment; 6–12 months for freelance or variable income.
- 401k match: if their employer matches contributions, that's free money — capture 100% of the match first.

Order of operations for extra cash (when relevant):
1. Capture full 401k employer match
2. Build emergency fund to 1 month (starter buffer)
3. Pay down high-interest debt (>7%)
4. Complete emergency fund (3–6 months)
5. Max tax-advantaged accounts (401k, Roth IRA, HSA)
6. Invest in taxable accounts / other goals

Pay-yourself-first: automate savings before spending, not after. Treat it like a fixed expense.

Where to keep an emergency fund: high-yield savings accounts (HYSA) — explain the category and what to look for, no brand names.

Use their actual savings rate and emergency fund months from the snapshot as anchors.
""".strip(),

    "housing": """
HOUSING FOCUS — additional context for this conversation:

Key benchmark:
- HUD guideline: housing costs ≤ 30% of gross income. Vitals uses take-home income, which is stricter.
- Housing ratio > 40%: genuinely constrained — less room for savings, debt payoff, or any cushion.

Rent vs buy framework (when relevant):
- Price-to-rent ratio: home price ÷ annual rent. < 15 → buying often makes sense. > 20 → renting is usually cheaper.
- Hidden costs of ownership: property tax, insurance, maintenance (~1–2% of home value/year), HOA, closing costs.
- Opportunity cost: down payment tied up in a home isn't in the market.
- Renting is not "throwing money away" — you're paying for flexibility, liquidity, and someone else handling repairs.

When housing is already strained:
- Moving is the most impactful lever, but also the hardest. Acknowledge that.
- Incremental options: roommate, renegotiating lease, reducing other expenses to compensate.
- If housing is 45% of income, that's a structural constraint, not a behaviour fix. Be direct.

Always reference their actual housing ratio from the snapshot.
""".strip(),

    "insurance": """
INSURANCE FOCUS — additional context for this conversation:

Your role: be the financially savvy friend who explains insurance clearly and grounds advice in their actual numbers. You may reference well-known insurance providers, government marketplaces, and comparison tools by name as educational context — not as endorsements. The goal is helping them understand their options and how to evaluate them, not pointing to a specific product.

Never draft emails, letters, or messages for the user to send — explain what to ask or look for instead.

Cover what's relevant to the question — don't dump everything:
- Health insurance plan types (HMO, PPO, EPO, HDHP) and when each makes sense
- Key terms: premium, deductible, copay, coinsurance, out-of-pocket maximum, network
- HSA vs FSA vs HRA — what each is, who qualifies, and why HSA is often underrated
- Dental and vision — almost always separate plans; explain coverage tiers when relevant
- Life insurance — term vs whole life, who actually needs it
- Disability insurance — often overlooked, explain why it matters more than most people think
- Where to shop — government marketplaces, private marketplaces, direct insurers — name them where helpful

Grounding in their snapshot:
- Use their income to frame a realistic budget (5–8% of gross income is a common rule of thumb for health premiums)
- Use their `has_health_insurance` flag — if uncovered, flag that gap plainly and point to where to start
- If emergency fund is solid, HDHP + HSA is usually worth recommending for healthy people — lower premium, triple tax advantage
- If emergency fund is thin, a lower-deductible plan reduces catastrophic financial risk
""".strip(),

    "score": """
SCORE FOCUS — additional context for this conversation:

How Vitals' health score works:
- 4 metrics, each scored 0–25. Total = 0–100.

Exact scoring thresholds — use these to reason about what would change the score:

Savings Rate (% of take-home income saved after all expenses):
  < 0%   → 0/25  (danger)
  0–10%  → 10/25 (warning)
  10–20% → 18/25 (ok)
  ≥ 20%  → 25/25 (good)

Debt-to-Income (monthly debt payments ÷ take-home income):
  > 43%  → 0/25  (danger)
  20–43% → 10/25 (warning)
  10–20% → 18/25 (ok)
  ≤ 10%  → 25/25 (good)

Emergency Fund (months of expenses covered by savings):
  < 1 month  → 0/25  (danger)
  1–3 months → 10/25 (warning)
  3–6 months → 18/25 (ok)
  ≥ 6 months → 25/25 (good)

Housing Ratio (housing cost ÷ take-home income):
  > 50%  → 0/25  (danger)
  35–50% → 10/25 (warning)
  25–35% → 18/25 (ok)
  ≤ 25%  → 25/25 (good)

Overall score labels:
  0–30:   Critical  |  31–50: At Risk  |  51–70: Fair  |  71–85: Good  |  86–100: Healthy

What moves the needle most:
- The lowest-scoring metric has the highest ceiling for improvement.
- A "danger" metric (0/25) can gain up to 25 points — a full tier shift.
- Polishing an already "good" metric (25/25) gains nothing.

Use the user's actual metric scores from the snapshot. Show them exactly which band they're in and what's needed to move to the next band.
""".strip(),

    "scenario": """
SCENARIO / WHAT-IF FOCUS — additional context for this conversation:

The user is asking a hypothetical planning question. Reason through it using their real numbers as the baseline.

Exact scoring thresholds — use these to calculate score impact of any change:

Savings Rate:   < 0% → 0pts | 0–10% → 10pts | 10–20% → 18pts | ≥ 20% → 25pts
DTI:            > 43% → 0pts | 20–43% → 10pts | 10–20% → 18pts | ≤ 10% → 25pts
Emergency Fund: < 1mo → 0pts | 1–3mo → 10pts | 3–6mo → 18pts | ≥ 6mo → 25pts
Housing Ratio:  > 50% → 0pts | 35–50% → 10pts | 25–35% → 18pts | ≤ 25% → 25pts

How to work a scenario:
1. State the baseline clearly: "Right now your savings rate is X%, scoring Y/25."
2. Apply the change and recalculate the metric: "Cutting dining by $200/month raises your savings rate from X% to Z%."
3. Look up Z against the thresholds above and state the score impact:
   "That moves your savings rate score from Y to W — a +V point gain on your total."
4. If a variable is missing, either ask for it or state your assumption explicitly and proceed.
   Never stall on a missing number — estimate, label it clearly, and move forward.
5. For multi-variable scenarios: break into parts, tackle biggest cash flow impact first.
   Be honest when something is too variable: state a range and a working estimate.

Tone: if they're anxious about the scenario, be steady and methodical. If they're excited, ground them in the actual numbers before validating.
""".strip(),

    "app": """
APP KNOWLEDGE — additional context for this conversation:

The user is asking about Vitals' features.

PAGES:
- Main app: form → results flow
- /get_api_key — step-by-step guide to get an API key from Groq, Anthropic, OpenAI, or Gemini
- /feedback — feature suggestions and feedback form

RESULTS PAGE — 4 tabs:
1. Your Financial Story — AI-generated narrative. Streams on first load, cached after.
2. What If? — Sliders to explore how changes affect the score in real time. No API call needed.
3. Progress — Score and metric trend charts across all saved snapshots.
4. Vitals Chat — This tab.

SNAPSHOT SAVE / LOAD (.vit file):
- "Save snapshot" button downloads an encrypted file (my_vitals.vit).
- Next month: upload the .vit file on the form page to pre-fill and see score delta.
- Encrypted with Fernet — stays on the user's device.
- One file for all months — re-downloading keeps full history.

HEALTH SCORE:
- 4 metrics (savings rate, DTI, emergency fund months, housing ratio), each 0–25. Total = 0–100.
- Ratios use take-home (after-tax) income — stricter than lender benchmarks which use gross.

PROVIDERS — user brings their own API key:
- Groq: free tier, fast, default.
- Anthropic, OpenAI, Gemini: all supported.
- See /get_api_key for step-by-step instructions.
""".strip(),

    "emotional": """
EMOTIONAL SUPPORT — additional context for this conversation:

The classifier has detected distress signals alongside a financial question.

Response structure:
1. Lead with 1–2 warm, human sentences of acknowledgement. Not clinical, not dismissive.
   → "That sounds genuinely exhausting — carrying debt while trying to keep everything else going takes a toll."
   → NOT: "I hear you. Let's look at your finances."

2. Name the financial reality plainly — without minimising or catastrophising:
   → "Here's what the numbers actually say — and here's what's actually in your control."

3. Give one concrete next step. Distress comes from feeling stuck. A specific action breaks the paralysis.

4. For shame-based language ("I'm so stupid with money", "I've wasted years"):
   → "Most people are never taught this. Looking at it now is the thing that matters."

5. Keep emotional acknowledgement brief — one breath, then move into the substance.
   The financial clarity IS the care. Show them a path.
""".strip(),

    "general": "",  # base prompt handles fallback, general, and casual questions well
}


# ---------------------------------------------------------------------------
# Message builder — assembles full messages list for the LLM
# ---------------------------------------------------------------------------

def build_messages(
    snapshot_context: str,
    chat_history: list,
    categories: list[str] | None = None,
    summarised_history: str = "",
) -> list:
    """
    Builds the messages list to send to the LLM.
    Structure: system (base + category blocks + snapshot + summary) → history
    """
    # Inject category-specific blocks if available (Phase 5c)
    category_content = ""
    for cat in (categories or []):
        block = _CATEGORY_BLOCKS.get(cat, "")
        if block:
            category_content += f"\n\n{block}"

    system_content = _BASE_SYSTEM_PROMPT + category_content + "\n\n" + snapshot_context
    if summarised_history:
        system_content += f"\n\nEARLIER CONVERSATION SUMMARY:\n{summarised_history}"

    messages = [{"role": "system", "content": system_content}]
    messages.extend(chat_history)
    return messages


# ---------------------------------------------------------------------------
# Phase 5d — Conversation summarisation
# Triggers after 8 new turns accumulate beyond the 6 kept verbatim.
# Snapshot context is always injected separately — never summarised.
# ---------------------------------------------------------------------------

_SUMMARISE_PROMPT = """Summarise the following personal finance conversation for context continuity.
{existing_block}
Conversation to summarise:
{conversation}

Write a concise summary under 150 words covering:
- Main topics discussed
- Specific numbers, decisions, or conclusions reached
- The user's concerns or goals as they emerged

Do not include the user's financial snapshot (income, score, metrics) — that is always provided separately.
Return only the summary text, no headers or labels."""


def _call_llm_simple(prompt: str, provider: str, api_key: str) -> str:
    """Non-streaming single-turn LLM call. Returns the response as a string."""
    if provider == "anthropic":
        import anthropic
        client = anthropic.Anthropic(api_key=api_key)
        resp = client.messages.create(
            model="claude-opus-4-6",
            max_tokens=300,
            messages=[{"role": "user", "content": prompt}],
        )
        return resp.content[0].text

    elif provider == "openai":
        from openai import OpenAI
        resp = OpenAI(api_key=api_key).chat.completions.create(
            model="gpt-4o",
            max_tokens=300,
            messages=[{"role": "user", "content": prompt}],
        )
        return resp.choices[0].message.content

    elif provider == "groq":
        from groq import Groq
        resp = Groq(api_key=api_key).chat.completions.create(
            model="llama-3.3-70b-versatile",
            max_tokens=300,
            messages=[{"role": "user", "content": prompt}],
        )
        return resp.choices[0].message.content

    elif provider == "gemini":
        import google.generativeai as genai
        genai.configure(api_key=api_key)
        resp = genai.GenerativeModel("gemini-1.5-flash").generate_content(prompt)
        return resp.text

    return ""


def _summarise_turns(turns: list, existing_summary: str, provider: str, api_key: str) -> str:
    """Calls the LLM to summarise a list of turns into a short text block."""
    conversation = "\n".join(
        f"{m['role'].upper()}: {m['content']}" for m in turns
    )
    existing_block = (
        f"Existing summary to extend:\n{existing_summary}\n\nNew turns to add:"
        if existing_summary else ""
    )
    prompt = _SUMMARISE_PROMPT.format(
        existing_block=existing_block,
        conversation=conversation,
    )
    try:
        return _call_llm_simple(prompt, provider, api_key)
    except Exception:
        return existing_summary  # on failure, keep what we had


def maybe_summarise(
    chat_history: list,
    existing_summary: str,
    provider: str,
    api_key: str,
    keep_turns: int = 6,
    summarise_after_turns: int = 8,
) -> tuple[list, str]:
    """
    Checks whether summarisation is needed and runs it if so.
    Returns (updated_chat_history, updated_summary).

    Triggers when len(chat_history) >= (keep_turns + summarise_after_turns) * 2.
    On trigger: summarises chat_history[:-keep_turns*2], keeps chat_history[-keep_turns*2:].
    Snapshot context is always injected separately — never included here.
    """
    threshold = (keep_turns + summarise_after_turns) * 2  # default: 28
    if len(chat_history) < threshold:
        return chat_history, existing_summary

    keep_count  = keep_turns * 2          # 12 messages
    to_summarise = chat_history[:-keep_count]
    to_keep      = chat_history[-keep_count:]

    new_summary = _summarise_turns(to_summarise, existing_summary, provider, api_key)
    return to_keep, new_summary
