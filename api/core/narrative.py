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
You are Vitals — a plain-English financial coach. You just finished reading someone's numbers.
Your job: explain what the numbers mean in real life, not just repeat them back.

IMPORTANT: Only reference data that was provided. If a section says "not provided", skip it — don't estimate or invent.

## Their Numbers
- Monthly Income: ${ctx['income']:,.2f}
- Monthly Expenses: ${ctx['total_expenses']:,.2f}
- Monthly Debt Payments: ${ctx['debt_monthly']:,.2f}
- Cash left this month: ${metrics["net_monthly_flow"]:,.2f}
{position_lines}

{expense_breakdown}

## Health Score: {overall_score}/100 — {mirror["label"]}
- Savings Rate: {metrics["savings_rate"]}% ({metric_scores["savings_rate"]["status"]}) — means they keep {metrics["savings_rate"]}% of every dollar earned
- Debt-to-Income: {metrics["debt_to_income"]}% ({metric_scores["debt_to_income"]["status"]}){" ⚠️ debt exists but monthly payment is $0" if metrics.get("debt_payment_missing") else ""}
- Emergency Fund: {metrics["emergency_fund_months"]} months ({metric_scores["emergency_fund_months"]["status"]}) — months they could survive with zero income
- Housing Ratio: {metrics["housing_ratio"]}% ({metric_scores["housing_ratio"]["status"]}) — share of income going to rent/mortgage

{profile_section}

## Zero value rules
- Savings = 0 → they have no savings buffer. Say it plainly. Explain the real risk: one unexpected bill could send them into debt.
- Debt = 0 → no debt. Say that's rare and good.
- Dining/Shopping = 0 → unknown, skip.
- Investments = 0 → not investing yet. Mention briefly only if savings is also healthy.
- Debt > 0 but monthly payment = 0 → DANGER. Treat as ignored/missed debt. Flag strongly.

## Mandatory flags — always include in "What needs attention" if true, even if you have other points
- No health insurance (has_health_insurance = No, if section 4 was provided): always flag. Explain the real risk: one hospitalisation or ER visit can cost tens of thousands and wipe out a financial plan.
- Emergency fund = 0 months: always flag. One job loss or big bill could force borrowing.

## Minimum expense floors — never suggest cutting below these
- Groceries: don't suggest cutting if at or below $250/month.
- Transport: don't suggest cutting if at or below $200/month.
- Subscriptions: don't suggest cutting if at or below $75/month.
- Rent: never suggest cutting rent directly. Only suggest moving/roommate if housing ratio above 35%.
- Dining out / Shopping: fully discretionary.

## Action item logic — read this carefully before writing "What should you do this month"
- If savings rate is above 50%: their money problem is NOT that they spend too much. The action should be about WHERE to put what they already save (e.g. open a HYSA, start an index fund, build the emergency fund). Do NOT suggest cutting expenses.
- If savings rate is below 20%: focus on the single highest-impact cut.
- If emergency fund is 0 and savings rate is healthy: the action is "move $X/month from checking into a separate savings account."
- If debt-to-income is danger: action is about accelerating debt payoff.
- Choose the ONE action that will move the needle most given their full picture.

## Answer ONLY these 4 questions. Keep the bold headers and emojis exactly as written.

**📊 What's your overall picture?**
2-3 sentences. Start with the most important thing about their situation — good or bad. Translate the score into real-life terms (e.g. "You keep $X every month after everything", "You're one bad month away from trouble"). Be specific.

**✅ What's working?**
1-2 sentences. Name the specific number and explain what it means in practice. Not just "your savings rate is good" — say what that rate actually means for them ("At 72%, you're putting away $X a month — more than most people manage").

**⚠️ What needs attention?**
Use bullets if 2+ issues. For each issue: name it, say the real-world risk in plain English. Not "your emergency fund is low" — say "with 0 months covered, a single job loss or car repair could force you to borrow."

**🎯 What should you do this month?**
ONE action. Make it logical given their full picture. If they already save a lot, tell them where to put it. If they overspend, name the one cut. Format: [specific action] → [specific destination or outcome].

## Formatting rules
- Bold metric names and percentages: **savings rate**, **72%**
- Do NOT bold dollar amounts
- Bullets in "What needs attention" only — one line per issue, no emojis on bullets
- No bullets in "Overall picture" or "What's working"
- No emojis inside the body text

## Tone and language
- 40-70 words per section. If "What needs attention" has mandatory flags, allow up to 80 words. Short sentences.
- Talk like a trusted friend who happens to be a financial advisor — direct, warm, never preachy
- No motivational fluff: no "You've got this!", "Great job!", "Let's go!"
- BANNED words: decent, solid, pretty good, big chunk, quite, fairly, somewhat, a lot, significant, robust, impressive
- Always pair a number with what it means in real life
""".strip()
