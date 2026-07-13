import streamlit as st

_CSS = """
<style>
[data-testid="stAppViewContainer"] { padding-top: 8px !important; }
[data-testid="stMainBlockContainer"] { padding: 8px 5vw 0 5vw !important; max-width: 100% !important; }
[data-testid="block-container"] { padding: 0 !important; max-width: 100% !important; }
.main .block-container { padding: 0 !important; max-width: 100% !important; }

.lp-nav {
    display: flex;
    align-items: center;
    padding: 18px 0;
    border-bottom: 1px solid rgba(128,128,128,0.1);
    margin: 0 -5vw;
    padding-left: 5vw;
    padding-right: 5vw;
}
.lp-logo {
    font-size: 1.05rem;
    font-weight: 700;
    color: var(--text-color);
    letter-spacing: -0.01em;
}
.lp-hero {
    padding: 72px 0 40px;
}
.lp-eyebrow {
    font-size: 0.72rem;
    font-weight: 600;
    letter-spacing: 0.13em;
    text-transform: uppercase;
    color: var(--primary-color);
    margin-bottom: 20px;
}
.lp-headline {
    font-size: clamp(2.4rem, 5.5vw, 3.8rem);
    font-weight: 700;
    line-height: 1.08;
    letter-spacing: -0.04em;
    color: var(--text-color);
    max-width: 700px;
    margin-bottom: 22px;
}
.lp-sub {
    font-size: 1.1rem;
    line-height: 1.72;
    color: var(--text-color);
    opacity: 0.62;
    max-width: 540px;
    margin-bottom: 0;
}
.lp-stats {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    margin-top: 40px;
    margin-left: -5vw;
    margin-right: -5vw;
    border-top: 1px solid rgba(128,128,128,0.1);
    border-bottom: 1px solid rgba(128,128,128,0.1);
    background: var(--secondary-background-color);
}
.lp-stat {
    padding: 26px 0;
    text-align: center;
}
.lp-stat + .lp-stat {
    border-left: 1px solid rgba(128,128,128,0.1);
}
.lp-stat-num {
    display: block;
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--text-color);
    letter-spacing: -0.03em;
    line-height: 1.2;
}
.lp-stat-label {
    display: block;
    font-size: 0.68rem;
    color: var(--text-color);
    opacity: 0.4;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    margin-top: 5px;
}
.lp-section {
    padding: 56px 0;
}
.lp-section-label {
    font-size: 0.68rem;
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--text-color);
    opacity: 0.35;
    margin-bottom: 28px;
}
.lp-steps {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 16px;
}
.lp-step {
    background: var(--secondary-background-color);
    border-radius: 14px;
    padding: 28px 22px;
}
.lp-step-num {
    font-size: 0.65rem;
    font-weight: 700;
    color: var(--primary-color);
    letter-spacing: 0.07em;
    text-transform: uppercase;
    margin-bottom: 14px;
}
.lp-step-title {
    font-size: 0.98rem;
    font-weight: 600;
    color: var(--text-color);
    margin-bottom: 10px;
}
.lp-step-desc {
    font-size: 0.83rem;
    color: var(--text-color);
    opacity: 0.58;
    line-height: 1.62;
}
.lp-features {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 14px;
}
.lp-feature {
    padding: 22px 20px;
    border: 1px solid rgba(128,128,128,0.11);
    border-radius: 12px;
}
.lp-feature-icon {
    font-size: 1.3rem;
    margin-bottom: 12px;
    display: block;
}
.lp-feature-title {
    font-size: 0.88rem;
    font-weight: 600;
    color: var(--text-color);
    margin-bottom: 7px;
}
.lp-feature-desc {
    font-size: 0.78rem;
    color: var(--text-color);
    opacity: 0.54;
    line-height: 1.58;
}
.lp-trust {
    background: var(--secondary-background-color);
    border-top: 1px solid rgba(128,128,128,0.1);
    padding: 20px 5vw;
    margin-left: -5vw;
    margin-right: -5vw;
    text-align: center;
    font-size: 0.76rem;
    color: var(--text-color);
    opacity: 0.4;
    letter-spacing: 0.03em;
}
</style>
"""

_NAV = '<div class="lp-nav"><span class="lp-logo">🩺 Vitals</span></div>'

_HERO = """
<div class="lp-hero">
    <div class="lp-eyebrow">Financial Health Checkup · Free · No account needed</div>
    <div class="lp-headline">Finally know<br>where you stand.</div>
    <div class="lp-sub">
        Most financial tools are built for people who already get it. Vitals is for everyone else.
        Enter your numbers, get a score, and hear in plain English exactly what's going on
        and one concrete thing to do about it.
    </div>
</div>
"""

