# Vitals — Roadmap & Backlog

The plan behind this file is in `DECISIONS.md` (see "Where Vitals Is Headed" and "Analytics and the Gates").

**How this file works**
- Work goes in **phases**. Each phase ends at a **gate**: a number that decides whether to keep going, change direction, or stop.
- Every item is sized to be **one small PR** (a branch off `main`, reviewed, merged). Bigger items are split into lettered steps.
- Old backlog numbers are kept in brackets, e.g. `[was #27]`, so history still makes sense.
- Status: ⬜ not started · 🔄 in progress · ✅ done

**North-star metric:** payday check-ins completed per month.

---

## Now — Finish What Is In Flight

| ID | Item | Status |
|----|------|--------|
| N1 | **Merge the Expo SDK 58 PR** (`expo-sdk-58`): SDK upgrade, mobile gets its own install, root layout route fix, PDF import upload fix, design icons, Budget page layout. Watch the Railway web build after merge. | 🔄 |
| N2 | **Merge `ignore-test-plan`** (one `.gitignore` line). | ⬜ |
| N3 | **Finish the mobile test pass** in `MOBILE_TEST_PLAN.md` (local) — send screenshots of anything broken; fix each as its own small PR. | 🔄 |
| N4 | **Delete stale branches**: `nextjs-fastapi-prod`, `mobile-monorepo`, `shared-package` (Railway now deploys from `main`). | ⬜ |
| N5 | **GitHub settings**: require a PR to merge into `main`; auto-delete merged branches. | ⬜ |
| N6 | **Test sign-in on the live site** (email and Google). The production database has never had a user; confirm Google is enabled in Supabase and the redirect URLs are set. | ⬜ |

---

## Phase 0 — Validate the Payday Problem (6 weeks)

**Goal:** prove people want the "safe to spend until payday" answer before building the full plan.
**Gate:** ≥ 300 completed check-ups across two launches; ≥ 10% set a reminder; 5+ of 10–15 interviewees describe the payday/surprise problem unprompted. **Below 100 completions after two launches → change the problem or the audience.**

### Product (web)

| ID | Item | What + why | Where | Status |
|----|------|-----------|-------|--------|
| 0.1 | **Re-source the 43% DTI line** | It cites the CFPB qualified-mortgage cap, which the CFPB replaced in 2020. Say "common lender guideline". | `web/src/components/Narrative.tsx`, `api/core/export_pdf.py`, metric citations | ⬜ |
| 0.2 | **Plain-language metric labels** | "How much of your pay you keep", "Could you handle a surprise?" etc. (table in `DECISIONS.md`). Labels only, no logic change. | `web/src/components/MetricCards.tsx`, `HealthScore.tsx`, mobile `completeness.ts` | ⬜ |
| 0.3 | **No-signup "Payday check-up"** — the core of Phase 0. Split into: | | | |
| 0.3a | Check-up form | Take-home pay, pay schedule (weekly/biweekly/monthly), rent, a checklist of monthly bills, once-in-a-while costs, current savings. Reuses guest mode and the progressive form. | `web/src/app/form` (or new `web/src/app/check-up`) | ⬜ |
| 0.3b | Check-up result | Headline: **safe to spend per week until payday**. Then "Could you handle a surprise?" (buffer vs $1,000 / one month of essentials), the four plain answers, and one next step. Reuses the score engine and partial scoring. | `web/src/app/results`, `api/core/health.py` | ⬜ |
| 0.3c | Check-up math in shared code | `safeToSpendPerWeek()`, `setAsidePerPaycheck()`, `bufferTarget()` as pure functions with unit tests, so web and mobile use the same numbers. | `packages/shared/src/` | ⬜ |
| 0.4 | **Reminder opt-in** `[was #18, #28]` | After the result: "Remind me on my next payday." Generates a `.ics` calendar event (no backend) that opens Vitals. | `web/src/components/ExportMenu.tsx` | ⬜ |
| 0.5 | **Email opt-in (optional)** `[part of #21]` | "Email me on payday" — store the email in a Supabase table with consent. Update the privacy policy first. Sending comes in Phase 1. | new table, `web/src/app/privacy` | ⬜ |
| 0.6 | **Gate analytics events** | `checkup_started`, `checkup_completed`, `reminder_set`, `email_optin`. No financial numbers. | `web/src/lib/analytics`, `api/core/analytics.py` | ⬜ |
| 0.7 | **Landing page rewrite** | New promise: "Know what's safe to spend until payday — in one minute, without linking your bank." CTA goes to the check-up. Keep the trust bar and founder card. | `web/src/app/page.tsx` | ⬜ |
| 0.8 | **CSV export** | Plain CSV next to `.vit` and PDF. Spreadsheet users will ask for it first. | `ExportMenu.tsx`, `packages/shared` | ⬜ |
| 0.9 | **Shareable check-up card** `[was #22]` | "I can safely spend $X/week" or the score, as an image with a link. Distribution, not vanity. | new route (server image, e.g. `@vercel/og`-style or Pillow) | ⬜ |

