# Vitals — Product Thinking & Design Decisions

This document captures how I think about Vitals: the product, the architecture, and the choices made along the way. Written for anyone who wants to understand the reasoning, not just the code.

Decisions marked **(Oct 2026)** came out of a product research round: competitor mechanics (YNAB, Monarch, Copilot, PocketGuard, Simplifi, Goodbudget, Actual Budget), behavioral finance studies, and the post-Mint market. Where a decision rests on weak evidence, it says so.

---

## Table of Contents

- [Where Vitals Is Headed](#where-vitals-is-headed)
- [The Problem](#the-problem)
- [Who It Is For](#who-it-is-for)
- [The Payday Plan](#the-payday-plan)
- [Planned Costs vs Surprises](#planned-costs-vs-surprises)
- [Card Rules](#card-rules)
- [The Score](#the-score)
- [Language Over Charts](#language-over-charts)
- [The AI's Job](#the-ais-job)
- [Vitals Chat](#vitals-chat)
- [All Your Money in One Place](#all-your-money-in-one-place)
- [Your Data](#your-data)
- [Accounts & Persistence](#accounts--persistence)
- [Open Source and Paying for It](#open-source-and-paying-for-it)
- [Growth](#growth)
- [Analytics and the Gates](#analytics-and-the-gates)
- [Progressive Form](#progressive-form)
- [PDF Bank Statement Import](#pdf-bank-statement-import)
- [PDF Export](#pdf-export)
- [Budget Planner History](#budget-planner-history)
- [Mobile App](#mobile-app)
- [What Vitals Isn't](#what-vitals-isnt)

---

## Where Vitals Is Headed

**(Oct 2026)** Vitals is not trying to be another general budgeting app. That market is taken: Mint's users already moved to well-funded, bank-synced apps priced around $100 a year (Monarch, YNAB, Copilot), and well-funded attempts have failed (Tally raised $172M and shut down in 2024; Maybe failed twice). Most finance apps keep only about 3–5% of users after 30 days.

What Vitals can be is narrower and more useful: **a payday plan**. Once per paycheck it splits take-home pay into bills, once-in-a-while costs, a surprise cushion and goals, then answers one question: **how much is safe to spend until the next payday?** The 0–100 score stays, as a monthly check-up rather than the headline.

Most of what is already built carries over: the score engine, percent/fixed cards, the Float card, PDF import, snapshots, reminders, the tool-calling chat. The change is positioning, clearer card types, and three new mechanics: the surprise gap, borrowing from a goal, and an over-allocation resolver.

The plan is gated by numbers, not by feel (see [Analytics and the Gates](#analytics-and-the-gates)). If people do not come back each payday, Vitals stays an open-source project and a portfolio, and that is a fine outcome.

---

## The Problem

The old statement was: "Most personal finance tools are built for people who already understand money." That is true, and it still shapes the design. But it describes a kind of person, not a moment or a job to be done. A diagnostic answers "am I OK?" once, and nothing brings the person back. That is why the product felt vague.

**(Oct 2026)** The problem Vitals solves:

> **When your paycheck lands, you can't tell how much of it is really free to spend. Rent and bills are obvious, but car repairs, annual renewals and real surprises aren't, so they end up on a credit card.**

Why this framing:

- **It names a recurring moment.** Payday gives the app a natural rhythm, instead of fighting the category's poor 30-day retention.
- **It names a concrete failure** (the surprise that lands on a card), which is measurable.
- **It matches the evidence.** Household spending swings about 29% month to month, and about 40% of families face a $1,500+ unexpected payment in a year (JPMorgan Chase Institute). Only 63% of adults could cover a $400 expense with cash (Federal Reserve SHED).

The literacy point does not go away; it becomes a design rule instead of a slogan. Nobody searches for "an app for people with low financial literacy". They search for "how much can I spend until payday".

> **The AI is not the product. The product is financial clarity, one payday at a time. The AI is what makes the numbers readable.**

---

## Who It Is For

**(Oct 2026)**

- **Primary:** people roughly 22–35 who rent, get a regular paycheck (biweekly or monthly), have little cushion, and either never budgeted or gave up. 55% of Gen Z lack three months of emergency savings (Bank of America, 2025).
- **Secondary:** people tired of spreadsheets who want to "divvy up real dollars" quickly on payday.

**Not for, on purpose:**

| Group | Why not | Who already serves them |
|---|---|---|
| Couples / shared finances | Crowded, and a big feature set | Monarch |
| Zero-based power users | They want every dollar assigned daily | YNAB, Actual Budget |
| Investors tracking portfolios | Needs holdings data and market prices | Empower, Sharesight |
| Gig / irregular income | Real need, but needs income smoothing; revisit only with first-hand knowledge | — |

---

## The Payday Plan

**(Oct 2026)** The core loop:

1. **On payday**, the plan carries forward from last time. The user confirms or tweaks it (about a minute).
2. Money splits into four kinds of cards (see [Card Rules](#card-rules)).
3. What is left is **Spending money**: the current Float card, renamed. Divided by the weeks until next payday, it becomes the headline number: **safe to spend**.
4. The plan ends with a short list of **real transfers** to make ("Move $180 to savings: Car fund $80, Buffer $100"), plus a one-time guide to setting up an automatic transfer or split deposit at the user's bank.

Why these choices:

- **One number on the home screen.** Beginners ask "how much can I spend right now without risking bills?" Simple's Safe-to-Spend was widely missed after it shut down.
- **Pay schedule, not calendar month.** Monzo users complained when "left to spend" reset on the 1st instead of payday.
- **No transaction logging.** Data-entry effort is the top reason people quit tracking money (57% of quitters in a CHI 2016 study). Vitals asks for one minute per payday, not daily upkeep.
- **Real transfers, not just virtual cards.** In a 9,035-person randomized trial (Irrational Labs), setting budget limits did not change spending. What does help is physically separating money into labeled pots (Soman & Cheema) and splitting deposits automatically. The cards are a plan; the transfers make it real.
- **Safe to spend never counts money parked in pots**, and shows a plain negative number when commitments exceed income. Mid-cycle, the user can type in their checking balance to get a live figure.
- **Short paycheck order.** If a paycheck is smaller than planned, cards fill in a fixed order: bills, starter buffer, once-in-a-while costs due soonest, goals, then Spending money.

---

## Planned Costs vs Surprises

**(Oct 2026)** There are three kinds of outflow and they need different treatment:

1. **Monthly bills** (rent, phone, debt minimums): obvious and fixed.
2. **Once-in-a-while costs** (car registration, insurance premiums, holidays, annual renewals): known, just not monthly. YNAB calls these "true expenses"; others call them sinking funds. They become a per-paycheck set-aside.
3. **Real surprises** (car repair, medical bill): unknown in timing and size. They are paid from a **surprise buffer**, which is created automatically.

### The surprise gap

None of the apps reviewed measures how wrong the plan was. Only Simplifi even separates planned from unplanned spending. That is the opening:

```
Set-aside per paycheck (each once-in-a-while cost)
  = (target amount − already set aside) ÷ paychecks left before the due date

Surprise buffer target
  start: the larger of $1,000 or one month of essential costs
  then:  grow toward 3 months of essential costs

Surprise gap, stock  (monthly check-up)
  = buffer target − current buffer balance

Surprise run-rate
  until 3+ months of logged surprises: 5% of take-home pay per month
  after that: logged surprises over the last 12 months ÷ 12

Surprise gap, flow  (payday plan)
  = surprise run-rate − monthly buffer contribution
```

The defaults are rules of thumb, not validated outcomes: the $1,000 starter is Ramsey's, the 3–6 months and "5% of take-home for unplanned expenses" are Fidelity's.

### Logging surprises, not purchases

At each payday check-in Vitals asks one question: **"Anything unexpected since last payday?"** Users log only surprises, a few a year, with what it cost and how it was paid (buffer, Spending money, a goal, or a credit card). **"Share of surprises paid from the buffer instead of a card"** is the product's outcome metric.

When a second surprise in the same category appears within 12 months, Vitals offers to turn it into a once-in-a-while card ("Car upkeep, $60 a paycheck"). Many surprises are predictable; this is how the plan learns.

---

## Card Rules

### Four card types, chosen by one question

**(Oct 2026)** Expense cards stay, but only for things that need money set aside. Category limits for everyday spending did not change behavior in the largest trial, and Monarch made a single flexible spending pool its default for the same reason.

| Card type | Examples | How the amount is set | Over time |
|---|---|---|---|
| **Bills** | Rent, phone, car payment, debt minimums, subscriptions | Fixed dollars | Resets each paycheck; never auto-shrunk |
| **Once-in-a-while** | Registration, insurance, holidays, annual renewals | Yearly amount or target + due date, converted per paycheck | Builds up; drains when the bill hits |
| **Goals** (including the surprise buffer) | Buffer, car fund, trip, deposit | Percent or fixed, optional target and date | Builds up; borrow-and-repay flow |
| **Spending money** (today's Float) | Groceries, dining, fun, everything else | Whatever is left | Resets each paycheck; drives safe to spend |

Users do not start from a blank "Add card" button. Onboarding asks, in order: take-home pay and pay schedule → "Which of these do you pay every month?" (a checklist, pre-filled from PDF import where possible) → "Which of these hit you once in a while?" → the buffer is created automatically → "Anything you're saving for?" → what is left is shown as Spending money per week.

Later, "Add card" asks a single question: **"Is this a bill, a once-in-a-while cost, or something you're saving for?"** The keyword classifier (`classifyCard`) can pre-select an answer, but no longer decides on its own. It misread "buy a car" as an expense before.

### Using money from a goal is a loan, not a silent withdrawal

**(Oct 2026)** Every app reviewed lets you move money out of a goal; none treats it as something to pay back. Vitals offers "Use money from Car fund": the amount, what it was for (if unexpected, it logs a surprise), and three choices, each with a preview:

- **Pay it back** (default): spread over the paychecks left before the target date, showing how much it takes from Spending money.
- **Push the date**: same contribution, later finish.
- **Shrink or rename the goal**: the money is not coming back.

The goal's history keeps the dip and the refill visible. The copy says plainly that this is what savings are for. When the buffer covers a surprise, it is shown as a win ("Your buffer covered a $640 car repair") and the refill starts automatically. If goals keep getting raided, the surprise gap is telling the user the buffer is too small.

### When 100% is already allocated

**(Oct 2026)** Three rules:

1. **Percentages are always of take-home pay**, never of "what is left". That is predictable when cards are added or reordered.
2. **Over-allocation is a plain state**, not an error: "Your plan is $85 more than your paycheck."
3. **Nothing is ever cut silently.** A resolver offers four fixes, each previewing the new safe-to-spend and score:
   - **Take it from Spending money** (default), as long as it stays above a weekly floor the user sets.
   - **Shrink flexible cards proportionally**: wants first, long-term goals after. Bills and the starter buffer are never touched.
   - **Pick the donor cards** manually.
   - **Start the new card smaller** and step it up at the next raise (the Save More Tomorrow idea).

### Suggested amounts show their source

**(Oct 2026)** No incumbent suggests allocations from benchmarks; they use the user's own history. Benchmarks can help at the start, but they anchor behavior (people stick with defaults), so they must be honest:

| Source | Use in Vitals |
|---|---|
| BLS Consumer Expenditure Survey (housing 33.4%, transport 17%, food 12.9% of *spending*) | "Typical households spend…" context only. It is what people do, not what they should do. |
| 50/30/20 (Warren & Tyagi, 2005) | Starting template, adjusted to the user's real rent (60/20/20 when rent is high) |
| Fidelity 50/15/5 | Default buffer contribution (5% of take-home) |
| Ramsey ($1,000 starter fund) | Starter buffer target |
| "Travel 5–10%" | **Not used.** Popular-press folklore with no real source. Trips are planned from their cost: "$1,800 in 9 months = $100 a paycheck." |
| The user's own history | Default after three paychecks |

Every suggestion shows its source and what it is a percentage of. **Code computes every number; the AI only explains them.**

### Credit cards: one question

Credit cards were the most-cited stumbling block for YNAB beginners. Vitals asks: **"Do you pay your card in full every month?"** If yes, card purchases are just Spending money. If no, the balance is debt that feeds the debt metric, and the payment becomes a Bills card.

### Card data always wins over a manual answer

Housing Ratio and Emergency Fund originally required a specifically-labeled budget card to exist before either metric would compute. That was too rigid: a user with no interest in building out a full envelope budget had no way to just answer "what's your rent" directly.

The fix adds direct manual fields for both — Monthly rent/mortgage, Monthly expenses — but a matching card, the moment one exists, always wins over the manual value. The user is never maintaining two numbers that are supposed to agree.

The same trip revealed a sharper problem: `0` cannot be allowed to mean two different things. A field that starts unanswered and displays as "$0" is indistinguishable from a real zero. These fallback fields start in a visibly distinct "Not set" state, and only an explicit Enter or Save commits a value. `undefined` and `0` are different facts and the UI has to say so.

### Every metric must be inspectable

A metric that is silently wrong while displaying "Good" is more dangerous than one honestly marked unanswered. Every pill is clickable, complete or not. A complete one shows the real computed value, its point contribution, and its source ("Based on: your 'Rent' card" vs "your profile's monthly rent"). This matters even more now: a score only changes behavior if people can see the parts.

---

## The Score

The health score (0–100) is built on four metrics. Each scores 0–25; a partial score covers only the answered metrics and is scaled to 0–100.

| Metric | Plain label (Oct 2026) | Green | Yellow | Red | Source |
|--------|------|-------|--------|-----|--------|
| **Savings rate** | How much of your pay you keep | ≥ 20% | 10–20% | < 10% | 50/30/20 rule |
| **Debt-to-income** | How much of your pay goes to debt | ≤ 20% | 20–43% | > 43% | Common lender guideline |
| **Emergency fund** | Could you handle a surprise? | ≥ 3 months | 1–3 months | < 1 month | Fidelity / Vanguard |
| **Housing ratio** | How much of your pay goes to rent | ≤ 30% | 30–50% | > 50% | HUD affordability standard |

### Why keep a score at all

**(Oct 2026)** The score's job is **calibration**: showing people where they actually stand. That is the mechanism with real evidence. Telling 400,000+ student-loan borrowers that their FICO score was available cut late payments by about 4%, by correcting how they saw themselves, not by teaching them anything. The score moves from headline to **monthly check-up**, framed around the CFPB's four parts of financial well-being: day-to-day control, absorbing a shock, being on track, and freedom of choice.

### Corrections (Oct 2026)

- **The 43% DTI line is no longer cited as "the CFPB qualified-mortgage threshold".** The CFPB's 2020 General QM rule replaced that cap with a price-based test. The 43% line stays, cited as a common lender guideline.
- **The score is Vitals' own four-metric method.** It is not the Financial Health Network's FinHealth Score (8 indicators, licensed through Attune for commercial software) and must not imply any link to it.
- **Housing gets less emphasis.** Half of renter households are cost-burdened, and many can't change their rent this year. A red housing grade invites avoidance (people check their finances less when the news is bad). It is shown as context, and its weight will be reduced. This is a reasoned call, not a tested result.

### The DTI deviation

Vitals uses **take-home income** for DTI, not gross. Lenders use gross. We use take-home because rent and debt payments come out of what actually hits your bank account.

This makes Vitals' DTI stricter than a lender's calculation. That is intentional: the tool's job is an honest picture, not telling users what they want to hear. The choice is disclosed in the app.

---

## Language Over Charts

A 38% DTI means something different for a 24-year-old student than for a 40-year-old with a mortgage. Charts cannot carry that nuance. A narrative can.

**(Oct 2026)** The narrative becomes a **payday recap**: what changed since last payday, by exactly how much, and one move to make. Two rules stay enforced at the prompt level:

- **No vague adjectives** — decent, solid, fairly, significant are banned
- **Numbers must carry meaning** — never state a percentage without explaining what it means in real life

Finance words are translated everywhere in the UI:

| Finance term | What Vitals says |
|---|---|
| Savings rate | How much of your pay you keep |
| Debt-to-income | How much of your pay goes to debt |
| Emergency fund months | How long you could last without a paycheck |
| Sinking fund / true expenses | Once-in-a-while costs |
| Float / unallocated | Spending money (safe to spend) |
| Net worth | What you have minus what you owe |
| Zero-based budgeting | Never shown |

**Shortfalls are framed as moves, not alarms.** Nudges can backfire: payment reminders on one platform cut late fees by 14% but raised overdraft fees by 9%. 41% of Gen Z say they avoid looking at their balance. Vitals says what to move, never "you failed".

> The goal: someone who has never thought seriously about their finances reads the output and feels like they understand their situation — without learning a single financial term.

---

## The AI's Job

**(Oct 2026)** The AI explains numbers; it never invents them.

- **Code computes every number** (scores, set-asides, suggestions, what-ifs). The model writes the sentence that explains them. The chat keeps using tool calls for real math.
- **Never marketed as an "AI financial advisor".** Impersonal, general information is outside the Advisers Act (Lowe v. SEC); personalized securities advice is not. The SEC has fined firms for "AI washing", including one that called itself the "first regulated AI financial advisor". Vitals' chat declines to recommend specific funds or securities.
- **The model gets aggregated numbers**, not raw transactions or account details.
- **Trust is low and earned slowly.** Only 27% of US adults trust AI financial guidance, against 79% for human advisers (Gallup). Tested tax chatbots were wrong or unhelpful on 25–50% of questions. Bounded, checkable features (explain this change, recap this payday) are what users actually use.
- **Personas are shelved.** Cleo's "roast mode" is popular, but harsh framing works against people who already avoid looking at their money.
- **Cost is small.** Grounded AI on small models costs roughly $0.01–$0.15 per user per month at list prices (an estimate). Time and distribution are the real constraints, not AI cost.

---

## Vitals Chat

### The friend model, not the compliance model

The chat is designed to feel like a **financially savvy friend** — warm, direct, honest, and specific. Not a textbook and not a compliance officer.

The guardrails exist to keep the chat *useful*, not to make it restrictive. The line is **specificity, not topic**:

- ✅ Categories and strategies — always fine
- ✅ Banks, HYSA providers, insurance companies, comparison sites — named freely as educational context
- ❌ Specific investment execution — no stock picks, no fund recommendations as execution calls, no specific trading platforms

> The test: are you helping them understand their options, or making an execution call for them? The first is the job. The second is not.

### Guardrail layers

1. **Keyword pre-filter** — blocks obvious out-of-scope requests (legal action, tax filing) before any API call is made
2. **System prompt decision framework** — teaches the model how to think about any question type: casual, core finance, finance-adjacent, borderline, off-topic, writing tasks, career advice, or requests for specific companies

A flat refusal is never the right response. Redirect warmly, or explain why Vitals isn't the right tool and point to what would actually help.

### Emotional signals

People often come to Vitals with real weight behind a question — feeling overwhelmed, stuck, or hopeless because of money. Emotional awareness is always active in the base prompt. When distress is detected: acknowledge briefly, pivot to the financial picture, use real numbers to show a path.

> The path IS the relief. Most of the distress comes from not being able to see one.

For severe signals, one gentle line about talking to someone is added. One line. Not the focus.

### Routed multi-prompt architecture

Each message is classified before answering by a fast, cheap LLM call (no base system prompt) that returns 1–2 categories:

`debt` · `savings` · `housing` · `insurance` · `score` · `scenario` · `cognitive_offload` · `app` · `emotional` · `general`

Stripping the base prompt from the classifier saves ~800 tokens per call. A targeted category prompt is injected on top of the base prompt. A generic prompt hedges across all question types; a targeted debt prompt says "focus on this user's DTI at 52%".

### Cognitive offload

`cognitive_offload` fires when the user explicitly delegates — *"you decide"*, *"just tell me what to change"*. A small pre-call picks the single highest-impact lever from the user's snapshot first; the main response then presents it decisively with real numbers.

### Tool calls — real math, not estimation

For `scenario` and `cognitive_offload` questions, the LLM calls `calculate_score()` with modified inputs and gets **real calculated math** back. No LangChain, no LangGraph — native tool calling via each provider's SDK, with `health.py` as the tool layer.

### Conversation summarisation

| Tier | What | Behaviour |
|------|------|-----------|
| **Verbatim recent** | Last 6 turns | Always included in full |
| **Rolling summary** | Older turns | Summarised after every 8 new turns |
| **Financial snapshot** | User's numbers | Always injected in full, never summarised or dropped |

---

## All Your Money in One Place

**(Oct 2026)** People say they want this: 91% in vendor surveys say a single view would be valuable, but only 44% have actually linked their accounts. When Mint moved to Credit Karma, users kept net-worth tracking and left anyway, because budgets were gone. People pay for the bundle, not for the net-worth view; Empower gives it away free.

Real account linking is costly and risky for a solo developer:

- **Plaid** bills per linked connection per month, investments separately, even when a connection is broken. Its free Trial caps at 10 connections.
- **The open-banking rule (CFPB §1033) is frozen** by a court order (Oct 2025) and being rewritten; banks like JPMorgan now charge aggregators for data access.
- **Liability:** storing access tokens means breach-reporting duties under the FTC Safeguards Rule.

So Vitals does a **manual "Where your money lives" screen**: checking, savings, 401(k), IRA, brokerage, HSA and debts, with balances typed in once a month at the check-in. Each goal can name the account that holds it ("Car fund lives in Ally savings"). Net worth charts from snapshots, and liquid balances feed the surprise metric. Optional SimpleFIN (the user pays $15/yr; no developer fee) or SnapTrade (brokerage holdings, about $2/user/month) come later, only if users ask. Plaid is not planned.

Vitals' angle is what each dollar is **for**, not only what it is worth.

---

## Your Data

### Why `.vit` and not plain JSON

Vitals saves snapshots as `.vit` files rather than plain JSON:

- **Branding** — `.vit` signals clearly that this is a Vitals file
- **Privacy** — a `.vit` file on a shared computer, in a cloud sync folder, or accidentally emailed exposes nothing. Fernet encryption (AES-128-CBC + HMAC-SHA256) prevents accidental exposure.

The key is baked into the app — no password friction. The threat model is **accidental exposure**, not a determined attacker.

**(Oct 2026)** Plain **CSV export** is added alongside `.vit`. Spreadsheet users have been burned by shutdowns and price hikes ("I got burned by MS Money going away, no proprietary formats again"). An open-source app should never trap data.

### One file, all months

One file holds all months. Same-month saves overwrite. The user manages one file, not twelve.

### The live "unsaved" point on progress charts

Progress charts include the current unsaved session as a live point — hollow marker, dotted line — so users see where a change puts them on the trend before saving.

---

## Accounts & Persistence

### Zero persistence for Guests

Guests get genuinely nothing saved — not even a localStorage cache. Removing the hybrid "sort of saved" state makes the value of an account unambiguous: sign in and it is really saved; do not, and it is really not.

### No paywall until the habit is proven

**(Oct 2026)** The earlier plan split Guest / Free / Pro, with Pro charging for multi-device sync. That is paused. Paywalls only convert people who already value the product, and freemium converts a median of about 2% anyway. **Nothing is gated until people come back payday after payday** (the habit gate below). The one-device limit (`active_sessions`) is deferred for the same reason. Money comes from people who want to support the project, see below.

### Why no device fingerprinting

If a device limit ever returns, it is enforced with a server-side `active_sessions` table, not a MAC address or a generated device ID. iOS has blocked real MAC access since iOS 7, and browsers expose no stable hardware identifier. A session the server issued and can revoke is the only reliable version of "which device is this".

---

## Open Source and Paying for It

**(Oct 2026)** Vitals stays open source (MIT). The hosted app at myfinancevitals.app asks users who value it to help pay for the infrastructure.

How the comparable projects did it:

- **Actual Budget** reached 810 paying subscribers as a commercial app, then its founder open-sourced it in 2022. The community took it over; third-party hosts now sell managed hosting.
- **Lunch Money** (solo founder) uses pay-what-you-want with a minimum, launched on Hacker News, and grew to about 1,000 paying users and $80k a year in roughly 20 months.
- **Ghostfolio** (open-source wealth tracker) sells a hosted Premium tier and says the revenue covers hosting.

The model for Vitals:

- **The core is free on the hosted app**: the payday plan, the score, the check-up. Self-hosting is always complete — no features held back in the code.
- **A supporter tier, pay-what-you-want** (suggested $3–5/month), launched only after the habit gate. It funds the servers and AI costs; it is framed as "keep Vitals running", not as unlocking features.
- **A public costs page**: what Vitals costs to run this month and how much supporters cover. Transparency is the pitch.
- **One-click self-hosting**: a Railway template (Railway shares a cut of template usage with the author) and a Docker setup, for people who would rather run their own.
- **AI usage has a fair-use cap** on the free hosted tier. Self-hosters bring their own key.
- **Clean billing**: clear terms, consent before charging, one-click cancel. Cleo paid the FTC $17M partly over subscription dark patterns.

---

## Growth

**(Oct 2026)**

- **Organic first, no fundraising now.** Venture money needs a venture-sized outcome, and the realistic outcomes here are a small sustainable product or a strong open-source project. Raising early would push toward a strategy the evidence does not support. Investors become relevant only if the gates show real retention (for example credit-union or employer distribution later).
- **Channels with evidence behind them:** an open-source launch on Hacker News/GitHub, building in public, then long-tail search pages ("how much can I spend until payday", "sinking fund calculator"). That is how Lunch Money grew. Head terms like "best budgeting app" belong to affiliate sites.
- **Shareable results.** 42% of Gen Z say they "loud budget", openly telling friends what they can and cannot afford. A shareable check-up card fits that.
- **The App Store is not the acquisition channel.** Mobile's job is payday reminders for people who already use Vitals.

---

## Analytics and the Gates

The question I kept coming back to was: *what do I actually need to know?*

Not everything. Two tables: `sessions` and `events`. Sessions holds one row per visitor; events holds one row per action, in sequence. Every analytics call is fire-and-forget: if Supabase is down, the user notices nothing. Two env vars separate dev and prod: `NEXT_PUBLIC_ANALYTICS_ENABLED` decides whether anything fires, `NEXT_PUBLIC_ENV` tags each row. No PII, no financial numbers, no raw messages ever touch the analytics tables.

**(Oct 2026)** The north-star metric is **payday check-ins completed per month**. The plan is gated, and the thresholds are my judgment, set against the benchmarks above:

| Gate | When | Keep going if | Stop or change if |
|---|---|---|---|
| **Demand** | 6–8 weeks after first launch | ≥ 300 completed check-ups; ≥ 10% set a reminder; 5+ of 10–15 interviewees describe the payday/surprise problem unprompted | < 100 completions after two launches, or < 5% opt-in → change the problem or the audience |
| **Habit** | 3 months after the payday plan ships | ≥ 25% do a second payday check-in; ≥ 15% active at day 60 | < 10% second check-in → stop feature work |
| **Outcome** | 6 months | The share of surprises paid from the buffer rises | No movement → the product isn't changing behavior |
| **Money** | 9–12 months | ≥ 2% of monthly actives support it, or ≥ 50 supporters | < $100/month at month 12 → declare it an open-source/portfolio project and keep it in maintenance |

---

## Progressive Form

Dumping 15 fields on someone who has never used the app is a fast way to lose them. Start with what everyone knows — income and rough monthly spend — and only ask for more once the user has seen enough to want to go deeper:

- Fill in only the first two fields → still get a score and a narrative
- Add expense breakdowns → more precision
- Add debt and savings → full picture

You are never blocked from a result by missing fields. **(Oct 2026)** The same principle drives the payday check-up: a useful answer from take-home pay and rent alone.

---

## PDF Bank Statement Import

Most people don't have their numbers memorised. The PDF import removes that friction: upload a statement → Vitals reads it → the numbers fill in. You review every transaction and can reassign any category. The LLM's guess is a starting point, not a verdict.

**(Oct 2026)** Its main job becomes **finding recurring bills** to pre-fill the "which of these do you pay every month?" checklist, not filling a spending breakdown.

### Privacy constraint (non-negotiable)

Account numbers, names, addresses, and balances never leave your device. Only merchant names and amounts go to the AI for categorisation.

---

## PDF Export

The `.vit` file is encrypted and not human-readable. PDF solves a different problem: **communication** — showing your picture to a partner, an advisor, or printing it out.

- **Page 1** — score and metric breakdown
- **Page 2** — narrative

The export lives at the bottom of the results page: you should have seen your score and read your narrative before exporting anything.

---

## Budget Planner History

### Why we reversed the "not a budget planner" decision

The original rationale was that budgeting is commoditised. That turned out to be wrong in practice: the simulator answers "what if my numbers were different?", but does not help a user actually get to different numbers. The budget planner does, and every card feeds the score.

### The "moat" claim was wrong

An earlier version of this document called the live score updating as envelopes move "the moat". **(Oct 2026)** It is not. Any bank-synced app could add a score, and 0–100 financial health scores already exist (the Financial Health Network's FinHealth Score, the CFPB's Financial Well-Being Scale). Vitals' defensible assets are positioning (the payday plan and the surprise gap), trust (open source, no bank link), and simplicity — not the technology.

### Envelope budgeting, not a spreadsheet

The model is envelope budgeting (the principle behind YNAB): income arrives, you decide where it goes, and Spending money absorbs whatever is left. No "you must allocate 100%" pressure. "I want 20% to go to savings" is a more natural decision than "savings = $1,240 this month".

### Card purpose classification

A card labelled "buy a car" would be matched as transport (an expense) by naive string matching. The `purpose` field fixes that, auto-classified from the name and an optional description, with a one-tap override. **(Oct 2026)** It is being replaced as the main path by the one-question card type choice (see [Card Rules](#card-rules)); the classifier only pre-selects.

### Live score and narrative on the budget page

The score auto-recalculates (1.5-second debounce) on every card change, allocation edit, or profile update, and the narrative streams in the background so it is ready before the user looks for it. The three-question financial profile (total debt, monthly debt payments, total savings) is the minimal data the cards do not provide.

---

## Mobile App

**(Oct 2026)**

- **Expo (React Native) in the same repo**, sharing types, API calls and budget logic with the website through `packages/shared`.
- **Separate install trees.** The website (Next.js 14) needs React 18 and the mobile app needs React 19. Sharing one npm workspace mixed the two and broke the website's type check, so mobile has its own `node_modules` and lockfile and links the shared package with `file:../packages/shared`.
- **Feature parity, then a freeze.** Mobile's job is the payday push reminder and a quick check-in, for people who already use Vitals. Competing for App Store attention against Monarch, Copilot and Rocket Money with no budget is not a realistic way to find users; the web, search and communities are.
- **Guests on mobile** follow the same zero-persistence rule as the web.

---

## What Vitals Isn't

**Not a spending tracker.**
You log surprises, a few a year, not every coffee. Real-time tracking is a different product and a harder infrastructure problem.

**Not connected to your bank.**
No bank link keeps the user in control and the product simple, and it is a trust advantage, not just a missing feature. Optional linking may come later, only if users ask and only with providers where the user stays in control.

**Not a Mint replacement.**
Mint's users have already moved. Vitals does one job — the payday plan — and does it in one minute.

**Not an investment advisor.**
Vitals works at the fundamentals. Investment strategy needs more context (risk tolerance, time horizon, portfolio) and carries regulatory obligations. The chat explains options; it never makes execution calls.

**Not open source for altruistic reasons alone.**
Building in the open meant getting a working product in front of real people faster and learning from how they used it. If the product never takes off, the code and decisions here are a real portfolio of product thinking. Either way, the time is not wasted.

---

*Built by Pavan Hebli · Open source · MIT License*
