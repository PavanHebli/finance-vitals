# Vitals — Feature Backlog

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
| 0 | **Landing Page** | No value proposition shown before the form — users land cold with zero context. Fatal trust gap for a finance app. Single page: what Vitals does, why it's safe, one CTA. Must ship before any other outreach. | new `landing.py`, `main.py` | ⬜ |
| 1 | **Form Framing Change** | Estimate-friendly labels and captions. Unblocks users who don't track spending precisely. | `snapshot.py`, `panel_form.py` | ✅ |
| 2 | **What-If Simulator** | 5 sliders — see how income/expense changes affect score live. Pure math, no AI. | `simulator.py`, `panel_results.py`, `health.py` | ✅ |
| 3 | **Snapshot Save / Load** | Save encrypted `.vit` file, re-upload next month to pre-fill form. Enables all history features. | `storage.py`, `panel_form.py`, `panel_results.py` | ✅ |
| 4 | **Progress Charts** | Score + 4 metric trend lines + cash flow across all saved snapshots. Merges saved history with current session live. | `progress.py`, `panel_results.py` | ✅ |
| 5 | **Vitals Chat** | Finance-only chat (hard guardrails). Scope: scenario planning, progress coaching, insurance type guidance (no company/product names). Context: current + previous snapshot, both narratives, conversation history. Built in phases — see below. | `chat.py`, `panel_results.py` | ⬜ |

**Vitals Chat — Build Phases**

| Phase | What | Files | Done |
|-------|------|-------|------|
| 5a | **Base prompt + guardrails + chat UI** | `chat.py`, `panel_results.py` | ✅ |
| 5b | **LLM classifier** — fast call, NO base system prompt (saves ~800 tokens). Returns 1–2 categories: `debt`, `savings`, `housing`, `insurance`, `score`, `scenario`, `app`, `emotional`, `general`. Pydantic-validated structured output per provider. | `chat.py` | ✅ |
| 5c | **Category-specific prompts** — 9 prompt blocks injected on top of base prompt. `emotional` is both a standalone category and a modifier. `app` block contains full Vitals feature knowledge. `scenario` block has scoring thresholds inlined for accurate what-if reasoning. | `chat.py` | ✅ |
| 5d | **Conversation summarisation** — rolling summary after 8 turns. Snapshot context always injected, never dropped. | `chat.py` | ✅ |
| 5e | **Tool calls — What-If from chat** — chat detects scenario questions, calls `calculate_metrics()` + `score_metrics()` with modified inputs, returns real calculated score delta. Replaces LLM estimation with actual math. | `chat.py`, `health.py` | ⬜ |
| 5f | **Cognitive offload handling** — when user says "you decide" / "you pick" / "give me your best guess", model uses snapshot anchors + standard financial rules of thumb (28% housing rule, 80% income for freelance estimate etc.) to fill in missing variables, then calls tool. Reasoning and tool call are one step — reasoning decides the estimate, tool validates with real math. | `chat.py` | ⬜ |

---

## P1 — Medium Term

| # | Feature | What + Why | Files | Done |
|---|---------|------------|-------|------|
| 6 | **Goal Tracker** | User sets ONE goal tied to narrative Q4 action. Progress bar shown when snapshot loaded. Needs storage (already done). | new `goals.py`, `panel_results.py` | ⬜ |
| 7 | **CSV / Bank Statement Import** | User exports last month's bank CSV → Vitals parses and auto-fills the expense form. Solves "I don't know my numbers" for users who can't fill from memory. | new `importer.py`, `panel_form.py` | ⬜ |
| 8 | **Metric Citations** | Show benchmark source (CFPB, HUD, Fidelity/Vanguard, 50/30/20) next to each metric. Builds trust. | `panel_results.py` | ⬜ |
| 11b | **Trust Signals on Results Page** | Add a visible "no account, no server storage, your data stays local" note near the form and results. Directly addresses user concern about financial data security. | `panel_form.py`, `panel_results.py` | ⬜ |
| 9 | **AI Personas** | Narrative tone selector: Honest Friend (default), Finance Professional, Tough Love. System prompt variation. | `narrative.py`, `panel_form.py` | ⬜ |
| 10 | **Form Assistant Chat** | User types "my rent is $1,200 and I earn $4,500" → form auto-fills. Requires intent parsing + session state mutation from chat. | new `form_chat.py`, `panel_form.py` | ⬜ |
| 11 | **Hosted API Key (remove BYOK friction)** | Vitals absorbs AI cost for basic use — user gets free tier without needing an API key. Controlled via `SHOW_API_INPUT` + `HOSTED_API_KEY` in secrets. No code change needed to toggle. | `snapshot.py` | ✅ |

---

## P2 — Infrastructure / Big Builds

