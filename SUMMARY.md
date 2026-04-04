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
├── requirements.txt          # Dependencies (streamlit>=1.33.0)
├── SUMMARY.md                # This file
├── TODO.md                   # Feature backlog
└── app/
    ├── main.py               # Panel switching only
    └── modules/
        ├── snapshot.py       # Module 1: form data collection
        ├── health.py         # Module 2: pure calculation logic
        ├── panel_form.py     # Panel 1 UI (form + Clear all + CTA)
        └── panel_results.py  # Panel 2 UI (score + breakdown)
```

---

## Module 1: Financial Snapshot - Detailed Implementation

### API Configuration (Top Section)

| Field | Widget Type | Options |
|-------|-------------|---------|
| AI Provider | selectbox | anthropic, openai, groq |
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
- Renders AI provider dropdown and API key input
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
- Renders Section B: 7 expense categories
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
- Initializes all 18 session state variables with defaults
- All financial fields default to 0 or sensible defaults
- Keys: llm_provider, api_key, income_main, income_additional, expenses_*, savings_total, investments_total, debt_total, debt_monthly, age, employment, has_health_insurance, has_emergency_fund, contributing_401k, data_entered

#### 2. `main()`
- Sets page config (title="FinFriend", icon="💰", layout="wide")
- Calls init_session_state()
- Renders title and all form sections
- Handles CTA button with validation and success message
- Calculates and displays totals on button click

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
- Build Module 3: AI Narrative Story
- Build Module 4: Contextual Education
- Build Module 5: The One Next Step

### Future Enhancements
See TODO.md for full feature backlog.

---

## File Listings

### `requirements.txt`
```
streamlit>=1.33.0
```

### `app/main.py` (56 lines)
Entry point with:
- Session state initialization
- Page configuration
- Form rendering
- CTA button with validation and totals calculation

### `app/modules/snapshot.py` (242 lines)
Contains all form section functions:
- render_api_config()
- render_income_section()
- render_expenses_section()
- render_position_section()
- render_context_section()

---

## Decisions Log

| Topic | Decision |
|-------|----------|
| API key + income validation | Both required to reach Panel 2 |
| Optional fields | Default to 0 |
| LLM providers | Anthropic, OpenAI, Groq |
| API key visibility | Simple password input (no toggle) |
| Streamlit version | >=1.33.0 |
| Panel navigation | session state `current_page` + `st.rerun()` on button click |
| Scoring | 4 metrics × 25pts = 100. Net flow shown as raw value only |
| Benchmarks | Industry standards — CFPB (DTI), HUD (housing), Fidelity/Vanguard (emergency fund), 50/30/20 rule (savings) |
| Calculation layer | `health.py` is pure logic, no Streamlit — UI only in panel files |

---

## Summary

Modules 1 and 2 are complete. The app collects financial data, scores it across 4 industry-standard metrics, and displays an overall health score (0–100) with a plain-language label. Next focus is Module 3 — the first AI/LLM integration.
