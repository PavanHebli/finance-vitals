"use client";

import { useState, useCallback, useRef } from "react";
import * as Slider from "@radix-ui/react-slider";
import { ArrowRight, ChevronDown, ChevronUp, Loader2, X } from "lucide-react";
import { useStore, toApiFormData } from "@/lib/store";
import { fetchSimulate, fetchSimulateInterpret } from "@/lib/api";
import { analytics } from "@/lib/analytics";
import type { Metrics, MetricScores, FormData } from "@/lib/types";

// ── Status ────────────────────────────────────────────────────────────────────

type Status = "danger" | "warning" | "ok" | "good";

const S_TEXT: Record<Status, string> = {
  good:    "text-green-500",
  ok:      "text-emerald-500",
  warning: "text-amber-500",
  danger:  "text-red-500",
};
const S_DOT: Record<Status, string> = {
  good:    "bg-green-500",
  ok:      "bg-emerald-400",
  warning: "bg-amber-400",
  danger:  "bg-red-500",
};

// ── Health area definitions ───────────────────────────────────────────────────

interface AreaData {
  key: string;
  title: string;
  subtitle: string;
  status: Status;
  label: string;
  value: string;
  hint?: string;
  formula: string;
}

const AREA_LABELS: Record<string, Record<Status, string>> = {
  debt:      { good: "Manageable",  ok: "Moderate",   warning: "Significant", danger: "Heavy"      },
  rent:      { good: "Affordable",  ok: "Acceptable", warning: "Stretching",  danger: "Straining"  },
  savings:   { good: "Healthy",     ok: "Growing",    warning: "Low",         danger: "Not saving" },
  emergency: { good: "Protected",   ok: "Building",   warning: "Thin",        danger: "Vulnerable" },
  cashflow:  { good: "Positive",    ok: "Balanced",   warning: "Tight",       danger: "Negative"   },
};

function flowStatus(v: number): Status {
  if (v > 200)  return "good";
  if (v >= 0)   return "ok";
  if (v > -200) return "warning";
  return "danger";
}

