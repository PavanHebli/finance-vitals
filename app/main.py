import streamlit as st
from modules.panel_form import render_form_panel
from modules.panel_results import render_results_panel


def init_session_state():
    defaults = {
        "llm_provider": "anthropic",
        "api_key": "",
        "income_main": 0.0,
        "income_additional": 0.0,
        "expenses_rent": 0.0,
        "expenses_groceries": 0.0,
        "expenses_transport": 0.0,
        "expenses_subscriptions": 0.0,
        "expenses_dining": 0.0,
        "expenses_shopping": 0.0,
        "expenses_other": 0.0,
        "savings_total": 0.0,
        "investments_total": 0.0,
        "debt_total": 0.0,
        "debt_monthly": 0.0,
        "age": 25,
        "employment": "Employed",
        "has_health_insurance": False,
        "has_emergency_fund": "Not sure",
        "contributing_401k": "No",
        "data_entered": False,
        "current_page": "form",
        "sample_input_active": False,
    }
    for key, value in defaults.items():
        if key not in st.session_state:
            st.session_state[key] = value


def main():
    st.set_page_config(
        page_title="FinFriend",
        page_icon="💰",
        layout="wide"
    )

    init_session_state()

    if st.session_state.current_page == "form":
        render_form_panel()
    else:
        render_results_panel()


if __name__ == "__main__":
    main()
