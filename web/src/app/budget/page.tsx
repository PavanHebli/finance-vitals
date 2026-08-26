"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { Plus, Trash2, Pause, Play, ChevronDown, ArrowDownCircle, Info, X, Sparkles, FileUp, CheckCircle2 } from "lucide-react";
import { useStore, budgetToFormData } from "@/lib/store";
import { fetchScore, streamNarrative } from "@/lib/api";
import { analytics } from "@/lib/analytics";
import type { BudgetCard, DistributionLogEntry, FinancialProfile, Metrics, MetricScores } from "@/lib/types";
import { ImportPDFModal } from "@/components/ImportPDFModal";

// ── Auto-classifier ───────────────────────────────────────────────────────────

const SAVING_SIGNALS = [
  /\bsav(e|ing|ings)?\b/, /\bfund\b/, /\bgoal\b/, /\bdream\b/, /\bfuture\b/,
  /\bdown\s*payment\b/, /\bvacation\b/, /\bholiday\b/, /\btrip\b/,
  /\bwedding\b/, /\bretire(ment)?\b/, /\bemergency\b/, /\binvest(ment)?\b/,
  /\bcollege\b/, /\buniversity\b/,
  /\bbuy\b/, /\bpurchas/,                           // "buy a car", "purchase a house"
  /\bnew\s+(car|house|home|phone|laptop|bike)\b/,  // "new car", "new home"
  /\b(car|house|home|laptop|phone|bike)\s+(fund|goal|sav)/,
];

const EXPENSE_SIGNALS = [
  /\brent\b/, /\bmortgage\b/, /\bgroceries?\b/, /\bfood\b/,
  /\butilities?\b/, /\belectric(ity)?\b/, /\bwater bill\b/, /\binternet\b/,
  /\bphone\s*bill\b/, /\bsubscription\b/, /\bnetflix\b/, /\bspotify\b/,
  /\bgym\b/, /\bfitness\b/, /\binsurance\b/, /\bdining\b/, /\brestaurant\b/,
  /\btransport\b/, /\bcommute?\b/, /\bfuel\b/, /\bpetrol\b/, /\bgas\s*bill\b/,
  /\bclothing\b/, /\bshopping\b/, /\bentertainment\b/, /\bparking\b/,
  /\bmedical\b/, /\bhealthcare?\b/, /\bdental\b/, /\bloan\s*payment\b/,
  /\bmonthly\s*(bill|payment|expense)\b/,
];

function classifyCard(name: string, description = ""): "expense" | "saving" {
  const text = `${name} ${description}`.toLowerCase();
  const savingScore  = SAVING_SIGNALS.filter(p => p.test(text)).length;
  const expenseScore = EXPENSE_SIGNALS.filter(p => p.test(text)).length;
  return savingScore > 0 && savingScore >= expenseScore ? "saving" : "expense";
}

// ── Metric completeness ───────────────────────────────────────────────────────

const HOUSING_PATTERNS = [/rent/i, /mortgage/i, /housing/i, /home\s*loan/i, /hoa/i];

interface MetricStatus { complete: boolean; hint: string | null; }
interface BudgetCompleteness {
  savingsRate:   MetricStatus;
  debtToIncome:  MetricStatus;
  emergencyFund: MetricStatus;
  housingRatio:  MetricStatus;
}

function checkCompleteness(
  budgetCards: BudgetCard[],
  distributionLog: DistributionLogEntry[],
  profile: FinancialProfile,
): BudgetCompleteness {
  const income        = distributionLog[0]?.incomeAmount ?? budgetCards.find(c => c.type === "income")?.balance ?? 0;
  const hasIncome     = income > 0;
  const custom        = budgetCards.filter(c => c.type === "custom");
  const expenseCards  = custom.filter(c => (c.purpose ?? "expense") === "expense");
  const savingCards   = custom.filter(c => c.purpose === "saving");
  const hasExpenses   = expenseCards.length > 0;
  const hasSavings    = savingCards.length > 0 || (profile.profileComplete && profile.savingsTotal > 0);
  const hasHousing    = expenseCards.some(c =>
    HOUSING_PATTERNS.some(p => p.test(c.label + " " + (c.description ?? "")))
  );

  return {
    savingsRate: {
      complete: hasIncome && hasSavings,
      hint: !hasSavings ? "Add a savings envelope or enter total savings in your profile" : null,
    },
    debtToIncome: {
      complete: hasIncome && profile.profileComplete,
      hint: !profile.profileComplete ? "Complete your financial profile to include debt payments" : null,
    },
    emergencyFund: {
      complete: profile.profileComplete && hasExpenses,
      hint: !profile.profileComplete
        ? "Complete your financial profile to include total savings"
        : !hasExpenses
        ? "Add expense cards so we can estimate your monthly spending"
        : null,
    },
    housingRatio: {
      complete: hasIncome && hasHousing,
      hint: !hasHousing ? "Add a Rent or Mortgage card" : null,
    },
  };
}

// ── Partial score ─────────────────────────────────────────────────────────────

const COMPLETENESS_TO_METRIC: [keyof BudgetCompleteness, keyof MetricScores][] = [
  ["savingsRate",   "savings_rate"],
  ["debtToIncome",  "debt_to_income"],
  ["emergencyFund", "emergency_fund_months"],
  ["housingRatio",  "housing_ratio"],
];

function computePartialScore(
  metricScores: MetricScores,
  completeness: BudgetCompleteness,
): { score: number; count: number } {
  const complete = COMPLETENESS_TO_METRIC.filter(([ck]) => completeness[ck].complete);
  if (complete.length === 0) return { score: 0, count: 0 };
  const sum = complete.reduce((acc, [, mk]) => {
    const ms = metricScores[mk];
    return acc + (typeof ms === "object" && "score" in ms ? ms.score : 0);
  }, 0);
  return { score: Math.round(sum / complete.length), count: complete.length };
}

// ── Constants ─────────────────────────────────────────────────────────────────

