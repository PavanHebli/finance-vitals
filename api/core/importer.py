"""
Bank statement PDF importer.

Two-step flow:
  Step 1 (local)  — coordinate-based extraction finds all numeric clusters on each page
  Step 2 (LLM #1) — parse ALL clusters into structured transactions {date, description, amount, type}
  Step 3 (LLM #2) — categorize expense transactions into Vitals form fields
"""
from __future__ import annotations
import json
import re
from collections import Counter

_NUM_RE = re.compile(r'^[$₹€£¥₩₦₨]?-?\(?\d{1,3}(?:,\d{3})*\.\d{2}\)?$')


def _log(msg: str):
    print(f"[IMPORTER] {msg}", flush=True)


def _find_amount_columns(all_words: list[dict]) -> list[int]:
    xs = [round(w["x0"] / 15) * 15 for w in all_words if _NUM_RE.match(w["text"])]
    return sorted(Counter(xs).keys()) if xs else []


def _find_clusters(words: list[dict], amount_cols: list[int], col_tolerance: int = 20) -> list[tuple[float, float]]:
    ys = sorted(set(
        w["top"] for w in words
        if _NUM_RE.match(w["text"]) and any(abs(w["x0"] - cx) <= col_tolerance for cx in amount_cols)
    ))
    if not ys:
        return []
    if len(ys) == 1:
        return [(ys[0] - 4, ys[0] + 20)]

    gaps       = [ys[i + 1] - ys[i] for i in range(len(ys) - 1)]
    median_gap = sorted(gaps)[len(gaps) // 2]
    clusters: list[list[float]] = []
    current: list[float] = [ys[0]]
    for i, gap in enumerate(gaps):
        if gap <= median_gap * 3:
            current.append(ys[i + 1])
        else:
            clusters.append(current)
            current = [ys[i + 1]]
    clusters.append(current)
    return [(min(c), max(c)) for c in clusters]


def _reconstruct_rows(words: list[dict], table_start_y: float, table_end_y: float, y_bucket_px: int = 4) -> list[str]:
    rows: dict[int, list[dict]] = {}
    for w in words:
        if not (table_start_y - 4 <= w["top"] <= table_end_y + 4):
            continue
        bucket = round(w["top"] / y_bucket_px) * y_bucket_px
        rows.setdefault(bucket, []).append(w)
    lines = []
    for y in sorted(rows):
        line = " ".join(w["text"] for w in sorted(rows[y], key=lambda w: w["x0"]))
        if line.strip():
            lines.append(line)
    return lines


def extract_lines(pdf_bytes: bytes) -> tuple[list[str], list[str]]:
    """Coordinate-based table extraction. Returns (table_lines, debug_log)."""
    debug: list[str] = []
    try:
        import pdfplumber, io
    except ImportError:
        return [], ["❌ pdfplumber not installed"]

    pages_words: list[tuple[int, list[dict]]] = []
    all_words_global: list[dict] = []

    try:
        with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
            debug.append(f"📄 Opened PDF — {len(pdf.pages)} page(s)")
            for page_num, page in enumerate(pdf.pages, start=1):
                words = page.extract_words()
                debug.append(f"  Page {page_num}: {len(words)} words")
                pages_words.append((page_num, words))
                all_words_global.extend(words)
    except Exception as e:
        return [], [f"❌ Failed to open PDF: {e}"]

    if not all_words_global:
        return [], ["❌ No text found — PDF appears to be image-based (scanned)."]

    amount_cols = _find_amount_columns(all_words_global)
    if not amount_cols:
        return [], ["❌ No financial amounts detected — could not find transaction columns."]

    debug.append(f"📊 Amount columns: x={amount_cols}")
    all_table_lines: list[str] = []

    for page_num, words in pages_words:
        if not words:
            continue
        clusters = _find_clusters(words, amount_cols)
        if not clusters:
            continue
        for ci, (start_y, end_y) in enumerate(clusters, start=1):
            page_lines = _reconstruct_rows(words, start_y, end_y)
            if not page_lines:
                continue
            label = f"=== Page {page_num} · Section {ci} ({len(page_lines)} rows) ==="
            all_table_lines.append(label)
            all_table_lines.extend(page_lines)

    if not all_table_lines:
        return [], ["❌ No table content extracted."]

    debug.append(f"✅ Total lines sent to LLM: {len(all_table_lines)}")
    return all_table_lines, debug


_PARSE_PROMPT = """You are parsing raw text rows extracted from a bank statement PDF.
The input may contain MULTIPLE SECTIONS — transaction tables, summaries, fee tables, etc.
Section markers (=== Page X · Section Y ===) separate distinct clusters.

{lines}

YOUR TASKS:
1. Identify which section(s) contain real bank or credit card transactions.
2. Extract ONLY those transactions.
3. Return a JSON array of transaction objects.

Rules:
- If NO section contains real transactions, return [].
- Do NOT invent transactions.
- Rows ending with a running balance (e.g. "127.13 209.39") — use 127.13, ignore 209.39.
- Separate Debit/Credit columns: use whichever column has a value per row.

Each transaction: {{"date": "YYYY-MM-DD or null", "description": "merchant text only", "amount": positive number, "type": "expense|income|unknown"}}
- expense: stores, restaurants, streaming, fuel, rent, ATM, phone bills, transfers out
- income: salary, payroll, direct deposit, Zelle received, transfers in, interest
- unknown: bare PAYMENT/TRANSFER with no merchant context

Respond with ONLY a valid JSON array — no explanation, no markdown."""


def parse_transactions(lines: list[str], provider: str, api_key: str) -> tuple[list[dict], list[str]]:
    from core.chat import _call_llm_simple
    debug: list[str] = []
    if not lines:
        return [], ["❌ No lines to parse"]

    chunks = [lines[i:i + 300] for i in range(0, len(lines), 300)]
    debug.append(f"🤖 LLM Call #1 — {len(lines)} lines · {len(chunks)} chunk(s)")
    all_transactions: list[dict] = []

    for idx, chunk in enumerate(chunks, start=1):
        try:
            raw = _call_llm_simple(_PARSE_PROMPT.format(lines="\n".join(chunk)), provider, api_key, max_tokens=2000)
            raw = raw.strip()
            m = re.search(r"```(?:json)?\s*(.*?)\s*```", raw, re.DOTALL)
            if m:
                raw = m.group(1)
            parsed = json.loads(raw)
            if isinstance(parsed, list):
                valid = [tx for tx in parsed if {"date", "description", "amount", "type"}.issubset(tx.keys())]
                debug.append(f"  Chunk {idx}: ✅ {len(valid)} transactions")
                all_transactions.extend(valid)
        except Exception as e:
            import traceback
            debug.append(f"  Chunk {idx}: ❌ {e}")
            debug.append(traceback.format_exc())

    return all_transactions, debug


_CATEGORIZE_PROMPT = """Assign each transaction to a spending category for a budgeting app.

Categories (use EXACTLY these keys):
  rent | groceries | transport | subscriptions | dining | shopping | other | income

Transactions (index · description · amount · detected type):
{lines}

Return a JSON array — one entry per transaction, same order as input.
Each entry: {{"index": 0, "category": "one of the keys above"}}
Respond with ONLY the JSON array."""


def categorize_expenses(transactions: list[dict], provider: str, api_key: str) -> tuple[list[dict], list[str]]:
    from core.chat import _call_llm_simple
    debug: list[str] = []
    if not transactions:
        return [], ["⚠️ No transactions to categorize"]

    lines = "\n".join(f"{i} · {t['description']} · ${float(t['amount']):.2f} · {t.get('type', 'unknown')}" for i, t in enumerate(transactions))
    debug.append(f"🤖 LLM Call #2 — categorizing {len(transactions)} transactions")
    valid_cats = {"rent", "groceries", "transport", "subscriptions", "dining", "shopping", "other", "income"}

    try:
        raw = _call_llm_simple(_CATEGORIZE_PROMPT.format(lines=lines), provider, api_key, max_tokens=1000)
        raw = raw.strip()
        m = re.search(r"```(?:json)?\s*(.*?)\s*```", raw, re.DOTALL)
        if m:
            raw = m.group(1)
        assignments = json.loads(raw)
        result = [dict(t) for t in transactions]
        for entry in assignments:
            idx = entry.get("index")
            cat = entry.get("category", "other")
            if isinstance(idx, int) and 0 <= idx < len(result):
                result[idx]["category"] = cat if cat in valid_cats else "other"
        for t in result:
            if "category" not in t:
                t["category"] = "income" if t.get("type") == "income" else "other"
        debug.append(f"✅ {len(result)} transactions categorized")
        return result, debug
    except Exception as e:
        return [], [f"❌ {e}"]


def run_import(pdf_bytes: bytes, provider: str, api_key: str) -> dict:
    """Full two-step import pipeline."""
    full_debug: list[str] = []

    lines, d1 = extract_lines(pdf_bytes)
    full_debug.extend(d1)
    if not lines:
        return {"error": "Could not extract table content from this PDF.", "debug_log": full_debug}

    transactions, d2 = parse_transactions(lines, provider, api_key)
    full_debug.extend(d2)
    if not transactions:
        return {"error": "Could not identify any transactions.", "debug_log": full_debug}

    categorized, d3 = categorize_expenses(transactions, provider, api_key)
    full_debug.extend(d3)
    if not categorized:
        return {"error": "Could not categorize transactions.", "debug_log": full_debug}

    return {
        "lines_extracted": len(lines),
        "transactions":    categorized,
        "debug_log":       full_debug,
        "error":           None,
    }
