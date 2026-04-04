import streamlit as st
from modules.snapshot import render_api_config, render_income_section, render_expenses_section, render_position_section, render_context_section


def render_form_panel():
    col1, col2 = st.columns([6, 1])
    with col1:
        st.title("💰 FinFriend")
        st.markdown("### Your Personal Financial Health Assistant")
    with col2:
        st.markdown("<br>", unsafe_allow_html=True)
        if st.button("Clear all", type="secondary"):
            keys_to_reset = [
                "income_main", "income_additional",
                "expenses_rent", "expenses_groceries", "expenses_transport",
                "expenses_subscriptions", "expenses_dining", "expenses_shopping", "expenses_other",
                "savings_total", "investments_total", "debt_total", "debt_monthly",
                "age", "employment", "has_health_insurance", "has_emergency_fund", "contributing_401k",
            ]
            defaults = {
                "income_main": 0.0, "income_additional": 0.0,
                "expenses_rent": 0.0, "expenses_groceries": 0.0, "expenses_transport": 0.0,
                "expenses_subscriptions": 0.0, "expenses_dining": 0.0, "expenses_shopping": 0.0,
                "expenses_other": 0.0, "savings_total": 0.0, "investments_total": 0.0,
                "debt_total": 0.0, "debt_monthly": 0.0,
                "age": 25, "employment": "Employed", "has_health_insurance": False,
                "has_emergency_fund": "Not sure", "contributing_401k": "No",
            }
            for key in keys_to_reset:
                st.session_state[key] = defaults[key]

    st.markdown("---")

    render_api_config()
    render_income_section()
    render_expenses_section()
    render_position_section()
    render_context_section()

    st.markdown("---")

    if st.button("Show me my financial picture →", type="primary"):
        if not st.session_state.api_key:
            st.error("Please enter an API key to continue.")
        elif st.session_state.income_main == 0:
            st.error("Please enter your monthly income to continue.")
        else:
            st.session_state.current_page = "results"
            st.rerun()