### Research (no code)

| ID | Item | Status |
|----|------|--------|
| 0.10 | **10–15 user interviews** with 22–35 renters on a paycheck. Ask about the last surprise expense and how it was paid; do not pitch. Write notes per interview. | ⬜ |
| 0.11 | **Reddit by hand** (the research tools were blocked): r/personalfinance, r/povertyfinance, r/ynab, r/budget, r/MintUpdates — search "gave up budgeting", "sinking funds", "safe to spend", "budget keeps failing". Save 30+ permalinks with quotes. | ⬜ |

### Launches (see Growth Track)

| ID | Item | Status |
|----|------|--------|
| 0.12 | Launch 1: **Show HN** + GitHub README refresh. | ⬜ |
| 0.13 | Launch 2: one of Product Hunt / Indie Hackers / a relevant subreddit's self-promotion thread (read each sub's rules first). | ⬜ |
| 0.14 | **Gate review**: write down the numbers and decide. | ⬜ |

---

## Phase 1 — Payday Plan MVP (2–3 months)

**Goal:** turn the one-time check-up into a payday habit.
**Gate:** ≥ 25% of planners do a second payday check-in; ≥ 15% active at day 60. **Below 10% second check-in → stop feature work.**

| ID | Item | What + why | Status |
|----|------|-----------|--------|
| 1.1 | **Card types** | Bills / Once-in-a-while / Goals / Spending money, layered on the existing percent/fixed cards. Rename Float → Spending money. Data model change in `packages/shared` types + Supabase column; migrate existing cards (expense → Bills, saving → Goals). | ⬜ |
| 1.2 | **"Add card" asks one question** | "Is this a bill, a once-in-a-while cost, or something you're saving for?" `classifyCard` only pre-selects. | ⬜ |
| 1.3 | **Guided onboarding** | Take-home + pay schedule → monthly bills checklist → once-in-a-while checklist → buffer created automatically → goals → Spending money per week. Pre-fill bills from PDF import where possible. | ⬜ |
| 1.4 | **Pay schedule** | Periods follow paydays, not calendar months. Next payday date drives safe-to-spend and reminders. | ⬜ |
| 1.5 | **Safe to spend on the home screen** | Spending money ÷ weeks until payday. Never counts pots. Plain negative when over-committed. Optional "type your checking balance" for a live mid-cycle figure. | ⬜ |
| 1.6 | **60-second payday check-in** `[was #27]` | Plan carries forward; confirm or tweak; "Anything unexpected since last payday?"; score delta shown `[was #12, #19]`. | ⬜ |
| 1.7 | **Surprise log + surprise gap** | Log a surprise (cost, how it was paid). Show the gap (stock and flow formulas in `DECISIONS.md`). Second surprise in a category within 12 months → offer a once-in-a-while card. | ⬜ |
| 1.8 | **Borrow from a goal** | "Use money from Car fund" → pay it back (default) / push the date / shrink the goal, each with a preview. Buffer covering a surprise is shown as a win. | ⬜ |
| 1.9 | **Over-allocation resolver** | "Your plan is $85 more than your paycheck" → take from Spending money (above a floor) / shrink flexible cards proportionally / pick donors / start smaller. Bills and the starter buffer are never touched. | ⬜ |
| 1.10 | **Short-paycheck fill order** | Bills → starter buffer → once-in-a-while due soonest → goals → Spending money. | ⬜ |
| 1.11 | **Transfer list** | Every plan ends with "Move $180 to savings: Car fund $80, Buffer $100", plus a one-time guide to automatic transfers / split deposit. | ⬜ |
| 1.12 | **Credit card question** | "Do you pay your card in full every month?" → yes: Spending money; no: debt metric + Bills card. | ⬜ |
| 1.13 | **Narrative → payday recap** | What changed since last payday, by exactly how much, one move. Fixes the logged narrative-quality issues (vague adjectives, unspecific numbers). | ⬜ |
| 1.14 | **Payday reminders that work** | Email on payday (Resend/Postmark + a scheduled Supabase function) `[was #21]`; mobile push on payday (adapt the weekly reminder). | ⬜ |
| 1.15 | **Snapshots sync on web** | Mobile syncs snapshots to Supabase; the web does not yet. Progress must follow the user. | ⬜ |
| 1.16 | **Check-in streak** `[was #20]` | Consecutive paydays checked in. Small, motivating, uses existing snapshots. | ⬜ |
| 1.17 | **Mobile parity for 1.1–1.12** | Same features on mobile, then freeze mobile-only work. | ⬜ |
| 1.18 | **TestFlight beta for friends** | Needs the Apple Developer account ($99/yr), EAS env vars, and Apple sign-in enabled in Supabase. | ⬜ |
| 1.19 | **Housing weight down** | Show housing as context; reduce its weight in the score. Decide the new weights in a short note first. | ⬜ |

