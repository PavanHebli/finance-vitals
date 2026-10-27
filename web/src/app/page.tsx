"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { analytics } from "@/lib/analytics";

// ── Landing ──────────────────────────────────────────────────────────────────
// One promise, one main button, and an example of what you get before you
// type anything. The benchmark lines below match the scoring in
// api/core/health.py, so if those thresholds change, change them here too.
// (The returning-user dashboard was removed for now: it depended on local state
// only and did not handle a signed-in user with an empty local cache.)

const METRICS = [
  {
    label: "How much of your pay you keep",
    description: "What is left each month after your spending.",
    benchmark: "Healthy: keeping 20% or more of take-home pay",
    accent: "#00a043",
  },
  {
    label: "How much of your pay goes to debt",
    description: "Loan, card and other debt payments as a share of take-home pay.",
    benchmark: "Healthy: under 10% of take-home pay",
    accent: "#dc6e00",
  },
  {
    label: "How long you could last without a paycheck",
    description: "Your savings divided by what you spend in a month.",
    benchmark: "Strong: 6 months or more of spending saved",
    accent: "#4f6ef7",
  },
  {
    label: "How much of your pay goes to rent",
    description: "Rent or mortgage as a share of take-home pay.",
    benchmark: "Healthy: under 25% of take-home pay",
    accent: "#a08200",
  },
];

const HOW = [
  { step: "1", title: "Enter your pay and spending", body: "Two numbers are enough to start. Add debt and savings if you want a fuller picture." },
  { step: "2", title: "Get your score and your story", body: "A score out of 100, plus a plain-English note on what is working, what is not, and one thing to do this month." },
  { step: "3", title: "Come back next month", body: "Sign in to keep your numbers and see how your score moves." },
];

// Made-up numbers, shown only as an example of what a result looks like.
const EXAMPLE = [
  { label: "Of your pay you keep", value: "15%", points: "18 / 25" },
  { label: "Of your pay goes to debt", value: "12%", points: "18 / 25" },
  { label: "Months you could last", value: "2.1", points: "10 / 25" },
  { label: "Of your pay goes to rent", value: "31%", points: "18 / 25" },
];

export default function Landing() {
  return (
    <div className="max-w-5xl mx-auto px-4">
      {/* Hero */}
      <section className="py-16 sm:py-20 text-center">
        <p className="text-[var(--brand)] font-semibold text-sm tracking-widest uppercase mb-4">
          Free · No signup · No bank link
        </p>
        <h1 className="text-4xl md:text-6xl font-bold text-[var(--text)] leading-tight mb-6">
          Is your money actually okay?
        </h1>
        <p className="text-xl text-[var(--text-muted)] max-w-2xl mx-auto mb-10 leading-relaxed">
          Enter what you earn and spend. Get a financial health score out of 100, and one clear thing to do this month.
        </p>
        <div className="flex flex-col items-center justify-center gap-3">
          <Link
            href="/form"
            className="btn-primary text-base px-8 py-3 inline-flex items-center gap-2"
            onClick={() => analytics.track("cta_clicked", { cta: "hero_score" })}
          >
            Check my score <ArrowRight size={16} />
          </Link>
          <Link
            href="/budget"
            className="text-sm text-[var(--text-muted)] hover:underline"
            onClick={() => analytics.track("cta_clicked", { cta: "hero_budget" })}
          >
            Or plan your month with envelope budgeting →
          </Link>
        </div>
        <p className="text-sm text-[var(--text-muted)] mt-5">
          Takes about 2 minutes. Nothing is saved unless you create an account.{" "}
          <Link href="/privacy" className="underline">How we handle your data</Link>
        </p>
      </section>

      {/* Example result */}
      <section className="py-12 border-t border-[var(--border)]">
        <h2 className="text-2xl font-bold text-center mb-2">Here is what you get</h2>
        <p className="text-[var(--text-muted)] text-center mb-8">An example with made-up numbers.</p>
        <div className="max-w-xl mx-auto rounded-2xl border border-[var(--border)] bg-[var(--bg-2)] p-6">
          <div className="text-center mb-6">
            <div className="text-6xl font-extrabold text-[var(--text)]">64</div>
            <div className="text-lg font-semibold text-[#dc6e00]">Fair</div>
            <div className="text-sm text-[var(--text-muted)]">out of 100</div>
          </div>
          <div className="space-y-3 mb-6">
            {EXAMPLE.map((row) => (
              <div key={row.label} className="flex items-center justify-between text-sm">
                <span className="text-[var(--text-muted)]">
                  <span className="font-semibold text-[var(--text)]">{row.value}</span> {row.label.toLowerCase()}
                </span>
                <span className="font-semibold text-[var(--text)]">{row.points}</span>
              </div>
            ))}
          </div>
          <div className="rounded-xl p-4 text-sm text-[var(--text)] leading-relaxed" style={{ background: "color-mix(in srgb, var(--brand) 12%, transparent)" }}>
            <span className="font-semibold">Your next step: </span>
            your biggest gap is your cushion, at 2.1 months. Adding about $300 a month would reach 3 months in around 10 months.
          </div>
        </div>
      </section>

      {/* Metrics */}
      <section className="py-12 border-t border-[var(--border)]">
        <h2 className="text-2xl font-bold text-center mb-2">Four things that matter</h2>
        <p className="text-[var(--text-muted)] text-center mb-10">Each one counts for up to 25 points. Without at least one month of savings, your score can't go above 50.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {METRICS.map((m) => (
            <div key={m.label} className="rounded-xl border border-[var(--border)] p-5">
              <div className="font-semibold text-[var(--text)] mb-1">{m.label}</div>
              <div className="text-sm text-[var(--text-muted)] mb-2">{m.description}</div>
              <div className="text-xs font-medium" style={{ color: m.accent }}>{m.benchmark}</div>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="py-12 border-t border-[var(--border)]">
        <h2 className="text-2xl font-bold text-center mb-10">How it works</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
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
      <section className="py-12 border-t border-[var(--border)] text-center">
        <h2 className="text-3xl font-bold mb-4">Ready to see where you stand?</h2>
        <p className="text-[var(--text-muted)] mb-8">About 2 minutes. Free, and no account needed.</p>
        <Link
          href="/form"
          className="btn-primary text-base px-8 py-3 inline-flex items-center gap-2"
          onClick={() => analytics.track("cta_clicked", { cta: "bottom_score" })}
        >
          Check my score <ArrowRight size={16} />
        </Link>
      </section>

      <footer className="py-8 border-t border-[var(--border)] text-center text-sm text-[var(--text-muted)] space-y-2">
        <p>For informational purposes only — not financial advice.</p>
        <p>
          <Link href="/terms" className="hover:underline">Terms</Link>
          {" · "}
          <Link href="/privacy" className="hover:underline">Privacy Policy</Link>
          {" · "}
          <a href="https://github.com/PavanHebli/finance-vitals" className="hover:underline">Open source on GitHub</a>
        </p>
      </footer>
    </div>
  );
}