const CARD_COLORS = [
  "#5572f4", "#22c55e", "#f59e0b", "#a855f7",
  "#ec4899", "#ef4444", "#14b8a6", "#f97316",
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function computePreview(cards: BudgetCard[]): Map<string, number> | null {
  const incomeCard = cards.find(c => c.type === "income");
  if (!incomeCard || incomeCard.balance <= 0) return null;

  const income       = incomeCard.balance;
  const activeCustom = cards.filter(c => c.type === "custom" && !c.paused);
  const fixedCards   = activeCustom.filter(c => c.allocationMode === "fixed");
  const percentCards = activeCustom.filter(c => c.allocationMode === "percent");

  const totalFixed = fixedCards.reduce((sum, c) => sum + c.allocationValue, 0);
  if (totalFixed > income) return null;

  const remaining    = income - totalFixed;
  const totalPercent = percentCards.reduce((sum, c) => sum + c.allocationValue, 0);
  if (totalPercent > 100) return null;

  const preview = new Map<string, number>();
  for (const c of fixedCards)   preview.set(c.id, c.allocationValue);
  for (const c of percentCards) preview.set(c.id, remaining * c.allocationValue / 100);

  const cashCard = cards.find(c => c.type === "cash");
  if (cashCard) preview.set(cashCard.id, remaining * (1 - totalPercent / 100));

  return preview;
}

function getLastStats(cardId: string, log: DistributionLogEntry[]) {
  if (log.length === 0) return { amount: null, percent: null };
  const latest = log[0];
  const entry  = latest.allocations.find(a => a.cardId === cardId);
  if (!entry) return { amount: null, percent: null };
  const percent = latest.incomeAmount > 0 ? (entry.amount / latest.incomeAmount) * 100 : null;
  return { amount: entry.amount, percent };
}

// ── Income Card — plain, functional ──────────────────────────────────────────

function IncomeCard({ card }: { card: BudgetCard }) {
  const { addBudgetIncome } = useStore();
  const [input, setInput]   = useState("");

  function handleAdd() {
    const amount = parseFloat(input.replace(/[^0-9.]/g, ""));
    if (!amount || amount <= 0) return;
    addBudgetIncome(amount);
    setInput("");
    analytics.track("budget_income_added", { amount });
  }

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-2)] p-6 flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]">Income</span>
        <span className="text-xs bg-[var(--bg)] border border-[var(--border)] px-2.5 py-1 rounded-full text-[var(--text-muted)]">
          Source
        </span>
      </div>

      <div>
        <p className="text-xs text-[var(--text-muted)] mb-1">Available to split</p>
        <p className="text-5xl font-bold tabular-nums text-[var(--text)] leading-none">{fmt(card.balance)}</p>
      </div>

      <div className="flex gap-2 mt-auto">
        <input
          type="number"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") handleAdd(); }}
          placeholder="Add income…"
          className="input flex-1 text-sm"
          min={0}
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={!input || parseFloat(input) <= 0}
          className="btn-primary text-sm disabled:opacity-40 shrink-0"
        >
          Add
        </button>
      </div>
    </div>
  );
}

// ── Cash in Hand Card — plain, functional ─────────────────────────────────────

function CashInHandCard({ card, preview }: { card: BudgetCard; preview?: number }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-2)] p-6 flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]">Cash in Hand</span>
        <span className="text-xs bg-[var(--bg)] border border-[var(--border)] px-2.5 py-1 rounded-full text-[var(--text-muted)]">
          Remainder
        </span>
      </div>

      <div>
        <p className="text-xs text-[var(--text-muted)] mb-1">Accumulated</p>
        <p className="text-5xl font-bold tabular-nums text-[var(--text)] leading-none">{fmt(card.balance)}</p>
      </div>

      <div className="mt-auto">
        {preview !== undefined && preview > 0 ? (
          <p className="text-sm text-[var(--text-muted)]">
            Next split: <span className="font-semibold text-[var(--text)] tabular-nums">+{fmt(preview)}</span>
          </p>
        ) : (
          <p className="text-sm text-[var(--text-muted)]">Receives unallocated income each split</p>
        )}
      </div>
    </div>
  );
}

// ── Category Card — colored top, white bottom ─────────────────────────────────

