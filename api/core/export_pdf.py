from fpdf import FPDF
from datetime import datetime

_LABEL_COLORS = {
    "Critical": (220, 53,  53),
    "At Risk":  (220, 110,  0),
    "Fair":     (160, 130,  0),
    "Good":     (28,  100, 200),
    "Healthy":  (0,   160, 67),
}

_STATUS_COLORS = {
    "danger":  (220, 53,  53),
    "warning": (220, 110,  0),
    "ok":      (160, 130,  0),
    "good":    (0,   160, 67),
}

_STATUS_LABELS = {"danger": "Danger", "warning": "Warning", "ok": "OK", "good": "Good"}

_REPLACEMENTS = [
    ("–", "-"), ("—", "-"), ("≥", ">="), ("≤", "<="), ("·", "."),
    (" ", " "), ("'", "'"), ("'", "'"), (""", '"'), (""", '"'),
    ("•", "-"), ("…", "..."),
]


def _safe(text: str) -> str:
    for bad, good in _REPLACEMENTS:
        text = text.replace(bad, good)
    return text.encode("latin-1", errors="ignore").decode("latin-1")


def _divider(pdf: FPDF, margin: int = 20) -> None:
    pdf.set_draw_color(220, 220, 220)
    pdf.set_line_width(0.2)
    pdf.line(margin, pdf.get_y(), pdf.w - margin, pdf.get_y())
    pdf.ln(7)


