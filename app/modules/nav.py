import streamlit as st


def render_nav():
    """
    Renders the Vitals logo as a plain HTML anchor.
    Consistent with feedback.py and get_api_key.py.
    Clicking navigates to / which loads a fresh session at the landing page.
    """
    st.markdown(
        "<a href='/' target='_self' style='font-size:1.7rem; font-weight:700; color:var(--text-color); "
        "text-decoration:none; letter-spacing:-0.02em; display:inline-block; padding:8px 0 12px;'>"
        "🩺 Vitals</a>",
        unsafe_allow_html=True,
    )
    st.markdown("---")
