<div align="center">

<img src="assets/Logo.png" alt="Vitals" width="160" />

# Vitals

**Your financial health score in 5 minutes. No bank connection. No account. No nonsense.**

[![Live App](https://img.shields.io/badge/Live%20App-myfinancevitals.app-4F46E5?style=for-the-badge)](https://myfinancevitals.app/)
[![License](https://img.shields.io/badge/License-MIT-22C55E?style=for-the-badge)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-14-000000?style=for-the-badge&logo=nextdotjs)](https://nextjs.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://python.org)

</div>

---

## What is Vitals?

Most people have no idea how their finances actually stack up. Not because they don't care — but because the tools are either too complex, require handing over bank credentials, or give vague advice that doesn't apply to their situation.

Vitals fixes that. Enter your rough monthly numbers. Get a real score, benchmarked against published financial standards. Read a plain-English story of your financial picture. Ask follow-up questions. Track your progress month over month — all without an account or a bank connection.

---

## Features

| | |
|---|---|
| 🩺 **Health Score** | Scored 0–100 across 4 metrics, each benchmarked against CFPB, HUD, and Fidelity standards |
| 🤖 **AI Narrative** | Streaming plain-English story of your finances — what's working, what needs attention, one action this month |
| 💬 **Inline Chat** | Ask follow-ups right below your story. No tab switch, no help-center feel — it flows like a conversation |
| 🎛️ **What-If Simulator** | Move sliders to see how income/expense changes affect your score in real time |
| 📄 **PDF Import** | Upload bank statements (up to 5 PDFs) — Vitals categorises transactions and fills your form automatically |
| 📊 **Progress Tracking** | Score and metric trend charts across all saved months |
| 💾 **Encrypted Snapshots** | Save your data as a `.vit` file (Fernet/AES-128). No server, no cloud — your file, your device |
| 📤 **PDF Export** | Download a 2-page advisor-ready report: score + metrics on p1, narrative on p2 |
| 🌙 **Dark Mode** | Full light/dark theme with separate logo variants |

---

## Screenshots

<div align="center">

**Health score + metric breakdown**
![Health Score](assets/health-score.png)

**AI narrative + expense chart**
![AI Narrative](assets/ai-narrative.png)

</div>

---

## How the score works

Each metric is scored independently against a published benchmark, then weighted into a 0–100 composite.

| Metric | Green | Yellow | Red | Source |
|--------|-------|--------|-----|--------|
| **Savings rate** | ≥ 20% of take-home | 10–20% | < 10% | 50/30/20 rule |
| **Debt-to-income** | ≤ 20% of take-home | 20–43% | > 43% | CFPB qualified mortgage threshold |
| **Emergency fund** | ≥ 3 months expenses | 1–3 months | < 1 month | Fidelity / Vanguard |
| **Housing ratio** | ≤ 30% of take-home | 30–50% | > 50% | HUD affordability standard |

> DTI uses **take-home income** (not gross) — your payments come out of what actually hits your account. This gives a stricter and more honest picture than a lender's calculation.

---

## Running locally

### Prerequisites

- Node.js 18+
- Python 3.11+

### 1. Backend (FastAPI)

```bash
cd api
pip install -r requirements.txt
```

Create `api/.env`:

```env
HOSTED_API_KEY    = "your-openai-or-groq-key"
HOSTED_PROVIDER   = "openai"          # openai | groq | anthropic | gemini
SHOW_API_INPUT    = false             # false = hosted key, true = user brings their own
SUPABASE_URL      = ""                # optional — for analytics + feedback
SUPABASE_KEY      = ""                # optional
ENABLE_LOGGING    = false             # false = skip Supabase writes locally
```

```bash
uvicorn main:app --reload --port 8000
```

### 2. Frontend (Next.js)

```bash
cd web
npm install
```

Create `web/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Snapshot format

Data is saved locally as an encrypted `.vit` file — one file holds all months. Same-month saves overwrite. Fernet encryption (AES-128-CBC + HMAC-SHA256) prevents accidental exposure if the file ends up on a shared computer or cloud sync folder.

Inspect a snapshot from the command line:

```bash
python tests/decrypt_finfd.py path/to/my_vitals.vit
python tests/decrypt_finfd.py path/to/my_vitals.vit --full
```

Generate a 6-month fake dataset for testing Progress Charts:

```bash
python tests/generate_fake_data.py
```

---

## Project structure

```
vitals/
├── api/                          # FastAPI backend
│   ├── main.py                   # App init, CORS, router mounts
│   ├── config.py                 # Env var config
│   ├── models.py                 # Pydantic request/response models
│   ├── routes/
│   │   ├── score.py              # POST /score
│   │   ├── narrative.py          # POST /narrative  (SSE streaming)
│   │   ├── chat.py               # POST /chat       (SSE streaming)
│   │   ├── simulate.py           # POST /simulate
│   │   ├── importer.py           # POST /import/pdf  (multipart)
│   │   ├── export.py             # POST /export/pdf  (returns bytes)
│   │   ├── goal.py               # POST /goal/extract
│   │   ├── snapshot.py           # POST /snapshot/encode + /decode
│   │   └── feedback.py           # POST /feedback
│   └── core/                     # Business logic (provider-agnostic)
│       ├── health.py             # Scoring math + financial context builder
│       ├── narrative.py          # AI narrative generator
│       ├── chat.py               # Chat — classifier, category prompts, tool calls
│       ├── importer.py           # PDF parsing + LLM categorisation
│       ├── storage.py            # Fernet encrypt/decrypt (.vit format)
│       ├── export_pdf.py         # 2-page PDF report (fpdf2)
│       ├── goal.py               # Goal extraction from narrative
│       └── analytics.py          # Session funnel tracking → Supabase
│
├── web/                          # Next.js 14 frontend
│   └── src/
│       ├── app/
│       │   ├── page.tsx          # Landing page
│       │   ├── form/             # Data entry form
│       │   ├── results/          # Score, narrative, chat, simulator
│       │   └── progress/         # Score + metric trend charts
│       ├── components/
│       │   ├── Header.tsx        # Hamburger sidebar + dark mode toggle
│       │   ├── HealthScore.tsx   # Score ring + metric cards
│       │   ├── Narrative.tsx     # Streaming narrative + education blocks
│       │   ├── InlineChat.tsx    # Conversational chat below narrative
│       │   ├── Simulator.tsx     # What-If sliders → live score
│       │   ├── Progress.tsx      # Recharts trend charts
│       │   ├── PdfImport.tsx     # Multi-PDF upload + transaction review
│       │   ├── ExpenseChart.tsx  # Horizontal expense bar chart
│       │   ├── GoalCard.tsx      # Goal progress bar + actions
│       │   └── ExportMenu.tsx    # PDF export + .vit save popover
│       └── lib/
│           ├── store.ts          # Zustand store (replaces session state)
│           ├── api.ts            # Fetch wrappers for all FastAPI endpoints
│           └── types.ts          # TypeScript interfaces
│
├── tests/
│   ├── decrypt_finfd.py          # CLI: decrypt + inspect .vit files
│   ├── generate_fake_data.py     # Generate 6-month fake .vit for testing
│   └── test_classifier.py        # Chat classifier unit tests
├── assets/                       # Logos + screenshots
├── DECISIONS.md                  # Product thinking and design rationale
└── TODO.md                       # Feature backlog with priority tiers
```

---

## Tech stack

<div align="center">

![Next.js](https://img.shields.io/badge/Next.js_14-000000?style=flat-square&logo=nextdotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)
![Zustand](https://img.shields.io/badge/Zustand-FF6B35?style=flat-square)
![Radix UI](https://img.shields.io/badge/Radix_UI-161618?style=flat-square)
![Recharts](https://img.shields.io/badge/Recharts-22C55E?style=flat-square)

![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=flat-square&logo=fastapi&logoColor=white)
![Python](https://img.shields.io/badge/Python_3.11-3776AB?style=flat-square&logo=python&logoColor=white)
![OpenAI](https://img.shields.io/badge/OpenAI-412991?style=flat-square&logo=openai&logoColor=white)
![Groq](https://img.shields.io/badge/Groq-F55036?style=flat-square)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=flat-square&logo=supabase&logoColor=white)
![Railway](https://img.shields.io/badge/Railway-0B0D0E?style=flat-square&logo=railway&logoColor=white)

</div>

---

## Contributing

Design decisions — why no bank connection, how scoring works, how Vitals Chat handles guardrails, and why certain features were dropped — are documented in [DECISIONS.md](./DECISIONS.md).

The full feature backlog with priority tiers is in [TODO.md](./TODO.md).

---

<div align="center">

MIT License · Built by [Pavan Hebli](https://github.com/PavanHebli)

</div>
