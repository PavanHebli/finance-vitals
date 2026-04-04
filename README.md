# FinFriend

An open source personal finance app that helps you understand your financial health through honest scoring and AI-powered insights.

---

## What it does

```
You input your financial data
        ↓
App scores your financial health
        ↓
AI narrates the story of your money
        ↓
App educates you on why it matters
        ↓
App gives you ONE clear next step
```

---

## Module Status

| Module | Description | Status |
|--------|-------------|--------|
| 1 — Financial Snapshot | Input form for financial data | ✅ Done |
| 2 — Health Score + Mirror | Scores your finances across 4 key metrics | ✅ Done |
| 3 — AI Narrative Story | AI tells the story of your money | 🔄 In Progress |
| 4 — Contextual Education | Explains why the diagnosed issues matter | ⏳ Pending |
| 5 — The One Next Step | One clear, actionable recommendation | ⏳ Pending |

---

## Tech Stack

- **Python** 3.9+
- **Streamlit** — UI framework
- **LLM Providers** — Anthropic, OpenAI, Groq (user's own API key)

---

## Getting Started

### Prerequisites
- Python 3.9 or higher
- An API key from Anthropic, OpenAI, or Groq

### Install dependencies
```bash
pip install -r requirements.txt
```

### Run the app
```bash
cd app
streamlit run main.py
```

Open your browser at `http://localhost:8501`

---

## Project Structure

```
finfriend/
├── requirements.txt
├── README.md
├── SUMMARY.md
├── TODO.md
└── app/
    ├── main.py               # Panel switching
    └── modules/
        ├── snapshot.py       # Module 1: form data collection
        ├── health.py         # Module 2: calculations
        ├── panel_form.py     # Panel 1 UI
        └── panel_results.py  # Panel 2 UI
```

---

## License

MIT
