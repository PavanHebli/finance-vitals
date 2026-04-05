import streamlit as st

EDUCATION = {
    "savings_rate": {
        "danger": {
            "title": "You're spending more than you earn",
            "body": "Every month you go deeper into the hole — this is unsustainable. Without reversing this, you'll eventually run out of money or accumulate debt just to cover basic expenses. The first step is identifying which expenses can be cut immediately."
        },
        "warning": {
            "title": "Your savings rate is too low",
            "body": "Keeping less than 10% of your income means wealth builds very slowly. The standard target is 20%. At this rate, one unexpected expense — a car repair, a medical bill — can wipe out everything you've saved."
        }
    },
    "debt_to_income": {
        "danger": {
            "title": "Your debt load is at a critical level",
            "body": "Over 43% of your income going to debt is the threshold banks use to deny mortgage applications. You have almost no financial flexibility. If your income drops or an unexpected cost hits, you have very little room to absorb it."
        },
        "warning": {
            "title": "Your debt is limiting your financial progress",
            "body": "Between 20-43% of income going to debt leaves little room to save or invest. Every dollar going to debt is a dollar not building your future. If interest rates rise or income drops, payments can quickly become hard to manage."
        }
    },
    "emergency_fund_months": {
        "danger": {
            "title": "You have no real safety net",
            "body": "Less than 1 month of expenses saved means one job loss, car repair, or medical bill pushes you straight into debt. The standard recommendation is 3-6 months. Without this cushion, you're one bad event away from a financial crisis."
        },
        "warning": {
            "title": "Your safety net is thinner than it should be",
            "body": "1-3 months is a start but most financial experts recommend at least 3 months minimum. A job loss can easily last longer than your current cushion — especially in a tough job market. Keep building this before focusing on investments."
        }
    },
    "housing_ratio": {
        "danger": {
            "title": "Housing is consuming your income",
            "body": "Over 50% on rent or mortgage leaves almost nothing for savings, debt payments, or emergencies. You are financially stretched to the limit. One missed paycheck puts you at risk of not being able to pay rent. This needs to change."
        },
        "warning": {
            "title": "Housing costs are stretching your budget",
            "body": "Spending 35-50% of income on housing makes other financial goals — saving, investing, paying off debt — significantly harder. The standard guideline is 30% or less. Consider whether moving or increasing income is a realistic option."
        }
    }
}


def get_education(metric_scores: dict) -> list:
    """
    Returns education content for flagged metrics only (danger or warning).
    Skips metrics that are ok or good.
    """
    flagged = []
    for metric, data in metric_scores.items():
        if metric == "net_monthly_flow":
            continue
        status = data.get("status")
        if status in ("danger", "warning") and metric in EDUCATION:
            flagged.append({
                "metric": metric,
                "status": status,
                "title": EDUCATION[metric][status]["title"],
                "body": EDUCATION[metric][status]["body"]
            })
    return flagged


def render_education(metric_scores: dict):
    """
    Renders a 'Why this matters' expander for each flagged metric.
    Only shown after the narrative — call this after st.write_stream().
    """
    flagged = get_education(metric_scores)
    if not flagged:
        return

    with st.expander("Why this matters"):
        for i, item in enumerate(flagged):
            status_color = "#FF4B4B" if item["status"] == "danger" else "#FF8C00"
            st.markdown(
                f"<span style='color:{status_color}; font-weight:bold;'>{item['title']}</span>",
                unsafe_allow_html=True
            )
            st.markdown(item["body"])
            if i < len(flagged) - 1:
                st.markdown("---")
