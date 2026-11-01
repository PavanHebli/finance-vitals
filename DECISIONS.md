# Vitals — Product Decisions

The thinking behind Vitals: the problem it solves, the principles every feature is checked against, the main decisions, and what each one costs. Where an early decision turned out wrong, it says what replaced it.

---

## Contents

1. [The problem](#1-the-problem)
2. [Who it is for](#2-who-it-is-for)
3. [Design principles](#3-design-principles)
4. [The score](#4-the-score)
5. [The check-up](#5-the-check-up)
6. [The AI's role](#6-the-ais-role)
7. [From budget planner to payday plan](#7-from-budget-planner-to-payday-plan)
8. [Trust and data](#8-trust-and-data)
9. [Learning before building](#9-learning-before-building)
10. [Keeping it running](#10-keeping-it-running)
11. [What Vitals isn't](#11-what-vitals-isnt)
12. [Decision log](#12-decision-log)

---

## 1. The problem

**First framing:** most personal finance tools are built for people who already understand money. They show ratios and charts and assume you know what "good" looks like. The people who most need help never learned it.

That led to a diagnostic: enter a few numbers, get a score out of 100 and a plain-English explanation. It was useful once, but it gave no reason to come back. A score changes slowly, and nothing in your life prompts you to check it.

**Sharper framing:**

> When your paycheck lands, you can't tell how much of it is really free to spend. Rent and bills are obvious; car repairs, annual renewals and real surprises aren't, so they end up on a credit card.

This is better because it names a **recurring moment** (payday), a **concrete failure** (the surprise that lands on a card), and a question people actually ask: "how much can I spend until payday?" Nobody searches for "an app for people with low financial literacy". The literacy point doesn't go away; it becomes a design rule.

---

## 2. Who it is for

**For:** people roughly 22–35 who rent, are paid on a regular schedule, have little or no cushion, and either never budgeted or gave up.

**Not for, on purpose:**

| Group | Why not |
|---|---|
| Couples managing shared money | A large feature set, and well served elsewhere |
| Zero-based budgeting enthusiasts | They want every dollar assigned daily; Vitals asks for a minute per paycheck |
| Investors tracking portfolios | Needs live holdings and prices |
| Gig / irregular income | A real need, but it needs income smoothing, which deserves its own design |

Saying no to these keeps the product small enough to be simple.

---

## 3. Design principles

Every feature is checked against these:

1. **Plain words, not finance terms.** "How much of your pay you keep", not "savings rate". If a word needs a glossary, it doesn't go in the UI.
2. **One clear next step, not a dashboard.** The page should say what to do, with real dollar amounts.
3. **Code computes, AI explains.** Every number comes from deterministic code. The AI turns numbers into sentences and never invents one.
4. **Ask for the minimum.** Never block a result on missing fields. A rough answer now beats a precise answer nobody finishes.
5. **Honest over flattering.** A score that makes people feel good but misreads their situation is worse than no score.
6. **One meaning per field.** If a user can't tell what to type, the numbers will be wrong, and so will everything built on them.
7. **Trust is the product.** No bank link, open code, and an exact account of what data goes where.
8. **A minute per paycheck, not daily upkeep.** Data entry is the main reason people abandon money apps.

---

## 4. The score

### Why a score at all

Scores are easy to dismiss as gimmicks. The reason to keep one is **calibration**: people often misjudge where they stand, and a clear number corrects that faster than any explanation. But the score is a check-up, not the headline. The headline is what to do next.

### Four metrics, equal weight

| Metric | What Vitals calls it | Full marks | Danger |
|---|---|---|---|
| Savings rate | How much of your pay you keep | ≥ 20% | spending + debt payments exceed pay |
| Debt-to-income | How much of your pay goes to debt | ≤ 10% | > 43% |
| Emergency fund | How long you could last without a paycheck | ≥ 6 months | < 1 month |
| Housing | How much of your pay goes to rent | ≤ 25% | > 50% |

Each metric is worth up to 25 points in four steps (0, 10, 18, 25). Equal weights are easy to explain: "each counts for up to 25 points". Thresholds come from common guidance (the 50/30/20 rule, lender guidelines, 3–6 months of savings, housing affordability standards). All of them live in one place in the code, and every screen that quotes them follows it.

### Decisions and trade-offs

- **Take-home pay, not gross.** Lenders use gross income. Vitals uses what actually lands in your account, because that is what rent and debt are paid from. *Cost:* stricter than a lender. Intentional, and stated in the app.
- **No cushion caps the score at 50.** Debt and housing are "less is better" ratios, so someone with no debt and cheap rent earned half the points even with $0 saved. That made a person one surprise away from trouble look "Fair". Now, under one month of savings, the score can't go above 50. *Cost:* the score jumps instead of rising smoothly. Accepted, because it's easy to explain and makes the first month of savings the obvious goal.
- **What you keep is measured after debt payments.** An earlier version measured savings before debt payments, so the page could say "you keep 15%" next to "$120 left over". When the app's own numbers disagree, users stop trusting all of them, and the AI can't explain the gap either. *Cost:* scores drop for people with debt, and debt now affects two metrics. Accepted: the two metrics answer different questions (how heavy is the debt vs what's left at month end).
- **Housing matters less over time.** Many people can't change their rent this year, and a red grade they can't act on just makes them look away. It will be shown as context with less weight. A reasoned call, not a tested one.
- **Every metric can be opened.** It shows the value, the points, and where the number came from. A metric that is silently wrong while saying "Good" is worse than one that says "not answered".
- **Not borrowed authority.** The score is Vitals' own four-metric method and doesn't imply a link to any industry score or regulator.

---

## 5. The check-up

The first thing a new visitor does, so it gets the most care.

- **Five numbers, always visible:** take-home pay, rent, everything else you spend, monthly debt payments, money saved. Rough guesses are welcome. Everything else (a spending breakdown, extra income, profile questions) is collapsed and optional.
- **The three outflows never overlap.** An earlier form had "total spending, including rent" next to a separate rent box. People couldn't tell what to type. Now: rent; everything else (card purchases included); and debt payments (loans, and card payments on balances carried over). A card paid in full is the same money as the purchases on it, so it isn't counted again.
- **See a result before typing your own.** An "example numbers" button fills in a typical person, so a hesitant visitor can see what they'll get first.
- **One next step on the result.** Worked out by code from the weakest metric: "you have 2.1 months saved; the usual goal is 3 months, about $10,200; at $120 a month that takes about 26 months." The AI summary is told to follow it, so the page never gives two instructions.
- **Deliberately left out:** a live running total while typing, and a "do you pay your card in full?" question. Both make people stop and think mid-form. They get added only if real users trip on the problem they solve.

---

## 6. The AI's role

**The AI is not the product. The product is clarity; the AI makes the numbers readable.**

- **It explains, it doesn't calculate.** Scores, what-ifs and suggestions come from code. For "what if" questions, the chat calls the real scoring function instead of doing arithmetic itself.
- **Language over charts.** A 38% debt ratio means something different at 24 than at 40. A sentence can carry that; a chart can't. Two rules in every prompt: no vague adjectives ("decent", "solid"), and no number without what it means in real life.
- **Moves, not alarms.** People who avoid looking at their money avoid it more when the news is bad. Vitals says what to move, never "you failed".
- **A knowledgeable friend, not a compliance officer.** The line is specificity, not topic: strategies and categories are fine, and so is naming banks or comparison sites; specific stock or fund picks are not. A flat refusal is never the answer; redirect instead.
- **Never an "AI financial advisor".** General information is fine; personalised investment advice carries legal duties. That is also why the chat explains options and doesn't make execution calls.
- **Personas dropped.** A "tough love" mode is popular elsewhere, but harsh framing pushes away exactly the people Vitals is for.
- **Consistent inputs before better prompts.** If the model is confused, check the data it was given before rewriting the prompt. Contradictory numbers can't be fixed with wording.

---

## 7. From budget planner to payday plan

### Why a budget planner was added

Vitals first avoided budgeting entirely: it seemed commoditised. That changed because a diagnostic tells you what's wrong but doesn't help you change it. The budget planner uses envelopes: income arrives, you assign it by percent or fixed amount ("20% to savings" is easier to decide than "$1,240 to savings"), and whatever is left stays unassigned.

### What was wrong with it

- **It flattered.** Unassigned money counted as saved, so the fewer envelopes you made, the better you scored. The same person could score "Good" on the budget page and "At Risk" on the check-up.
- **Bill envelopes only grew.** Rent kept accumulating month after month, though it was paid.
- **It had the same double-counting traps** the check-up had fixed (debt as an envelope *and* as a profile answer).
- **It gave no reason to come back.** No pay schedule, no prompt, no number that changes each visit.

### The payday plan

The payday plan **replaces** the budget page rather than sitting next to it; two places to plan money would confuse people.

**How it works:** on payday, the plan carries forward from last time and the user confirms it in about a minute. Money splits into four kinds of card. What's left becomes one number: **how much you can spend each week until the next payday**. The plan ends with real transfers to make ("move $180 to savings"), because moving money into separate pots changes behaviour; virtual limits alone mostly don't.

| Card type | Examples | Over time |
|---|---|---|
| **Bills** | Rent, phone, car payment, subscriptions | Resets each paycheck |
| **Once-in-a-while** | Car registration, annual insurance, holidays | Builds up; drains when the bill hits |
| **Goals** | Surprise cushion, car fund, trip | Builds up |
| **Spending money** | Groceries, eating out, fun | Whatever is left; the weekly number |

**Layout:** one number on top, then groups, not one card per bill.

```
┌─────────────────────────────────────────┐
│  You can spend  $450 a week             │
│  until your next payday (Fri, Nov 6)    │
└─────────────────────────────────────────┘

Bills this paycheck                $1,100  ▾
  Rent                $600
  Car payment         $150
  Phone                $40
  + 4 more

Set aside for later                  $120  ▾
  Car insurance  $720 due Feb  → $120 this paycheck

Goals
  [Cushion  $1,200 / $3,000 ████░░]  +$100
  [Trip       $270 / $900   ███░░░]   +$90
```

- **Bills** are one list: they reset every paycheck and only the total matters.
- **Set-asides** are one list: each row shows its own amount per paycheck, because due dates differ.
- **Goals** get a card each with progress, because watching them grow is the motivating part.
- **Spending money** isn't a card; it's the headline.

**Entering bills without a long form.** A big list of common bills is a good memory aid but a bad form. So:

- Show a rough weekly number after pay and rent alone, before any list.
- Offer about ten common bills as tap-to-select chips, then ask amounts only for the ones tapped.
- Always allow "just type your bills total"; only the total is needed.
- Lean on the checklist for once-in-a-while costs (registration, annual insurance, renewals, holidays), which people forget; the app works out the per-paycheck amount.
- No pre-filled "typical" amounts: there's no honest source for someone's phone bill, and defaults anchor people.
- The weekly number updates as bills are added. Here a running number *is* the answer the user came for.

**Rules that keep it honest:**

- **Taking money from a goal is a loan, not a silent withdrawal.** Pay it back over the next paychecks (default), push the date, or shrink the goal. When the cushion covers a surprise, that's shown as a win.
- **Over-allocating is a plain state, not an error** ("your plan is $85 more than your paycheck"). Nothing is cut silently; the user chooses where it comes from.
- **Suggestions show their source** (for example the 50/30/20 rule, adjusted for real rent). Folk rules with no real source, like "travel should be 5–10% of income", are not used.
- **Surprises are logged, not purchases.** One question per payday: "anything unexpected?" If the same kind of surprise repeats, Vitals offers to turn it into a once-in-a-while card. Most "surprises" are predictable.

**The weak spot:** without a bank link, Vitals knows what you planned, not what you spent. It's a plan per paycheck, not a live tracker, and it relies on self-control. And beginners are the people least likely to keep anything updated by hand. The payday visit has to take under a minute and be prompted by a reminder, or nobody returns.

**Build order** (each step useful on its own; stop anywhere):

1. Count unassigned money as spending in the score.
2. Bill cards reset each paycheck; goals keep growing.
3. Rename the leftover to "Spending money" and show it per week at the top.
4. Add a pay schedule (every two weeks / monthly).
5. Once-in-a-while cards: amount and due date give the set-aside per paycheck.
6. Adding a card asks one question: bill, once-in-a-while, or saving for something?

---

## 8. Trust and data

- **No bank linking.** Account aggregation is expensive per user, its regulation is unsettled, and storing bank access creates real liability. Vitals uses a manual "where your money lives" list instead, updated at check-ins. *Cost:* nothing updates by itself. It's also a trust advantage for people who won't link their bank.
- **Guests get nothing saved.** No half-saved middle state: sign in and it's kept; don't, and it isn't.
- **Say exactly what happens to data.** Numbers go to the server to compute the score and to the AI provider to write the summary; they aren't stored without an account. An uploaded bank statement is read on the server, and its transaction lines go to the AI for categorising. A privacy promise that turns out false costs more trust than any missing feature.
- **Your data stays yours.** Snapshots export as an encrypted file (safe if left on a shared computer) and as plain CSV. An open-source app shouldn't trap data.
- **No paywall until people come back.** Paywalls convert people who already value a product. Charging before there's a habit just loses the few people trying it.

---

## 9. Learning before building

- **Check the measurement before believing it.** "Nobody did X" is only a finding once you've confirmed X can actually be recorded.
- **Ask one person, not a group.** Links in group chats get ignored; a direct, specific ask ("where did you get stuck?") gets real answers.
- **Test the cheapest version of an idea first.** Before building the payday plan, a "remind me on payday" button tests whether anyone wants to come back. If almost nobody uses it, the bigger build isn't worth it.
- **No new features until real people use what exists.** Polishing is easier than getting the product in front of people, and it doesn't answer whether anyone needs it.

**Gates:** the north-star metric is payday check-ins per month. Each stage has a threshold set in advance, so the decision isn't made by feel:

| Stage | Keep going if | Otherwise |
|---|---|---|
| **Demand** | Hundreds of completed check-ups; a meaningful share set a reminder; interviewees describe the payday problem unprompted | Change the problem or the audience |
| **Habit** | A quarter of planners come back for a second payday | Stop adding features |
| **Outcome** | More surprises get paid from the cushion instead of a card | The product isn't changing behaviour |
| **Sustainability** | Supporters cover running costs | Keep it free and in maintenance |

---

## 10. Keeping it running

- **Open source (MIT).** Anyone can see exactly how the score works, or run Vitals themselves. Self-hosting is complete; nothing is held back.
- **The core stays free.** Once people come back regularly, a pay-what-you-want supporter option covers hosting and AI costs, framed as "keep Vitals running", not as unlocking features.
- **Costs in the open.** A public page showing what Vitals costs to run and how much supporters cover.
- **Fair use on AI** for the hosted version; self-hosters bring their own key.
- **Organic reach only.** No ads, no outside funding. Help-first in communities, then small search pages that answer real questions ("how much can I spend until payday?").

---

## 11. What Vitals isn't

- **Not a spending tracker.** You log a few surprises a year, not every coffee.
- **Not connected to your bank.** That keeps you in control, and it's also a real limit.
- **Not a full budgeting suite.** It does one job, in about a minute per paycheck.
- **Not an investment adviser.** It explains options; it doesn't make execution calls.
- **Not a black box.** The code is open.

---

## 12. Decision log

| Decision | Why | Cost |
|---|---|---|
| Rebuild the prototype properly rather than port it line by line | A port carries every workaround forward | Slower to start |
| Never block a result on missing fields | Long forms lose first-time visitors | Less precise partial results |
| Four equal-weight metrics on take-home pay | Easy to explain; reflects money people actually have | Stricter than a lender |
| Cap the score at 50 with under a month saved | Someone with no cushion looked "Fair" | The score jumps instead of rising smoothly |
| Measure what you keep after debt payments | The app's own numbers contradicted each other | Lower scores for people with debt |
| Five non-overlapping check-up fields | People couldn't tell what to type | Less detail by default |
| One computed next step; the AI follows it | The page must never give two instructions | Less freedom for the AI |
| AI explains, code calculates | Numbers must be checkable | The AI can't improvise answers |
| Drop chat personas | Harsh framing pushes away the target user | Less novelty |
| Add a budget planner, then plan to replace it with the payday plan | A diagnostic doesn't help people change; the first planner flattered and gave no reason to return | A significant rebuild, gated on evidence |
| No bank linking | Cost, unsettled regulation, liability | Nothing updates automatically |
| No paywall until a habit exists | Paywalls only convert people who already care | No revenue for now |
| Test return intent with a reminder before building | Cheap signal before expensive work | A weak signal; calendar files are clunky on some phones |
| No new features until real users | Polish doesn't show whether anyone needs it | Known improvements wait |

---

*Built by Pavan Hebli · Open source · MIT License*
