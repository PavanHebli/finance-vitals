"use client";

import { useState, useRef, useCallback } from "react";
import { X, Upload, Check, AlertCircle, Loader2, ChevronRight } from "lucide-react";
import { importPdf, Transaction } from "@/lib/api";
import { useStore } from "@/lib/store";
import { analytics } from "@/lib/analytics";

// ── Category → budget card defaults ──────────────────────────────────────────

const CATEGORY_CONFIG: Record<string, { label: string; purpose: "expense" | "saving"; color: string }> = {
  rent:          { label: "Rent",          purpose: "expense", color: "#ef4444" },
  groceries:     { label: "Groceries",     purpose: "expense", color: "#22c55e" },
  transport:     { label: "Transport",     purpose: "expense", color: "#f97316" },
  subscriptions: { label: "Subscriptions", purpose: "expense", color: "#a855f7" },
  dining:        { label: "Dining",        purpose: "expense", color: "#ec4899" },
  shopping:      { label: "Shopping",      purpose: "expense", color: "#f59e0b" },
  other:         { label: "Other",         purpose: "expense", color: "#64748b" },
  income:        { label: "Income",        purpose: "expense", color: "#5572f4" }, // handled separately
};

// ── Group + sum transactions by category (monthly avg) ────────────────────────

interface CategorySummary {
  category: string;
  label: string;
  monthlyTotal: number;
  count: number;
  purpose: "expense" | "saving";
  color: string;
  include: boolean;
}

function summarize(transactions: Transaction[]): CategorySummary[] {
  const map = new Map<string, { total: number; count: number; months: Set<string> }>();

  for (const tx of transactions) {
    if (tx.category === "income") continue; // skip income rows
    const entry = map.get(tx.category) ?? { total: 0, count: 0, months: new Set() };
    entry.total += tx.amount;
    entry.count += 1;
    if (tx.date) entry.months.add(tx.date.slice(0, 7));
    map.set(tx.category, entry);
  }

  return Array.from(map.entries())
    .map(([cat, { total, count, months }]) => {
      const cfg = CATEGORY_CONFIG[cat] ?? { label: cat, purpose: "expense", color: "#64748b" };
      const monthCount = Math.max(1, months.size);
      return {
        category: cat,
        label: cfg.label,
        monthlyTotal: Math.round(total / monthCount),
        count,
        purpose: cfg.purpose,
        color: cfg.color,
        include: true,
      };
    })
    .filter(s => s.monthlyTotal > 0)
    .sort((a, b) => b.monthlyTotal - a.monthlyTotal);
}

// ── Step 1: Upload ────────────────────────────────────────────────────────────