function buildAreas(metrics: Metrics, scores: MetricScores, fd: FormData): AreaData[] {
  const income  = fd.incomeMain + fd.incomeAdditional;
  const rent    = fd.expensesRent;
  const debt    = fd.debtMonthly;
  const savings = fd.savingsTotal;
  const expTotal =
    fd.expensesRent + fd.expensesGroceries + fd.expensesTransport +
    fd.expensesSubscriptions + fd.expensesDining + fd.expensesShopping + fd.expensesOther;
  const fmt = (n: number) => `$${Math.round(n).toLocaleString()}`;

  const debtSt = scores.debt_to_income.status as Status;
  const rentSt = scores.housing_ratio.status as Status;
  const saveSt = scores.savings_rate.status as Status;
  const efSt   = scores.emergency_fund_months.status as Status;
  const cfSt   = flowStatus(metrics.net_monthly_flow);

  const savingsNotEntered = savings === 0 && metrics.savings_rate > 5;

  return [
    {
      key: "debt", title: "Debt burden",
      subtitle: "% of income going to debt payments",
      status: debtSt, label: AREA_LABELS.debt[debtSt],
      value: income > 0 ? `${metrics.debt_to_income.toFixed(1)}% of income` : "—",
      formula: income > 0
        ? `${fmt(debt)}/mo in debt payments\n÷ ${fmt(income)}/mo income\n= ${metrics.debt_to_income.toFixed(1)}% going to debt\n\nGoal: keep this below 20%`
        : "Enter your income to see the breakdown",
    },
    {
      key: "rent", title: "Rent burden",
      subtitle: "% of income going to housing",
      status: rentSt, label: AREA_LABELS.rent[rentSt],
      value: income > 0 ? `${metrics.housing_ratio.toFixed(1)}% of income` : "—",
      formula: income > 0
        ? `${fmt(rent)}/mo rent\n÷ ${fmt(income)}/mo income\n= ${metrics.housing_ratio.toFixed(1)}% going to housing\n\nGoal: keep this below 30%`
        : "Enter your income to see the breakdown",
    },
    {
      key: "savings", title: "Monthly savings",
      subtitle: "% of each paycheck you keep",
      status: saveSt, label: AREA_LABELS.savings[saveSt],
      value: income > 0 ? `${metrics.savings_rate.toFixed(1)}% of income` : "—",
      formula: income > 0
        ? `${fmt(income)} income − ${fmt(expTotal)} total expenses\n= ${fmt(income - expTotal)} kept each month\n= ${metrics.savings_rate.toFixed(1)}% of income\n\nGoal: save at least 20%`
        : "Enter your income to see the breakdown",
    },
    {
      key: "emergency", title: "Emergency fund",
      subtitle: "months your saved-up money would cover",
      status: efSt, label: AREA_LABELS.emergency[efSt],
      value: savings > 0
        ? `${metrics.emergency_fund_months.toFixed(1)} months covered`
        : "No savings balance entered",
      hint: savingsNotEntered
        ? "You're saving well each month — but this measures your total savings balance, not your monthly savings rate. Add your current savings in Section 3 of the form to see your real coverage."
        : undefined,
      formula: expTotal > 0 && savings > 0
        ? `${fmt(savings)} total savings balance\n÷ ${fmt(expTotal)}/mo in expenses\n= ${metrics.emergency_fund_months.toFixed(1)} months you could survive without income\n\nGoal: cover 3–6 months of expenses`
        : savingsNotEntered
          ? "You haven't entered a savings balance yet.\nGo to Section 3 of the form → add your total savings.\nThis is separate from your monthly savings rate."
          : "Enter your expenses and savings balance to see the breakdown",
    },
    {
      key: "cashflow", title: "Monthly cash flow",
      subtitle: "money left after all expenses each month",
      status: cfSt, label: AREA_LABELS.cashflow[cfSt],
      value: `${metrics.net_monthly_flow >= 0 ? "+" : ""}${fmt(metrics.net_monthly_flow)}/mo`,
      formula: `${fmt(income)} income\n− ${fmt(expTotal)} expenses\n− ${fmt(debt)} debt payments\n= ${metrics.net_monthly_flow >= 0 ? "+" : ""}${fmt(metrics.net_monthly_flow)} left over each month`,
    },
  ];
}

// ── Area card ─────────────────────────────────────────────────────────────────

function AreaCard({ area, simArea }: { area: AreaData; simArea?: AreaData }) {
  const [open, setOpen] = useState(false);
  // Only show before→after treatment when the status word itself changes
  const statusChanged = simArea != null && simArea.status !== area.status;
  const active        = simArea ?? area;

  return (
    <div className={`card space-y-2 transition-shadow ${statusChanged ? "ring-1 ring-[var(--brand)]" : ""}`}>
      <div>
        <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">{area.title}</p>
        <p className="text-xs text-[var(--text-muted)] opacity-60">{area.subtitle}</p>
      </div>

      {statusChanged ? (
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-sm font-medium ${S_TEXT[area.status]}`}>{area.label}</span>
          <ArrowRight size={13} className="text-[var(--text-muted)] shrink-0" />
          <span className={`text-base font-bold ${S_TEXT[simArea!.status]}`}>{simArea!.label}</span>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full shrink-0 ${S_DOT[active.status]}`} />
          <span className={`text-base font-bold ${S_TEXT[active.status]}`}>{active.label}</span>
        </div>
      )}

      <p className="text-sm text-[var(--text-muted)]">{active.value}</p>

      {active.hint && (
        <p className="text-xs text-amber-500 bg-amber-50 dark:bg-amber-950/30 rounded-lg px-3 py-2 leading-relaxed">
          {active.hint}
        </p>
      )}

      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1 text-xs text-[var(--text-muted)] hover:text-[var(--text)] transition-colors pt-1"
      >
        {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        How is this calculated?
      </button>

      {open && (
        <p className="text-xs text-[var(--text-muted)] bg-[var(--surface-alt,var(--border))] rounded-lg px-3 py-2.5 leading-relaxed whitespace-pre-line font-mono">
          {active.formula}
        </p>
      )}
    </div>
  );
}

