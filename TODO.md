# FinFriend — Feature Backlog

Each entry: what + why | files touched | priority

---

## Pending Features

| # | Feature | What + Why | Files | Priority | Done |
|---|---------|------------|-------|----------|------|
| 1 | **Metric Citations** | Show source (CFPB, HUD, etc.) next to each metric so users know scores aren't arbitrary | `panel_results.py` → `render_metrics_breakdown()` | Low | ⬜ |
| 2 | **User-configurable Weights** | Let users set priority % for each scored metric — different life situations need different focus | `health.py` → `score_metrics()`, `calculate_overall_score()`, `panel_results.py` | Medium | ⬜ |
| 3 | **Export Settings** | Download JSON/CSV of metric weights + financial snapshot — portability, share with advisor | `main.py`, new `app/modules/export.py` | Low | ⬜ |
| 4 | **Investment Knowledge Base** | Connect a curated investment knowledge base to the AI — so narrative can reference real investment strategies, fund types, tax-advantaged accounts etc. relevant to user's situation | `narrative.py`, new `app/modules/knowledge.py` | Medium | ⬜ |
| 5 | **Expense Benchmark Hints** | Show average spending ranges below each expense field (e.g. "Avg: $200–400/month") so users have a reference when they don't know exact amounts | `snapshot.py` → each expense input | Low | ✅ |
| 6 | **Budget Planner Sheet** | Let users split monthly salary into custom goal buckets (travel, education, new car, home, etc.) — choose from preset categories or create custom ones. Like a personal Google Sheet but built into the app | new `app/modules/planner.py`, new panel in UI | High | ⬜ |
| 7 | **Cloud Storage Integration** | Let users connect their own Google Drive (or similar) to save/load their financial data per session — needed for public hosting where server-side storage isn't viable. Paid version could offer platform storage | new `app/modules/storage.py`, `main.py` | High | ⬜ |
| 8 | **AI Personas** | Let users choose the tone/style of FinFriend's narrative. Personas: Honest Friend (default, warm+direct), Finance Professional (formal, precise), Coach (motivational, goal-focused), Tough Love (blunt, no softening). Each persona is a different system prompt variation | `narrative.py` → `build_prompt()`, `panel_form.py` (persona selector in API config) | Low | ⬜ |

---

## How to use this file
- Pick a feature by number, bring it up in conversation
- Do NOT load this file into context unless actively working on a feature
