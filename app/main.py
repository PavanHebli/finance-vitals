import os
import streamlit as st
from modules.landing import render_landing_page
from modules.panel_form import render_form_panel
from modules.panel_results import render_results_panel


def init_session_state():
    defaults = {
        "llm_provider": "groq",
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
        "current_page": "landing",
        "sample_input_active": False,
        "file_uploader_key": 0,
        "loaded_snapshots": [],
        "chat_history": [],
        "chat_summary": "",
        "expenses_total_estimate": 0.0,
        "section2_visible": False,
        "section3_visible": False,
        "section4_visible": False,
    }
    for key, value in defaults.items():
        if key not in st.session_state:
            st.session_state[key] = value


def main():
    st.set_page_config(
        page_title="Vitals",
        page_icon="🩺",
        layout="wide",
        initial_sidebar_state="collapsed"
    )

    _css_path = os.path.join(os.path.dirname(__file__), "..", ".streamlit", "custom.css")
    with open(_css_path) as f:
        st.markdown(f"<style>{f.read()}</style>", unsafe_allow_html=True)

    init_session_state()

    if st.session_state.current_page == "landing":
        render_landing_page()
    elif st.session_state.current_page == "form":
        render_form_panel()
    else:
        render_results_panel()


if __name__ == "__main__":
    main()