// ── Slider config ─────────────────────────────────────────────────────────────

interface SliderConfig {
  key:           string;
  label:         string;
  field:         string;
  affects:       string;
  goodDirection: "up" | "down";
  min:           number;
  step:          number;
  getMax:        (fd: FormData) => number;
  format:        (v: number) => string;
  getThreshold?: (fd: FormData) => number | null;
  thresholdLabel?: string;
}

const SLIDERS: SliderConfig[] = [
  {
    key: "income", label: "Monthly income", field: "income_main",
    affects: "all five areas", goodDirection: "up",
    min: 0, step: 100,
    getMax: (fd) => Math.max(fd.incomeMain * 2, 15000),
    format: (v) => `$${v.toLocaleString()}`,
  },
  {
    key: "rent", label: "Rent / Mortgage", field: "expenses_rent",
    affects: "rent burden · savings · cash flow", goodDirection: "down",
    min: 0, step: 50,
    getMax: (fd) => Math.max(fd.expensesRent * 2, 5000),
    format: (v) => `$${v.toLocaleString()}`,
    getThreshold: (fd) => fd.incomeMain > 0 ? Math.round(fd.incomeMain * 0.30 / 50) * 50 : null,
    thresholdLabel: "30% limit",
  },
  {
    key: "groceries", label: "Groceries", field: "expenses_groceries",
    affects: "savings · cash flow", goodDirection: "down",
    min: 0, step: 25,
    getMax: (fd) => Math.max(fd.expensesGroceries * 3, 1500),
    format: (v) => `$${v.toLocaleString()}`,
  },
  {
    key: "transport", label: "Transport", field: "expenses_transport",
    affects: "savings · cash flow", goodDirection: "down",
    min: 0, step: 25,
    getMax: (fd) => Math.max(fd.expensesTransport * 3, 1500),
    format: (v) => `$${v.toLocaleString()}`,
  },
  {
    key: "subscriptions", label: "Subscriptions", field: "expenses_subscriptions",
    affects: "savings · cash flow", goodDirection: "down",
    min: 0, step: 10,
    getMax: (fd) => Math.max(fd.expensesSubscriptions * 3, 500),
    format: (v) => `$${v.toLocaleString()}`,
  },
  {
    key: "dining", label: "Dining out", field: "expenses_dining",
    affects: "savings · cash flow", goodDirection: "down",
    min: 0, step: 25,
    getMax: (fd) => Math.max(fd.expensesDining * 3, 2000),
    format: (v) => `$${v.toLocaleString()}`,
  },
  {
    key: "shopping", label: "Shopping", field: "expenses_shopping",
    affects: "savings · cash flow", goodDirection: "down",
    min: 0, step: 25,
    getMax: (fd) => Math.max(fd.expensesShopping * 3, 2000),
    format: (v) => `$${v.toLocaleString()}`,
  },
  {
    key: "other", label: "Other expenses", field: "expenses_other",
    affects: "savings · cash flow", goodDirection: "down",
    min: 0, step: 25,
    getMax: (fd) => Math.max(fd.expensesOther * 3, 1000),
    format: (v) => `$${v.toLocaleString()}`,
  },
  {
    key: "debt", label: "Monthly debt payments", field: "debt_monthly",
    affects: "debt burden · cash flow", goodDirection: "down",
    min: 0, step: 50,
    getMax: (fd) => Math.max(fd.debtMonthly * 3, 3000),
    format: (v) => `$${v.toLocaleString()}`,
    getThreshold: (fd) => fd.incomeMain > 0 ? Math.round(fd.incomeMain * 0.20 / 50) * 50 : null,
    thresholdLabel: "20% safe zone",
  },
  {
    key: "savings", label: "Total savings", field: "savings_total",
    affects: "emergency fund", goodDirection: "up",
    min: 0, step: 500,
    getMax: (fd) => Math.max(fd.savingsTotal * 3, 50000),
    format: (v) => `$${v.toLocaleString()}`,
    getThreshold: (fd) => {
      const monthly = fd.expensesRent + fd.expensesGroceries + fd.expensesTransport +
        fd.expensesSubscriptions + fd.expensesDining + fd.expensesShopping + fd.expensesOther;
      return monthly > 0 ? Math.round(monthly * 3 / 500) * 500 : null;
    },
    thresholdLabel: "3-month fund",
  },
];