---

## Phase 2 — Depth and Paying for Infra (months 4–9)

**Goal:** keep people longer and cover running costs.
**Gate:** ≥ 2% of monthly actives support it, or ≥ 50 supporters. **Under $100/month at month 12 → declare it an open-source/portfolio project, maintenance only.**

| ID | Item | What + why | Status |
|----|------|-----------|--------|
| 2.1 | **"Where your money lives"** | Manual list of accounts (checking, savings, 401(k), IRA, brokerage, HSA, debts), balances updated at the monthly check-in; goals can name their account; net worth charted from snapshots. | ⬜ |
| 2.2 | **History-based suggestions** | After three paychecks, suggest amounts from the user's own history instead of benchmarks. | ⬜ |
| 2.3 | **Step up at a raise** | When take-home goes up, offer to move part of the raise into goals (Save More Tomorrow). | ⬜ |
| 2.4 | **Supporter tier (pay-what-you-want)** | Suggested $3–5/month, framed as "keep Vitals running". Clear terms, consent, one-click cancel. | ⬜ |
| 2.5 | **Public costs page** | What hosting + AI cost this month and how much supporters cover. | ⬜ |
| 2.6 | **One-click self-hosting** | Railway template (Railway shares template usage with the author) + Docker Compose + a self-hosting guide. | ⬜ |
| 2.7 | **AI fair-use cap** on the free hosted tier; self-hosters bring their own key. | ⬜ |
| 2.8 | **Calculator pages** (also in Growth Track) | "How much can I spend until payday", "sinking fund calculator", "emergency fund calculator" — each a small standalone page that leads into the check-up. | ⬜ |

---

## Phase 3 — Optional Reach (after month 9, only if the gates pass)

| ID | Item | Status |
|----|------|--------|
| 3.1 | **SimpleFIN** balances (the user pays $15/yr; no developer fee). | ⬜ |
| 3.2 | **SnapTrade** brokerage holdings — only if many users ask. | ⬜ |
| 3.3 | **Credit union / employer conversations** — needs engagement and outcome numbers first. | ⬜ |
| 3.4 | **Fundraising conversations** — only if the habit and money gates pass and there is a reason to grow faster than organically. | ⬜ |

---

## Growth Track (ongoing, alongside every phase)

Organic only, no paid ads. Small, repeatable actions beat one big launch.

| ID | Channel | Concrete actions | Phase |
|----|---------|------------------|-------|
| G1 | **Open-source launch** | Polished README (problem, screenshots, self-host steps); good first issues; Show HN; submit to awesome-selfhosted and alternativeTo (as a Mint/YNAB alternative). | 0 |
| G2 | **Build in public** | One short post a week on X/LinkedIn/Bluesky: what shipped, a real number from the gates, a lesson. Monthly public update post. | 0 → ongoing |
| G3 | **Communities (help first)** | Answer questions in r/personalfinance, r/povertyfinance, r/budget, r/ynab (the irregular-expense and "gave up budgeting" threads) without linking unless allowed. Follow each sub's self-promotion rules. | 0 → ongoing |
| G4 | **Long-tail search pages** | Calculator pages (2.8) + one short guide per common question ("What is a sinking fund?", "How big should my emergency fund be?"). Head terms belong to affiliate sites; skip them. | 1 → ongoing |
| G5 | **Shareable results** | Check-up card (0.9) and score card; "loud budgeting" is a Gen Z habit. | 0 |
| G6 | **Short video** | 30-second screen recordings: "I put my paycheck in and it told me what's safe to spend" for TikTok/Reels/Shorts. | 1 |
| G7 | **Indie communities** | Indie Hackers milestone posts, Product Hunt launch once the payday plan exists. | 1 |
| G8 | **Creators and newsletters** | Reach out to small personal-finance creators and newsletters (not big ones) with a free, no-signup tool their audience can use. | 1 → 2 |
| G9 | **Campus and first-job** | College career centers and first-job communities: "your first paycheck plan". | 2 |
| G10 | **Email list** | Everyone who opts in for reminders; a short monthly note with one useful idea. | 0 → ongoing |

