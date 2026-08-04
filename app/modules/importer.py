"""
Bank statement PDF importer.

Two-step flow:
  Step 1 (local)  — coordinate-based table detection extracts only description + amount rows
  Step 2 (LLM #1) — parse extracted rows into structured transactions {date, description, amount, type}
  Step 3 (LLM #2) — categorize expense transactions into Vitals form fields

How table detection works:
  - Amounts in bank statements are always right-aligned in consistent x-coordinate columns
  - pdfplumber gives every word an exact x-position (e.g. 480.3, 481.1, 479.8)
  - Words in the same column vary by a few pixels — we snap to 15px buckets to group them
  - This reveals distinct columns: [description col, amount col, balance col]
  - Rightmost bucket = running balance (skip); second rightmost = transaction amount (keep)
  - Table y-range found via row spacing: table rows are evenly spaced, non-table text has
    large irregular gaps — we walk the amount column rows and stop at the first big gap

What goes to LLM: description text + amounts only. Balance, account numbers, header PII — never sent.
"""
from __future__ import annotations
import json
import re
from collections import Counter


# Matches financial amounts across common bank statement formats:
#   127.13   1,300.00            plain
#   $127.13  $1,300.00           dollar sign prefix
#   (127.13) (1,300.00)          parentheses = debit notation
#   -127.13  -1,300.00           negative prefix
# Must match BEFORE stripping commas to preserve \d{1,3} group assumption.
_NUM_RE = re.compile(r'^\$?-?\(?\d{1,3}(?:,\d{3})*\.\d{2}\)?$')


def _log(msg: str):
    print(f"[IMPORTER] {msg}", flush=True)


# ── Coordinate helpers ────────────────────────────────────────────────────────

def _find_amount_columns(all_words: list[dict]) -> list[int]:
    """
    Finds which x-positions (snapped to 15px buckets) contain financial amounts.

    Why 15px: right-aligned numbers in the same column vary by a few pixels depending
    on how wide the number is (e.g. "12.98" starts at x=483, "1,300.00" starts at x=468
    — same column, different starting x because the wider number extends further left).
    15px buckets absorb that variance without merging adjacent columns (which are
    typically 60-80px apart).

    Returns sorted list of x-buckets. Rightmost = balance column.
    Works with as few as 1 transaction.
    """
    xs = [
        round(w["x0"] / 15) * 15
        for w in all_words
        if _NUM_RE.match(w["text"])
    ]
    if not xs:
        return []
    return sorted(Counter(xs).keys())