function UploadStep({
  onUploaded,
}: {
  onUploaded: (transactions: Transaction[]) => void;
}) {
  const [dragging,  setDragging]  = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const { formData } = useStore();

  async function process(file: File) {
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setError("Only PDF files are supported.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await importPdf(file, formData.provider || "", formData.apiKey || "");
      if (result.error) { setError(result.error); return; }
      if (!result.transactions.length) { setError("No transactions found in this statement."); return; }
      analytics.track("pdf_import_uploaded", { count: result.transactions.length });
      onUploaded(result.transactions);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) process(file);
  }, []);

  return (
    <div className="space-y-5">
      <div>
        <h3 className="font-semibold text-[var(--text)] mb-1">Import bank statement</h3>
        <p className="text-sm text-[var(--text-muted)]">
          We read the PDF locally, then send only merchant names and amounts for categorisation. Account numbers and personal details never leave your device.
        </p>
      </div>

      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => !loading && fileRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
          dragging
            ? "border-[var(--brand)] bg-[color-mix(in_srgb,var(--brand)_8%,transparent)]"
            : "border-[var(--border)] hover:border-[var(--brand)]/50 hover:bg-[var(--bg-2)]"
        }`}
      >
        <input
          ref={fileRef}
          type="file"
          accept=".pdf"
          className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) process(f); }}
        />
        {loading ? (
          <div className="space-y-3">
            <Loader2 size={28} className="animate-spin text-[var(--brand)] mx-auto" />
            <p className="text-sm text-[var(--text-muted)]">Reading statement…</p>
          </div>
        ) : (
          <div className="space-y-3">
            <Upload size={28} className="text-[var(--text-muted)] mx-auto" />
            <div>
              <p className="text-sm font-medium text-[var(--text)]">Drop your PDF here</p>
              <p className="text-xs text-[var(--text-muted)] mt-1">or click to browse</p>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-start gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 rounded-xl p-3">
          <AlertCircle size={15} className="shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}
    </div>
  );
}

// ── Step 2: Review categories ─────────────────────────────────────────────────

function ReviewStep({
  summaries,
  onChange,
  onConfirm,
  onBack,
}: {
  summaries: CategorySummary[];
  onChange: (updated: CategorySummary[]) => void;
  onConfirm: () => void;
  onBack: () => void;
}) {
  function toggleInclude(cat: string) {
    onChange(summaries.map(s => s.category === cat ? { ...s, include: !s.include } : s));
  }

  function updateLabel(cat: string, label: string) {
    onChange(summaries.map(s => s.category === cat ? { ...s, label } : s));
  }

  function updateAmount(cat: string, val: string) {
    const n = parseFloat(val);
    if (!isNaN(n)) onChange(summaries.map(s => s.category === cat ? { ...s, monthlyTotal: n } : s));
  }

  const included = summaries.filter(s => s.include);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold text-[var(--text)] mb-1">Review categories</h3>
        <p className="text-sm text-[var(--text-muted)]">
          Monthly averages from your statement. Uncheck anything you don&apos;t want as a card, or edit the amounts.
        </p>
      </div>

      <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
        {summaries.map(s => (
          <div
            key={s.category}
            className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition-opacity ${
              s.include ? "border-[var(--border)]" : "border-[var(--border)] opacity-40"
            }`}
          >
            {/* Color swatch */}
            <div className="w-3 h-3 rounded-full shrink-0" style={{ background: s.color }} />

            {/* Label input */}
            <input
              type="text"
              value={s.label}
              onChange={e => updateLabel(s.category, e.target.value)}
              disabled={!s.include}
              className="flex-1 bg-transparent text-sm font-medium text-[var(--text)] outline-none min-w-0"
            />

            {/* Amount input */}
            <div className="flex items-center gap-1 shrink-0">
              <span className="text-xs text-[var(--text-muted)]">$</span>
              <input
                type="number"
                value={s.monthlyTotal}
                onChange={e => updateAmount(s.category, e.target.value)}
                disabled={!s.include}
                className="w-20 bg-transparent text-sm tabular-nums font-semibold text-[var(--text)] outline-none text-right"
                min={0}
              />
              <span className="text-xs text-[var(--text-muted)]">/mo</span>
            </div>

            {/* Transaction count */}
            <span className="text-xs text-[var(--text-muted)] shrink-0 hidden sm:inline">
              {s.count} txn{s.count !== 1 ? "s" : ""}
            </span>

            {/* Toggle */}
            <button
              type="button"
              onClick={() => toggleInclude(s.category)}
              className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                s.include
                  ? "bg-[var(--brand)] border-[var(--brand)]"
                  : "border-[var(--border)] bg-[var(--bg)]"
              }`}
            >
              {s.include && <Check size={11} className="text-white" />}
            </button>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between pt-2">
        <button type="button" onClick={onBack} className="text-sm text-[var(--text-muted)] hover:text-[var(--text)] transition-colors">
          ← Back
        </button>
        <div className="flex items-center gap-3">
          <span className="text-xs text-[var(--text-muted)]">{included.length} card{included.length !== 1 ? "s" : ""} will be created</span>
          <button
            type="button"
            onClick={onConfirm}
            disabled={included.length === 0}
            className="btn-primary text-sm disabled:opacity-40 flex items-center gap-1.5"
          >
            Create cards <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Step 3: Conflict resolution ───────────────────────────────────────────────

type ConflictAction = "replace" | "keep" | "both" | "skip";

interface Conflict {
  summary: CategorySummary;
  existingCardId: string;
  existingLabel: string;
  existingBalance: number;
  action: ConflictAction;
}

function ConflictStep({
  conflicts,
  nonConflicts,
  onChange,
  onConfirm,
  onBack,
}: {
  conflicts: Conflict[];
  nonConflicts: CategorySummary[];
  onChange: (updated: Conflict[]) => void;
  onConfirm: () => void;
  onBack: () => void;
}) {
  function setAction(label: string, action: ConflictAction) {
    onChange(conflicts.map(c => c.existingLabel === label ? { ...c, action } : c));
  }

  const ACTIONS: { value: ConflictAction; label: string }[] = [
    { value: "replace", label: "Replace" },
    { value: "keep",    label: "Keep existing" },
    { value: "both",    label: "Keep both" },
    { value: "skip",    label: "Skip" },
  ];

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-semibold text-[var(--text)] mb-1">Resolve conflicts</h3>
        <p className="text-sm text-[var(--text-muted)]">
          Some cards with similar names already exist. Choose what to do for each.
        </p>
      </div>

      <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
        {conflicts.map(c => (
          <div key={c.existingLabel} className="rounded-xl border border-[var(--border)] p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: c.summary.color }} />
                <span className="text-sm font-medium text-[var(--text)]">{c.summary.label}</span>
              </div>
              <div className="flex flex-col items-end text-xs text-[var(--text-muted)]">
                <span>Import: <strong className="text-[var(--text)]">${c.summary.monthlyTotal}/mo</strong></span>
                <span>Existing: <strong className="text-[var(--text)]">${Math.round(c.existingBalance)}</strong></span>
              </div>
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {ACTIONS.map(a => (
                <button
                  key={a.value}
                  type="button"
                  onClick={() => setAction(c.existingLabel, a.value)}
                  className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${
                    c.action === a.value
                      ? "border-[var(--brand)] bg-[color-mix(in_srgb,var(--brand)_12%,transparent)] text-[var(--brand)] font-semibold"
                      : "border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--brand)]/40"
                  }`}
                >
                  {a.label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {nonConflicts.length > 0 && (
        <p className="text-xs text-[var(--text-muted)]">
          + {nonConflicts.length} new card{nonConflicts.length !== 1 ? "s" : ""} will be added without conflicts.
        </p>
      )}

      <div className="flex items-center justify-between pt-2">
        <button type="button" onClick={onBack} className="text-sm text-[var(--text-muted)] hover:text-[var(--text)] transition-colors">
          ← Back
        </button>
        <button type="button" onClick={onConfirm} className="btn-primary text-sm">
          Apply changes
        </button>
      </div>
    </div>
  );
}

