"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { analytics } from "@/lib/analytics";

// ── Landing ──────────────────────────────────────────────────────────────────
// NOTE: the personalised "returning user" dashboard (score recap, quick-question
// input, budget snapshot) was removed for now — it was gated on local Zustand
// state only and didn't account for a logged-in user with an empty local cache.
// Revisit once auth/session hydration is in place; for now everyone sees the
// same marketing landing regardless of login state.

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
  { step: "1", title: "Add your income",       body: "Tell Vitals how much you take home each month. That's all you need to start.", optional: false },
  { step: "2", title: "Import or build",        body: "Upload a bank statement and Vitals categorises your spending automatically. Or build envelope cards yourself — your call.", optional: true, optionalLabel: "PDF import optional" },
  { step: "3", title: "See your score live",   body: "Every card you create updates the health score in real time. Add a rent card, watch your housing ratio move.", optional: false },
  { step: "4", title: "Read your AI narrative", body: "A plain-English breakdown of what's working, what needs attention, and one concrete action for this month.", optional: false },
  { step: "5", title: "Track the trend",        body: "Your score snapshots automatically each session. Come back next month and see exactly how far you've moved.", optional: false },
];

export default function Landing() {
  return (
    <div className="max-w-5xl mx-auto px-4">
      {/* Hero */}
      <section className="py-20 text-center">
        <p className="text-[var(--brand)] font-semibold text-sm tracking-widest uppercase mb-4">
          Budget Planner · Financial Health Score
        </p>
        <h1 className="text-5xl md:text-6xl font-bold text-[var(--text)] leading-tight mb-6">
          The budget that tells you<br className="hidden sm:block" /> if you&apos;re actually winning
        </h1>
        <p className="text-xl text-[var(--text-muted)] max-w-2xl mx-auto mb-10 leading-relaxed">
          Build your envelope budget, get a real financial health score from 0 to 100, and hear exactly what to do next — all from one screen, in under 5 minutes.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/budget"
            className="btn-primary text-base px-8 py-3 inline-flex items-center gap-2"
            onClick={() => analytics.track("cta_clicked", { cta: "hero_budget" })}
          >
            Start my budget <ArrowRight size={16} />
          </Link>
          <Link
            href="/form"
            className="btn-secondary text-base px-8 py-3 inline-block"
            onClick={() => analytics.track("cta_clicked", { cta: "hero_score" })}
          >
            Just check my score
          </Link>
        </div>
        <p className="text-sm text-[var(--text-muted)] mt-4">Free to try, no account needed — sign in anytime to save your progress.</p>
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
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold">{h.title}</span>
                  {h.optional && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-[var(--bg-2)] text-[var(--text-muted)] border border-[var(--border)]">
                      {h.optionalLabel}
                    </span>
                  )}
                </div>
                <div className="text-sm text-[var(--text-muted)]">{h.body}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 border-t border-[var(--border)] text-center">
        <h2 className="text-3xl font-bold mb-4">Ready to see where you stand?</h2>
        <p className="text-[var(--text-muted)] mb-8">Takes under 5 minutes. Try it free, or sign in to keep your progress saved.</p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/budget"
            className="btn-primary text-base px-8 py-3 inline-flex items-center gap-2"
            onClick={() => analytics.track("cta_clicked", { cta: "bottom_budget" })}
          >
            Start my budget <ArrowRight size={16} />
          </Link>
          <Link
            href="/form"
            className="btn-secondary text-base px-8 py-3 inline-block"
            onClick={() => analytics.track("cta_clicked", { cta: "bottom_score" })}
          >
            Just check my score
          </Link>
        </div>
      </section>

      <footer className="py-8 border-t border-[var(--border)] text-center text-sm text-[var(--text-muted)] space-y-2">
        <p>For informational purposes only — not financial advice.</p>
        <p>
          <Link href="/terms" className="hover:underline">Terms</Link>
          {" · "}
          <Link href="/privacy" className="hover:underline">Privacy Policy</Link>
        </p>
      </footer>
    </div>
  );
}
