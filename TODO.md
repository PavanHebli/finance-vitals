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

## Product Direction — Retention Problem

Right now FinFriend is a one-time diagnostic. Users have no recurring reason to return. Three directions to solve this:

| Direction | What it means | Needs |
|-----------|--------------|-------|
| **Progress tracking** | User returns monthly, updates numbers, sees score change over time. "Last month: 60 → This month: 68" | Cloud storage (TODO #7) |
| **Goal-based usage** | User sets a goal (e.g. build 3-month emergency fund), app tracks progress toward it | Budget planner (TODO #6) + storage |
| **Decision helper** | Shift from diagnostic to advisor — "I got a raise, what do I do?" or "Should I take this loan?" | Mostly a prompt change, low infra cost |

Decision helper is the lowest effort and highest immediate value — worth exploring before the others.

---

## How to use this file
- Pick a feature by number, bring it up in conversation
- Do NOT load this file into context unless actively working on a feature
