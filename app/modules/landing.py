import streamlit as st

_CSS = """
<style>
[data-testid="stAppViewContainer"] { padding-top: 0 !important; }
[data-testid="stMainBlockContainer"] { padding: 0 !important; max-width: 100% !important; }
[data-testid="block-container"] { padding: 0 !important; max-width: 100% !important; }

.landing-wrap {
    font-family: 'Inter', -apple-system, sans-serif;
    max-width: 860px;
    margin: 0 auto;
    padding: 60px 24px 40px;
}
.hero-eyebrow {
    font-size: 0.8rem;
    font-weight: 600;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--primary-color);
    margin-bottom: 18px;
}
.hero-headline {
    font-size: clamp(2rem, 5vw, 3.2rem);
    font-weight: 700;
    line-height: 1.15;
    letter-spacing: -0.03em;
    margin-bottom: 20px;
    color: var(--text-color);
}
.hero-sub {
    font-size: 1.1rem;
    line-height: 1.7;
    color: var(--text-color);
    opacity: 0.65;
    max-width: 600px;
    margin-bottom: 12px;
}
.section-label {
    font-size: 0.72rem;
    font-weight: 600;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--text-color);
    opacity: 0.4;
    margin-bottom: 16px;
    margin-top: 48px;
}
.steps-grid {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 14px;
    margin-bottom: 8px;
}
.step-card {
    background: var(--secondary-background-color);
    border-radius: 12px;
    padding: 20px 18px;
}
.step-number {
    font-size: 0.7rem;
    font-weight: 700;
    color: var(--primary-color);
    margin-bottom: 10px;
    letter-spacing: 0.05em;
}
.step-title {
    font-size: 0.92rem;
    font-weight: 600;
    color: var(--text-color);
    margin-bottom: 6px;
}
.step-desc {
    font-size: 0.82rem;
    color: var(--text-color);
    opacity: 0.6;
    line-height: 1.55;
}
.pills-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
    margin-bottom: 8px;
}
.pill-card {
    background: var(--secondary-background-color);
    border-radius: 10px;
    padding: 16px 18px;
    display: flex;
    align-items: flex-start;
    gap: 12px;
}
.pill-icon { font-size: 1.2rem; line-height: 1; margin-top: 2px; }
.pill-title {
    font-size: 0.88rem;
    font-weight: 600;
    color: var(--text-color);
    margin-bottom: 3px;
}
.pill-desc {
    font-size: 0.78rem;
    color: var(--text-color);
    opacity: 0.55;
    line-height: 1.5;
}
.trust-bar {
    margin-top: 44px;
    padding: 16px 20px;
    background: var(--secondary-background-color);
    border-radius: 10px;
    font-size: 0.8rem;
    color: var(--text-color);
    opacity: 0.55;
    text-align: center;
    line-height: 1.6;
}
</style>
"""

_HTML = """
<div class="landing-wrap">
    <div class="hero-eyebrow">🩺 Vitals — Financial Health</div>
    <div class="hero-headline">Know where you stand<br>financially.</div>
    <div class="hero-sub">A 5-minute checkup that scores your finances against the same benchmarks banks and government agencies use — and explains what it all means in plain English, no jargon.</div>
    <div class="section-label">How it works</div>
    <div class="steps-grid">
        <div class="step-card">
            <div class="step-number">STEP 01</div>
            <div class="step-title">Enter your numbers</div>
            <div class="step-desc">Rough estimates are fine. Income, expenses, savings, debt — takes about 5 minutes.</div>
        </div>
        <div class="step-card">
            <div class="step-number">STEP 02</div>
            <div class="step-title">Get your score</div>
            <div class="step-desc">0–100 health score across 4 metrics. AI explains your picture in plain English and gives you one action.</div>
        </div>
        <div class="step-card">
            <div class="step-number">STEP 03</div>
            <div class="step-title">Track over time</div>
            <div class="step-desc">Save a snapshot and return next month. Watch your score move as your finances improve. Download a PDF report to share with a partner or advisor.</div>
        </div>
    </div>
    <div class="section-label">Why Vitals</div>
    <div class="pills-grid">
        <div class="pill-card">
            <div class="pill-icon">🏦</div>
            <div>
                <div class="pill-title">No bank connection</div>
                <div class="pill-desc">Enter estimates manually. No OAuth, no account access, no risk.</div>
            </div>
        </div>
        <div class="pill-card">
            <div class="pill-icon">🔒</div>
            <div>
                <div class="pill-title">No account required</div>
                <div class="pill-desc">Nothing stored on our servers. Your data lives in your session and your file.</div>
            </div>
        </div>
        <div class="pill-card">
            <div class="pill-icon">📊</div>
            <div>
                <div class="pill-title">Real benchmarks</div>
                <div class="pill-desc">CFPB, HUD, Fidelity standards — the same thresholds lenders and advisors use.</div>
            </div>
        </div>
        <div class="pill-card">
            <div class="pill-icon">💬</div>
            <div>
                <div class="pill-title">Plain English</div>
                <div class="pill-desc">Not a ratio dashboard. A diagnosis. Ask follow-up questions in the built-in chat.</div>
            </div>
        </div>
        <div class="pill-card">
            <div class="pill-icon">📄</div>
            <div>
                <div class="pill-title">Exportable report</div>
                <div class="pill-desc">Download a clean PDF with your score, metrics, and full narrative — ready to share or print.</div>
            </div>
        </div>
    </div>
    <div class="trust-bar">No account &nbsp;·&nbsp; No bank login &nbsp;·&nbsp; No data stored on our servers &nbsp;·&nbsp; Free to use</div>
</div>
"""


def render_landing_page():
    st.markdown(_CSS, unsafe_allow_html=True)
    st.markdown(_HTML, unsafe_allow_html=True)

    col1, col2, col3 = st.columns([2, 2, 2])
    with col2:
        if st.button("Check my financial health →", use_container_width=True, type="primary"):
            st.session_state.current_page = "form"
            st.rerun()
