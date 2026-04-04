# FinFriend — Feature Backlog

Each entry: what + why | files touched | priority

---

## Pending Features

| # | Feature | What + Why | Files | Priority |
|---|---------|------------|-------|----------|
| 1 | **Metric Citations** | Show source (CFPB, HUD, etc.) next to each metric so users know scores aren't arbitrary | `panel_results.py` → `render_metrics_breakdown()` | Low |
| 2 | **User-configurable Weights** | Let users set priority % for each scored metric — different life situations need different focus | `health.py` → `score_metrics()`, `calculate_overall_score()`, `panel_results.py` | Medium |
| 3 | **Export Settings** | Download JSON/CSV of metric weights + financial snapshot — portability, share with advisor | `main.py`, new `app/modules/export.py` | Low |

---

## How to use this file
- Pick a feature by number, bring it up in conversation
- Do NOT load this file into context unless actively working on a feature
