# FinFriend

An open source personal finance app that scores your financial health, narrates your money story, and tracks your progress over time.

**Live app:** https://finfriend-web.streamlit.app/

---

## What it does

```
You input your financial data
        ↓
App scores your financial health (0–100)
        ↓
AI narrates the story of your money
        ↓
App educates you on why flagged metrics matter
        ↓
Save your snapshot → track progress month over month
```

---

## Features

| Feature | Description | Status |
|---------|-------------|--------|
| Financial Snapshot | Income, expenses, savings, debt, context | ✅ |
| Health Score | 4 metrics scored against industry benchmarks (CFPB, HUD, Fidelity) | ✅ |
| AI Narrative | Streams honest Q&A: picture, working, attention, one action | ✅ |
| Contextual Education | Explains why flagged metrics matter | ✅ |
| Expense Chart | Horizontal bar chart — each category as % of income | ✅ |
| What-If Simulator | Sliders to explore how changes affect your score | ✅ |
| Snapshot Save / Load | Save progress as encrypted `.fin` file, load next month | ✅ |
| Progress Charts | Score and metric trends across months — merges saved history with current session | ✅ |
| FinFriend Chat | Finance-only chat: scenario planning, progress coaching, insurance guidance | 🔜 |

---

## Tech Stack

- **Python** 3.9+
- **Streamlit** — UI framework
- **Plotly** — charts
- **Cryptography (Fernet)** — `.fin` file encryption
- **LLM Providers** — Anthropic, OpenAI, Groq (default — free tier), Gemini

**User brings their own API key.** Don't have one? See the [Get API Key](/get_api_key) page inside the app.

---

## Getting Started

### Prerequisites
- Python 3.9+
- API key from Groq (free), Anthropic, OpenAI, or Gemini

### Install
```bash
pip install -r requirements.txt
```

### Run
```bash
cd app
streamlit run main.py
```

Open `http://localhost:8501`

---

## Project Structure

```
finfriend/
├── requirements.txt
├── README.md
├── DECISIONS.md              # Product thinking and design rationale
├── TODO.md                   # Prioritised feature backlog
├── tests/
│   ├── decrypt_finfd.py      # CLI utility to decrypt + inspect .fin files
│   └── generate_fake_data.py # Generates a 6-month fake .fin file for testing
└── app/
    ├── main.py               # Page config + session state init + panel routing
    ├── pages/
    │   └── get_api_key.py    # Step-by-step API key guide (all 4 providers)
    └── modules/
        ├── snapshot.py       # Module 1: form section render functions
        ├── health.py         # Module 2: pure scoring logic (no Streamlit)
        ├── narrative.py      # Module 3: LLM prompt + streaming (4 providers)
        ├── education.py      # Module 4: contextual education content
        ├── simulator.py      # What-If Simulator: sliders + live recalculation
        ├── storage.py        # Snapshot schema, Fernet encryption, .fin I/O
        ├── progress.py       # Progress Charts: merge history + current, render charts
        ├── panel_form.py     # Panel 1 UI: form, toggle, import snapshot
        └── panel_results.py  # Panel 2 UI: score, breakdown, 4 tabs
```

---

## Snapshot file format

FinFriend saves your data as an encrypted `.fin` file (`my_finances.fin`). The file contains all your monthly snapshots — one entry per month, with inputs, scores, metrics, and AI narrative. Re-downloading overwrites the previous file — one file for everything.

To inspect a snapshot file from the command line:
```bash
python tests/decrypt_finfd.py path/to/my_finances.fin
python tests/decrypt_finfd.py path/to/my_finances.fin --full
```

To generate fake test data for the Progress Charts tab:
```bash
python tests/generate_fake_data.py
```

---

## License

MIT