// ── Root modal ────────────────────────────────────────────────────────────────

export function ImportPDFModal({ onClose }: { onClose: () => void }) {
  const [step,       setStep]       = useState<1 | 2 | 3>(1);
  const [summaries,  setSummaries]  = useState<CategorySummary[]>([]);
  const [conflicts,  setConflicts]  = useState<Conflict[]>([]);
  const [nonConflicts, setNonConflicts] = useState<CategorySummary[]>([]);

  const { budgetCards, addBudgetCard, updateBudgetCard } = useStore();

  function handleUploaded(transactions: Transaction[]) {
    setSummaries(summarize(transactions));
    setStep(2);
  }

  function handleReviewConfirm() {
    const included = summaries.filter(s => s.include);
    const customCards = budgetCards.filter(c => c.type === "custom");

    const newConflicts: Conflict[] = [];
    const newNonConflicts: CategorySummary[] = [];

    for (const s of included) {
      const existing = customCards.find(c =>
        c.label.toLowerCase().includes(s.label.toLowerCase()) ||
        s.label.toLowerCase().includes(c.label.toLowerCase())
      );
      if (existing) {
        newConflicts.push({
          summary: s,
          existingCardId: existing.id,
          existingLabel: existing.label,
          existingBalance: existing.balance,
          action: "keep",
        });
      } else {
        newNonConflicts.push(s);
      }
    }

    if (newConflicts.length > 0) {
      setConflicts(newConflicts);
      setNonConflicts(newNonConflicts);
      setStep(3);
    } else {
      applyCards(newNonConflicts, []);
    }
  }

  function applyCards(toCreate: CategorySummary[], resolvedConflicts: Conflict[]) {
    // Create new cards
    for (const s of toCreate) {
      addBudgetCard(s.label, "fixed", s.monthlyTotal, s.color, s.purpose, `Imported from bank statement`);
    }

    // Resolve conflicts
    for (const c of resolvedConflicts) {
      if (c.action === "replace") {
        updateBudgetCard(c.existingCardId, { allocationValue: c.summary.monthlyTotal });
      } else if (c.action === "both") {
        addBudgetCard(
          `${c.summary.label} (imported)`,
          "fixed",
          c.summary.monthlyTotal,
          c.summary.color,
          c.summary.purpose,
          "Imported from bank statement"
        );
      }
      // "keep" and "skip" — do nothing
    }

    analytics.track("pdf_import_applied", {
      created: toCreate.length,
      conflicts: resolvedConflicts.length,
    });

    onClose();
  }

  // Close on Escape
  const handleBackdrop = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(6px)" }}
      onClick={handleBackdrop}
    >
      <div
        className="w-full max-w-md bg-[var(--bg)] rounded-2xl shadow-2xl border border-[var(--border)] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
          <div className="flex items-center gap-3">
            {/* Step dots */}
            <div className="flex gap-1.5">
              {[1, 2, 3].map(s => (
                <div
                  key={s}
                  className="w-1.5 h-1.5 rounded-full transition-colors"
                  style={{ background: s <= step ? "var(--brand)" : "var(--border)" }}
                />
              ))}
            </div>
            <p className="text-sm font-semibold text-[var(--text)]">
              {step === 1 ? "Upload statement" : step === 2 ? "Review categories" : "Resolve conflicts"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[var(--bg-2)] text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
          >
            <X size={15} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          {step === 1 && <UploadStep onUploaded={handleUploaded} />}
          {step === 2 && (
            <ReviewStep
              summaries={summaries}
              onChange={setSummaries}
              onConfirm={handleReviewConfirm}
              onBack={() => setStep(1)}
            />
          )}
          {step === 3 && (
            <ConflictStep
              conflicts={conflicts}
              nonConflicts={nonConflicts}
              onChange={setConflicts}
              onConfirm={() => applyCards(nonConflicts, conflicts)}
              onBack={() => setStep(2)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