_STATS = """
<div class="lp-stats">
    <div class="lp-stat">
        <span class="lp-stat-num">0–100</span>
        <span class="lp-stat-label">Health score</span>
    </div>
    <div class="lp-stat">
        <span class="lp-stat-num">4</span>
        <span class="lp-stat-label">Metrics tracked</span>
    </div>
    <div class="lp-stat">
        <span class="lp-stat-num">5 min</span>
        <span class="lp-stat-label">To your score</span>
    </div>
    <div class="lp-stat">
        <span class="lp-stat-num">0</span>
        <span class="lp-stat-label">Data on our servers</span>
    </div>
</div>
"""

_HOW = """
<div class="lp-section">
    <div class="lp-section-label">How it works</div>
    <div class="lp-steps">
        <div class="lp-step">
            <div class="lp-step-num">Step 01</div>
            <div class="lp-step-title">Enter your numbers</div>
            <div class="lp-step-desc">
                Type in estimates, or upload a PDF bank statement and let Vitals fill the form for you.
                Either way, nothing leaves your device — parsing happens locally.
            </div>
        </div>
        <div class="lp-step">
            <div class="lp-step-num">Step 02</div>
            <div class="lp-step-title">Get your score and story</div>
            <div class="lp-step-desc">
                A 0–100 health score across four metrics. An AI narrative explains what your
                numbers mean in plain English and gives you one concrete action for this month.
            </div>
        </div>
        <div class="lp-step">
            <div class="lp-step-num">Step 03</div>
            <div class="lp-step-title">Track your progress</div>
            <div class="lp-step-desc">
                Save a snapshot, return next month, and watch your score move.
                Set a goal, chat with your data, or export a PDF to share with a partner or advisor.
            </div>
        </div>
    </div>
</div>
"""

_WHY = """
<div class="lp-section" style="padding-top:0;">
    <div class="lp-section-label">Why Vitals</div>
    <div class="lp-features">
        <div class="lp-feature">
            <span class="lp-feature-icon">📊</span>
            <div class="lp-feature-title">Real benchmarks, not arbitrary thresholds</div>
            <div class="lp-feature-desc">
                CFPB, HUD, Fidelity — the same standards banks, lenders, and government agencies use.
                You're measured against numbers that actually mean something.
            </div>
        </div>
        <div class="lp-feature">
            <span class="lp-feature-icon">💬</span>
            <div class="lp-feature-title">A diagnosis, not a dashboard</div>
            <div class="lp-feature-desc">
                A 38% DTI means something different at 24 than at 40. Charts can't carry that nuance.
                The AI narrative puts your numbers in context — no jargon required.
            </div>
        </div>
        <div class="lp-feature">
            <span class="lp-feature-icon">🔒</span>
            <div class="lp-feature-title">No account, no bank connection</div>
            <div class="lp-feature-desc">
                Upload a PDF statement or type estimates manually — either way, account numbers,
                names, and balances never leave your device. Only merchant names and amounts
                go to AI for categorization.
            </div>
        </div>
        <div class="lp-feature">
            <span class="lp-feature-icon">🎯</span>
            <div class="lp-feature-title">One action, not a list of twelve</div>
            <div class="lp-feature-desc">
                Every checkup ends with a single recommended action for this month. Set it as a goal
                and track the one metric that matters most right now.
            </div>
        </div>
        <div class="lp-feature">
            <span class="lp-feature-icon">📈</span>
            <div class="lp-feature-title">Month-to-month tracking</div>
            <div class="lp-feature-desc">
                Come back each month with updated numbers. Progress charts show where you started
                and how far you've come — in score points, not just gut feeling.
            </div>
        </div>
        <div class="lp-feature">
            <span class="lp-feature-icon">📄</span>
            <div class="lp-feature-title">Exportable PDF report</div>
            <div class="lp-feature-desc">
                Download a clean report with your score, metrics, and full narrative —
                ready to share with a partner or financial advisor.
            </div>
        </div>
    </div>
</div>
"""

_TRUST = """
<div class="lp-trust">
    No account &nbsp;·&nbsp; No bank login &nbsp;·&nbsp; No data stored on our servers
    &nbsp;·&nbsp; Free to use &nbsp;·&nbsp; Open source
</div>
"""


def render_landing_page():
    st.markdown(_CSS, unsafe_allow_html=True)
    st.markdown(_NAV, unsafe_allow_html=True)
    st.markdown(_HERO, unsafe_allow_html=True)

    cta_col, _ = st.columns([1.6, 4])
    with cta_col:
        if st.button("Try it free here", use_container_width=True, type="primary"):
            st.session_state.current_page = "form"
            st.rerun()

    st.markdown(_STATS, unsafe_allow_html=True)
    st.markdown(_HOW, unsafe_allow_html=True)
    st.markdown(_WHY, unsafe_allow_html=True)
    st.markdown(_TRUST, unsafe_allow_html=True)
