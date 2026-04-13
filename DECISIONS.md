# FinFriend — Product Thinking & Design Decisions

This document explains the reasoning behind FinFriend: why it exists, what it deliberately does and does not do, and the decisions made along the way. It is written for anyone who wants to understand the product thinking, not just the code.

---

## Why FinFriend exists

I built FinFriend because I personally felt weak at finances.

Before making any financial decisions I realised I had no visibility — money came in, money went out, and I had no clear picture of where it went or whether I was making good choices. I knew vaguely that saving was important, that debt was bad, that I should think about the future. But I had no framework for understanding *how well I was actually doing* or *what I should do next*.

Most finance tools show you charts and numbers. That did not help me. I needed something that looked at my situation and said: here is what is actually going on, here is what is a problem, here is what to do about it — in plain language, without assuming I already understood financial concepts.

That is the gap FinFriend fills.

---

## Why AI narrative instead of charts

Most personal finance apps are built for people who already understand money. They show dashboards, graphs, percentage breakdowns. If you know what a debt-to-income ratio is, that is useful. If you do not, it is just a number.

The AI narrative exists to bridge that gap. Instead of showing a DTI of 38% and leaving the user to figure out if that is good or bad, FinFriend tells a story: what your numbers mean, what is working, what needs attention, and what to do this month — in plain language that does not require any financial background to understand.

The flexibility of natural language also means the explanation can be contextual. A 38% DTI means something different for a 24-year-old student than for a 40-year-old with a mortgage. Charts cannot carry that nuance. A narrative can.

The goal: someone who has never thought seriously about their finances should be able to read the output and feel like they understand their situation — without learning a single financial term.

---

## Why industry benchmarks for scoring

The health score (0–100) is built on four metrics, each scored against published industry standards:

| Metric | Benchmark | Source |
|--------|-----------|--------|
| Savings rate | 20% target | 50/30/20 rule |
| Debt-to-income | 43% maximum | CFPB qualified mortgage threshold |
| Emergency fund | 3–6 months | Fidelity / Vanguard guidelines |
| Housing ratio | 30% maximum | HUD affordability standard |

These are not arbitrary numbers. They are the same thresholds that banks, government agencies, and financial institutions use. This matters because the score needs to be trustworthy — users should feel confident that a score of 65 means something real, not something made up.

Every benchmark is documented. Users can look up the CFPB, HUD, or Fidelity guidelines and verify that the standards FinFriend uses are legitimate.

---

## Why open source

Two reasons.

First, the practical one: I was building a mobile app privately and the development was slow. The learning curve was steep and there was no feedback loop — just me, the code, and no users. Switching to an open, public approach meant I could get a working product in front of real people much faster, learn from how they used it, and build in the direction that actually mattered.

Second, the bigger reason: if something is genuinely useful, open source lets it grow beyond what one person can build. I came across the journey of opencode — a project that built something meaningful in the open and found an audience that cared about it. That model made sense to me. Transparency builds trust. If the tool is good, openness helps it spread.

There is also a third, honest reason: if the product never takes off, the code and the decisions documented here are a real portfolio of product thinking and engineering. Either way, the time is not wasted.

---

## Why build on AI now

AI gets used a lot these days, often for things that do not need it. Finance is different. Financial concepts are genuinely hard for most people — not because people are not smart, but because the education system does not teach it, the jargon is alienating, and most tools are built for people who already know what they are doing.

People are already turning to ChatGPT to understand their finances. They are asking "is my savings rate good?" and "what does debt-to-income mean?" FinFriend is a structured framework built on top of that behaviour — instead of an open-ended chat, it takes your actual numbers, applies real benchmarks, and gives you a grounded, personalised explanation.

The AI is not the product. The product is financial clarity. The AI is what makes that clarity accessible to people who would otherwise not know where to start.

---

## Why a custom .fin file format with encryption

FinFriend saves snapshots as `.fin` files rather than plain JSON. Two reasons.

First, the format is branded — `.fin` is short, clearly means "financial", and signals to the user that this is a FinFriend file, not a generic data export. When a user sees `my_finances.fin` in their downloads folder they know exactly what it is and which app opens it.

Second, plain JSON is readable by anyone. A `.fin` file on a shared computer, in a cloud sync folder, or accidentally attached to an email would expose someone's income, debt, and savings to anyone who opened it. Fernet encryption (AES-128 + HMAC) makes the file unreadable without the app. The key is baked into the app — no password friction, no "forgot my password" problem. The threat model is accidental exposure, not a determined attacker. This level of protection is appropriate and proportionate.

The single-file strategy (all months in one array, same-month saves overwrite) means the user manages one file, not twelve. Re-downloading overwrites the old file in their downloads folder naturally.

---

## Why DTI uses take-home income, not gross

The CFPB's 43% DTI threshold is defined against gross (pre-tax) income. FinFriend uses take-home (after-tax) income instead. This means FinFriend's DTI will always look stricter than a lender's calculation.

This is deliberate. Your rent, groceries, and debt payments come out of what actually hits your bank account — not what you earn before tax. A ratio calculated against take-home income is more honest about what you can actually afford. The trade-off is that FinFriend's benchmarks are stricter than what a bank would tell you. That is the right trade-off for a tool whose job is to give an honest picture, not to tell users what they want to hear.