function CategoryCard({
  card,
  preview,
  log,
}: {
  card: BudgetCard;
  preview?: number;
  log: DistributionLogEntry[];
}) {
  const { updateBudgetCard, deleteBudgetCard, toggleBudgetPause, updateBudgetSaved } = useStore();
  const [editingName,   setEditingName]   = useState(false);
  const [editingAlloc,  setEditingAlloc]  = useState(false);
  const [editingSaved,  setEditingSaved]  = useState(false);
  const [nameVal,       setNameVal]       = useState(card.label);
  const [allocVal,      setAllocVal]      = useState(String(card.allocationValue));
  const [savedVal,      setSavedVal]      = useState(String(card.savedSoFar ?? 0));
  const [confirmDelete, setConfirmDelete] = useState(false);

  const goalAchieved = card.purpose === "saving" && card.goalAmount && (card.savedSoFar ?? 0) >= card.goalAmount;
  const goalPct      = card.goalAmount ? Math.min(100, ((card.savedSoFar ?? 0) / card.goalAmount) * 100) : 0;

  const { amount: lastAmount, percent: lastPercent } = getLastStats(card.id, log);

  function saveName() {
    if (nameVal.trim()) updateBudgetCard(card.id, { label: nameVal.trim() });
    setEditingName(false);
  }

  function saveAlloc() {
    const val = parseFloat(allocVal);
    if (!isNaN(val) && val >= 0) updateBudgetCard(card.id, { allocationValue: val });
    setEditingAlloc(false);
  }

  function toggleMode() {
    updateBudgetCard(card.id, { allocationMode: card.allocationMode === "percent" ? "fixed" : "percent", allocationValue: 0 });
    setAllocVal("0");
  }

  const allocSummary = card.allocationValue === 0
    ? "Tap to set allocation"
    : card.allocationMode === "percent"
      ? `${card.allocationValue}% of income`
      : `${fmt(card.allocationValue)} fixed`;

  return (
    <div
      className={`budget-card rounded-2xl overflow-hidden shadow-md ${card.paused ? "opacity-55" : ""}`}
    >
      {/* ── Colored top section ── */}
      <div
        className="relative px-4 pt-3 pb-5 flex flex-col justify-between"
        style={{ background: card.color, minHeight: "7rem" }}
      >
        {/* Top row: purpose chip (left) + action buttons (right) */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => updateBudgetCard(card.id, {
                purpose: (card.purpose ?? "expense") === "expense" ? "saving" : "expense",
              })}
              className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full transition-colors ${
                (card.purpose ?? "expense") === "saving"
                  ? "bg-white/30 text-white hover:bg-white/45"
                  : "bg-white/15 text-white/75 hover:bg-white/25"
              }`}
              title="Tap to toggle: expense / saving"
            >
              {(card.purpose ?? "expense") === "saving" ? "Saving" : "Expense"}
            </button>
            {goalAchieved && (
              <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-white/30 text-white px-2 py-0.5 rounded-full">
                <CheckCircle2 size={9} /> Done
              </span>
            )}
            {card.paused && (
              <span className="text-[10px] font-bold uppercase tracking-wider bg-white/25 text-white px-2 py-0.5 rounded-full">
                Paused
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => toggleBudgetPause(card.id)}
              className="p-1.5 rounded-lg bg-white/15 hover:bg-white/30 text-white transition-colors"
              title={card.paused ? "Resume" : "Pause"}
            >
              {card.paused ? <Play size={12} /> : <Pause size={12} />}
            </button>

            {confirmDelete ? (
              <>
                <button
                  type="button"
                  onClick={() => { deleteBudgetCard(card.id); analytics.track("budget_card_deleted"); }}
                  className="text-[11px] font-semibold px-2 py-1 bg-white/30 hover:bg-white/50 text-white rounded-lg transition-colors"
                >
                  Confirm
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="p-1.5 rounded-lg bg-white/15 hover:bg-white/30 text-white transition-colors text-xs leading-none"
                >
                  ✕
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="p-1.5 rounded-lg bg-white/15 hover:bg-white/30 text-white transition-colors"
                title="Delete"
              >
                <Trash2 size={12} />
              </button>
            )}
          </div>
        </div>

        {/* Title — large, white, bottom of colored section */}
        <div className="mt-2">
          {editingName ? (
            <input
              autoFocus
              value={nameVal}
              onChange={e => setNameVal(e.target.value)}
              onBlur={saveName}
              onKeyDown={e => { if (e.key === "Enter") saveName(); if (e.key === "Escape") setEditingName(false); }}
              className="bg-white/20 text-white font-bold text-2xl rounded-lg px-2 py-0.5 outline-none focus:bg-white/30 w-full"
            />
          ) : (
            <h3
              className="text-white font-bold text-2xl leading-tight cursor-pointer hover:text-white/80 transition-colors"
              onClick={() => setEditingName(true)}
              title="Click to rename"
            >
              {card.label}
            </h3>
          )}
        </div>
      </div>

      {/* ── White bottom section ── */}
      <div className="bg-[var(--bg-2)] px-4 py-4 flex flex-col gap-3">
        {/* Accumulated balance */}
        <div>
          <p className="text-[11px] text-[var(--text-muted)] mb-0.5">Accumulated</p>
          <p className="text-2xl font-bold tabular-nums text-[var(--text)] leading-none">{fmt(card.balance)}</p>
        </div>

        {/* Allocation + stats */}
        <div className="border-t border-[var(--border)] pt-3 space-y-1">
          {editingAlloc ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleMode}
                className="text-xs px-2 py-1 border border-[var(--border)] hover:bg-[var(--bg)] rounded-lg transition-colors font-semibold text-[var(--text-muted)]"
              >
                {card.allocationMode === "percent" ? "%" : "$"}
              </button>
              <input
                autoFocus
                type="number"
                value={allocVal}
                onChange={e => setAllocVal(e.target.value)}
                onBlur={saveAlloc}
                onKeyDown={e => { if (e.key === "Enter") saveAlloc(); if (e.key === "Escape") setEditingAlloc(false); }}
                className="input flex-1 text-sm py-1"
                min={0}
              />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => { setAllocVal(String(card.allocationValue)); setEditingAlloc(true); }}
              className={`text-sm text-left ${card.allocationValue === 0 ? "text-[var(--text-muted)] italic" : "text-[var(--text)]"} hover:text-[var(--brand)] transition-colors`}
            >
              {allocSummary}
            </button>
          )}

          {lastAmount !== null && (
            <p className="text-xs text-[var(--text-muted)] tabular-nums">
              {fmt(lastAmount)}{lastPercent !== null ? ` · ${lastPercent.toFixed(1)}%` : ""}{" "}
              <span className="text-[var(--text-muted)]/60">last split</span>
            </p>
          )}

          {preview !== undefined && preview > 0 && (
            <p className="text-xs text-[var(--text-muted)] tabular-nums">
              Next: <span className="font-semibold text-[var(--text)]">+{fmt(preview)}</span>
            </p>
          )}
        </div>

        {/* Goal progress — only for saving cards with a goal set */}
        {card.purpose === "saving" && card.goalAmount && (
          <div className="border-t border-[var(--border)] pt-3 space-y-2">
            <div className="flex items-center justify-between">
              {goalAchieved ? (
                <div className="flex items-center gap-1.5 text-green-500">
                  <CheckCircle2 size={13} />
                  <span className="text-xs font-semibold">Goal reached</span>
                </div>
              ) : (
                <span className="text-xs text-[var(--text-muted)]">
                  {fmt(card.savedSoFar ?? 0)} of {fmt(card.goalAmount)}
                </span>
              )}
              <span className="text-xs font-semibold tabular-nums" style={{ color: goalAchieved ? "#22c55e" : "var(--text-muted)" }}>
                {goalPct.toFixed(0)}%
              </span>
            </div>

            {/* Progress bar */}
            <div className="h-1 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${goalPct}%`, background: goalAchieved ? "#22c55e" : card.color }}
              />
            </div>

            {/* Update saved amount */}
            {editingSaved ? (
              <div className="flex gap-2 items-center pt-0.5">
                <span className="text-xs text-[var(--text-muted)]">Saved so far $</span>
                <input
                  type="number"
                  min={0}
                  value={savedVal}
                  onChange={e => setSavedVal(e.target.value)}
                  className="input py-0.5 text-xs w-24"
                  autoFocus
                  onKeyDown={e => {
                    if (e.key === "Enter") {
                      updateBudgetSaved(card.id, parseFloat(savedVal) || 0);
                      setEditingSaved(false);
                    }
                    if (e.key === "Escape") setEditingSaved(false);
                  }}
                />
                <button type="button" onClick={() => { updateBudgetSaved(card.id, parseFloat(savedVal) || 0); setEditingSaved(false); }} className="btn-primary py-0.5 px-2 text-xs">Save</button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => { setSavedVal(String(card.savedSoFar ?? 0)); setEditingSaved(true); }}
                className="text-xs text-[var(--brand)] hover:underline"
              >
                Update saved amount
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Add Card Form ─────────────────────────────────────────────────────────────

function AddCardForm({ onClose }: { onClose: () => void }) {
  const { addBudgetCard } = useStore();
  const [label,       setLabel]       = useState("");
  const [description, setDescription] = useState("");
  const [mode,        setMode]        = useState<"percent" | "fixed">("percent");
  const [value,       setValue]       = useState("");
  const [color,       setColor]       = useState(CARD_COLORS[2]);
  const [purpose,     setPurpose]     = useState<"expense" | "saving">("expense");
  const [autoLabeled, setAutoLabeled] = useState(false);
  const [goalAmount,  setGoalAmount]  = useState("");

  // Re-classify whenever name or description changes, but only if user hasn't manually toggled
  useEffect(() => {
    if (!label && !description) return;
    const guessed = classifyCard(label, description);
    setPurpose(guessed);
    setAutoLabeled(true);
  }, [label, description]);

  function handleSubmit() {
    if (!label.trim()) return;
    const goal = purpose === "saving" && goalAmount ? parseFloat(goalAmount) : undefined;
    addBudgetCard(label.trim(), mode, parseFloat(value) || 0, color, purpose, description.trim(), goal);
    analytics.track("budget_card_added", { allocationMode: mode, purpose, hasGoal: !!goal });
    onClose();
  }

  const purposeLabel   = purpose === "saving" ? "Saving goal" : "Monthly expense";
  const purposeHint    = purpose === "saving"
    ? "Won't count as an expense — improves your savings rate."
    : "Counted as a recurring monthly expense in your score.";

  return (
    <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--bg-2)] p-6 space-y-5">
      <p className="font-semibold text-[var(--text)]">New category</p>

      {/* Card preview */}
      <div
        className="rounded-xl px-4 py-3 flex items-end justify-between"
        style={{ background: color, minHeight: "4rem" }}
      >
        <p className="text-white font-bold text-xl">{label || "Category name"}</p>
        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
          purpose === "saving" ? "bg-white/30 text-white" : "bg-white/15 text-white/80"
        }`}>
          {purposeLabel}
        </span>
      </div>

      {/* Name */}
      <div>
        <label className="text-xs text-[var(--text-muted)] mb-1 block">Name</label>
        <input
          autoFocus
          type="text"
          value={label}
          onChange={e => setLabel(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") handleSubmit(); if (e.key === "Escape") onClose(); }}
          placeholder="e.g. Travel, Emergency fund, Rent…"
          className="input text-sm"
        />
      </div>

      {/* Description — drives auto-classification */}
      <div>
        <label className="text-xs text-[var(--text-muted)] mb-1 block">
          What's it for? <span className="text-[var(--text-muted)]/60">(optional — helps us classify it)</span>
        </label>
        <input
          type="text"
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="e.g. Saving to buy a car in 2026, or monthly Netflix subscription"
          className="input text-sm"
        />
      </div>

      {/* Auto-classification result — user can flip it */}
      {(label || description) && (
        <div className="flex items-center gap-3 text-sm">
          <span className="text-[var(--text-muted)]">
            {autoLabeled ? "Looks like a" : "Type:"}
          </span>
          <button
            type="button"
            onClick={() => setPurpose(p => p === "expense" ? "saving" : "expense")}
            className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
              purpose === "saving"
                ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                : "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400"
            }`}
          >
            {purposeLabel}
          </button>
          <span className="text-xs text-[var(--text-muted)]/70 hidden sm:inline">tap to change</span>
        </div>
      )}
      {(label || description) && (
        <p className="text-xs text-[var(--text-muted)] -mt-2">{purposeHint}</p>
      )}

      {/* Allocation + Color */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-xs text-[var(--text-muted)] mb-1 block">Allocation</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setMode(m => m === "percent" ? "fixed" : "percent")}
              className="btn-secondary text-sm px-3 shrink-0"
            >
              {mode === "percent" ? "%" : "$"}
            </button>
            <input
              type="number"
              value={value}
              onChange={e => setValue(e.target.value)}
              placeholder={mode === "percent" ? "10" : "500"}
              className="input flex-1 text-sm"
              min={0}
            />
          </div>
        </div>

        <div>
          <label className="text-xs text-[var(--text-muted)] mb-2 block">Color</label>
          <div className="flex gap-2 flex-wrap">
            {CARD_COLORS.map(c => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className="w-7 h-7 rounded-full transition-transform hover:scale-110"
                style={{ background: c, outline: color === c ? `3px solid ${c}` : "none", outlineOffset: 2 }}
              />
            ))}
          </div>
        </div>
      </div>

      <p className="text-xs text-[var(--text-muted)]">
        Leave allocation at 0 to set later — unallocated income flows to Cash in Hand.
      </p>

      {/* Goal amount — saving cards only */}
      {purpose === "saving" && (
        <div>
          <label className="text-xs text-[var(--text-muted)] mb-1 block">
            Goal amount <span className="text-[var(--text-muted)]/60">(optional — shows a progress bar on the card)</span>
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] text-sm">$</span>
            <input
              type="number"
              value={goalAmount}
              onChange={e => setGoalAmount(e.target.value)}
              placeholder="e.g. 15,000"
              className="input pl-7 text-sm"
              min={0}
            />
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <button type="button" onClick={handleSubmit} disabled={!label.trim()} className="btn-primary text-sm disabled:opacity-40">
          Add category
        </button>
        <button type="button" onClick={onClose} className="btn-secondary text-sm">
          Cancel
        </button>
      </div>
    </div>
  );
}

