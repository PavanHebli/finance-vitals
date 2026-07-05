def call_llm(prompt: str, provider: str, api_key: str):
    """
    Calls the selected LLM provider with streaming.
    Returns a generator that yields text chunks.
    Use with st.write_stream() in the UI.
    """
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
        client = OpenAI(api_key=api_key)
        stream = client.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": prompt}],
            stream=True
        )
        for chunk in stream:
            if chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content

    elif provider == "groq":
        from groq import Groq
        client = Groq(api_key=api_key)
        stream = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": prompt}],
            stream=True
        )
        for chunk in stream:
            if chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content

    elif provider == "gemini":
        import google.generativeai as genai
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel("gemini-1.5-flash")
        response = model.generate_content(prompt, stream=True)
        for chunk in response:
            if chunk.text:
                yield chunk.text

    else:
        yield "Unsupported provider selected."


def build_prompt(state, metrics, metric_scores, overall_score, mirror) -> str:
    """
    Builds the LLM prompt using the user's financial data, computed metrics, and scores.
    Handles partial data gracefully when optional form sections were skipped.
    """
    from modules.health import get_financial_context
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
- Debt-to-Income: {metrics["debt_to_income"]}% ({metric_scores["debt_to_income"]["status"]}){"  ⚠️ debt exists but monthly payment is $0" if metrics.get("debt_payment_missing") else ""}
- Emergency Fund: {metrics["emergency_fund_months"]} months ({metric_scores["emergency_fund_months"]["status"]})
- Housing Ratio: {metrics["housing_ratio"]}% ({metric_scores["housing_ratio"]["status"]})

{profile_section}

## Zero value rules
- Savings = 0 → they have no savings. Say it directly.
- Debt = 0 → they likely have no debt. That is good.
- Dining/Shopping = 0 → unknown, skip it.
- Investments = 0 → not investing yet.
- Debt > 0 but monthly debt payment = 0 → this is a DANGER flag. Treat it as missed/skipped debt payments regardless of whether it was a data entry mistake. Flag it strongly in "What needs attention" — missing debt payments damages credit scores, triggers penalty interest, and can lead to collections or legal action. Do not soften this. Say it directly.

## Minimum expense floors — never suggest cutting below these
People have unavoidable minimum costs. Before suggesting any expense cut, check whether the amount is already near the floor for that category. If it is, do not suggest cutting it — find a different lever instead.
- Rent / Mortgage: never suggest cutting rent directly. Only suggest moving, getting a roommate, or refinancing if housing ratio is above 35%.
- Groceries: $200/month or below is already bare minimum for one person. Do not suggest cutting groceries if they are at or below $250.
- Transport: $150/month or below is already minimum (gas, transit, insurance basics). Do not suggest cutting transport if at or below $200.
- Subscriptions: $75/month or below may just be a phone bill and one streaming service. Do not suggest cutting subscriptions if at or below $75.
- Dining out: fully discretionary — can be cut to $0. Safe to suggest cutting.
- Shopping / Personal: fully discretionary — can be cut to $0. Safe to suggest cutting.
- Other: treat as semi-fixed. Only suggest cutting if above $200/month.

## Answer ONLY these 4 questions. Keep the bold headers and emojis exactly as written.
Put each answer on a new line directly below the header.
Leave a blank line between each section.

**📊 What's your overall picture?**

**✅ What's working?**

**⚠️ What needs attention?**

**🎯 What should you do this month?**

## Formatting rules — follow these exactly
- Bold metric names, percentages, and score changes: **savings rate**, **32%**, **61 → 68**
- Do NOT bold dollar amounts — write them plain: $4,500 not **$4,500**. Bold + $ signs break the markdown renderer.
- Use bullet points (- ) inside "What needs attention" if there are 2+ issues — one plain bullet per issue, no emojis on the bullets themselves
- Use a single bullet for the action in "What should you do this month"
- Do NOT use bullet points in "Overall picture" or "What's working" — those stay as short punchy prose
- No emojis inside the answer body — the section header emojis are enough

## Content rules
- Max 50-60 words per section (each section gets its own 50-60 words)
- Short sentences. Talk like a close friend who knows finance — casual, direct, honest, never stiff
- No motivational phrases. No "Let's go!", "You've got this!", "Great job!"
- BANNED words: decent, solid, pretty good, big chunk, quite, fairly, somewhat, a lot, significant — replace every one with the actual number
- Always pair a number with what it means — never use a number alone, never explain without a specific number to back it up
- Overall picture: state their income, cash left this month, and mention debt if present. If employment is "Job hunting", flag the income risk
- What's working: must include a specific number or percentage AND explain what it means in real life
- What needs attention: say what could actually go wrong in real life — not just that a metric is low. Always include the specific number. Flag housing ratio if above 35%, flag debt if present
- What should you do this month: ONE suggestion only. Format: cut/move **[exact amount]** from [specific source] → [specific destination]. No second suggestion
- If employed and not contributing to 401k, mention it in "What needs attention"
- Do not repeat the same point across sections
""".strip()