const FORM_TO_SLIDER: Record<string, keyof FormData> = {
  income_main:            "incomeMain",
  expenses_rent:          "expensesRent",
  expenses_groceries:     "expensesGroceries",
  expenses_transport:     "expensesTransport",
  expenses_subscriptions: "expensesSubscriptions",
  expenses_dining:        "expensesDining",
  expenses_shopping:      "expensesShopping",
  expenses_other:         "expensesOther",
  debt_monthly:           "debtMonthly",
  savings_total:          "savingsTotal",
};

// ── Scenario chips — built from the user's actual data ───────────────────────

function buildChips(fd: FormData): string[] {
  const chips: string[] = ["I'm getting a $500 raise", "Starting a side hustle ($800/month)"];
  if (fd.expensesRent > 0)          chips.push("Moving to a cheaper apartment");
  if (fd.debtMonthly > 0 || fd.debtTotal > 0) chips.push("Paying off my debt");
  if (fd.expensesDining > 0)        chips.push("Cut dining out in half");
  if (fd.expensesSubscriptions > 0) chips.push("Cancel unused subscriptions");
  if (fd.expensesTransport > 0)     chips.push("Switch to public transport");
  return chips.slice(0, 5);
}

// ── Component ─────────────────────────────────────────────────────────────────

export function Simulator() {
  const { formData, overallScore, metricScores, metrics } = useStore();

  const [values, setValues] = useState<Record<string, number>>(() =>
    Object.fromEntries(SLIDERS.map((s) => [s.key, (formData[FORM_TO_SLIDER[s.field]] as number) || 0]))
  );

  const [simScore,        setSimScore]        = useState<number | null>(null);
  const [simMetrics,      setSimMetrics]      = useState<Metrics | null>(null);
  const [simMetricScores, setSimMetricScores] = useState<MetricScores | null>(null);
  const [simFd,           setSimFd]           = useState<FormData | null>(null);
  const [simLoading,      setSimLoading]      = useState(false);

  const [scenario,          setScenario]          = useState("");
  const [activeLabel,       setActiveLabel]       = useState<string | null>(null);
  const [interpretLoading,  setInterpretLoading]  = useState(false);
  const [interpretError,    setInterpretError]    = useState<string | null>(null);

  const debounceRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const trackedOnce  = useRef(false);

  // Build a merged formData from slider values for formula display
  function buildSimFd(vals: Record<string, number>): FormData {
    return {
      ...formData,
      incomeMain:            vals.income,
      expensesRent:          vals.rent,
      expensesGroceries:     vals.groceries,
      expensesTransport:     vals.transport,
      expensesSubscriptions: vals.subscriptions,
      expensesDining:        vals.dining,
      expensesShopping:      vals.shopping,
      expensesOther:         vals.other,
      debtMonthly:           vals.debt,
      savingsTotal:          vals.savings,
    };
  }

  const runSimulate = useCallback(async (vals: Record<string, number>) => {
    const overrides: Record<string, number | null> = {};
    SLIDERS.forEach((s) => { overrides[s.field] = vals[s.key]; });
    setSimLoading(true);
    try {
      const result = await fetchSimulate(toApiFormData(formData), overrides);
      setSimScore(result.sim_score);
      setSimMetrics(result.sim_metrics);
      setSimMetricScores(result.sim_metric_scores);
      setSimFd(buildSimFd(vals));
    } catch {
      /* ignore */
    } finally {
      setSimLoading(false);
    }
  }, [formData]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleSliderChange(key: string, value: number) {
    const next = { ...values, [key]: value };
    setValues(next);
    setActiveLabel(null);
    if (!trackedOnce.current) {
      trackedOnce.current = true;
      analytics.track("simulator_used", { field: key });
      analytics.updateSession({ simulator_used: true });
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSimulate(next), 400);
  }

  async function handleInterpret(text: string) {
    if (!text.trim()) return;
    setInterpretError(null);
    setInterpretLoading(true);
    if (!trackedOnce.current) {
      trackedOnce.current = true;
      analytics.track("simulator_used", { field: "ai_scenario" });
      analytics.updateSession({ simulator_used: true });
    }
    try {
      const result = await fetchSimulateInterpret({
        scenario:  text.trim(),
        form_data: toApiFormData(formData),
        provider:  formData.provider,
        api_key:   formData.apiKey,
      });

      const adj  = result.adjustments;
      const next = { ...values };
      if (adj.income_main            != null) next.income        = adj.income_main;
      if (adj.expenses_rent          != null) next.rent          = adj.expenses_rent;
      if (adj.expenses_groceries     != null) next.groceries     = adj.expenses_groceries;
      if (adj.expenses_transport     != null) next.transport     = adj.expenses_transport;
      if (adj.expenses_subscriptions != null) next.subscriptions = adj.expenses_subscriptions;
      if (adj.expenses_dining        != null) next.dining        = adj.expenses_dining;
      if (adj.expenses_shopping      != null) next.shopping      = adj.expenses_shopping;
      if (adj.expenses_other         != null) next.other         = adj.expenses_other;
      if (adj.debt_monthly           != null) next.debt          = adj.debt_monthly;
      if (adj.savings_total          != null) next.savings       = adj.savings_total;

      setValues(next);
      setActiveLabel(result.scenario_label);
      setScenario("");
      runSimulate(next);
    } catch {
      setInterpretError("Couldn't interpret that scenario — try rephrasing.");
    } finally {
      setInterpretLoading(false);
    }
  }

  function handleReset() {
    const reset = Object.fromEntries(
      SLIDERS.map((s) => [s.key, (formData[FORM_TO_SLIDER[s.field]] as number) || 0])
    );
    setValues(reset);
    setSimScore(null);
    setSimMetrics(null);
    setSimMetricScores(null);
    setSimFd(null);
    setActiveLabel(null);
    setInterpretError(null);
  }

  const scoreDelta = simScore !== null && overallScore !== null ? simScore - overallScore : null;

  const currentAreas = metrics && metricScores
    ? buildAreas(metrics, metricScores, formData)
    : null;

  const simulatedAreas = simMetrics && simMetricScores && simFd
    ? buildAreas(simMetrics, simMetricScores, simFd)
    : null;

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-[var(--text)]">What If?</h2>
          <p className="text-sm text-[var(--text-muted)]">
            Describe a scenario to see exactly what shifts — and why.
          </p>
        </div>
        <button type="button" onClick={handleReset} className="btn-secondary text-sm">
          Reset
        </button>
      </div>

      {/* Scenario input */}
      <div className="space-y-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={scenario}
            onChange={(e) => setScenario(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleInterpret(scenario); }}
            placeholder="What are you planning? e.g. paying off my car loan"
            disabled={interpretLoading}
            className="input flex-1 disabled:opacity-50"
          />
          <button
            type="button"
            onClick={() => handleInterpret(scenario)}
            disabled={interpretLoading || !scenario.trim()}
            className="btn-primary px-3 shrink-0 disabled:opacity-50"
          >
            {interpretLoading
              ? <Loader2 size={16} className="animate-spin" />
              : <ArrowRight size={16} />}
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {buildChips(formData).map((chip) => (
            <button
              key={chip}
              type="button"
              onClick={() => handleInterpret(chip)}
              disabled={interpretLoading}
              className="text-xs px-3 py-1.5 rounded-full border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text)] hover:border-[var(--brand)] transition-colors disabled:opacity-40"
            >
              {chip}
            </button>
          ))}
        </div>

        {interpretError && <p className="text-xs text-red-500">{interpretError}</p>}
      </div>

      {/* Active scenario + score delta */}
      {(activeLabel || scoreDelta !== null) && (
        <div className="flex items-center gap-3 flex-wrap">
          {activeLabel && (
            <div className="inline-flex items-center gap-1.5 text-xs bg-[color-mix(in_srgb,var(--brand)_10%,transparent)] text-[var(--brand)] border border-[color-mix(in_srgb,var(--brand)_20%,transparent)] rounded-full px-3 py-1.5">
              {activeLabel}
              <button type="button" onClick={handleReset} className="opacity-60 hover:opacity-100">
                <X size={10} />
              </button>
            </div>
          )}
          {scoreDelta !== null && !simLoading && (
            <span className={`text-sm font-semibold ${scoreDelta > 0 ? "text-green-500" : scoreDelta < 0 ? "text-red-500" : "text-[var(--text-muted)]"}`}>
              Overall score: {scoreDelta > 0 ? "+" : ""}{scoreDelta} points
            </span>
          )}
          {simLoading && <span className="text-xs text-[var(--text-muted)] animate-pulse">Calculating…</span>}
        </div>
      )}

      {/* Health area cards — 2×2 + 1 full width */}
      {currentAreas && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {currentAreas.slice(0, 4).map((area) => (
              <AreaCard
                key={area.key}
                area={area}
                simArea={simulatedAreas?.find((s) => s.key === area.key)}
              />
            ))}
          </div>
          <AreaCard
            area={currentAreas[4]}
            simArea={simulatedAreas?.find((s) => s.key === "cashflow")}
          />
        </div>
      )}

      {/* Sliders */}
      <div className="card space-y-6">
        <p className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wide">
          Explore manually — drag any slider
        </p>

        {SLIDERS.map((s) => {
          const max          = s.getMax(formData);
          const value        = values[s.key] ?? 0;
          const threshold    = s.getThreshold?.(formData) ?? null;
          const thresholdPct = threshold !== null ? Math.min((threshold / max) * 100, 100) : null;
          const dirHint      = s.goodDirection === "up" ? "↑ higher is better" : "↓ lower is better";

          return (
            <div key={s.key}>
              <div className="flex justify-between mb-0.5">
                <label className="text-sm font-medium text-[var(--text)]">{s.label}</label>
                <span className="text-sm font-mono text-[var(--brand)]">{s.format(value)}</span>
              </div>
              <p className="text-xs text-[var(--text-muted)] mb-2">
                {dirHint} · affects {s.affects}
              </p>

              <Slider.Root
                min={s.min} max={max} step={s.step}
                value={[value]}
                onValueChange={([v]) => handleSliderChange(s.key, v)}
                className="relative flex items-center w-full h-5 select-none touch-none"
              >
                <Slider.Track className="relative grow h-1.5 rounded-full bg-[var(--border)]">
                  <Slider.Range className="absolute h-full rounded-full bg-[var(--brand)]" />
                  {thresholdPct !== null && (
                    <span
                      className="absolute top-1/2 -translate-y-1/2 w-0.5 h-3 rounded-full bg-green-400 opacity-70"
                      style={{ left: `${thresholdPct}%` }}
                    />
                  )}
                </Slider.Track>
                <Slider.Thumb className="block w-5 h-5 bg-white border-2 border-[var(--brand)] rounded-full shadow focus:outline-none focus:ring-2 focus:ring-[var(--brand)] focus:ring-offset-1" />
              </Slider.Root>

              <div className="flex justify-between text-xs text-[var(--text-muted)] mt-1">
                <span>{s.format(s.min)}</span>
                {threshold !== null && thresholdPct !== null && thresholdPct < 95 && (
                  <span className="text-green-500">{s.format(threshold)} ← {s.thresholdLabel}</span>
                )}
                <span>{s.format(max)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
