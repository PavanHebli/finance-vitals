# Vitals — Product Thinking & Design Decisions

This document captures how I think about Vitals: the product, the architecture, and the choices made along the way. Written for anyone who wants to understand the reasoning, not just the code.

---

## Table of Contents

- [The Problem](#the-problem)
- [The Score](#the-score)
- [Language Over Charts](#language-over-charts)
- [Your Data](#your-data)
- [Vitals Chat](#vitals-chat)
- [Analytics](#analytics)
- [Progressive Form](#progressive-form)
- [PDF Bank Statement Import](#pdf-bank-statement-import)
- [PDF Export](#pdf-export)
- [Budget Planner](#budget-planner)
- [What Vitals Isn't](#what-vitals-isnt)

---

## The Problem

Most personal finance tools are built for people who already understand money. They show dashboards, ratios, and percentage breakdowns. If you know what a debt-to-income ratio is, that is useful. If you do not, it is just a number.

Vitals exists for the second group. Not because they are less capable — but because financial education is genuinely poor, the jargon is alienating, the concepts are taught nowhere, and most tools assume fluency you never got.

> **The AI is not the product. The product is financial clarity. The AI is what makes that clarity accessible.**

---

## The Score

The health score (0–100) is built on four metrics, each benchmarked against published industry standards — the same thresholds banks, government agencies, and financial institutions use. Not arbitrary numbers.

| Metric | Benchmark | Green | Yellow | Red | Source |
|--------|-----------|-------|--------|-----|--------|
| **Savings rate** | 20% of take-home | ≥ 20% | 10–20% | < 10% | 50/30/20 rule |
| **Debt-to-income** | 43% max of take-home | ≤ 20% | 20–43% | > 43% | CFPB qualified mortgage threshold |
| **Emergency fund** | 3–6 months expenses | ≥ 3 months | 1–3 months | < 1 month | Fidelity / Vanguard |
| **Housing ratio** | 30% of take-home | ≤ 30% | 30–50% | > 50% | HUD affordability standard |

### The DTI deviation

One deliberate deviation: Vitals uses **take-home income** for DTI, not gross. The CFPB standard uses gross. We use take-home because your rent and debt payments come out of what actually hits your bank account, not what you earn before tax.

This makes Vitals' DTI stricter than a lender's calculation. That is intentional. The tool's job is an honest picture, not telling users what they want to hear. The choice is disclosed on the results page and in the simulator tooltip.

---

## Language Over Charts

A 38% DTI means something different for a 24-year-old student than for a 40-year-old with a mortgage. Charts cannot carry that nuance. A narrative can.

The AI narrative answers four questions in sequence:

1. What does the overall picture look like?
2. What is working?
3. What needs attention?
4. What is one concrete action to take this month?

Every answer is grounded in the user's specific numbers, not generic advice. Two rules enforced at the prompt level:

- **No vague adjectives** — decent, solid, fairly, significant are banned
- **Numbers must carry meaning** — never state a percentage without explaining what it means in real life

> The goal: someone who has never thought seriously about their finances reads the output and feels like they understand their situation — without learning a single financial term.

---

## Your Data

### Why `.vit` and not plain JSON

Vitals saves snapshots as `.vit` files rather than plain JSON. Two reasons:

- **Branding** — `.vit` signals clearly that this is a Vitals file, not a generic data export
- **Privacy** — plain JSON is readable by anyone who opens the file. A `.vit` file on a shared computer, in a cloud sync folder, or accidentally emailed exposes nothing. Fernet encryption (AES-128-CBC + HMAC-SHA256) prevents accidental exposure.

The key is baked into the app — no password friction, no "forgot my password" problem. The threat model is **accidental exposure**, not a determined attacker.

### One file, all months

One file holds all months. Same-month saves overwrite. Re-downloading replaces the old file in the downloads folder naturally. The user manages one file, not twelve.

### The live "unsaved" point on progress charts

Progress charts include the current unsaved session as a live point — hollow marker, dotted line. This is deliberate. If a user just updated their income or cut a budget item, they should immediately see where that puts them on the trend line without needing to save first. The hollow marker signals it is a preview, not a confirmed entry.

---

## Vitals Chat

### The friend model, not the compliance model

The chat is designed to feel like a **financially savvy friend** — warm, direct, honest, and specific. Not a textbook and not a compliance officer.

The guardrails exist to keep the chat *useful*, not to make it restrictive. A friend who knows finance will tell you about types of investments, explain how insurance works, and discuss income strategies. The line is **specificity, not topic**:

- ✅ Categories and strategies — always fine
- ✅ Banks, HYSA providers, insurance companies, comparison sites — named freely as educational context
- ❌ Specific investment execution — no stock picks, no fund recommendations as execution calls, no specific trading platforms

> The test: are you helping them understand their options, or making an execution call for them? The first is the job. The second is not.

### Guardrail layers

Two layers of protection:

1. **Keyword pre-filter** — blocks obvious out-of-scope requests (legal action, tax filing) before any API call is made
2. **System prompt decision framework** — teaches the model how to think about any question type: casual, core finance, finance-adjacent, borderline, off-topic, writing tasks, career advice, or requests for specific companies

A flat refusal is never the right response. Redirect warmly, or explain why Vitals isn't the right tool and point to what would actually help.

### Emotional signals

People often come to Vitals not just with a financial question but with real weight behind it — feeling overwhelmed, stuck, or hopeless because of money. A good friend notices this.

Emotional awareness is always active in the base prompt — not a separate mode, not something that only triggers for certain question types. When distress is detected: acknowledge briefly, pivot to the financial picture, use real numbers to show a path.

> The path IS the relief. Most of the distress comes from not being able to see one.

For severe signals, one gentle line about talking to someone is added. One line. Not the focus.

### Routed multi-prompt architecture

Each message is classified before answering. The classifier is a fast, cheap LLM call — no base system prompt, just a classify instruction — that returns 1–2 categories:

`debt` · `savings` · `housing` · `insurance` · `score` · `scenario` · `cognitive_offload` · `app` · `emotional` · `general`

Stripping the base prompt from the classifier saves ~800 tokens per call. A targeted category prompt is then injected on top of the always-present base prompt. If 2 categories are returned, both blocks are injected. If 3+ topics genuinely mix, it routes to `general`.

**Why not a single generic prompt?** A generic prompt hedges across all question types. A targeted debt prompt says "focus on this user's DTI at 52%" rather than dumping all eight metrics and hoping the model picks the right one.

### Cognitive offload

`cognitive_offload` fires when the user explicitly delegates — *"you decide"*, *"just tell me what to change"*, *"you pick"*. It is distinct from `scenario`, which has a topic the user is already exploring.

When triggered, a small pre-call picks the single highest-impact lever from the user's snapshot first; the main response then presents it decisively with real numbers. Pre-selecting the lever before streaming avoids the hedging that happens when the model derives a recommendation mid-response.

### Tool calls — real math, not estimation

For `scenario` and `cognitive_offload` questions, the LLM calls `calculate_score()` with modified inputs and gets **real calculated math** back rather than estimating. No LangChain, no LangGraph — native tool calling via each provider's SDK, with `health.py` as the tool layer.

### Conversation summarisation

Three tiers to keep token count bounded while preserving context:

| Tier | What | Behaviour |
|------|------|-----------|
| **Verbatim recent** | Last 6 turns | Always included in full |
| **Rolling summary** | Older turns | Summarised after every 8 new turns |
| **Financial snapshot** | User's numbers | Always injected in full, never summarised or dropped |

Summarisation threshold: `(6 + 8) × 2 = 28 messages`. The grounding that makes Vitals Chat different from a generic chatbot is always preserved.

---

## Analytics

The question I kept coming back to was: *what do I actually need to know?*

Not everything. Most analytics setups track everything by default and then nobody looks at it. What I wanted was funnel visibility — how many people who land on the page actually fill out the form, how many who fill out the form read the narrative, how many who read the narrative save a snapshot and come back. Those four numbers tell me whether the product is working.

That drove the structure. Two tables: `sessions` and `events`. Sessions holds one row per visitor, updated as they move through the app — device, score, which features they touched, whether they finished the narrative, how many chat turns they had. Events holds one row per action, in sequence — every page view, button click, feature interaction. Sessions answer "what kind of session was this overall?", events answer "what actually happened and in what order?"

Every analytics call is fire-and-forget. It never blocks, never awaits, never surfaces a failure to the user. If Supabase is down, the user notices nothing. Analytics cannot be a single point of failure for a product that is supposed to feel fast and reliable.

The dev/prod problem took a moment to think through. I didn't want test sessions polluting real data, but I also didn't want a separate Supabase project to maintain. Two env vars solved it: one controls whether anything fires at all (`NEXT_PUBLIC_ANALYTICS_ENABLED`), the other tags every row as `dev` or `prod` (`NEXT_PUBLIC_ENV`). They're separate because they do different things — the flag decides whether to fire, the tag decides how to label it. Flip the flag on locally to debug something, those rows land in Supabase tagged `dev` and you filter them out in any query.

No PII, no financial numbers, no raw messages ever touch the analytics tables. The goal is understanding behaviour, not collecting data.

---

## Progressive Form

Dumping 15 fields on someone who has never used the app is a fast way to lose them. The form is designed to feel like a conversation, not a spreadsheet.

Start with the two things everyone knows off the top of their head — income and rough monthly spend — and only ask for more detail once the user has seen enough to want to go deeper. Each section earns its right to appear.

This also means the tool produces something useful at every level of detail:

- Fill in only the first two fields → still get a score and a narrative
- Add expense breakdowns → more precision
- Add debt and savings → full picture

You are never blocked from a result by missing fields.

---

## PDF Bank Statement Import

The biggest friction point in the form is that most people don't have their numbers memorised. The form asking for groceries, dining, and transport as separate line items is exactly the kind of question that makes people close the tab.

The PDF import removes that friction. Upload last month's statement → Vitals reads it → the form fills itself. You still review every transaction and can reassign any category before the numbers go in. The LLM's guess is a starting point, not a verdict.

### Privacy constraint (non-negotiable)

Account numbers, names, addresses, and balances never leave your device. Only merchant names and amounts go to the AI for categorisation. This is the same principle as the rest of Vitals — the tool's job is analysis, not data collection.

Users who are cautious enough to read that caveat are exactly the users who would otherwise not upload anything. Stating it plainly is worth the space it takes.

---

## PDF Export

Several users tried to open their `.vit` file and found it confusing — it is encrypted, not human-readable, and that is a legitimate friction point. But PDF is not the answer to *that* problem. PDF solves a different problem: **communication**. Showing your picture to a partner, sharing it with an advisor, printing it out. The two serve different purposes and both belong.

### Layout decision: numbers first, story second

- **Page 1** — score and metric breakdown. Someone who glances at the first page should immediately see the score and what each metric means.
- **Page 2** — narrative. It is longer and requires a different kind of attention. Mixing them makes both harder to read.

### Placement on the results page

The export lives at the bottom of the results page, not the top. You should have seen your score, reviewed your metrics, and read your narrative before exporting anything. The placement is a quiet nudge toward actually engaging with the results first.

---

## Budget Planner

### Why we reversed the "not a budget planner" decision

The original rationale was that budgeting is commoditised — every spreadsheet app does it, and the What-If Simulator was supposed to cover the planning intent. That turned out to be wrong in practice.

The simulator answers "what if my numbers were different?" It does not help a user actually get to different numbers. The budget planner does. More importantly, the differentiator is not the budget itself — it is that the budget *is the score input*. Every card a user creates feeds directly into the health score calculation. Add a rent card → housing ratio updates. Add a savings goal card → savings rate updates. The budget becomes the interface for improving the score, not a separate feature.

This is only possible because Vitals already owns the scoring math. No other budgeting tool can show you a financial health score updating in real time as you move envelopes around — because they do not have the benchmarks, the weighting, or the narrative model. That is the moat.

### Envelope budgeting, not a spreadsheet

The model is envelope budgeting (the same principle behind YNAB): income arrives, you decide where it goes, and Cash in Hand absorbs whatever is left. No "you must allocate 100%" pressure. Cards support fixed dollar amounts or percentage of income — the remainder just flows to cash.

This maps better to how people actually think about money than a row-by-row spreadsheet. "I want 20% to go to savings" is a more natural decision than "savings = $1,240 this month."

### Card purpose classification

A card labelled "buy a car" would be pattern-matched as transport (an expense) by naive string matching. That is wrong — it is a savings goal, and treating it as a recurring expense overstates the user's debt burden and understates their savings rate.

The fix is a `purpose` field on each card, auto-classified from the card name and an optional short description the user can provide. A keyword scoring system runs against two signal lists — saving signals (fund, goal, buy, new home, wedding, retire…) and expense signals (rent, groceries, utilities, subscriptions…) — and picks the winner by count. Users can override with a single tap. The purpose determines whether the card's monthly allocation feeds into `savings_total` or `expenses_other` in the score calculation.

### Live score on the budget page

The score previously lived only on the results page. Moving it to the budget page — in the same row as Income and Cash in Hand, with the same animated ring — means users see the consequence of their budget decisions immediately. The score auto-recalculates (1.5-second debounce) on every card change, allocation edit, or financial profile update.

The three-question financial profile (total debt, monthly debt payments, total savings) is the minimal data the score needs that the budget cards do not provide. It is asked once, inline, and users can edit any value at any time with the score updating automatically.

### AI narrative on the budget page

The narrative previously required navigating to the results page. That is the wrong home for it — the budget page is where users are making decisions, and the narrative should be available in that context without a page switch.

The pattern: an info icon on the Health Score card glows (ring highlight) when the narrative is ready. Clicking it opens a centered popup with a card-flip animation. The narrative starts streaming automatically in the background after every score calculation, so it is ready before the user thinks to look for it.

---

## What Vitals Isn't

**Not a spending tracker.**
Vitals is a diagnostic. You come to it when you want to understand your situation — monthly, or when something changes. Real-time tracking is a different product (Mint, YNAB) and a harder infrastructure problem. The value is in the analysis and the story, not the data collection.

**Not connected to your bank.**
Bank connections require OAuth, compliance work, and significant infrastructure. More importantly, they change the relationship — suddenly the app holds sensitive access to accounts. The current approach keeps the user in control and the product simple. No bank connection is also a feature: zero setup friction is what makes the 5-minute checkup model possible.

**Not an investment advisor.**
Vitals operates at financial health fundamentals. Investment strategy requires more context (risk tolerance, time horizon, portfolio) and carries regulatory considerations. Getting the fundamentals right comes first.

**Not open source for altruistic reasons alone.**
Building in the open meant getting a working product in front of real people faster, learning from how they used it, and building in the direction that actually mattered. If the product never takes off, the code and decisions here are a real portfolio of product thinking. Either way, the time is not wasted.

---

*Built by Pavan Hebli · Open source · MIT License*