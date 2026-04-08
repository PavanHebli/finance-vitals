# FinFriend — Feature Backlog

Each entry: what + why | files touched | priority | done

---

## Priority Tiers

- **P0** — No new infrastructure. Ship now.
- **P1** — Some engineering. Ship after P0.
- **P2** — Needs infrastructure (storage, file parsing). Ship after P1.
- **P3** — Polish / big bets. Low urgency.
- **Dropped** — Deprioritised with rationale.

---

## P0 — Ship Now

| # | Feature | What + Why | Files | Done |
|---|---------|------------|-------|------|
| 1 | **Form Framing Change** | Estimate-friendly labels and captions. Unblocks users who don't track spending precisely. | `snapshot.py`, `panel_form.py` | ✅ |
| 2 | **What-If Simulator** | 5 sliders — see how income/expense changes affect score live. Pure math, no AI. | `simulator.py`, `panel_results.py`, `health.py` | ✅ |
| 3 | **Snapshot Save / Load** | Save encrypted `.fin` file, re-upload next month to pre-fill form. Enables all history features. | `storage.py`, `panel_form.py`, `panel_results.py` | ✅ |
| 4 | **Progress Charts** | Score + 4 metric trend lines + cash flow across all saved snapshots. Merges saved history with current session live. | `progress.py`, `panel_results.py` | ✅ |
| 5 | **FinFriend Chat** | Finance-only chat (hard guardrails). Scope: scenario planning, progress coaching, insurance type guidance (no company/product names). Context: current + previous snapshot, both narratives, conversation history. | new `chat.py`, `panel_results.py` | ⬜ |

---

## P1 — Medium Term

| # | Feature | What + Why | Files | Done |
|---|---------|------------|-------|------|
| 6 | **Goal Tracker** | User sets ONE goal tied to narrative Q4 action. Progress bar shown when snapshot loaded. Needs storage (already done). | new `goals.py`, `panel_results.py` | ⬜ |
| 7 | **CSV / Bank Statement Import** | User exports last month's bank CSV → FinFriend parses and auto-fills the expense form. Solves "I don't know my numbers" for users who can't fill from memory. | new `importer.py`, `panel_form.py` | ⬜ |
| 8 | **Metric Citations** | Show benchmark source (CFPB, HUD, Fidelity/Vanguard, 50/30/20) next to each metric. Builds trust. | `panel_results.py` | ⬜ |
| 9 | **AI Personas** | Narrative tone selector: Honest Friend (default), Finance Professional, Tough Love. System prompt variation. | `narrative.py`, `panel_form.py` | ⬜ |
| 10 | **Form Assistant Chat** | User types "my rent is $1,200 and I earn $4,500" → form auto-fills. Requires intent parsing + session state mutation from chat. | new `form_chat.py`, `panel_form.py` | ⬜ |

---

## P2 — Infrastructure / Big Builds

| # | Feature | What + Why | Files | Depends On | Done |
|---|---------|------------|-------|------------|------|
| 11 | **Monthly Check-in Score Delta** | User returns next month, sees score change: "Last month: 58 → This month: 65". Storage already done — this is the UI layer. | `panel_results.py` | #3 | ⬜ |
| 12 | **Google Drive Connector** | Save/load `.fin` file directly from Google Drive. Removes manual download/upload step. Requires OAuth + Google verification. Build after traction. | new `drive.py` | — | ⬜ |
| 13 | **User-configurable Metric Weights** | Let users set priority % for each metric. Different life situations need different focus. | `health.py`, `panel_results.py` | — | ⬜ |
| 14 | **Export to CSV/PDF** | Download snapshot history as CSV or formatted PDF. Useful for sharing with an advisor. | new `export.py` | #3 | ⬜ |

---

## P3 — Long Term / Big Bets

| # | Feature | What + Why | Done |
|---|---------|------------|------|
| 15 | **Bank Connection (Plaid)** | Auto-pull real transaction data. Changes FinFriend from "estimate" to "actual". High effort, compliance considerations. Revisit after P0–P2 stable. | ⬜ |
| 16 | **Hosted API Key (SaaS tier)** | FinFriend absorbs AI cost, users get free/paid tier. Requires billing, auth. Changes the product from open-source tool to SaaS. | ⬜ |

---

## Dropped

| Feature | Reason |
|---------|--------|
| **Budget Planner Sheet** | Commoditised space. FinFriend's edge is diagnosis + narrative, not data entry. What-If Simulator covers the planning intent better. |
| **Module 5: One Next Step** | Redundant — narrative Q4 already is the one next step. |
| **Guided Estimation Flow** | Sufficiently solved by form framing change + benchmark captions. |
| **Decision Helper Q&A Chat** | Re-packages data already visible on screen. No new insight. Replaced by the scoped FinFriend Chat (#5) which adds scenario planning + progress coaching. |

---

## Completed

| Feature | Done |
|---------|------|
| Form Framing Change | ✅ |
| Expense Benchmark Hints | ✅ |
| What-If Simulator | ✅ |
| Simulator metric tooltips (short, net income note on DTI) | ✅ |
| Results page tabs (4 tabs: Story / What If? / Progress / Chat) | ✅ |
| Expense breakdown chart (Plotly, % of income, 30% reference line) | ✅ |
| Debt payment missing flag (danger score + narrative warning) | ✅ |
| Debt/payment mismatch validation on form | ✅ |
| Minimum expense floors in AI prompt | ✅ |
| DTI net income disclaimer on results page | ✅ |
| Snapshot save / load (.fin encrypted format, Fernet) | ✅ |
| Score delta vs previous snapshot on results page | ✅ |
| Progress Charts (score + 4 metrics + cash flow, merges current session) | ✅ |
| API key guide page (/get_api_key) | ✅ |
| Default provider changed to Groq (free tier) | ✅ |
| Module 1: Financial Snapshot | ✅ |
| Module 2: Health Score + Mirror | ✅ |
| Module 3: AI Narrative | ✅ |
| Module 4: Contextual Education | ✅ |

---

## How to use this file
- Pick the next unchecked P0 item and bring it up in conversation
- Do NOT load this file into context unless actively working on a feature
- Note dependencies before starting any P2 feature