---

## Housekeeping

| ID | Item | Status |
|----|------|--------|
| H1 | Update the model string `claude-opus-4-6` in `api/core/chat.py` to a current model. | ⬜ |
| H2 | Remove unused `section*_visible` fields from the web form state. | ⬜ |
| H3 | Delete Expo template leftovers in `mobile/` (`LICENSE`, `README.md`, `scripts/`, `use-color-scheme.web.ts` if unused). | ⬜ |
| H4 | `npm audit` review for web and mobile (no `--force`). | ⬜ |
| H5 | Unit tests for the shared budget and score math (`packages/shared`), then a few screen tests. | ⬜ |
| H6 | README: describe the payday plan, self-hosting, and the supporter model (no Free/Pro framing). | ⬜ |

---

## Parked (revisit only with evidence)

| Item | Why parked |
|------|-----------|
| One-device limit (`active_sessions` enforcement) | Nothing is gated until the habit gate passes. |
| Guest / Free / Pro tiers | Replaced by free core + supporter tier (see `DECISIONS.md`). |
| Charts in Chat `[was #24]` | Nice, not core to the payday job. |
| Budget AI drawer + allocation simulator `[was #29, #30]` | The resolver and check-in cover the planning need. |
| Form Assistant Chat `[was #10]` | Onboarding checklists solve the same friction more simply. |
| Plaid bank connection `[was #16]` | Per-connection cost, frozen open-banking rule, liability. SimpleFIN/SnapTrade first, only if asked. |
| Gig / irregular income features | Real need, but only with first-hand knowledge of that world. |

## Dropped

| Item | Reason |
|------|--------|
| AI Personas `[was #9]` | Harsh framing ("tough love") works against people who already avoid looking at their money. |
| Insurance Plan Finder `[was #17]` | Affiliate and regulatory distraction from the core job. |
| User-configurable Metric Weights `[was #14]` | Adds complexity for beginners; the defaults are being fixed instead (1.19). |
| Google Drive Connector `[was #13]` | Accounts + sync replaced the need. |
| Couples / shared budgets | Monarch owns this; out of scope. |
| Goal Tracker as a separate feature `[was #6]` | Covered by Goal cards. |
| "Travel = X% of income" style suggestions | No real source; trips are planned from their cost. |
| Module 5: One Next Step | Redundant — the narrative already gives one next step. |
| Guided Estimation Flow | Solved by the form framing and benchmark captions. |
| Decision Helper Q&A Chat | Replaced by the scoped Vitals Chat. |

---

## Done (summary)

**Web app (Next.js + FastAPI, Railway)**
- Landing page (hero, how it works, trust bar, founder card), Terms and Privacy pages
- Progressive form, expense benchmark hints, metric citations, trust signals
- Health score (4 metrics, partial scoring), mirror label, AI narrative (streamed), contextual education
- What-if simulator; Vitals Chat (classifier, category prompts, summarisation, tool-call math, cognitive offload, emotional awareness)
- Snapshots (`.vit`, Fernet), progress charts, score delta, PDF export, multi-statement PDF import with review
- Returning-user home screen `[#25]`, quick decision flow `[#26]`, hosted API key `[#11]`
- Budget planner: income / Float / custom cards (fixed, percent), Split, distribution log, card purpose classification, live score with 1.5s debounce, narrative popup, inspectable metric pills, manual rent/expense fallbacks
- Accounts and persistence on Supabase `[#31]`: profiles, budget cards, goals, distribution log, financial profile; guests in memory only
- Session/event analytics with dev/prod tagging; feedback page

**Monorepo and mobile**
- `packages/shared` (types, API calls, budget logic) used by web and mobile
- Expo app `[#32]`: auth (email, Google, Apple), profile setup, Budget / Score / Progress / Me tabs, card sheets, score form, chat, PDF import, weekly reminder, snapshot sync, themes and dark mode
- Railway deploys from `main`; web builds from the repo root with npm workspaces

---

## How to use this file
- Work top to bottom: **Now**, then the current phase. Don't start a later phase before its gate.
- One item = one branch = one PR.
- When an item is done, mark it ✅ in the same PR.
- Gate reviews (0.14 and the Phase 1/2 gates) get a short written note in `DECISIONS.md`.
