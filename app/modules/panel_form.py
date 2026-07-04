import random
from pathlib import Path
import streamlit as st
from modules.snapshot import render_api_config, render_income_section, render_expenses_section, render_position_section, render_context_section
from modules.storage import load_vit, get_latest, populate_state_from_snapshot
from modules.analytics import log_snapshot_loaded


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
    # Set total estimate so all sections become visible immediately
    st.session_state.expenses_total_estimate = (
        st.session_state.expenses_rent + st.session_state.expenses_groceries +
        st.session_state.expenses_transport + st.session_state.expenses_subscriptions +
        st.session_state.expenses_dining + st.session_state.expenses_shopping +
        st.session_state.expenses_other
    )


def clear_all_fields():
    keys_to_reset = {
        "income_main": 0.0, "income_additional": 0.0,
        "expenses_rent": 0.0, "expenses_groceries": 0.0, "expenses_transport": 0.0,
        "expenses_subscriptions": 0.0, "expenses_dining": 0.0, "expenses_shopping": 0.0,
        "expenses_other": 0.0, "savings_total": 0.0, "investments_total": 0.0,
        "debt_total": 0.0, "debt_monthly": 0.0,
        "age": 25, "employment": "Employed", "has_health_insurance": False,
        "has_emergency_fund": "Not sure", "contributing_401k": "No",
        "expenses_total_estimate": 0.0,
        "section2_visible": False, "section3_visible": False, "section4_visible": False,
    }
    for key, value in keys_to_reset.items():
        st.session_state[key] = value
    st.session_state.sample_input_active = False


def render_form_panel():
    from modules.nav import render_nav
    render_nav()
    st.markdown(
        "<div style='background:var(--secondary-background-color); border-radius:8px; "
        "padding:10px 16px; font-size:0.82rem; color:var(--text-color); opacity:0.7; "
        "text-align:center; margin-bottom:8px;'>"
        "🔒 Your data never leaves your browser session &nbsp;·&nbsp; "
        "No account &nbsp;·&nbsp; No bank connection &nbsp;·&nbsp; No server storage"
        "</div>",
        unsafe_allow_html=True
    )

    # --- Sample data banner ---
    col_txt, col_try, col_clear = st.columns([4, 1.2, 1])
    with col_txt:
        st.markdown(
            "<p style='font-size:1.05rem; margin:0; padding-top:6px;'>"
            "🚀 <b>First time here?</b> No API key needed — try the app instantly with sample data.</p>",
            unsafe_allow_html=True,
        )
    with col_try:
        if st.button("Try sample data →", type="primary", use_container_width=True):
            st.session_state.sample_input_active = True
            fill_sample_data()
            st.rerun()
    with col_clear:
        if st.button("Clear all", type="secondary", use_container_width=True):
            clear_all_fields()
            st.rerun()

    if st.session_state.get("sample_input_active", False):
        st.success("✅ Form pre-filled with sample data — review and click **Show me my financial picture →**.")

    st.markdown("---")

    if st.session_state.get("previous_snapshot"):
        date = st.session_state.previous_snapshot["saved_at"]
        st.success(
            f"Form loaded from your **{date}** snapshot. "
            "Review your numbers — update anything that has changed since then."
        )

    # --- API config ---
    render_api_config()

    # --- Section 1: Income + total expenses estimate ---
    render_income_section()

    total_est = st.number_input(
        "Total monthly expenses (rough estimate)",
        min_value=0.0,
        value=st.session_state.get("expenses_total_estimate", 0.0),
        step=100.0,
        format="%.2f",
        help="All spending combined — rent, food, transport, everything. An estimate is fine.",
    )
    st.session_state.expenses_total_estimate = total_est
    # Proxy for health.py when detailed breakdown not provided
    if not st.session_state.get("section2_visible", False):
        st.session_state.expenses_other = total_est

    income = st.session_state.get("income_main", 0.0)

    # One-way unlocks — once True, stay True until clear_all
    if income > 0 and total_est > 0:
        st.session_state.section2_visible = True

    if any(st.session_state.get(k, 0) > 0
           for k in ["expenses_rent", "expenses_groceries", "expenses_transport",
                     "expenses_subscriptions", "expenses_dining", "expenses_shopping"]):
        st.session_state.section3_visible = True

    if any(st.session_state.get(k, 0) > 0
           for k in ["savings_total", "investments_total", "debt_total", "debt_monthly"]):
        st.session_state.section4_visible = True

    # --- Section 2: Expense breakdown (expander, appears once unlocked) ---
    if st.session_state.get("section2_visible"):
        with st.expander("💰 Expense breakdown  ·  optional, improves accuracy"):
            render_expenses_section()

    # --- Section 3: Financial position (expander, appears once unlocked) ---
    if st.session_state.get("section3_visible"):
        with st.expander("📊 Financial position  ·  optional"):
            render_position_section()

    # --- Section 4: About you (expander, appears once unlocked) ---
    if st.session_state.get("section4_visible"):
        with st.expander("👤 About you  ·  optional, adds context to your narrative"):
            render_context_section()

    st.markdown("---")

    # --- File uploader (above generate button) ---
    uploaded = st.file_uploader(
        "Import previous data (my_vitals.vit)",
        type=["vit"],
        key=f"snapshot_upload_{st.session_state.get('file_uploader_key', 0)}",
        label_visibility="visible",
    )

    if uploaded and "snapshot_preview_data" not in st.session_state:
        try:
            st.session_state.snapshot_preview_data = load_vit(uploaded)
        except ValueError as e:
            st.error(str(e))

    if "snapshot_preview_data" in st.session_state:
        data   = st.session_state.snapshot_preview_data
        latest = get_latest(data)
        n      = len(data)
        score  = latest["outputs"]["overall_score"]
        label  = latest["outputs"]["mirror_label"]
        date   = latest["saved_at"]

        st.info(
            f"📁 Found **{n} snapshot{'s' if n > 1 else ''}** — most recent: **{date}**  \n"
            f"Score: **{score}/100 ({label})**  \n"
            "This will pre-fill the form with your previous data. Review and update any values that have changed."
        )

        col_load, col_cancel, _ = st.columns([1, 1, 4])
        with col_load:
            if st.button("Load into form", type="primary"):
                populate_state_from_snapshot(latest, st.session_state)
                st.session_state.previous_snapshot = latest
                st.session_state.loaded_snapshots  = data
                log_snapshot_loaded()
                st.session_state.pop("narrative_text", None)
                st.session_state.file_uploader_key = st.session_state.get("file_uploader_key", 0) + 1
                del st.session_state.snapshot_preview_data
                st.session_state.expenses_total_estimate = sum(
                    st.session_state.get(f"expenses_{k}", 0.0)
                    for k in ["rent", "groceries", "transport", "subscriptions",
                              "dining", "shopping", "other"]
                )
                st.rerun()
        with col_cancel:
            if st.button("Cancel", type="secondary"):
                st.session_state.file_uploader_key = st.session_state.get("file_uploader_key", 0) + 1
                del st.session_state.snapshot_preview_data
                st.rerun()

    # --- Generate button (visible when income > 0) ---
    if income > 0:
        st.markdown("")
        if st.button("Show me my financial picture →", type="primary", use_container_width=True):
            if not st.session_state.api_key:
                st.error("Please enter an API key to continue.")
            elif st.session_state.income_main == 0:
                st.error("Please enter your monthly income to continue.")
            else:
                if st.session_state.debt_monthly > 0 and st.session_state.debt_total == 0:
                    st.session_state.debt_monthly = 0.0
                st.session_state.current_page = "results"
                st.rerun()
