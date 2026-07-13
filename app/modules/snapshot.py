import streamlit as st


def get_llm_config() -> tuple[str, str]:
    """Returns (provider, api_key) from session state. Use everywhere instead of reading keys directly."""
    return st.session_state.get("llm_provider", "groq"), st.session_state.get("api_key", "")


def render_api_config():
    """
    Renders the API configuration section at the top of the form.
    If HOSTED_API_KEY is set in secrets and sample mode is active,
    the section is hidden and the hosted key is injected automatically.
    """
    hosted_key      = st.secrets.get("HOSTED_API_KEY", "")
    hosted_provider = st.secrets.get("HOSTED_PROVIDER", "groq")
    show_api_input  = st.secrets.get("SHOW_API_INPUT", True)
    # Edge case: if no hosted key, always show API input regardless of SHOW_API_INPUT
    if not show_api_input and bool(hosted_key):
        st.session_state.api_key      = hosted_key
        st.session_state.llm_provider = hosted_provider
        # st.success("✅ AI is ready, no API key needed.")
        # st.divider()
        return hosted_provider, hosted_key

    st.subheader("AI Configuration")
    st.caption("Don't have an API key? [Get one here →](/get_api_key)")

    col1, col2 = st.columns([1, 2])

    with col1:
        provider = st.selectbox(
            "AI Provider",
            options=["anthropic", "openai", "groq", "gemini"],
            index=["anthropic", "openai", "groq", "gemini"].index(st.session_state.get("llm_provider", "groq")),
            help="Select the LLM provider to use for AI features"
        )
        st.session_state.llm_provider = provider

    with col2:
        api_key = st.text_input(
            "API Key",
            value=st.session_state.get("api_key", ""),
            type="password",
            help="Enter your API key for the selected provider"
        )
        st.session_state.api_key = api_key

    st.divider()
    return provider, api_key


def render_income_section():
    col1, col2 = st.columns(2)
    
    with col1:
        main_income = st.number_input(
            "Monthly take-home income (after tax)",
            min_value=0.0,
            value=st.session_state.get("income_main", 0.0),
            step=100.0,
            format="%.2f",
            help="Your monthly take-home pay after all taxes"
        )
        st.session_state.income_main = main_income
    
    with col2:
        additional_income = st.number_input(
            "Additional income (freelance, side income)",
            min_value=0.0,
            value=st.session_state.get("income_additional", 0.0),
            step=100.0,
            format="%.2f",
            help="Optional: Any extra monthly income"
        )
        st.session_state.income_additional = additional_income
    
    return main_income, additional_income


def render_expenses_section():
    st.caption("Round to the nearest $25. Not sure? Your bank app's monthly summary is the fastest way to check.")
    expenses = {}
    
    col1, col2 = st.columns(2)
    
    with col1:
        expenses["rent"] = st.number_input(
            "Rent / Mortgage",
            min_value=0.0,
            value=st.session_state.get("expenses_rent", 0.0),
            step=50.0,
            format="%.2f"
        )
        st.caption("Avg: $1,000–2,000/month")
        expenses["groceries"] = st.number_input(
            "Groceries",
            min_value=0.0,
            value=st.session_state.get("expenses_groceries", 0.0),
            step=25.0,
            format="%.2f"
        )
        st.caption("Avg: $200–400/month · Tip: weekly shop amount × 4")
        expenses["transport"] = st.number_input(
            "Transport (car, gas, public transit)",
            min_value=0.0,
            value=st.session_state.get("expenses_transport", 0.0),
            step=25.0,
            format="%.2f"
        )
        st.caption("Avg: $150–400/month")
        expenses["subscriptions"] = st.number_input(
            "Subscriptions (Netflix, Spotify, gym, etc.)",
            min_value=0.0,
            value=st.session_state.get("expenses_subscriptions", 0.0),
            step=5.0,
            format="%.2f"
        )
        st.caption("Avg: $50–150/month · Tip: list them out (Netflix, Spotify, gym…)")

    with col2:
        expenses["dining"] = st.number_input(
            "Dining out / Food delivery",
            min_value=0.0,
            value=st.session_state.get("expenses_dining", 0.0),
            step=25.0,
            format="%.2f"
        )
        st.caption("Avg: $150–300/month · Tip: meals out per week × avg cost × 4")
        expenses["shopping"] = st.number_input(
            "Shopping / Personal",
            min_value=0.0,
            value=st.session_state.get("expenses_shopping", 0.0),
            step=25.0,
            format="%.2f"
        )
        st.caption("Avg: $100–300/month")
        expenses["other"] = st.number_input(
            "Other expenses",
            min_value=0.0,
            value=st.session_state.get("expenses_other", 0.0),
            step=25.0,
            format="%.2f"
        )
        st.caption("Anything not covered above")
    
    for key, value in expenses.items():
        st.session_state[f"expenses_{key}"] = value
    
    return expenses


def render_position_section():
    col1, col2 = st.columns(2)
    
    with col1:
        savings = st.number_input(
            "Total savings (checking + savings accounts)",
            min_value=0.0,
            value=st.session_state.get("savings_total", 0.0),
            step=100.0,
            format="%.2f",
            help="Add up all your bank account balances — checking, savings, and any cash on hand"
        )
        st.session_state.savings_total = savings
        
        investments = st.number_input(
            "Total investments (401k, stocks, etc.)",
            min_value=0.0,
            value=st.session_state.get("investments_total", 0.0),
            step=100.0,
            format="%.2f",
            help="Optional, enter 0 if none"
        )
        st.session_state.investments_total = investments
    
    with col2:
        debt = st.number_input(
            "Total debt (student loans, credit card, car loan)",
            min_value=0.0,
            value=st.session_state.get("debt_total", 0.0),
            step=100.0,
            format="%.2f"
        )
        st.session_state.debt_total = debt
        
        debt_payment = st.number_input(
            "Monthly debt payments",
            min_value=0.0,
            value=st.session_state.get("debt_monthly", 0.0),
            step=25.0,
            format="%.2f"
        )
        st.session_state.debt_monthly = debt_payment
    
    return savings, investments, debt, debt_payment


def render_context_section():
    col1, col2 = st.columns(2)
    
    with col1:
        age = st.number_input(
            "Age",
            min_value=1,
            max_value=120,
            value=st.session_state.get("age", 25),
            step=1
        )
        st.session_state.age = age
        
        employment = st.selectbox(
            "Employment status",
            options=["Employed", "Self-employed", "Student", "Job hunting"],
            index=["Employed", "Self-employed", "Student", "Job hunting"].index(
                st.session_state.get("employment", "Employed")
            )
        )
        st.session_state.employment = employment
    
    with col2:
        insurance = st.radio(
            "Do you have health insurance?",
            options=["Yes", "No"],
            index=0 if st.session_state.get("has_health_insurance", False) else 1
        )
        st.session_state.has_health_insurance = (insurance == "Yes")
        
        emergency_fund = st.selectbox(
            "Do you have an emergency fund?",
            options=["Yes", "No", "Not sure"],
            index=["Yes", "No", "Not sure"].index(st.session_state.get("has_emergency_fund", "Not sure"))
        )
        st.session_state.has_emergency_fund = emergency_fund
    
    contributing_401k = st.selectbox(
        "Are you contributing to 401k?",
        options=["Yes", "No", "Not sure", "No access"],
        index=["Yes", "No", "Not sure", "No access"].index(
            st.session_state.get("contributing_401k", "No")
        )
    )
    st.session_state.contributing_401k = contributing_401k
    
    return age, employment, insurance, emergency_fund, contributing_401k