| # | Feature | What + Why | Files | Depends On | Done |
|---|---------|------------|-------|------------|------|
| 12 | **Monthly Check-in Score Delta** | User returns next month, sees score change: "Last month: 58 → This month: 65". Storage already done — this is the UI layer. | `panel_results.py` | #3 | ⬜ |
| 13 | **Google Drive Connector** | Save/load `.vit` file directly from Google Drive. Removes manual download/upload step. Requires OAuth + Google verification. Build after traction. | new `drive.py` | — | ⬜ |
| 14 | **User-configurable Metric Weights** | Let users set priority % for each metric. Different life situations need different focus. | `health.py`, `panel_results.py` | — | ⬜ |
| 15 | **Export to CSV/PDF** | Download snapshot history as CSV or formatted PDF. Useful for sharing with an advisor. Addresses user feedback that `.vit` format is unfamiliar — PDF gives a human-readable alternative. | new `export.py` | #3 | ⬜ |

---

## P3 — Long Term / Big Bets

| # | Feature | What + Why | Done |
|---|---------|------------|------|
| 16 | **Bank Connection (Plaid)** | Auto-pull real transaction data. Changes Vitals from "estimate" to "actual". High effort, compliance considerations. Revisit after P0–P2 stable. | ⬜ |

---

## Dropped

| Feature | Reason |
|---------|--------|
| **Budget Planner Sheet** | Commoditised space. Vitals' edge is diagnosis + narrative, not data entry. What-If Simulator covers the planning intent better. |
| **Module 5: One Next Step** | Redundant — narrative Q4 already is the one next step. |
| **Guided Estimation Flow** | Sufficiently solved by form framing change + benchmark captions. |
| **Decision Helper Q&A Chat** | Re-packages data already visible on screen. No new insight. Replaced by the scoped Vitals Chat (#5) which adds scenario planning + progress coaching. |
| **Hosted API Key (SaaS tier) as P3** | Moved to P1 (#11) — removing BYOK friction is the most important adoption blocker, not a long-term bet. |

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
| Snapshot save / load (.vit encrypted format, Fernet) | ✅ |
| Score delta vs previous snapshot on results page | ✅ |
| Progress Charts (score + 4 metrics + cash flow, merges current session) | ✅ |
| API key guide page (/get_api_key) | ✅ |
| Default provider changed to Groq (free tier) | ✅ |
| Module 1: Financial Snapshot | ✅ |
| Module 2: Health Score + Mirror | ✅ |
| Module 3: AI Narrative | ✅ |
| Module 4: Contextual Education | ✅ |
| Feedback page (/feedback) with Supabase backend | ✅ |
| Feedback link on results page | ✅ |
| Vitals Chat Phase 5a — base prompt + guardrails + chat UI | ✅ |
| Vitals Chat Phase 5b — LLM classifier with Pydantic structured output | ✅ |
| Vitals Chat Phase 5c — 9 category-specific prompt blocks | ✅ |
| Vitals Chat Phase 5d — conversation summarisation (8 turns, keep 6 verbatim) | ✅ |
| Rebrand from FinFriend → Vitals (.vit file format, 🩺 icon) | ✅ |
| Hosted API key — `SHOW_API_INPUT` + `HOSTED_API_KEY` in secrets, zero friction for users | ✅ |
| Session analytics — `analytics.py` + Supabase `sessions` table, tracks funnel: results → narrative → whatif → save → return | ✅ |
| UX improvements — sample data banner, tab numbering (1·Story / 2·What If? / 3·Progress / 4·Ask Vitals), save callout, global font size bump | ✅ |
| Screenshots added to README (`assets/` folder) | ✅ |
| Device tracking — `_get_device()` in analytics.py using `st.context.headers` User-Agent | ✅ |
| Progressive form reveal — sections 2–4 as expanders with one-way unlock flags, total expenses estimate in section 1 | ✅ |
| Privacy trust note — `st.caption()` above income fields | ✅ |
| Logo in form header — `assets/Logo.png` rendered via `st.image()` | ✅ |
| Shared `get_financial_context()` — extracted to `health.py`, used by both `narrative.py` and `chat.py` | ✅ |
| Partial data handling — narrative and chat handle missing sections gracefully with "not provided" text | ✅ |
| Feedback form RLS fix — `returning="minimal"` in `feedback_db.py` | ✅ |
| `ENABLE_LOGGING` secret — disable Supabase writes locally to avoid fake data | ✅ |
| Custom CSS file — `.streamlit/custom.css` with Inter font, pill buttons, raised active tab, expander fade-in, metric card animations | ✅ |
| Theme config — soft light default in `config.toml`, Dark available via ≡ menu, multiple palette presets documented | ✅ |
| Metric breakdown redesign — 4-tile grid (single row) with progress bars and benchmark hints | ✅ |
| Score display — CSS pop animation, theme-adaptive `var(--text-color)` | ✅ |
| Tab fix — hidden `tab-highlight` and `tab-border` to remove duplicate blue line | ✅ |
| Results page layout — sample banner above buttons, save button pinned far right | ✅ |

---

## How to use this file
- Pick the next unchecked P0 item and bring it up in conversation
- Do NOT load this file into context unless actively working on a feature
- Note dependencies before starting any P2 feature
