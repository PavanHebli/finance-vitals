"""
Importer tests — runs outside Streamlit, no UI needed.

Each scenario prints exactly what went in and what came out so you can
verify the pipeline behaviour without uploading a PDF.

Usage:
    OPENAI_API_KEY=sk-... python tests/test_importer.py

Optional: override provider
    PROVIDER=groq GROQ_API_KEY=... python tests/test_importer.py
"""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "app"))

from modules.importer import parse_transactions, categorize_expenses

PROVIDER = os.environ.get("PROVIDER", "openai")
KEY_MAP  = {
    "openai":    "OPENAI_API_KEY",
    "groq":      "GROQ_API_KEY",
    "anthropic": "ANTHROPIC_API_KEY",
    "gemini":    "GEMINI_API_KEY",
}
API_KEY = os.environ.get(KEY_MAP[PROVIDER], "")
if not API_KEY:
    print(f"[ERROR] Set {KEY_MAP[PROVIDER]} environment variable first.")
    sys.exit(1)


# ── Scenario 1: parse_transactions ───────────────────────────────────────────
# Each entry: what the extracted PDF lines look like and what we expect back.
# expect_empty=True  → LLM should return [] (not a bank statement)
# expect_empty=False → LLM should return real transactions

PARSE_SCENARIOS = [
    {
        "label": "Vitals report PDF — wrong document, should return []",
        "lines": [
            "Cash left this month: $500.00",
            "Ratios are calculated using take-home (after-tax) income -- stricter than lender benchmarks.",
        ],
        "expect_empty": True,
    },
    {
        "label": "Wells Fargo statement — real transactions with multi-line descriptions",
        "lines": [
            "5/29 Online Transfer to Hebli P Ref #Ib0Y9J65Gx Way2Save Savings 3,000.76",
            "Savings",
            "6/1 Zenthor It LLC Payroll Wc0Gnray21Rnez7 Hebli, Pavan 2,642.92",
            "6/1 Recurring Payment authorized on 05/30 Vesta *AT&T Prepa 33.67",
            "866-608-3007 OR S306150357428175 Card 2531",
            "6/3 Purchase authorized on 06/02 Amazon Mark* 4Z490 48.99",
            "Amazon.Com/MA WA S386153759442367 Card 2531",
            "6/3 Save As You Go Transfer Debit to Xxxxxxxxxxx7703 2.00",
            "6/15 Zenthor It LLC Payroll Odkgraztw09T2Cb Hebli, Pavan 2,642.92",
            "6/15 Purchase authorized on 06/14 Costco Gas #1767 Liberty Hill TX 25.15",
            "6/22 Discover E-Payment 260622 9670 Hebli Pavan 293.12",
            "Totals $5,851.01 $6,088.00",
        ],
        "expect_empty": False,
    },
    {
        "label": "Non-transaction summary text — should return []",
        "lines": [
            "Account summary for June 2024",
            "Opening balance: $1,200.00",
            "Closing balance: $980.00",
            "Total fees charged: $15.00",
        ],
        "expect_empty": True,
    },
]


# ── Scenario 2: categorize_expenses ──────────────────────────────────────────
# Known transactions → check the LLM picks the right Vitals category.

CATEGORY_CASES = [
    {"description": "Netflix",               "amount": 15.99,   "type": "expense", "expected": "subscriptions"},
    {"description": "Costco Wholesale",       "amount": 87.43,   "type": "expense", "expected": "groceries"},
    {"description": "Shell Gas Station",      "amount": 52.10,   "type": "expense", "expected": "transport"},
    {"description": "Chipotle Mexican Grill", "amount": 14.75,   "type": "expense", "expected": "dining"},
    {"description": "Amazon Purchase",        "amount": 48.99,   "type": "expense", "expected": "shopping"},
    {"description": "Zenthor It LLC Payroll", "amount": 2642.92, "type": "income",  "expected": "income"},
    {"description": "Apartment Rent Payment", "amount": 1500.00, "type": "expense", "expected": "rent"},
    {"description": "Zelle From Friend",      "amount": 50.00,   "type": "income",  "expected": "income"},
    {"description": "Doctor Office Copay",    "amount": 30.00,   "type": "expense", "expected": "other"},
]


def _sep(title: str):
    print(f"\n{'─' * 68}")
    print(f"  {title}")
    print('─' * 68)


# ── Run parse scenarios ───────────────────────────────────────────────────────

print(f"\n{'═' * 68}")
print(f"  IMPORTER TESTS  [provider: {PROVIDER}]")
print(f"{'═' * 68}")

parse_passed = parse_failed = 0

for s in PARSE_SCENARIOS:
    _sep(s["label"])
    print(f"\nINPUT  ({len(s['lines'])} lines):")
    for i, line in enumerate(s["lines"]):
        print(f"  [{i}] {line}")

    txns, _ = parse_transactions(s["lines"], PROVIDER, API_KEY)

    print(f"\nOUTPUT  ({len(txns)} transaction(s)):")
    for t in txns:
        print(f"  [{t.get('type','?'):7}]  {str(t.get('date','?')):12}  "
              f"${float(t.get('amount', 0)):>9,.2f}  {t.get('description','')[:50]}")
    if not txns:
        print("  (empty list)")

    ok = (len(txns) == 0) == s["expect_empty"]
    expected_str = "[]" if s["expect_empty"] else "transactions"
    got_str      = "[]" if not txns else f"{len(txns)} transaction(s)"
    print(f"\n{'✅ PASS' if ok else '❌ FAIL'}  expected={expected_str}  got={got_str}")
    if ok: parse_passed += 1
    else:  parse_failed += 1


# ── Run categorize scenarios ──────────────────────────────────────────────────

_sep("CATEGORIZE — known merchants → expected Vitals categories")
print(f"\nINPUT  ({len(CATEGORY_CASES)} transactions):")
for t in CATEGORY_CASES:
    print(f"  [{t['type']:7}]  ${t['amount']:>9,.2f}  {t['description']}")

result, _ = categorize_expenses(CATEGORY_CASES, PROVIDER, API_KEY)

print(f"\nOUTPUT:")
print(f"  {'STATUS':<8}  {'GOT':<16}  {'EXPECTED':<16}  DESCRIPTION")
print(f"  {'─' * 60}")
cat_passed = cat_failed = 0
for t in result:
    got      = t.get("category", "?")
    expected = next((c["expected"] for c in CATEGORY_CASES if c["description"] == t["description"]), "?")
    ok       = got == expected
    print(f"  {'✅ PASS' if ok else '❌ FAIL'}  {got:<16}  {expected:<16}  {t['description']}")
    if ok: cat_passed += 1
    else:  cat_failed += 1


# ── Summary ───────────────────────────────────────────────────────────────────

total_p = parse_passed + cat_passed
total_f = parse_failed + cat_failed

print(f"\n{'═' * 68}")
print(f"  Parse     : {parse_passed}/{parse_passed + parse_failed} passed")
print(f"  Categorize: {cat_passed}/{cat_passed + cat_failed} passed")
print(f"  Total     : {total_p}/{total_p + total_f} passed", end="")
print(f"  ← {total_f} failure(s)" if total_f else "  — all good ✅")
print()