def generate_pdf(state: dict, metrics: dict, metric_scores: dict, overall_score: int, mirror: dict, narrative_text: str) -> bytes:
    from core.education import get_education

    pdf = FPDF()
    pdf.set_margins(20, 20, 20)
    pdf.set_auto_page_break(auto=True, margin=22)
    pdf.add_page()
    W = pdf.w - 40

    # Header
    pdf.set_font("Helvetica", "B", 8)
    pdf.set_text_color(160, 160, 160)
    pdf.cell(W / 2, 5, "VITALS - FINANCIAL HEALTH REPORT")
    pdf.set_font("Helvetica", "", 8)
    pdf.cell(W / 2, 5, f"Generated {datetime.now().strftime('%B %d, %Y')}", align="R")
    pdf.ln(14)

    # Score
    label = mirror.get("label", "")
    lr, lg, lb = _LABEL_COLORS.get(label, (100, 100, 100))
    pdf.set_font("Helvetica", "B", 52)
    pdf.set_text_color(30, 30, 30)
    pdf.cell(W, 28, str(overall_score), align="C")
    pdf.ln(28)
    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(130, 130, 130)
    pdf.cell(W, 5, "/ 100  |  Financial Health Score", align="C")
    pdf.ln(9)
    pdf.set_font("Helvetica", "B", 14)
    pdf.set_text_color(lr, lg, lb)
    pdf.cell(W, 7, label.upper(), align="C")
    pdf.ln(8)
    pdf.set_font("Helvetica", "", 9)
    pdf.set_text_color(110, 110, 110)
    pdf.multi_cell(W, 5, _safe(mirror.get("description", "")), align="C")
    pdf.ln(10)
    _divider(pdf)

    # Key numbers
    income = state.get("income_main", 0.0) + state.get("income_additional", 0.0)
    total_expenses = sum(state.get(f"expenses_{k}", 0.0) for k in ["rent", "groceries", "transport", "subscriptions", "dining", "shopping", "other"])
    savings    = state.get("savings_total", 0.0)
    debt_total = state.get("debt_total", 0.0)

    pdf.set_font("Helvetica", "B", 8)
    pdf.set_text_color(140, 140, 140)
    pdf.cell(W, 5, "KEY NUMBERS")
    pdf.ln(8)

    col_w = W / 4
    numbers = [("Monthly Income", f"${income:,.0f}"), ("Monthly Expenses", f"${total_expenses:,.0f}"), ("Savings", f"${savings:,.0f}"), ("Total Debt", f"${debt_total:,.0f}")]
    for _, val in numbers:
        pdf.set_font("Helvetica", "B", 15)
        pdf.set_text_color(30, 30, 30)
        pdf.cell(col_w, 8, val, align="C")
    pdf.ln(8)
    for lbl, _ in numbers:
        pdf.set_font("Helvetica", "", 8)
        pdf.set_text_color(140, 140, 140)
        pdf.cell(col_w, 5, lbl, align="C")
    pdf.ln(12)
    _divider(pdf)

    # Metrics breakdown
    pdf.set_font("Helvetica", "B", 8)
    pdf.set_text_color(140, 140, 140)
    pdf.cell(W, 5, "METRIC BREAKDOWN")
    pdf.ln(8)

    tiles = [
        ("Savings Rate",   f"{metrics['savings_rate']}%",            metric_scores["savings_rate"],           "Target >= 20%",    "50/30/20 rule"),
        ("Debt-to-Income", f"{metrics['debt_to_income']}%",          metric_scores["debt_to_income"],         "Safe zone < 20%",  "CFPB mortgage standard"),
        ("Emergency Fund", f"{metrics['emergency_fund_months']} mo", metric_scores["emergency_fund_months"],  "Goal: 3-6 months", "Fidelity / Vanguard"),
        ("Housing Ratio",  f"{metrics['housing_ratio']}%",           metric_scores["housing_ratio"],          "HUD limit <= 30%", "HUD affordability standard"),
    ]
    tile_col_w = W / 2
    for row in range(0, 4, 2):
        y_start = pdf.get_y()
        for col_idx, (name, value, score_data, benchmark, source) in enumerate(tiles[row:row + 2]):
            x = 20 + col_idx * tile_col_w
            sr, sg, sb = _STATUS_COLORS[score_data["status"]]
            pdf.set_draw_color(sr, sg, sb)
            pdf.set_line_width(2)
            pdf.line(x + 2, y_start, x + tile_col_w - 4, y_start)
            pdf.set_line_width(0.2)
            pdf.set_draw_color(220, 220, 220)
            pdf.set_xy(x + 3, y_start + 5)
            pdf.set_font("Helvetica", "", 7.5)
            pdf.set_text_color(140, 140, 140)
            pdf.cell(tile_col_w - 6, 5, name.upper())
            pdf.set_xy(x + 3, y_start + 11)
            pdf.set_font("Helvetica", "B", 22)
            pdf.set_text_color(30, 30, 30)
            pdf.cell(tile_col_w - 6, 11, value)
            pdf.set_xy(x + 3, y_start + 24)
            pdf.set_font("Helvetica", "B", 8.5)
            pdf.set_text_color(sr, sg, sb)
            pdf.cell(tile_col_w / 2, 5, _STATUS_LABELS[score_data["status"]])
            pdf.set_xy(x + 3 + tile_col_w / 2, y_start + 24)
            pdf.set_font("Helvetica", "", 7.5)
            pdf.set_text_color(160, 160, 160)
            pdf.cell(tile_col_w / 2 - 6, 5, benchmark, align="R")
            pdf.set_xy(x + 3, y_start + 30)
            pdf.set_font("Helvetica", "", 7)
            pdf.set_text_color(190, 190, 190)
            pdf.cell(tile_col_w - 6, 4, f"Source: {source}")
        pdf.set_y(y_start + 38)

    pdf.ln(4)
    flow = metric_scores["net_monthly_flow"]["value"]
    fr, fg, fb = (0, 160, 67) if flow >= 0 else (220, 53, 53)
    pdf.set_font("Helvetica", "", 9)
    pdf.set_text_color(80, 80, 80)
    pdf.cell(42, 6, "Cash left this month:")
    pdf.set_font("Helvetica", "B", 9)
    pdf.set_text_color(fr, fg, fb)
    pdf.cell(0, 6, f"${flow:,.2f}")
    pdf.ln(5)

    # Page 2: Narrative + Education
    pdf.add_page()
    pdf.set_font("Helvetica", "B", 8)
    pdf.set_text_color(160, 160, 160)
    pdf.cell(W / 2, 5, "VITALS - FINANCIAL HEALTH REPORT")
    pdf.set_font("Helvetica", "", 8)
    pdf.cell(W / 2, 5, f"Score: {overall_score}/100  |  {mirror.get('label', '')}", align="R")
    pdf.ln(12)
    _divider(pdf)

    pdf.set_font("Helvetica", "B", 8)
    pdf.set_text_color(140, 140, 140)
    pdf.cell(W, 5, "YOUR FINANCIAL STORY")
    pdf.ln(8)

    if narrative_text:
        clean = narrative_text
        for token in ["**", "__", "*", "_", "##", "#"]:
            clean = clean.replace(token, "")
        pdf.set_font("Helvetica", "", 10)
        pdf.set_text_color(40, 40, 40)
        pdf.multi_cell(W, 6, _safe(clean.strip()))
    else:
        pdf.set_font("Helvetica", "I", 9)
        pdf.set_text_color(160, 160, 160)
        pdf.cell(W, 6, "No narrative available.")

    pdf.ln(10)

    flagged = get_education(metric_scores)
    if flagged:
        _divider(pdf)
        pdf.set_font("Helvetica", "B", 8)
        pdf.set_text_color(140, 140, 140)
        pdf.cell(W, 5, "WHY THIS MATTERS")
        pdf.ln(8)
        for i, item in enumerate(flagged):
            sr, sg, sb = _STATUS_COLORS[item["status"]]
            pdf.set_font("Helvetica", "B", 10)
            pdf.set_text_color(sr, sg, sb)
            pdf.multi_cell(W, 6, _safe(item["title"]))
            pdf.ln(1)
            pdf.set_font("Helvetica", "", 9.5)
            pdf.set_text_color(50, 50, 50)
            pdf.multi_cell(W, 5.5, _safe(item["body"]))
            if i < len(flagged) - 1:
                pdf.ln(6)
        pdf.ln(8)

    _divider(pdf)
    pdf.set_font("Helvetica", "", 7.5)
    pdf.set_text_color(180, 180, 180)
    pdf.multi_cell(W, 4, "Generated by myfinancevitals.app  |  For informational purposes only - not financial advice. Consult a qualified financial advisor before making major financial decisions.", align="C")

    return bytes(pdf.output())
