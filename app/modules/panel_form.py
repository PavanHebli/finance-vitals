import random
import streamlit as st
from modules.snapshot import render_api_config, render_income_section, render_expenses_section, render_position_section, render_context_section


def fill_sample_data():
    income = float(random.choice([3500, 4500, 6000, 8000, 10000]))
    st.session_state.income_main = income
    st.session_state.income_additional = float(random.choice([0, 0, 500, 1000]))
    st.session_state.expenses_rent = float(random.choice([1200, 1500, 1800, 2000]))
    st.session_state.expenses_groceries = float(random.choice([0, 200, 300, 400]))
    st.session_state.expenses_transport = float(random.choice([0, 150, 250, 400]))
    st.session_state.expenses_subscriptions = float(random.choice([0, 0, 80, 150]))
    st.session_state.expenses_dining = float(random.choice([0, 200, 350, 500]))
    st.session_state.expenses_shopping = float(random.choice([0, 0, 150, 300]))
    st.session_state.expenses_other = float(random.choice([0, 100, 200]))
    st.session_state.savings_total = float(random.choice([0, 500, 2000, 8000]))
    st.session_state.investments_total = float(random.choice([0, 0, 5000, 20000]))
    st.session_state.debt_total = float(random.choice([0, 0, 5000, 15000, 30000]))
    st.session_state.debt_monthly = float(random.choice([0, 0, 200, 400, 600]))
    st.session_state.age = random.randint(24, 45)
    st.session_state.employment = random.choice(["Employed", "Employed", "Self-employed", "Job hunting"])
    st.session_state.has_health_insurance = random.choice([True, True, False])
    st.session_state.has_emergency_fund = random.choice(["Yes", "No", "Not sure"])
    st.session_state.contributing_401k = random.choice(["Yes", "No", "No", "Not sure"])


def clear_all_fields():
    keys_to_reset = {
        "income_main": 0.0, "income_additional": 0.0,
        "expenses_rent": 0.0, "expenses_groceries": 0.0, "expenses_transport": 0.0,
        "expenses_subscriptions": 0.0, "expenses_dining": 0.0, "expenses_shopping": 0.0,
        "expenses_other": 0.0, "savings_total": 0.0, "investments_total": 0.0,
        "debt_total": 0.0, "debt_monthly": 0.0,
        "age": 25, "employment": "Employed", "has_health_insurance": False,
        "has_emergency_fund": "Not sure", "contributing_401k": "No",
    }
    for key, value in keys_to_reset.items():
        st.session_state[key] = value
    st.session_state.sample_input_active = False


def render_form_panel():
    col1, col2, col3 = st.columns([5, 1.5, 1])
    with col1:
        st.title("💰 FinFriend")
        st.markdown("### Your Personal Financial Health Assistant")
    with col2:
        st.markdown("<br>", unsafe_allow_html=True)
        previous = st.session_state.get("sample_input_active", False)
        sample_on = st.toggle("Sample Input", value=previous)
        st.session_state.sample_input_active = sample_on
        if sample_on and not previous:
            fill_sample_data()
        elif not sample_on and previous:
            clear_all_fields()
    with col3:
        st.markdown("<br>", unsafe_allow_html=True)
        if st.button("Clear all", type="secondary"):
            clear_all_fields()

    st.markdown("---")

    with st.form("financial_form"):
        render_api_config()
        render_income_section()
        render_expenses_section()
        render_position_section()
        render_context_section()

        st.markdown("---")
        submitted = st.form_submit_button("Show me my financial picture →", type="primary")

    if submitted:
        if not st.session_state.api_key:
            st.error("Please enter an API key to continue.")
        elif st.session_state.income_main == 0:
            st.error("Please enter your monthly income to continue.")
        else:
            st.session_state.current_page = "results"
            st.rerun()
