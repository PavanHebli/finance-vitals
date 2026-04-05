# FinFriend - Complete Project Development Summary

## Table of Contents
1. [Project Overview](#project-overview)
2. [Core Loop](#core-loop)
3. [Project Structure](#project-structure)
4. [Module 1: Financial Snapshot - Detailed Implementation](#module-1-financial-snapshot---detailed-implementation)
5. [Functions Implemented](#functions-implemented)
6. [Issues Encountered and Fixes](#issues-encountered-and-fixes)
7. [Design Decisions](#design-decisions)
8. [Running the App](#running-the-app)
9. [Next Steps](#next-steps)
10. [File Listings](#file-listings)

---

## Project Overview

**FinFriend** is an open-source personal finance application built with Streamlit (Python). The app helps users understand their finances through an interactive form and AI-powered insights.

**Project Type:** Free and Open Source  
**Tech Stack:** Python, Streamlit  
**License:** MIT

### Core Features (5 Modules)
1. **Module 1: Financial Snapshot** - Input form for financial data
2. **Module 2: Health Score + Mirror** - Diagnose financial health
3. **Module 3: AI Narrative Story** - AI tells the story of user's money
4. **Module 4: Contextual Education** - Educates on WHY financial concepts matter
5. **Module 5: The One Next Step** - Gives ONE clear actionable step

---

## Core Loop

```
User inputs financial data
        ↓
AI narrates the story of their money
        ↓
App diagnoses problems with honesty
        ↓
App educates on WHY it matters
        ↓
App gives ONE clear next step
```

---

## Project Structure

```
finfriend/
├── requirements.txt          # streamlit, anthropic, openai, groq, google-generativeai, watchdog
├── SUMMARY.md                # This file
├── TODO.md                   # Feature backlog
├── README.md                 # Public-facing docs + live app link
├── .gitignore
└── app/
    ├── main.py               # Panel switching + session state init
    └── modules/
        ├── snapshot.py       # Module 1: form data collection + expense benchmarks
        ├── health.py         # Module 2: pure calculation logic (no Streamlit)
        ├── narrative.py      # Module 3: build_prompt() + call_llm() streaming
        ├── education.py      # Module 4: pre-written education per flagged metric
        ├── panel_form.py     # Panel 1 UI (form, Sample Input toggle, Clear all, CTA)
        └── panel_results.py  # Panel 2 UI (score, breakdown, narrative, education)
```

---

## Module 1: Financial Snapshot - Detailed Implementation

### API Configuration (Top Section)

| Field | Widget Type | Options |
|-------|-------------|---------|
| AI Provider | selectbox | anthropic, openai, groq, gemini |
| API Key | text_input | type="password" (hidden) |

### Section A: Income

| Field | Widget Type | Default | Step |
|-------|-------------|---------|------|
| Monthly take-home income (after tax) | number_input | 0.0 | 100 |
| Additional income (freelance, side income) | number_input | 0.0 | 100 |

### Section B: Monthly Expenses

| Field | Widget Type | Default | Step |
|-------|-------------|---------|------|
| Rent / Mortgage | number_input | 0.0 | 50 |
| Groceries | number_input | 0.0 | 25 |
| Transport (car, gas, public transit) | number_input | 0.0 | 25 |
| Subscriptions (Netflix, Spotify, gym, etc.) | number_input | 0.0 | 5 |
| Dining out / Food delivery | number_input | 0.0 | 25 |
| Shopping / Personal | number_input | 0.0 | 25 |
| Other expenses | number_input | 0.0 | 25 |

### Section C: Financial Position

| Field | Widget Type | Default | Step |
|-------|-------------|---------|------|
| Total savings (checking + savings accounts) | number_input | 0.0 | 100 |
| Total investments (401k, stocks, etc.) | number_input | 0.0 | 100 |
| Total debt (student loans, credit card, car loan) | number_state | 0.0 | 100 |
| Monthly debt payments | number_input | 0.0 | 25 |

### Section D: Context

| Field | Widget Type | Options |
|-------|-------------|---------|
| Age | number_input | min=1, max=120 |
| Employment status | selectbox | Employed, Self-employed, Student, Job hunting |
| Do you have health insurance? | radio | Yes, No |
| Do you have an emergency fund? | selectbox | Yes, No, Not sure |
| Are you contributing to 401k? | selectbox | Yes, No, Not sure, No access |

### CTA Button

- **Label:** "Show me my financial picture →"
- **Validation:** Requires API key to be entered
- **On Success:** Displays calculated totals (total income, total expenses, net monthly flow)

---

## Functions Implemented

### `app/modules/snapshot.py`

#### 1. `render_api_config()`
- Renders AI provider dropdown (anthropic, openai, groq, gemini) and API key input
- Uses `st.columns([1, 2])` for side-by-side layout
- API key stored in session state with password masking
- Returns: `(provider, api_key)`

#### 2. `render_income_section()`
- Renders Section A: Income inputs
- Two-column layout with main income and additional income
- Uses `st.number_input()` with format="%.2f"
- Values persist via session state
- Returns: `(main_income, additional_income)`

#### 3. `render_expenses_section()`
- Renders Section B: 7 expense categories with `st.caption()` benchmark hints
- Two-column layout (4 in col1, 3 in col2)
- All default to 0.0
- Returns: `expenses` dict

#### 4. `render_position_section()`
- Renders Section C: Financial position
- Two-column layout
- Savings, investments, debt, debt payments
- Returns: `(savings, investments, debt, debt_payment)`

#### 5. `render_context_section()`
- Renders Section D: Context questions
- Mix of number_input, selectbox, and radio widgets
- Returns: `(age, employment, insurance, emergency_fund, contributing_401k)`

### `app/main.py`

#### 1. `init_session_state()`
- Initializes all session state variables with defaults
- Keys: llm_provider, api_key, income_main, income_additional, expenses_*, savings_total, investments_total, debt_total, debt_monthly, age, employment, has_health_insurance, has_emergency_fund, contributing_401k, data_entered, current_page, sample_input_active

#### 2. `main()`
- Sets page config (title="FinFriend", icon="💰", layout="wide")
- Calls init_session_state()
- Routes to `render_form_panel()` or `render_results_panel()` based on `current_page`

### `app/modules/health.py`

Pure calculation logic — no Streamlit imports.

#### 1. `calculate_metrics(state)`
- Computes: savings_rate, debt_to_income, emergency_fund_months, housing_ratio, net_monthly_flow
- Edge case: if expenses=0 and income>0, emergency_fund = savings/income (treats full income as monthly flow)

#### 2. `score_metrics(metrics)`
- Returns dict of scored metrics: `{score: 0-25, status: "danger"|"warning"|"ok"|"good"}`
- Benchmarks: CFPB (DTI 43%), HUD (housing 30%), Fidelity/Vanguard (emergency 3-6mo), 50/30/20 rule (savings 20%)
- net_monthly_flow scored separately (not included in 0-100 total)

#### 3. `calculate_overall_score(metric_scores)`
- Sums scores for 4 metrics: savings_rate + debt_to_income + emergency_fund_months + housing_ratio
- Returns: 0–100

#### 4. `get_mirror_label(score)`
- Returns `{"label": str, "description": str}` based on score range
- Labels: Critical (0-29), At Risk (30-49), Fair (50-64), Good (65-79), Healthy (80-100)

### `app/modules/narrative.py`

#### 1. `build_prompt(state, metrics, metric_scores, overall_score, mirror)`
- Constructs the full LLM prompt with all financial data
- Q&A format: 4 fixed questions with bold headers
- Rules enforced: 50-60 words per answer, banned vague adjectives, numbers paired with meaning, ONE action suggestion
- Health insurance rendered as "Yes"/"No" (not True/False)

#### 2. `call_llm(prompt, provider, api_key)`
- Generator function yielding text chunks for streaming
- Supports: anthropic (claude-opus-4-6), openai (gpt-4o), groq (llama-3.3-70b-versatile), gemini (gemini-1.5-flash)
- Consumed by `st.write_stream()` in panel_results.py

### `app/modules/education.py`

#### 1. `get_education(metric_scores)`
- Returns list of education items for flagged (danger/warning) metrics only
- Skips net_monthly_flow and ok/good metrics

#### 2. `render_education(metric_scores)`
- Renders a "Why this matters" `st.expander()` for each flagged metric
- Color-coded by status: danger=red, warning=orange
- Called after narrative in panel_results.py

### `app/modules/panel_form.py`

#### 1. `fill_sample_data()`
- Sets all session state fields to randomized realistic values
- All values explicitly cast to `float()` to avoid StreamlitMixedNumericTypesError

#### 2. `clear_all_fields()`
- Resets all session state fields to defaults
- Also sets `sample_input_active = False`

#### 3. `render_form_panel()`
- Renders title, Sample Input toggle, Clear All button, and form
- Toggle uses `value=` (not `key=`) to avoid StreamlitAPIException
- Previous-state tracking pattern: only calls fill/clear when toggle state actually changes
- Form wrapped in `st.form("financial_form")` to batch interactions and reduce reruns

### `app/modules/panel_results.py`

#### 1. `render_health_score(score, mirror)`
- Centered display of score (X/100) and mirror label with color coding

#### 2. `render_metrics_breakdown(metrics, metric_scores)`
- Table-style rows for each metric: name, raw value, colored status dot, score/25
- Net monthly flow shown separately at the bottom with color (green/red)

#### 3. `render_results_panel()`
- "← Edit my data" button sets current_page="form" + st.rerun()
- Warning banner if sample data is active
- Renders: health score → metrics breakdown → narrative (streaming) → education expander

---


## Design Decisions

### Session State Management
- All form inputs save to `st.session_state` immediately
- Default values read from session state on each render
- Enables form persistence across Streamlit reruns
- Pattern: `value=st.session_state.get("key", default_value)`

### UI Layout
- Used `st.columns()` for side-by-side inputs throughout
- Sections separated with `st.subheader()` and `st.divider()`
- Wide layout mode (`layout="wide"`) for better form experience
- Two-column layout for most form fields

### Streamlit Behavior Notes
- **Rerun behavior**: Every interaction triggers full script rerun from top
- **Panel switching**: `current_page` in session state + `st.rerun()` after button sets the flag
- **LSP errors**: False positives - "streamlit could not be resolved" means local LSP doesn't have streamlit installed, not an actual error

### Validation Approach
- API key **and** income > 0 are both required to switch to Panel 2
- Validation happens on CTA button click
- Error message displayed via `st.error()`

### Currency Formatting
- Removed `$` from format strings (not supported by Streamlit)
- Values display as plain numbers (e.g., 5000.00)
- Dollar signs can be added in labels if needed

---

## Running the App

### Install Dependencies
```bash
pip install streamlit
```

### Run the App
```bash
cd app
streamlit run main.py
```

Or from project root:
```bash
PYTHONPATH=. streamlit run app/main.py
```

### Access
Open browser at: `http://localhost:8501`

---

## Next Steps

### Immediate
- ~~Build Module 2: Health Score + Mirror~~ ✓
- ~~Build Module 3: AI Narrative Story~~ ✓
- ~~Build Module 4: Contextual Education~~ ✓
- Build Module 5: The One Next Step

### Future Enhancements
See TODO.md for full feature backlog.

---

## File Listings

### `requirements.txt`
```
streamlit>=1.33.0
watchdog>=6.0.0
anthropic>=0.25.0
openai>=1.0.0
groq>=0.5.0
google-generativeai>=0.5.0
```

### `app/main.py`
Entry point: session state init + panel routing (form / results)

### `app/modules/snapshot.py`
Module 1: form data collection with benchmark captions

### `app/modules/health.py`
Module 2: pure calculation logic (no Streamlit)

### `app/modules/narrative.py`
Module 3: LLM prompt builder + streaming call_llm() for 4 providers

### `app/modules/education.py`
Module 4: pre-written education per flagged metric

### `app/modules/panel_form.py`
Panel 1 UI: form, Sample Input toggle, Clear All, CTA

### `app/modules/panel_results.py`
Panel 2 UI: score, breakdown, narrative stream, education expander

---

## Decisions Log

| Topic | Decision |
|-------|----------|
| API key + income validation | Both required to reach Panel 2 |
| Optional fields | Default to 0 |
| LLM providers | Anthropic (claude-opus-4-6), OpenAI (gpt-4o), Groq (llama-3.3-70b-versatile), Gemini (gemini-1.5-flash) |
| API key visibility | Simple password input (no toggle) |
| Streamlit version | >=1.33.0 |
| Panel navigation | session state `current_page` + `st.rerun()` on button click |
| Scoring | 4 metrics × 25pts = 100. Net flow shown as raw value only |
| Benchmarks | Industry standards — CFPB (DTI), HUD (housing), Fidelity/Vanguard (emergency fund), 50/30/20 rule (savings) |
| Calculation layer | `health.py` is pure logic, no Streamlit — UI only in panel files |
| Toggle state management | `st.toggle()` uses `value=` not `key=` to avoid StreamlitAPIException; previous-state tracking pattern to detect ON→OFF / OFF→ON transitions |
| Narrative format | Q&A format with 4 fixed bold-header questions; 50-60 words per answer; banned vague adjectives; numbers always paired with meaning |
| Navigation (back button) | "← Edit my data" sets `current_page="form"` + `st.rerun()` — same pattern as CTA forward |
| Empty data guard | If expenses=0 and income=0, CTA is blocked to prevent a false 60/100 score from debt/housing scoring as "good" |

---

## Summary

Modules 1–4 are complete. The app collects financial data, scores it across 4 industry-standard metrics, streams an AI narrative in Q&A format, and shows contextual education for any flagged problem areas. The live app is hosted at https://finfriend-web.streamlit.app/. Next focus is Module 5 — The One Next Step.
