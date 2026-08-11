import Link from "next/link";

const METRICS = [
  {
    label: "Savings Rate",
    description: "How much of your income you actually keep each month.",
    benchmark: "Healthy: saving 20%+ of take-home",
    icon: "📈",
    accent: "#00a043",
  },
  {
    label: "Debt-to-Income",
    description: "What share of your monthly pay goes straight to debt payments.",
    benchmark: "Healthy: debt payments below 36% of income",
    icon: "💳",
    accent: "#dc6e00",
  },
  {
    label: "Emergency Fund",
    description: "How many months you could survive financially without any income.",
    benchmark: "Healthy: 3–6 months of expenses saved",
    icon: "🛡️",
    accent: "#4f6ef7",
  },
  {
    label: "Housing Ratio",
    description: "Whether your rent or mortgage is squeezing your other finances.",
    benchmark: "Healthy: housing below 30% of income",
    icon: "🏠",
    accent: "#a08200",
  },
];

const HOW = [
  { step: "1", title: "Enter your numbers", body: "Income, expenses, savings, and debt — takes about 3 minutes. No bank connection required." },
  { step: "2", title: "Get your score",     body: "A 0-100 health score calculated from 4 key financial ratios with industry benchmarks." },
  { step: "3", title: "Read your story",    body: "An AI gives you a plain-English breakdown of what's working and one thing to fix this month." },
  { step: "4", title: "Track progress",     body: "Save your data each month as a .vit file. Come back and see how your score moves over time." },
];

export default function Landing() {
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
          A brutally honest score from 0 to 100. No bank connection. No subscription. Just your numbers, a real benchmark, and an AI that tells you exactly what to do next.
        </p>
        <Link href="/form" className="btn-primary text-base px-8 py-3 inline-block">
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
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
        <Link href="/form" className="btn-primary text-base px-8 py-3 inline-block">
          Get started
        </Link>
      </section>

      <footer className="py-8 border-t border-[var(--border)] text-center text-sm text-[var(--text-muted)]">
        For informational purposes only — not financial advice.
      </footer>
    </div>
  );
}
