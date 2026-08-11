from core.health import get_financial_context


def call_llm(prompt: str, provider: str, api_key: str):
    """Streams text chunks from the chosen LLM provider."""
    if provider == "anthropic":
        import anthropic
        client = anthropic.Anthropic(api_key=api_key)
        with client.messages.stream(
            model="claude-opus-4-6",
            max_tokens=1024,
            messages=[{"role": "user", "content": prompt}]
        ) as stream:
            for text in stream.text_stream:
                yield text

    elif provider == "openai":
        from openai import OpenAI
        stream = OpenAI(api_key=api_key).chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": prompt}],
            stream=True,
        )
        for chunk in stream:
            if chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content

    elif provider == "groq":
        from groq import Groq
        stream = Groq(api_key=api_key).chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            stream=True,
        )
        for chunk in stream:
            if chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content

    elif provider == "gemini":
        import google.generativeai as genai
        genai.configure(api_key=api_key)
        response = genai.GenerativeModel("gemini-1.5-flash").generate_content(prompt, stream=True)
        for chunk in response:
            if chunk.text:
                yield chunk.text

    else:
        yield "Unsupported provider."


def build_prompt(state: dict, metrics: dict, metric_scores: dict, overall_score: int, mirror: dict) -> str:
    ctx = get_financial_context(state)
    s2, s3, s4 = ctx["s2"], ctx["s3"], ctx["s4"]

    if s2:
        e = ctx["expenses"]
        expense_breakdown = (
            f"## Expense Breakdown\n"
            f"- Rent: ${e['rent']:,.2f} (essential)\n"
            f"- Groceries: ${e['groceries']:,.2f} (essential)\n"
            f"- Transport: ${e['transport']:,.2f} (essential)\n"
            f"- Subscriptions: ${e['subscriptions']:,.2f} (discretionary)\n"
            f"- Dining out: ${e['dining']:,.2f} (luxury)\n"
            f"- Shopping: ${e['shopping']:,.2f} (luxury)\n"
            f"- Other: ${e['other']:,.2f}"
        )
    else:
        expense_breakdown = (
            f"## Expense Breakdown\n"
            f"Not provided — user gave a total estimate of ${ctx['expenses_total_estimate']:,.2f}/month. "
            f"Do not break down by category or suggest cutting specific expense lines."
        )

    if s3:
        position_lines = (
            f"- Total Savings: ${ctx['savings']:,.2f}\n"
            f"- Total Investments: ${ctx['investments']:,.2f}\n"
            f"- Total Debt: ${ctx['debt_total']:,.2f}"
        )
    else:
        position_lines = "- Savings / investments / debt: not provided — do not reference these."

    if s4:
        profile_section = (
            f"## User Profile\n"
            f"- Age: {ctx['age']} | Employment: {ctx['employment']}\n"
            f"- Health Insurance: {'Yes' if ctx['has_health_insurance'] else 'No'}\n"
            f"- Emergency Fund: {ctx['has_emergency_fund']}\n"
            f"- Contributing to 401k: {ctx['contributing_401k']}"
        )
    else:
        profile_section = (
            "## User Profile\n"
            "Not provided — omit all advice about age, insurance, emergency fund, and 401k."
        )

    return f"""
You are Vitals — a brutally honest financial health checker.
You've just looked at someone's numbers. Answer 4 questions below.

IMPORTANT: Only reference data that was provided. If a section says "not provided", do not estimate, assume, or invent values for it.

## Their Numbers
- Monthly Income: ${ctx['income']:,.2f}
- Monthly Expenses: ${ctx['total_expenses']:,.2f}
- Monthly Debt Payments: ${ctx['debt_monthly']:,.2f}
- Cash left this month: ${metrics["net_monthly_flow"]:,.2f}
{position_lines}

{expense_breakdown}

## Health Score: {overall_score}/100 — {mirror["label"]}
- Savings Rate: {metrics["savings_rate"]}% ({metric_scores["savings_rate"]["status"]})
- Debt-to-Income: {metrics["debt_to_income"]}% ({metric_scores["debt_to_income"]["status"]}){" ⚠️ debt exists but monthly payment is $0" if metrics.get("debt_payment_missing") else ""}
- Emergency Fund: {metrics["emergency_fund_months"]} months ({metric_scores["emergency_fund_months"]["status"]})
- Housing Ratio: {metrics["housing_ratio"]}% ({metric_scores["housing_ratio"]["status"]})

{profile_section}

## Zero value rules
- Savings = 0 → they have no savings. Say it directly.
- Debt = 0 → they likely have no debt. That is good.
- Dining/Shopping = 0 → unknown, skip it.
- Investments = 0 → not investing yet.
- Debt > 0 but monthly debt payment = 0 → DANGER flag. Treat as missed/skipped debt payments. Flag strongly in "What needs attention".

## Minimum expense floors — never suggest cutting below these
- Rent / Mortgage: never suggest cutting rent directly. Only suggest moving/roommate/refinancing if housing ratio above 35%.
- Groceries: $200/month or below is bare minimum. Do not suggest cutting if at or below $250.
- Transport: $150/month or below is minimum. Do not suggest cutting if at or below $200.
- Subscriptions: $75/month or below may just be phone + one streaming service. Do not suggest cutting if at or below $75.
- Dining out: fully discretionary — can be cut to $0.
- Shopping / Personal: fully discretionary — can be cut to $0.
- Other: treat as semi-fixed. Only suggest cutting if above $200/month.

## Answer ONLY these 4 questions. Keep the bold headers and emojis exactly as written.

**📊 What's your overall picture?**

**✅ What's working?**

**⚠️ What needs attention?**

**🎯 What should you do this month?**

## Formatting rules
- Bold metric names, percentages, and score changes: **savings rate**, **32%**, **61 → 68**
- Do NOT bold dollar amounts — write them plain: $4,500 not **$4,500**
- Use bullet points inside "What needs attention" if 2+ issues — one plain bullet per issue, no emojis on bullets
- Use a single bullet for the action in "What should you do this month"
- No bullet points in "Overall picture" or "What's working" — short punchy prose
- No emojis inside the answer body

## Content rules
- Max 50-60 words per section
- Short sentences. Talk like a close friend who knows finance — casual, direct, honest
- No motivational phrases. No "Let's go!", "You've got this!", "Great job!"
- BANNED words: decent, solid, pretty good, big chunk, quite, fairly, somewhat, a lot, significant
- Always pair a number with what it means
- What should you do this month: ONE suggestion only. Format: cut/move [exact amount] from [specific source] → [specific destination]
""".strip()
