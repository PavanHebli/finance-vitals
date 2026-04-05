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
    """
    income = state.get("income_main", 0.0) + state.get("income_additional", 0.0)

    monthly_expenses = (
        state.get("expenses_rent", 0.0) +
        state.get("expenses_groceries", 0.0) +
        state.get("expenses_transport", 0.0) +
        state.get("expenses_subscriptions", 0.0) +
        state.get("expenses_dining", 0.0) +
        state.get("expenses_shopping", 0.0) +
        state.get("expenses_other", 0.0)
    )

    return f"""
You are FinFriend — a brutally honest financial friend.
You've just looked at someone's numbers. Answer 4 questions below.

## Their Numbers
- Monthly Income: ${income:,.2f}
- Monthly Expenses: ${monthly_expenses:,.2f}
- Monthly Debt Payments: ${state.get("debt_monthly", 0.0):,.2f}
- Cash left this month: ${metrics["net_monthly_flow"]:,.2f}
- Total Savings: ${state.get("savings_total", 0.0):,.2f}
- Total Investments: ${state.get("investments_total", 0.0):,.2f}
- Total Debt: ${state.get("debt_total", 0.0):,.2f}

## Expense Breakdown
- Rent: ${state.get("expenses_rent", 0.0):,.2f} (essential)
- Groceries: ${state.get("expenses_groceries", 0.0):,.2f} (essential)
- Transport: ${state.get("expenses_transport", 0.0):,.2f} (essential)
- Subscriptions: ${state.get("expenses_subscriptions", 0.0):,.2f} (discretionary)
- Dining out: ${state.get("expenses_dining", 0.0):,.2f} (luxury)
- Shopping: ${state.get("expenses_shopping", 0.0):,.2f} (luxury)
- Other: ${state.get("expenses_other", 0.0):,.2f}

## Health Score: {overall_score}/100 — {mirror["label"]}
- Savings Rate: {metrics["savings_rate"]}% ({metric_scores["savings_rate"]["status"]})
- Debt-to-Income: {metrics["debt_to_income"]}% ({metric_scores["debt_to_income"]["status"]})
- Emergency Fund: {metrics["emergency_fund_months"]} months ({metric_scores["emergency_fund_months"]["status"]})
- Housing Ratio: {metrics["housing_ratio"]}% ({metric_scores["housing_ratio"]["status"]})

## User Profile
- Age: {state.get("age")} | Employment: {state.get("employment")}
- Health Insurance: {"Yes" if state.get("has_health_insurance") else "No"}
- Emergency Fund: {state.get("has_emergency_fund")}
- Contributing to 401k: {state.get("contributing_401k")}

## Zero value rules
- Savings = 0 → they have no savings. Say it directly.
- Debt = 0 → they likely have no debt. That is good.
- Dining/Shopping = 0 → unknown, skip it.
- Investments = 0 → not investing yet.

## Answer ONLY these 4 questions. Keep the bold headers exactly as written.
Put each answer on a new line directly below the question.
Leave a blank line between each question and the next.

**What's your overall picture?**

**What's working?**

**What needs attention?**

**What should you do this month?**

## Rules
- Max 50-60 words per answer (each answer gets its own 50-60 words)
- Short sentences. Talk like texting a close friend — casual, direct, honest
- No motivational phrases. No "Let's go!", "You've got this!", "Great job!"
- BANNED words: decent, solid, pretty good, big chunk, quite, fairly, somewhat, a lot, significant — replace every one with the actual number
- Always pair a number with what it means — never use a number alone, never explain without the specific number to back it up
- Overall picture: state their income, cash left this month, and mention debt amount if present. If employment is "Job hunting", flag the income risk
- What's working: must include a specific number or percentage AND explain what it means in real life — not just that it is good
- What needs attention: say what could actually go wrong in real life, not just that a metric is low. Always include the specific number. Flag housing ratio if above 35%, flag debt if present
- What should you do this month: ONE suggestion only. Format: cut/move [exact amount] from [specific source] to [specific destination]. No second suggestion. No filler sentences after
- If employed and not contributing to 401k, mention it in "What needs attention"
- Do not repeat the same point across answers
""".strip()