def _find_table_y_range(
    words: list[dict],
    amount_cols: list[int],
    col_tolerance: int = 20,
) -> tuple[float, float] | tuple[None, None]:
    """
    Finds the y-range (start_y, end_y) of the transaction table on a single page.

    Key property: table rows are evenly spaced (consistent line height).
    Non-table content (account summaries, headers, footers) sits in separate blocks
    with larger gaps between them.

    Accepts ALL non-balance amount columns so that rows with only a deposit OR only
    a withdrawal are both detected — a row only needs an amount in any one column.

    We collect y-positions of all numbers across all detection columns, deduplicate,
    then walk them in order. A gap more than 3x the median gap = table ended.
    """
    ys = sorted(set(
        w["top"]
        for w in words
        if _NUM_RE.match(w["text"])
        and any(abs(w["x0"] - cx) <= col_tolerance for cx in amount_cols)
    ))

    if not ys:
        return None, None

    if len(ys) == 1:
        # Single transaction — wrap a small window around it
        return ys[0] - 4, ys[0] + 20

    gaps = [ys[i + 1] - ys[i] for i in range(len(ys) - 1)]
    median_gap = sorted(gaps)[len(gaps) // 2]

    table_ys = [ys[0]]
    for i, gap in enumerate(gaps):
        if gap <= median_gap * 3:
            table_ys.append(ys[i + 1])    # consistent spacing — still in table
        else:
            if len(table_ys) >= 1:
                break                      # big gap = table ended
            table_ys = [ys[i + 1]]        # pre-table noise, reset

    return min(table_ys), max(table_ys)


def _reconstruct_rows(
    words: list[dict],
    balance_col_x: int,
    table_start_y: float,
    table_end_y: float,
    col_tolerance: int = 20,
    y_bucket_px: int = 4,
) -> list[str]:
    """
    Reconstructs text lines from words that fall inside the table y-range,
    excluding the balance column.

    Words on the same visual row have y-positions within a few pixels of each other.
    We snap to 4px y-buckets to group them into lines, then sort by x to preserve
    left-to-right reading order (date → description → amount).
    """
    rows: dict[int, list[dict]] = {}
    for w in words:
        if not (table_start_y - 4 <= w["top"] <= table_end_y + 4):
            continue                                     # outside table
        if w["x0"] >= balance_col_x - col_tolerance:
            continue                                     # balance column — skip

        bucket = round(w["top"] / y_bucket_px) * y_bucket_px
        rows.setdefault(bucket, []).append(w)

    lines = []
    for y in sorted(rows):
        line = " ".join(w["text"] for w in sorted(rows[y], key=lambda w: w["x0"]))
        if line.strip():
            lines.append(line)
    return lines


# ── Step 1: local PDF extraction ──────────────────────────────────────────────

def extract_lines(pdf_bytes: bytes) -> tuple[list[str], list[str]]:
    """
    Coordinate-based table extraction. Returns (table_lines, debug_log).

    Pass 1 — collect all words from all pages.
    Pass 2 — cluster amount x-positions globally to find column layout.
    Pass 3 — per page, detect table y-range and extract rows within it.

    Nothing outside the table boundaries is included.
    Balance column is excluded. What remains: date, description, amount.
    """
    debug: list[str] = []

    try:
        import pdfplumber
        import io
    except ImportError:
        msg = "pdfplumber not installed — run: pip install pdfplumber"
        _log(msg)
        debug.append(f"❌ {msg}")
        return [], debug

    pages_words: list[tuple[int, list[dict]]] = []
    all_words_global: list[dict] = []

    try:
        with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
            n_pages = len(pdf.pages)
            _log(f"Opened PDF — {n_pages} page(s)")
            debug.append(f"📄 Opened PDF — {n_pages} page(s)")

            for page_num, page in enumerate(pdf.pages, start=1):
                words = page.extract_words()
                _log(f"  Page {page_num}: {len(words)} words")
                debug.append(f"  Page {page_num}: {len(words)} words extracted")
                if not words:
                    debug.append(f"  Page {page_num}: ⚠️ no words — may be a scanned image")
                pages_words.append((page_num, words))
                all_words_global.extend(words)

    except Exception as e:
        msg = f"Failed to open PDF: {e}"
        _log(msg)
        debug.append(f"❌ {msg}")
        return [], debug

    if not all_words_global:
        debug.append("❌ No text found — PDF appears to be image-based (scanned).")
        debug.append("   Use a downloaded digital statement from your bank's website.")
        return [], debug

    # ── Global column detection (all pages combined) ──────────────────────
    # More pages = more data points = more reliable clustering
    amount_cols = _find_amount_columns(all_words_global)

    if not amount_cols:
        # Sample words that look numeric so we can diagnose the format
        sample_numeric = [
            w["text"] for w in all_words_global
            if any(c.isdigit() for c in w["text"]) and len(w["text"]) <= 12
        ][:20]
        _log(f"No amount columns found. Sample numeric-looking words: {sample_numeric}")
        debug.append("❌ No financial amounts detected — could not find transaction columns.")
        debug.append(f"   Sample words with digits: {sample_numeric[:10]}")
        debug.append("   If amounts use an unusual format, report this so support can be added.")
        return [], debug

    # Rightmost cluster = balance column (skip it)
    # Everything to its left = transaction columns (debit, credit, or single amount)
    # For TABLE DETECTION we use the leftmost amount column — most likely to have
    # a number on every transaction row (some rows only have a debit OR a credit,
    # but the leftmost non-balance column appears most frequently)
    # For EXTRACTION we skip only the balance column and keep everything else
    balance_col_x  = amount_cols[-1]
    # Pick the column with the most hits for table detection (most reliable anchor)
    all_words_nums = [w for w in all_words_global if _NUM_RE.match(w["text"])]
    col_counts = Counter(round(w["x0"] / 15) * 15 for w in all_words_nums)
    non_balance_cols = [x for x in amount_cols if x != balance_col_x]
    if not non_balance_cols:
        non_balance_cols = [balance_col_x]  # only one column — use it for detection

    _log(f"All amount columns: x={amount_cols}  |  counts={dict(col_counts)}")
    _log(f"  Detection columns: x={non_balance_cols}  |  Balance column (skip): x≈{balance_col_x}")
    debug.append(f"📊 Amount columns: x={amount_cols}")
    debug.append(f"   Detection columns: x={non_balance_cols}  |  Skipping balance at x≈{balance_col_x}")

    # ── Per-page table detection + row extraction ─────────────────────────
    all_table_lines: list[str] = []

    for page_num, words in pages_words:
        if not words:
            continue

        start_y, end_y = _find_table_y_range(words, non_balance_cols)

        if start_y is None:
            _log(f"  Page {page_num}: no table rows found — skipping")
            debug.append(f"  Page {page_num}: no table rows detected — skipping")
            continue

        _log(f"  Page {page_num}: table at y={start_y:.0f}–{end_y:.0f}")
        debug.append(f"  Page {page_num}: table at y={start_y:.0f}–{end_y:.0f}")

        # Raw dump — everything inside the table y-range before any column filtering
        raw_rows: dict[int, list[dict]] = {}
        for w in words:
            if start_y - 4 <= w["top"] <= end_y + 4:
                bucket = round(w["top"] / 4) * 4
                raw_rows.setdefault(bucket, []).append(w)

        _log(f"  Page {page_num}: RAW TABLE ({len(raw_rows)} rows):")
        debug.append(f"  Page {page_num}: raw table dump ({len(raw_rows)} rows):")
        for y in sorted(raw_rows):
            raw_line = " ".join(
                w["text"] for w in sorted(raw_rows[y], key=lambda w: w["x0"])
            )
            _log(f"    {raw_line}")
            debug.append(f"    {raw_line}")

        page_lines = _reconstruct_rows(words, balance_col_x, start_y, end_y)

        _log(f"  Page {page_num}: {len(page_lines)} lines after balance column removed")
        debug.append(f"  Page {page_num}: {len(page_lines)} lines after balance column removed")
        all_table_lines.extend(page_lines)

    if not all_table_lines:
        debug.append("❌ No table content extracted.")
        debug.append("   The PDF structure may be non-standard — try a different statement.")
        return [], debug

    _log(f"Total table lines across all pages: {len(all_table_lines)}")
    debug.append(f"✅ Total lines sent to LLM: {len(all_table_lines)}")
    debug.append("   Sample (first 8 lines):")
    for line in all_table_lines[:8]:
        debug.append(f"     {repr(line)}")

    return all_table_lines, debug


# ── Step 2: LLM call #1 — parse rows into structured transactions ─────────────

_PARSE_PROMPT = """You are parsing rows extracted from a bank statement transaction table.

Rows (date · description · amount — balance column already removed):
{lines}

Task: return a JSON array of transactions. One object per transaction.
Skip: column header rows, subtotal rows, blank rows, section labels.

IMPORTANT: If the rows do not contain real bank/credit card transactions with recognisable
dates, merchant descriptions, and amounts — return an empty array [].
Do NOT invent or fabricate transactions. If the input looks like a report, summary, or
non-transaction document, return [].

Each object must have exactly:
  "date"        — YYYY-MM-DD. If only month/day given (e.g. "4/24"), infer year from context. null if truly unknown.
  "description" — merchant or narrative text only. No amounts, no dates, no reference numbers.
  "amount"      — positive number always
  "type"        — "expense" | "income" | "unknown"

Determine type from description alone — not from sign or column position:
- expense : stores, restaurants, streaming, fuel, rent payments, ATM, phone bills
- income  : salary, payroll, direct deposit, Zelle received, BACS credit, interest
- unknown : bare "PAYMENT", bare "TRANSFER", pure reference codes with no merchant context

Multi-line transactions: if a description wraps across multiple rows before the amount
appears, merge all those rows into one transaction record.

Respond with ONLY a valid JSON array — no explanation, no markdown."""


def parse_transactions(lines: list[str], provider: str, api_key: str) -> tuple[list[dict], list[str]]:
    """LLM call #1 — converts extracted table lines into structured transaction list."""
    from modules.chat import _call_llm_simple
    debug: list[str] = []

    if not lines:
        debug.append("❌ No lines to parse")
        return [], debug

    chunks = [lines[i:i + 300] for i in range(0, len(lines), 300)]
    _log(f"Parsing {len(lines)} lines in {len(chunks)} chunk(s)")
    _log("ALL LINES BEING SENT TO LLM:")
    for i, line in enumerate(lines):
        _log(f"  [{i}] {line}")
    debug.append(f"🤖 LLM Call #1 — {len(lines)} lines · {len(chunks)} chunk(s)")

    all_transactions: list[dict] = []

    for idx, chunk in enumerate(chunks, start=1):
        _log(f"  Chunk {idx}/{len(chunks)}: {len(chunk)} lines")
        debug.append(f"  Chunk {idx}/{len(chunks)}: {len(chunk)} lines")
        prompt = _PARSE_PROMPT.format(lines="\n".join(chunk))

        try:
            raw = _call_llm_simple(prompt, provider, api_key, max_tokens=2000)
            _log(f"  Chunk {idx} response (first 300): {raw[:300]}")
            debug.append(f"  Response preview: {raw[:200]}{'…' if len(raw) > 200 else ''}")

            raw = raw.strip()
            m = re.search(r"```(?:json)?\s*(.*?)\s*```", raw, re.DOTALL)
            if m:
                raw = m.group(1)

            parsed = json.loads(raw)
            if isinstance(parsed, list):
                valid = [
                    tx for tx in parsed
                    if {"date", "description", "amount", "type"}.issubset(tx.keys())
                ]
                _log(f"  Chunk {idx}: {len(valid)} valid transactions")
                debug.append(f"  ✅ {len(valid)} transactions found")
                all_transactions.extend(valid)
            else:
                debug.append(f"  ⚠️ Expected JSON array, got {type(parsed).__name__}")

        except json.JSONDecodeError as e:
            _log(f"  Chunk {idx}: JSON error — {e} | raw: {raw[:200]}")
            debug.append(f"  ❌ JSON parse failed — {e}")
            debug.append(f"     Raw: {raw[:300]}")
        except Exception as e:
            _log(f"  Chunk {idx}: error — {e}")
            debug.append(f"  ❌ Error — {e}")

    by_type = {t: sum(1 for tx in all_transactions if tx.get("type") == t)
               for t in ("expense", "income", "unknown")}
    _log(f"Parse done — {len(all_transactions)} total: {by_type}")
    debug.append(
        f"📊 {len(all_transactions)} transactions total — "
        f"{by_type['expense']} expense · {by_type['income']} income · {by_type['unknown']} unknown"
    )
    return all_transactions, debug


# ── Step 3: LLM call #2 — assign each transaction a Vitals form category ──────

_CATEGORIZE_PROMPT = """You are assigning personal finance transactions to spending categories for a budgeting app.

The app has these expense categories (use EXACTLY these keys):
  rent          — rent, mortgage, housing payments
  groceries     — supermarkets, food shops, wholesale clubs
  transport     — fuel, transit, parking, ride-share, car insurance
  subscriptions — streaming, software, gym, phone bill, recurring services
  dining        — restaurants, cafes, takeaway, food delivery
  shopping      — clothing, electronics, retail, Amazon purchases
  other         — anything that doesn't clearly fit above
  income        — salary, payroll, direct deposit, Zelle received, bank transfers in

Transactions to categorize (one per line: index · description · amount · detected type):
{lines}

Return a JSON array — one entry per transaction, in the SAME ORDER as input.
Each entry: {{"index": 0, "category": "one of the keys above"}}

Respond with ONLY the JSON array — no explanation, no markdown."""


def categorize_expenses(transactions: list[dict], provider: str, api_key: str) -> tuple[list[dict], list[str]]:
    """
    LLM call #2 — assigns each transaction a Vitals form category.
    Returns the transactions list with a 'category' field added to each.
    """
    from modules.chat import _call_llm_simple
    debug: list[str] = []

    if not transactions:
        debug.append("⚠️ No transactions to categorize")
        return [], debug

    _log(f"Categorizing {len(transactions)} transactions")
    debug.append(f"🤖 LLM Call #2 — categorizing {len(transactions)} transactions")

    lines = "\n".join(
        f"{i} · {t['description']} · ${float(t['amount']):.2f} · {t.get('type', 'unknown')}"
        for i, t in enumerate(transactions)
    )

    try:
        raw = _call_llm_simple(
            _CATEGORIZE_PROMPT.format(lines=lines),
            provider, api_key,
            max_tokens=1000,
        )
        _log(f"Categorize response: {raw[:400]}")

        raw = raw.strip()
        m = re.search(r"```(?:json)?\s*(.*?)\s*```", raw, re.DOTALL)
        if m:
            raw = m.group(1)

        assignments = json.loads(raw)  # list of {"index": i, "category": "..."}
        valid_cats  = {"rent", "groceries", "transport", "subscriptions", "dining", "shopping", "other", "income"}

        result = [dict(t) for t in transactions]
        for entry in assignments:
            idx = entry.get("index")
            cat = entry.get("category", "other")
            if isinstance(idx, int) and 0 <= idx < len(result):
                result[idx]["category"] = cat if cat in valid_cats else "other"

        # Fill any missing categories based on detected type
        for t in result:
            if "category" not in t:
                t["category"] = "income" if t.get("type") == "income" else "other"

        _log(f"Categorize done — {len(result)} transactions assigned")
        debug.append(f"✅ {len(result)} transactions categorized")
        return result, debug

    except json.JSONDecodeError as e:
        _log(f"Categorize JSON error: {e} | raw: {raw[:300]}")
        debug.append(f"❌ JSON parse failed — {e}")
        return [], debug
    except Exception as e:
        _log(f"Categorize error: {e}")
        debug.append(f"❌ Error — {e}")
        return [], debug


# ── Convenience: full pipeline ────────────────────────────────────────────────

def run_import(pdf_bytes: bytes, provider: str, api_key: str) -> dict:
    """Full two-step import pipeline. Returns result dict with debug_log."""
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
