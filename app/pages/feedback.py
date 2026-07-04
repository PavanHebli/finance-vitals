import streamlit as st
from modules.feedback_db import submit_feedback

st.set_page_config(
    page_title="Feedback — Vitals",
    page_icon="💬",
    layout="wide",
    initial_sidebar_state="collapsed",
)

st.markdown(
    "<a href='/' target='_self' style='font-size:1.7rem; font-weight:700; color:var(--text-color); "
    "text-decoration:none; letter-spacing:-0.02em;'>🩺 Vitals</a>",
    unsafe_allow_html=True,
)
st.markdown("---")
st.title("💬 Share Your Feedback")
st.markdown(
    "Vitals is built in the open. Your feedback directly shapes what gets built next. "
    "This takes about 2 minutes."
)
st.markdown("---")

if st.session_state.get("feedback_submitted"):
    st.success("Thanks — your feedback has been received. It genuinely helps.")
    st.stop()

LIMIT_SHORT = 300
LIMIT_LONG  = 2000

found_via = st.selectbox(
    "How did you find Vitals?",
    ["Reddit", "Friend / word of mouth", "Google", "GitHub", "Other"],
)
found_via_other = ""
if found_via == "Other":
    found_via_other = st.text_input(
        "Where exactly? (optional)",
        placeholder="e.g. LinkedIn, a podcast, a blog post…",
        max_chars=LIMIT_SHORT,
    )

st.markdown("")

score_accuracy = st.select_slider(
    "How accurate did your health score feel?",
    options=[1, 2, 3, 4, 5],
    value=3,
    format_func=lambda x: {
        1: "1 — Way off",
        2: "2 — Somewhat off",
        3: "3 — About right",
        4: "4 — Pretty accurate",
        5: "5 — Spot on",
    }[x],
)

st.markdown("")

most_useful = st.selectbox(
    "Which part of the app was most useful?",
    ["Health Score", "AI Narrative", "What-If Simulator", "Progress Charts", "Other"],
)
most_useful_other = ""
if most_useful == "Other":
    most_useful_other = st.text_input(
        "Which part exactly? (optional)",
        placeholder="e.g. The benchmark explanations, the expense chart…",
        max_chars=LIMIT_SHORT,
    )

st.markdown("")

missing_or_confusing = st.text_area(
    "What was missing or confusing? (optional)",
    placeholder="e.g. I didn't understand how the emergency fund score was calculated…",
    height=100,
    max_chars=LIMIT_LONG,
    help=f"Max {LIMIT_LONG:,} characters",
)

feature_suggestion = st.text_area(
    "What feature would you most like to see added? (optional)",
    placeholder="e.g. I'd love to import my bank CSV automatically…",
    height=100,
    max_chars=LIMIT_LONG,
    help=f"Max {LIMIT_LONG:,} characters",
)

anything_else = st.text_area(
    "Anything else you'd like to share? (optional)",
    placeholder="Any other thoughts, reactions, or suggestions…",
    height=120,
    max_chars=LIMIT_LONG,
    help=f"Max {LIMIT_LONG:,} characters",
)

email = st.text_input(
    "Email (optional — only if you'd like a reply)",
    placeholder="you@example.com",
)

st.markdown("")

if st.button("Submit feedback", type="primary"):
    resolved_found_via  = found_via_other.strip() if found_via == "Other" and found_via_other.strip() else found_via
    resolved_most_useful = most_useful_other.strip() if most_useful == "Other" and most_useful_other.strip() else most_useful

    ok = submit_feedback(
        found_via=resolved_found_via,
        score_accuracy=score_accuracy,
        most_useful=resolved_most_useful,
        missing_or_confusing=missing_or_confusing,
        feature_suggestion=feature_suggestion,
        anything_else=anything_else,
        email=email,
    )
    if ok:
        st.session_state["feedback_submitted"] = True
        st.rerun()
