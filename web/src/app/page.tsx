"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";
import { useStore, toApiFormData, formatBudgetContext } from "@/lib/store";
import { streamChat } from "@/lib/api";
import { analytics } from "@/lib/analytics";

// ── Helpers ───────────────────────────────────────────────────────────────────

function scoreColor(score: number): string {
  if (score >= 75) return "text-green-500";
  if (score >= 50) return "text-amber-500";
  return "text-red-500";
}

function formatMonth(saved_at: string): string {
  const [year, month] = saved_at.split("-");
  const date = new Date(parseInt(year), parseInt(month) - 1);
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

// ── Returning user view ───────────────────────────────────────────────────────

function ReturningHome({ score, mirrorLabel, lastChecked }: {
  score: number;
  mirrorLabel: string;
  lastChecked: string | null;
}) {
  const router = useRouter();
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const { formData, metrics, metricScores, overallScore, mirror, budgetCards, distributionLog } = useStore();

  const customBudgetCards = budgetCards.filter((c) => c.type === "custom");

  async function handleAsk() {
    if (!question.trim() || loading) return;

    // Fall back to results page if snapshot data isn't in store
    if (!metrics || !metricScores || overallScore === null || !mirror) {
      analytics.track("quick_question_asked", { question, fallback: true });
      router.push("/results");
      return;
    }

    analytics.track("quick_question_asked", { question });
    setAnswer("");
    setError(false);
    setLoading(true);

    try {
      await streamChat(
        {
          message: question,
          history: [],
          form_data: toApiFormData(formData),
          metrics,
          metric_scores: metricScores,
          overall_score: overallScore,
          mirror,
          provider:       formData.provider || "",
          api_key:        formData.apiKey || "",
          budget_context: formatBudgetContext(budgetCards, distributionLog),
        },
        (chunk) => setAnswer((prev) => prev + chunk),
      );
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  function handleNewQuestion() {
    setAnswer("");
    setError(false);
    setQuestion("");
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-20 space-y-12">

      {/* Score recap */}
      <div>
        <p className="text-sm text-[var(--text-muted)] mb-6">Welcome back</p>
        <div className="flex items-end gap-6">
          <div>
            <span className={`text-8xl font-bold tabular-nums leading-none ${scoreColor(score)}`}>
              {score}
            </span>
            <span className="text-2xl text-[var(--text-muted)] font-light ml-1">/100</span>
          </div>
          <div className="mb-2">
            <p className="text-xl font-semibold text-[var(--text)]">{mirrorLabel}</p>
            {lastChecked && (
              <p className="text-sm text-[var(--text-muted)] mt-0.5">Last checked {lastChecked}</p>
            )}
          </div>
        </div>
      </div>

      {/* CTAs */}
      <div className="flex gap-3">
        <Link
          href="/results"
          className="btn-primary px-6 py-2.5 text-sm"
          onClick={() => analytics.track("cta_clicked", { cta: "see_results" })}
        >
          See my results
        </Link>
        <Link
          href="/form"
          className="btn-secondary px-6 py-2.5 text-sm"
          onClick={() => analytics.track("cta_clicked", { cta: "update_numbers" })}
        >
          Update my numbers
        </Link>
      </div>

      {/* Budget snapshot */}
      <div className="bg-[var(--bg-2)] border border-[var(--border)] rounded-xl p-5">
        {customBudgetCards.length > 0 ? (
          <>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-[var(--text)]">Budget Planner</p>
              <Link href="/budget" className="text-xs text-[var(--brand)] hover:underline">
                View all →
              </Link>
            </div>
            <div className="space-y-2">
              {customBudgetCards.slice(0, 3).map((card) => (
                <div key={card.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: card.color }}
                    />
                    <span className="text-[var(--text)]">{card.label}</span>
                  </div>
                  <span className="tabular-nums text-[var(--text-muted)]">
                    ${card.balance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            <p className="text-sm font-semibold text-[var(--text)] mb-1">Put your score to work</p>
            <p className="text-sm text-[var(--text-muted)] mb-3">
              Build envelope budgets from your income and come back next month to see how far you've moved.
            </p>
            <Link href="/budget" className="text-sm text-[var(--brand)] font-medium hover:underline">
              Set up a budget →
            </Link>
          </>
        )}
      </div>

      {/* Quick decision input */}
      <div className="border-t border-[var(--border)] pt-10">
        <p className="font-semibold text-[var(--text)] mb-1">What are you deciding today?</p>
        <p className="text-sm text-[var(--text-muted)] mb-4">
          Ask anything about your financial picture — Vitals will answer using your numbers.
        </p>
        <div className="flex gap-2">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleAsk(); }}
            placeholder="e.g. Should I finance a car? Is it safe to quit my job?"
            className="input flex-1"
            disabled={loading}
          />
          <button
            type="button"
            onClick={handleAsk}
            disabled={!question.trim() || loading}
            className="btn-primary px-3 shrink-0 disabled:opacity-40"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
          </button>
        </div>

        {/* Answer area */}
        {(loading && !answer) && (
          <div className="mt-6 flex items-center gap-2 text-sm text-[var(--text-muted)]">
            <Loader2 size={14} className="animate-spin shrink-0" />
            <span>Thinking through your numbers…</span>
          </div>
        )}

        {(answer || error) && (
          <div className="mt-6 space-y-4">
            {error ? (
              <p className="text-sm text-red-500">Something went wrong. Try again or go to your full results.</p>
            ) : (
              <p className="text-[var(--text)] leading-relaxed whitespace-pre-wrap text-sm">{answer}</p>
            )}

            {!loading && (
              <div className="flex items-center gap-4 pt-2">
                <button
                  type="button"
                  onClick={handleNewQuestion}
                  className="text-sm text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
                >
                  Ask another question
                </button>
                <Link
                  href="/results"
                  className="text-sm text-[var(--brand)] hover:underline"
                  onClick={() => analytics.track("cta_clicked", { cta: "quick_decision_go_deeper" })}
                >
                  Go deeper in results →
                </Link>
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
}

// ── New user landing ──────────────────────────────────────────────────────────

const METRICS = [
  {
    label: "Savings Rate",
    description: "How much of your income you actually keep each month.",
    benchmark: "Healthy: saving 20%+ of take-home",
    accent: "#00a043",
  },
  {
    label: "Debt-to-Income",
    description: "What share of your monthly pay goes straight to debt payments.",
    benchmark: "Healthy: debt payments below 36% of income",
    accent: "#dc6e00",
  },
  {
    label: "Emergency Fund",
    description: "How many months you could survive financially without any income.",
    benchmark: "Healthy: 3–6 months of expenses saved",
    accent: "#4f6ef7",
  },
  {
    label: "Housing Ratio",
    description: "Whether your rent or mortgage is squeezing your other finances.",
    benchmark: "Healthy: housing below 30% of income",
    accent: "#a08200",
  },
];

const HOW = [
  { step: "1", title: "Enter your numbers",   body: "Income, expenses, savings, and debt — takes about 3 minutes. No bank connection required." },
  { step: "2", title: "Get your score",        body: "A 0-100 health score calculated from 4 key financial ratios with industry benchmarks." },
  { step: "3", title: "Read your story",       body: "An AI gives you a plain-English breakdown of what's working and one thing to fix this month." },
  { step: "4", title: "Track progress",        body: "Your score is saved automatically. Come back next month and see exactly how far you've moved." },
  { step: "5", title: "Act on your results",   body: "Use the Budget Planner to build envelope budgets aligned to your real income — no guesswork, just your numbers split the way you choose." },
];

function NewUserLanding() {
  return (
    <div className="max-w-5xl mx-auto px-4">
      {/* Hero */}
      <section className="py-20 text-center">
        <p className="text-[var(--brand)] font-semibold text-sm tracking-widest uppercase mb-4">
          Financial Health Score
        </p>
        <h1 className="text-5xl md:text-6xl font-bold text-[var(--text)] leading-tight mb-6">
          Know where you actually stand
        </h1>
        <p className="text-xl text-[var(--text-muted)] max-w-2xl mx-auto mb-10 leading-relaxed">
          A brutally honest score from 0 to 100. No bank connection. No subscription. Just your numbers, a real benchmark, an AI that tells you exactly what to do next — and a Budget Planner to help you do it.
        </p>
        <Link href="/form" className="btn-primary text-base px-8 py-3 inline-block" onClick={() => analytics.track("cta_clicked", { cta: "hero" })}>
          Check my financial health
        </Link>
        <p className="text-sm text-[var(--text-muted)] mt-4">Free · Private · No account required</p>
      </section>

      {/* Metrics */}
      <section className="py-16 border-t border-[var(--border)]">
        <h2 className="text-2xl font-bold text-center mb-2">Four things that actually matter</h2>
        <p className="text-[var(--text-muted)] text-center mb-10">Your score is built from four ratios, each weighted equally.</p>
        <div className="grid grid-cols-2">
          {METRICS.map((m, i) => (
            <div
              key={m.label}
              className="p-6"
              style={{
                borderRight:  i % 2 === 0 ? "2.5px solid color-mix(in srgb, var(--brand) 30%, transparent)" : "none",
                borderBottom: i < 2        ? "2.5px solid color-mix(in srgb, var(--brand) 30%, transparent)" : "none",
              }}
            >
              <div className="font-semibold text-[var(--text)] mb-1">{m.label}</div>
              <div className="text-sm text-[var(--text-muted)] mb-2">{m.description}</div>
              <div className="text-xs font-medium" style={{ color: m.accent }}>{m.benchmark}</div>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 border-t border-[var(--border)]">
        <h2 className="text-2xl font-bold text-center mb-10">How it works</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {HOW.map((h) => (
            <div key={h.step} className="flex gap-4">
              <div className="w-8 h-8 rounded-full bg-[var(--brand)] text-white flex items-center justify-center text-sm font-bold shrink-0">
                {h.step}
              </div>
              <div>
                <div className="font-semibold mb-1">{h.title}</div>
                <div className="text-sm text-[var(--text-muted)]">{h.body}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 border-t border-[var(--border)] text-center">
        <h2 className="text-3xl font-bold mb-4">Ready to see your score?</h2>
        <p className="text-[var(--text-muted)] mb-8">Takes 3 minutes. Your data stays on your device.</p>
        <Link href="/form" className="btn-primary text-base px-8 py-3 inline-block" onClick={() => analytics.track("cta_clicked", { cta: "bottom" })}>
          Get started
        </Link>
      </section>

      <footer className="py-8 border-t border-[var(--border)] text-center text-sm text-[var(--text-muted)]">
        For informational purposes only — not financial advice.
      </footer>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Landing() {
  const { overallScore, mirror, snapshots } = useStore();

  const lastChecked = snapshots.length > 0
    ? formatMonth([...snapshots].sort((a, b) => b.saved_at.localeCompare(a.saved_at))[0].saved_at)
    : null;

  if (overallScore !== null && mirror) {
    return (
      <ReturningHome
        score={Math.round(overallScore)}
        mirrorLabel={mirror.label}
        lastChecked={lastChecked}
      />
    );
  }

  return <NewUserLanding />;
}