The choice is disclosed via a caption on the results page and a note in the DTI simulator tooltip.

---

## Why the progress charts include the current unsaved session

When a user uploads their `.fin` history and opens the Progress tab, they see their saved months plus their current session data plotted as a live point (hollow dot, dotted line). The current session is merged into the chart even before saving.

The reason: if a user just updated their income or cut their dining budget, they should immediately see where that puts them on the trend line. Forcing them to save first before seeing the updated chart creates unnecessary friction and separates the action (editing data) from the feedback (seeing progress). The hollow marker makes it clear the point is unsaved — it is a preview, not a confirmed entry.

---

## Why FinFriend Chat uses a routed multi-prompt architecture

FinFriend Chat classifies each user question before answering it, then routes to a category-specific prompt rather than a single generic one. The categories are: debt, savings, housing, insurance, score, and general.

The classification is done by a fast, cheap LLM call (Groq free tier) using a tiny prompt that returns one word. This adds negligible latency and cost. The classifier handles natural language that keyword matching would miss — "my rent is eating me alive" correctly routes to housing even without the word "mortgage".

All category prompts share a common base: system guardrails, the user's financial snapshot (inputs, scores, metrics), and conversation history. The category-specific layer adds targeted instructions and injects only the metrics most relevant to that question type. This keeps answers precise without overwhelming the model with irrelevant context.

A single generic prompt was considered and rejected. A generic prompt dilutes the model's focus — it has to hedge across all possible question types and ends up giving vaguer answers. A targeted prompt for a debt question can say "the user's DTI is 52% — focus your answer on that" rather than dumping all 8 metrics and hoping the model picks the right one.

Guardrails are enforced at two layers: a keyword pre-filter blocks obvious out-of-scope requests before an API call is made, and the base system prompt handles edge cases the keyword filter misses. Both layers are always active regardless of which category prompt is routed to.

The conversation summarisation strategy uses three tiers: full recent messages (last 6–8 turns), a rolling summary of older turns, and the user's financial snapshot which is always injected in full and never summarised or dropped. This keeps token count bounded while preserving the grounding that makes FinFriend Chat different from a generic chatbot.

## Why FinFriend Chat does not use an external framework

LangChain, LlamaIndex, and LangGraph were considered and rejected. They are the right tools for RAG pipelines, multi-agent orchestration, and complex chains. FinFriend's tool calls are local Python functions that already exist — `calculate_metrics()` and `score_metrics()` in `health.py`. Wrapping them in a framework would add heavy dependencies and abstractions without any real benefit.

The chosen approach is native tool calling via each provider's own SDK: Anthropic tool use, OpenAI function calling, Groq function calling, Gemini function declarations. All four providers support this natively. The "framework" is `chat.py` itself.

The classifier is a plain LLM call returning one word. No orchestration library needed for that either.

---

## Why FinFriend Chat has hard guardrails

The chat feature (Tab 4) is scoped to finance-only questions with hard rules: no specific companies or products named, no investment advice, insurance guidance limited to type selection and evaluation criteria only.

The reason is not legal caution — it is product focus. FinFriend's value is grounded, personalised financial analysis using the user's actual numbers. The moment it starts recommending "buy Company X insurance" or "invest in Fund Y", it becomes a generic chatbot that happens to know your income. That is worse, not better. Keeping the scope narrow keeps every answer grounded in the user's specific situation.

---

## What FinFriend deliberately does not do

**It does not track your spending in real time.**
FinFriend is a diagnostic, not a tracker. You come to it when you want to understand your situation — monthly, or when something changes. Real-time tracking is a different product (Mint, YNAB) and a much harder infrastructure problem. FinFriend's value is in the analysis and the story, not in the data collection.

**It does not connect to your bank.**
Bank connections require OAuth integrations, compliance considerations, and significant infrastructure. More importantly, they change the relationship with the user — suddenly the app holds sensitive access to their accounts. That is a different level of trust and a different product. The current approach (user enters their own numbers) keeps the user in control and keeps the product simple.

**It does not have a budget planner.**
A budget planner — where you allocate income into custom goal buckets — is a commoditised feature. Every spreadsheet app does it. YNAB does it better than any web app could. Building it in FinFriend would be high effort, low differentiation, and would pull the product away from its core strength: diagnosis and narrative. The intent behind a budget planner (help users plan where money goes) is better served by the What-If Simulator — which shows you instantly how a spending change affects your score.

**It does not give investment advice.**
FinFriend operates at the level of financial health fundamentals — savings rate, debt, emergency fund, housing. Investment strategy is a separate domain that requires much more context (risk tolerance, time horizon, existing portfolio) and carries regulatory considerations. Getting the fundamentals right comes first. Investment guidance is a later feature.

---

## The core design principle

People would turn to AI to understand their finances eventually anyway. FinFriend just gives them a structured framework to do it — one grounded in real benchmarks, personalised to their actual numbers, and explained in language that does not require a finance degree.

The goal is not to be the most powerful finance tool. The goal is to be the one that makes the most people feel like they finally understand their own money.

---

*Built by Pavan Hebli · Open source · MIT License*