// ── Distribution Log ──────────────────────────────────────────────────────────

function LogPanel({ log }: { log: DistributionLogEntry[] }) {
  const [open, setOpen] = useState(false);
  if (log.length === 0) return null;

  return (
    <div className="border-t border-[var(--border)] pt-6">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 text-sm font-semibold text-[var(--text)] hover:text-[var(--brand)] transition-colors mb-4"
      >
        <ChevronDown size={15} className={`transition-transform ${open ? "rotate-180" : ""}`} />
        Split history ({log.length})
      </button>

      {open && (
        <div className="space-y-3">
          {log.map(entry => (
            <div key={entry.id} className="rounded-xl border border-[var(--border)] bg-[var(--bg-2)] p-4">
              <div className="flex items-baseline justify-between mb-3">
                <p className="font-semibold text-[var(--text)] tabular-nums">{fmt(entry.incomeAmount)} split</p>
                <p className="text-xs text-[var(--text-muted)]">
                  {new Date(entry.timestamp).toLocaleString("en-US", {
                    month: "short", day: "numeric", year: "numeric",
                    hour: "2-digit", minute: "2-digit",
                  })}
                </p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-1.5">
                {entry.allocations.filter(a => a.amount > 0).map(a => (
                  <div key={a.cardId} className="flex items-center justify-between text-xs gap-2">
                    <span className="text-[var(--text-muted)] truncate">{a.label}</span>
                    <span className="font-semibold text-[var(--text)] tabular-nums shrink-0">{fmt(a.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Narrative Popup ───────────────────────────────────────────────────────────

function NarrativePopup({
  text,
  loading,
  mirrorLabel,
  onClose,
}: {
  text: string;
  loading: boolean;
  mirrorLabel: string | null;
  onClose: () => void;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(6px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="narrative-popup-enter w-full max-w-md bg-[var(--bg)] rounded-2xl shadow-2xl border border-[var(--border)] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
          <div className="flex items-center gap-2">
            <Sparkles size={15} className="text-[var(--brand)]" />
            <p className="font-semibold text-[var(--text)] text-sm">
              {mirrorLabel ? `${mirrorLabel} — AI Insight` : "AI Insight"}
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

        {/* Content */}
        <div className="px-6 py-5 max-h-[65vh] overflow-y-auto">
          {loading && !text && (
            <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
              <div className="w-4 h-4 border border-[var(--brand)] border-t-transparent rounded-full animate-spin shrink-0" />
              <span>Analyzing your budget…</span>
            </div>
          )}
          {text && (
            <div className="prose-vitals text-sm text-[var(--text)] leading-relaxed">
              {text}
              {loading && (
                <span className="inline-block w-0.5 h-4 bg-[var(--brand)] ml-0.5 animate-pulse rounded-sm align-middle" />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Metric Pills ──────────────────────────────────────────────────────────────

const PILL_LABELS: Record<keyof BudgetCompleteness, string> = {
  savingsRate:   "Savings",
  debtToIncome:  "DTI",
  emergencyFund: "Emergency",
  housingRatio:  "Housing",
};

function MetricPills({ completeness }: { completeness: BudgetCompleteness }) {
  const [open, setOpen] = useState<keyof BudgetCompleteness | null>(null);

  const entries = Object.entries(completeness) as [keyof BudgetCompleteness, MetricStatus][];

  function toggle(key: keyof BudgetCompleteness, status: MetricStatus) {
    if (status.complete) return;
    setOpen(prev => prev === key ? null : key);
  }

  const openHint = open ? completeness[open].hint : null;

  return (
    <div className="space-y-2">
      <div className="flex gap-1.5 flex-wrap justify-center">
        {entries.map(([key, status]) => (
          <button
            key={key}
            type="button"
            onClick={() => toggle(key, status)}
            disabled={status.complete}
            className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border transition-colors ${
              status.complete
                ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800/60 text-green-700 dark:text-green-400 cursor-default"
                : open === key
                ? "bg-orange-100 dark:bg-orange-900/30 border-orange-300 dark:border-orange-700 text-orange-700 dark:text-orange-300"
                : "bg-orange-50 dark:bg-orange-900/15 border-orange-200 dark:border-orange-800/50 text-orange-600 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-900/25 cursor-pointer"
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${status.complete ? "bg-green-500" : "bg-orange-500"}`} />
            {PILL_LABELS[key]}{!status.complete && " ?"}
          </button>
        ))}
      </div>

      {openHint && (
        <p className="text-[11px] leading-relaxed text-[var(--text)] bg-orange-50 dark:bg-orange-900/15 border border-orange-200 dark:border-orange-800/40 rounded-lg px-3 py-2">
          <span className="font-semibold text-orange-600 dark:text-orange-400">{PILL_LABELS[open!]} not calculated. </span>
          {openHint}
        </p>
      )}
    </div>
  );
}

// ── Score Ring + Card ─────────────────────────────────────────────────────────

const RING_COLORS: Record<string, string> = {
  Critical: "#dc3535", "At Risk": "#dc6e00",
  Fair:     "#a08200", Good:     "#3b82f6", Healthy: "#22c55e",
};
const LABEL_COLORS: Record<string, string> = {
  Critical: "text-red-500",   "At Risk": "text-orange-500",
  Fair:     "text-yellow-600 dark:text-yellow-400",
  Good:     "text-blue-500",  Healthy:   "text-green-500",
};

function ScoreRing({ score, mirrorLabel }: { score: number; mirrorLabel: string }) {
  const [displayScore, setDisplayScore] = useState(0);
  const [ringReady,    setRingReady]    = useState(false);

  useEffect(() => {
    setDisplayScore(0);
    setRingReady(false);
    const ringTimer = setTimeout(() => setRingReady(true), 80);
    const duration  = 900;
    const start     = performance.now();
    let raf: number;
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased    = 1 - Math.pow(1 - progress, 3);
      setDisplayScore(Math.round(eased * score));
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { clearTimeout(ringTimer); cancelAnimationFrame(raf); };
  }, [score]);

  const color        = RING_COLORS[mirrorLabel]  || "#6b7280";
  const circumference = 2 * Math.PI * 40;
  const targetOffset  = circumference - (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-28 h-28 shrink-0">
        <div className="absolute inset-0 rounded-full opacity-20 blur-xl" style={{ background: color }} />
        <svg className="relative w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="40" fill="none" stroke="var(--border)" strokeWidth="7" />
          <circle
            cx="50" cy="50" r="40" fill="none"
            stroke={color} strokeWidth="7" strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={ringReady ? targetOffset : circumference}
            style={{ transition: "stroke-dashoffset 1s cubic-bezier(0.34, 1.56, 0.64, 1)" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-extrabold leading-none text-[var(--text)] tabular-nums">{displayScore}</span>
          <span className="text-[10px] text-[var(--text-muted)] mt-0.5">/ 100</span>
        </div>
      </div>
      <p className={`text-sm font-bold text-center ${LABEL_COLORS[mirrorLabel] || "text-[var(--text)]"}`}>
        {mirrorLabel}
      </p>
    </div>
  );
}

function EmptyRing({ label }: { label: string }) {
  const circumference = 2 * Math.PI * 40;
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-28 h-28">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="40" fill="none" stroke="var(--border)" strokeWidth="7"
            strokeDasharray="6 4" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[var(--text-muted)] text-3xl font-bold">—</span>
        </div>
      </div>
      <p className="text-xs text-[var(--text-muted)] text-center">{label}</p>
    </div>
  );
}

function ScoreCard({
  profileComplete, hasIncome, score, mirrorLabel, metrics, loading,
  narrativeReady, narrativeStreaming, completeness,
  partialScore, partialCount,
  onOpenFlow, onRecalculate, onOpenNarrative,
}: {
  profileComplete: boolean;
  hasIncome: boolean;
  score: number | null;
  mirrorLabel: string | null;
  metrics: Metrics | null;
  loading: boolean;
  narrativeReady: boolean;
  narrativeStreaming: boolean;
  completeness: BudgetCompleteness | null;
  partialScore: number | null;
  partialCount: number;
  onOpenFlow: () => void;
  onRecalculate: () => void;
  onOpenNarrative: () => void;
}) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-2)] p-6 flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-widest text-[var(--text-muted)]">Health Score</span>
        <div className="flex items-center gap-2">
          {/* AI insight icon — glows when narrative is ready */}
          <button
            type="button"
            onClick={onOpenNarrative}
            disabled={!narrativeReady && !narrativeStreaming}
            title={narrativeReady ? "View AI insight" : narrativeStreaming ? "Generating insight…" : "Calculate score first"}
            className={`p-1.5 rounded-full transition-all disabled:opacity-30 ${
              narrativeReady
                ? "text-[var(--brand)] ring-2 ring-[var(--brand)]/50 ring-offset-1 ring-offset-[var(--bg-2)] shadow-sm"
                : narrativeStreaming
                  ? "text-[var(--brand)]/60"
                  : "text-[var(--text-muted)]"
            }`}
          >
            {narrativeStreaming && !narrativeReady ? (
              <div className="w-3.5 h-3.5 border border-[var(--brand)] border-t-transparent rounded-full animate-spin" />
            ) : (
              <Info size={14} />
            )}
          </button>
          <span className="text-xs bg-[var(--bg)] border border-[var(--border)] px-2.5 py-1 rounded-full text-[var(--text-muted)]">
            Live
          </span>
        </div>
      </div>

      {/* Ring area */}
      <div className="flex-1 flex items-center justify-center py-1">
        {loading ? (
          <div className="flex flex-col items-center gap-3">
            <div className="w-7 h-7 border-2 border-[var(--brand)] border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-[var(--text-muted)]">Calculating…</p>
          </div>
        ) : partialScore !== null && mirrorLabel ? (
          <div className="flex flex-col items-center gap-1.5">
            <ScoreRing score={partialScore} mirrorLabel={mirrorLabel} />
            {partialCount < 4 && (
              <span className="text-[10px] text-[var(--text-muted)] bg-[var(--bg)] border border-[var(--border)] px-2 py-0.5 rounded-full">
                {partialCount} of 4 metrics
              </span>
            )}
          </div>
        ) : score !== null && mirrorLabel ? (
          <ScoreRing score={score} mirrorLabel={mirrorLabel} />
        ) : !profileComplete ? (
          <EmptyRing label="3 questions away" />
        ) : (
          <EmptyRing label={hasIncome ? "Ready to calculate" : "Add income first"} />
        )}
      </div>

      {/* Metric pills — shown once user has income */}
      {hasIncome && completeness && (
        <MetricPills completeness={completeness} />
      )}

      {/* Net flow — only when score available */}
      {score !== null && metrics && (
        <p className="text-xs text-[var(--text-muted)] text-center -mt-1">
          Net flow:{" "}
          <span className={metrics.net_monthly_flow >= 0 ? "text-green-500 font-medium" : "text-red-500 font-medium"}>
            ${metrics.net_monthly_flow.toLocaleString("en-US", { maximumFractionDigits: 0 })}/mo
          </span>
        </p>
      )}

      {/* CTA */}
      <div className="mt-auto">
        {!profileComplete ? (
          <button type="button" onClick={onOpenFlow} className="btn-primary text-sm w-full">
            Complete profile →
          </button>
        ) : score !== null ? (
          <div className="flex gap-2">
            <button type="button" onClick={onRecalculate} className="btn-secondary text-sm flex-1 text-xs">
              Recalculate
            </button>
            <Link href="/results" className="btn-primary text-sm flex-1 text-center text-xs px-2">
              Full analysis →
            </Link>
          </div>
        ) : (
          <button
            type="button"
            onClick={onRecalculate}
            disabled={!hasIncome}
            className="btn-primary text-sm w-full disabled:opacity-40"
          >
            Calculate score
          </button>
        )}
      </div>
    </div>
  );
}

// ── Question Flow ─────────────────────────────────────────────────────────────

type ProfileDraft = { debtTotal: string; debtMonthly: string; savingsTotal: string };

const PROFILE_QUESTIONS: { key: keyof ProfileDraft; label: string; hint: string }[] = [
  {
    key: "debtTotal",
    label: "What's your total debt?",
    hint: "All loans, credit cards, student debt — everything you owe.",
  },
  {
    key: "debtMonthly",
    label: "How much do you pay toward debt each month?",
    hint: "Combined minimum payments on all loans and credit cards.",
  },
  {
    key: "savingsTotal",
    label: "How much do you have saved in total?",
    hint: "Emergency fund, savings accounts, any liquid investments.",
  },
];

function QuestionFlow({
  onComplete,
  onSkip,
}: {
  onComplete: (data: { debtTotal: number; debtMonthly: number; savingsTotal: number }) => void;
  onSkip: () => void;
}) {
  const [step, setStep] = useState(0);
  const [vals, setVals] = useState<ProfileDraft>({ debtTotal: "", debtMonthly: "", savingsTotal: "" });

  const q = PROFILE_QUESTIONS[step];
  const isLast = step === PROFILE_QUESTIONS.length - 1;

  function advance() {
    if (isLast) {
      onComplete({
        debtTotal:    parseFloat(vals.debtTotal)    || 0,
        debtMonthly:  parseFloat(vals.debtMonthly)  || 0,
        savingsTotal: parseFloat(vals.savingsTotal) || 0,
      });
    } else {
      setStep(s => s + 1);
    }
  }

  return (
    <div className="rounded-2xl border border-[var(--brand)] bg-[var(--bg-2)] p-6 space-y-5">
      {/* Progress */}
      <div className="flex items-center gap-1.5">
        {PROFILE_QUESTIONS.map((_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-all ${
              i < step ? "bg-[var(--brand)]" : i === step ? "bg-[var(--brand)]/60" : "bg-[var(--border)]"
            }`}
          />
        ))}
        <span className="text-xs text-[var(--text-muted)] ml-1 shrink-0">{step + 1} / {PROFILE_QUESTIONS.length}</span>
      </div>

      <div>
        <p className="text-lg font-semibold text-[var(--text)] mb-1">{q.label}</p>
        <p className="text-sm text-[var(--text-muted)]">{q.hint}</p>
      </div>

      <div className="flex gap-3 items-center flex-wrap">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] text-sm select-none">$</span>
          <input
            key={step}
            autoFocus
            type="number"
            min={0}
            placeholder="0"
            value={vals[q.key]}
            onChange={e => setVals(v => ({ ...v, [q.key]: e.target.value }))}
            onKeyDown={e => { if (e.key === "Enter") advance(); }}
            className="input pl-7 text-base w-44"
          />
        </div>
        <button type="button" onClick={advance} className="btn-primary">
          {isLast ? "Calculate score" : "Next →"}
        </button>
        {step === 0 && (
          <button
            type="button"
            onClick={onSkip}
            className="text-sm text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
          >
            Skip for now
          </button>
        )}
      </div>
    </div>
  );
}

// ── Financial Profile Card ─────────────────────────────────────────────────────

function ProfileField({
  label,
  value,
  onSave,
}: {
  label: string;
  value: number;
  onSave: (v: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  function save() {
    const n = parseFloat(draft);
    if (!isNaN(n) && n >= 0) onSave(n);
    setEditing(false);
  }

  return (
    <div className="flex items-center justify-between text-sm gap-4 py-2.5">
      <span className="text-[var(--text-muted)]">{label}</span>
      {editing ? (
        <div className="relative">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] text-xs select-none">$</span>
          <input
            autoFocus
            type="number"
            min={0}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onBlur={save}
            onKeyDown={e => {
              if (e.key === "Enter") save();
              if (e.key === "Escape") setEditing(false);
            }}
            className="input text-sm py-1 pl-6 pr-2 w-32 text-right"
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => { setDraft(String(value)); setEditing(true); }}
          className="font-semibold tabular-nums text-[var(--text)] hover:text-[var(--brand)] transition-colors"
          title="Click to edit"
        >
          {fmt(value)}
        </button>
      )}
    </div>
  );
}

function FinancialProfileCard({
  profile,
  onUpdate,
}: {
  profile: FinancialProfile;
  onUpdate: (updates: Partial<FinancialProfile>) => void;
}) {
  if (!profile.profileComplete) return null;

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-2)] p-5">
      <p className="text-sm font-semibold text-[var(--text)] mb-0.5">Financial Profile</p>
      <p className="text-xs text-[var(--text-muted)] mb-3">Tap any value to edit — score updates automatically.</p>
      <div className="divide-y divide-[var(--border)]">
        <ProfileField
          label="Total debt"
          value={profile.debtTotal}
          onSave={v => onUpdate({ debtTotal: v })}
        />
        <ProfileField
          label="Monthly debt payments"
          value={profile.debtMonthly}
          onSave={v => onUpdate({ debtMonthly: v })}
        />
        <ProfileField
          label="Total savings"
          value={profile.savingsTotal}
          onSave={v => onUpdate({ savingsTotal: v })}
        />
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function BudgetPage() {
  const {
    budgetCards, distributionLog, distributeBudget,
    financialProfile, setFinancialProfile,
    overallScore, mirror, metrics, setResults,
    formData,
    narrativeText, narrativeLoading: narrativeStreaming,
    setNarrativeText, appendNarrative, setNarrativeLoading,
  } = useStore();

  const [showAddForm,       setShowAddForm]       = useState(false);
  const [distributeError,   setDistributeError]   = useState("");
  const [distributeSuccess, setDistributeSuccess] = useState(false);
  const [showQuestionFlow,  setShowQuestionFlow]  = useState(false);
  const [scoreLoading,      setScoreLoading]      = useState(false);
  const [showNarrative,     setShowNarrative]     = useState(false);
  const [showImport,        setShowImport]        = useState(false);

  const incomeCard  = budgetCards.find(c => c.type === "income")!;
  const cashCard    = budgetCards.find(c => c.type === "cash")!;
  const customCards = budgetCards.filter(c => c.type === "custom");
  const preview     = computePreview(budgetCards);

  const income       = distributionLog[0]?.incomeAmount ?? incomeCard.balance;
  const hasIncome    = income > 0;
  const completeness = hasIncome
    ? checkCompleteness(budgetCards, distributionLog, financialProfile)
    : null;

  // Partial score: average only the metrics we have data for, reweighting equally
  const { metricScores } = useStore();
  const partial = (completeness && metricScores)
    ? computePartialScore(metricScores, completeness)
    : null;
  const displayScore  = partial && partial.count > 0 ? partial.score : (overallScore !== null ? Math.round(overallScore) : null);
  const partialCount  = partial?.count ?? 4;

  // ── Score calculation ───────────────────────────────────────────────────────

  async function calculateScoreWith(profile: FinancialProfile) {
    if (!hasIncome) return;
    setScoreLoading(true);
    setNarrativeText("");
    try {
      const form = budgetToFormData(budgetCards, distributionLog, profile);
      const result = await fetchScore(form);
      setResults(result.metrics, result.metric_scores, result.overall_score, result.mirror);
      analytics.track("budget_score_calculated");
      // Stream narrative in background — score loading finishes immediately
      setNarrativeLoading(true);
      streamNarrative(
        {
          form_data: form,
          metrics: result.metrics,
          metric_scores: result.metric_scores,
          overall_score: result.overall_score,
          mirror: result.mirror,
          provider: formData.provider || "",
          api_key: formData.apiKey || "",
        },
        (chunk) => appendNarrative(chunk),
      ).catch(() => {}).finally(() => setNarrativeLoading(false));
    } catch {
      // silent — user can retry via Recalculate button
    } finally {
      setScoreLoading(false);
    }
  }

  function handleProfileComplete(data: { debtTotal: number; debtMonthly: number; savingsTotal: number }) {
    const updated: FinancialProfile = { ...data, profileComplete: true };
    setFinancialProfile(updated);
    setShowQuestionFlow(false);
    calculateScoreWith(updated);
  }

  // Auto-recalculate (debounced 1.5 s) whenever budget cards or profile values change
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!financialProfile.profileComplete || !hasIncome) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      calculateScoreWith(financialProfile);
    }, 1500);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [budgetCards, distributionLog, financialProfile.debtTotal, financialProfile.debtMonthly, financialProfile.savingsTotal]);

  const activeCustom    = customCards.filter(c => !c.paused);
  const totalPercent    = activeCustom.filter(c => c.allocationMode === "percent").reduce((s, c) => s + c.allocationValue, 0);
  const totalFixed      = activeCustom.filter(c => c.allocationMode === "fixed").reduce((s, c) => s + c.allocationValue, 0);
  const percentOverflow = totalPercent > 100;
  const fixedOverflow   = incomeCard.balance > 0 && totalFixed > incomeCard.balance;

  function handleDistribute() {
    setDistributeError("");
    setDistributeSuccess(false);
    const result = distributeBudget();
    if (!result.success) {
      setDistributeError(result.error);
    } else {
      setDistributeSuccess(true);
      setTimeout(() => setDistributeSuccess(false), 3000);
      analytics.track("budget_split", { card_count: customCards.length });
    }
  }

  return (
    <div className="px-4 md:px-8 lg:px-12 py-8 space-y-8 max-w-[1440px] mx-auto">

      {/* Page header */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text)]">Budget Planner</h1>
          <p className="text-sm text-[var(--text-muted)] mt-1">
            Divide your income across envelopes. Split each month to track what builds up where.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => { setShowImport(true); analytics.track("pdf_import_opened"); }}
            className="btn-secondary flex items-center gap-2 text-sm"
          >
            <FileUp size={14} />
            Import statement
          </button>
          <button
            type="button"
            onClick={handleDistribute}
            disabled={incomeCard.balance <= 0}
            className="btn-primary flex items-center gap-2 disabled:opacity-40"
          >
            <ArrowDownCircle size={15} />
            Split
          </button>
        </div>
      </div>

      {/* Profile question flow — appears when user clicks "Complete profile" on score card */}
      {showQuestionFlow && (
        <QuestionFlow
          onComplete={handleProfileComplete}
          onSkip={() => setShowQuestionFlow(false)}
        />
      )}

      {/* Feedback banners */}
      {distributeError && (
        <div className="text-sm text-red-500 bg-red-500/10 rounded-lg px-4 py-3 border border-red-500/20">
          {distributeError}
        </div>
      )}
      {distributeSuccess && (
        <div className="text-sm text-green-600 dark:text-green-400 bg-green-500/10 rounded-lg px-4 py-3 border border-green-500/20">
          Income split. Check the history below.
        </div>
      )}

      {/* Allocation summary */}
      {activeCustom.length > 0 && (
        <div className="flex flex-wrap gap-4 text-sm">
          {totalPercent > 0 && (
            <span className={percentOverflow ? "text-red-500 font-medium" : "text-[var(--text-muted)]"}>
              <span className={`font-semibold ${percentOverflow ? "" : "text-[var(--text)]"}`}>{totalPercent}%</span>
              {percentOverflow ? " — over 100%" : " allocated (%)"}
            </span>
          )}
          {totalFixed > 0 && (
            <span className={fixedOverflow ? "text-red-500 font-medium" : "text-[var(--text-muted)]"}>
              <span className={`font-semibold tabular-nums ${fixedOverflow ? "" : "text-[var(--text)]"}`}>{fmt(totalFixed)}</span>
              {fixedOverflow ? " — exceeds income" : " fixed"}
            </span>
          )}
        </div>
      )}

      {/* Narrative popup — centered, flip animation */}
      {showNarrative && (
        <NarrativePopup
          text={narrativeText}
          loading={narrativeStreaming}
          mirrorLabel={mirror?.label ?? null}
          onClose={() => setShowNarrative(false)}
        />
      )}

      {/* Top row: Income · Cash in Hand · Health Score — same visual weight */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <IncomeCard card={incomeCard} />
        <CashInHandCard card={cashCard} preview={preview?.get(cashCard.id)} />
        <ScoreCard
          profileComplete={financialProfile.profileComplete}
          hasIncome={hasIncome}
          score={overallScore !== null ? Math.round(overallScore) : null}
          mirrorLabel={mirror?.label ?? null}
          metrics={metrics}
          loading={scoreLoading}
          narrativeReady={narrativeText.length > 0}
          narrativeStreaming={narrativeStreaming}
          completeness={completeness}
          partialScore={displayScore}
          partialCount={partialCount}
          onOpenFlow={() => setShowQuestionFlow(true)}
          onRecalculate={() => calculateScoreWith(financialProfile)}
          onOpenNarrative={() => setShowNarrative(true)}
        />
      </div>

      {/* Category cards — 4 per row */}
      {customCards.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {customCards.map(card => (
            <CategoryCard
              key={card.id}
              card={card}
              preview={preview?.get(card.id)}
              log={distributionLog}
            />
          ))}
        </div>
      )}

      {/* Add category */}
      {showAddForm ? (
        <AddCardForm onClose={() => setShowAddForm(false)} />
      ) : (
        <button
          type="button"
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
        >
          <Plus size={15} />
          Add category
        </button>
      )}

      {/* Financial profile — shows once complete, inline editing */}
      <FinancialProfileCard
        profile={financialProfile}
        onUpdate={updates => setFinancialProfile(updates)}
      />

      {/* Split log */}
      <LogPanel log={distributionLog} />

      {/* PDF Import Modal */}
      {showImport && <ImportPDFModal onClose={() => setShowImport(false)} />}

    </div>
  );
}
