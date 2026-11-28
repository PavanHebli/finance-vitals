"use client";

import Link from "next/link";
import { ArrowRight, CalendarClock, Github, ShieldCheck, Smartphone } from "lucide-react";
import { PaycheckDemo } from "@/components/PaycheckDemo";
import { analytics } from "@/lib/analytics";

// ── Landing ──────────────────────────────────────────────────────────────────
// What the app does, shown before anything is typed:
// 1. One number: what you can spend this week, after rent, bills and savings.
// 2. A live demo of that number (no signup), using the app's shared math.
// 3. The health score, as the "is my money okay?" check.
// The score lines below match api/core/health.py; if those thresholds change,
// change them here too.

const HOW = [
  {
    icon: CalendarClock,
    title: "Plan by paycheck, not by month",
    body: "Tell it your pay, rent and bills once. Each payday, the plan covers the bills, puts money toward your goals, and tells you what's left to spend each week.",
  },
  {
    icon: ShieldCheck,
    title: "No surprise bills",
    body: "Car insurance, yearly subscriptions, gifts: costs that don't come every month get a little from each paycheck, so they're covered when they arrive.",
  },
  {
    icon: Smartphone,
    title: "A reminder on payday",
    body: "The iPhone app (coming soon) reminds you on payday. A one-minute check-in confirms the amount and starts the new paycheck.",
  },
];

const METRICS = [
  { label: "What's left after everything", benchmark: "Healthy: 20% or more of take-home pay" },
  { label: "Share of pay going to loans", benchmark: "Healthy: under 10%" },
  { label: "How long savings would last", benchmark: "Strong: 6 months or more" },
  { label: "Share of pay going to rent", benchmark: "Healthy: under 25%" },
];

const BUILT = [
  { name: "Web", detail: "Next.js 14, TypeScript, Tailwind" },
  { name: "iPhone app", detail: "Expo / React Native, local payday reminders (in testing)" },
  { name: "Shared logic", detail: "One tested TypeScript package for pay cycles, plans and scoring inputs, used by web and mobile" },
  { name: "Scoring API", detail: "Python FastAPI on Railway" },
  { name: "Accounts", detail: "Supabase auth and Postgres with row-level security" },
  { name: "AI", detail: "An LLM writes a plain-English story about your numbers, and answers questions in chat" },
];

export default function Landing() {
  return (
    <div className="max-w-5xl mx-auto px-4">
      {/* Hero */}
      <section className="py-14 sm:py-20 text-center">
        <p className="text-[var(--brand)] font-semibold text-sm tracking-widest uppercase mb-4">
          Free · No bank link · Open source
        </p>
        <h1 className="text-4xl md:text-6xl font-bold text-[var(--text)] leading-tight mb-6">
          Know what you can spend this week.
        </h1>
        <p className="text-lg sm:text-xl text-[var(--text-muted)] max-w-2xl mx-auto mb-10 leading-relaxed">
          Vitals turns each paycheck into one number: what's safe to spend until next payday, after rent, bills and
          savings. Then it scores how healthy your money is, out of 100.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <a
            href="#try"
            className="btn-primary text-base px-8 py-3 inline-flex items-center gap-2"
            onClick={() => analytics.track("cta_clicked", { cta: "hero_try" })}
          >
            Try it now <ArrowRight size={16} />
          </a>
          <Link
            href="/form"
            className="btn-secondary text-base px-8 py-3"
            onClick={() => analytics.track("cta_clicked", { cta: "hero_score" })}
          >
            Check my score
          </Link>
        </div>
        <p className="text-sm text-[var(--text-muted)] mt-5">
          No signup to try. Nothing is saved unless you create an account.{" "}
          <Link href="/privacy" className="underline">How we handle your data</Link>
        </p>
      </section>

      {/* Live demo */}
      <section id="try" className="py-12 border-t border-[var(--border)] scroll-mt-16">
        <h2 className="text-2xl font-bold text-center mb-2">Try it with your own numbers</h2>
        <p className="text-[var(--text-muted)] text-center mb-8">Change anything. The number updates as you type.</p>
        <PaycheckDemo />
      </section>

      {/* How it works */}
      <section className="py-12 border-t border-[var(--border)]">
        <h2 className="text-2xl font-bold text-center mb-10">How it works</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {HOW.map(({ icon: Icon, title, body }) => (
            <div key={title} className="card">
              <Icon size={22} className="text-[var(--brand)] mb-3" />
              <div className="font-semibold mb-1">{title}</div>
              <div className="text-sm text-[var(--text-muted)] leading-relaxed">{body}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Score */}
      <section className="py-12 border-t border-[var(--border)]">
        <div className="grid md:grid-cols-2 gap-8 items-center">
          <div>
            <h2 className="text-2xl font-bold mb-3">Is your money actually okay?</h2>
            <p className="text-[var(--text-muted)] mb-6 leading-relaxed">
              Your plan also gets a health score out of 100, from four plain checks worth 25 points each. An AI-written
              story explains what's working, what needs attention, and one thing to do this month. Without at least one
              month of savings, the score can't go above 50.
            </p>
            <Link
              href="/form"
              className="btn-primary inline-flex items-center gap-2"
              onClick={() => analytics.track("cta_clicked", { cta: "score_section" })}
            >
              Check my score <ArrowRight size={16} />
            </Link>
          </div>
          <div className="card space-y-3">
            {METRICS.map((m) => (
              <div key={m.label} className="flex items-center justify-between gap-4 text-sm">
                <span className="font-medium">{m.label}</span>
                <span className="text-[var(--text-muted)] text-right">{m.benchmark}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it's built */}
      <section className="py-12 border-t border-[var(--border)]">
        <h2 className="text-2xl font-bold text-center mb-2">How it's built</h2>
        <p className="text-[var(--text-muted)] text-center mb-8">
          Built and maintained by one developer, in the open under the MIT license.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-3xl mx-auto">
          {BUILT.map((b) => (
            <div key={b.name} className="rounded-lg border border-[var(--border)] px-4 py-3 text-sm">
              <span className="font-semibold">{b.name}: </span>
              <span className="text-[var(--text-muted)]">{b.detail}</span>
            </div>
          ))}
        </div>
        <div className="text-center mt-6">
          <a
            href="https://github.com/PavanHebli/finance-vitals"
            className="btn-secondary inline-flex items-center gap-2"
            onClick={() => analytics.track("cta_clicked", { cta: "github" })}
          >
            <Github size={16} /> See the code on GitHub
          </a>
        </div>
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
