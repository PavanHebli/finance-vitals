"use client";

import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import { useStore } from "@/lib/store";

const METRIC_LINES = [
  { key: "savings_rate",          label: "Savings Rate (%)",  color: "#4f6ef7" },
  { key: "debt_to_income",        label: "Debt-to-Income (%)", color: "#dc3535" },
  { key: "emergency_fund_months", label: "Emergency Fund (mo)", color: "#22c55e" },
  { key: "housing_ratio",         label: "Housing Ratio (%)",  color: "#f59e0b" },
];

export function ProgressTab() {
  const { snapshots } = useStore();

  const chartData = snapshots.map((snap) => ({
    month:  snap.saved_at,
    score:  snap.outputs.overall_score,
    ...Object.fromEntries(
      METRIC_LINES.map((m) => [m.key, snap.outputs.metrics?.[m.key as keyof typeof snap.outputs.metrics] ?? 0])
    ),
  }));

  return (
    <div className="space-y-6">
      {snapshots.length < 2 ? (
        <div className="card py-10 text-center space-y-3">
          {snapshots.length === 1 ? (
            <>
              <div className="text-3xl font-extrabold text-[var(--brand)]" style={{ fontVariantNumeric: "tabular-nums" }}>
                {snapshots[0].outputs.overall_score}
              </div>
              <p className="text-sm font-medium text-[var(--text)]">
                Your baseline is set — {snapshots[0].saved_at}.
              </p>
              <p className="text-sm text-[var(--text-muted)] max-w-xs mx-auto">
                Come back next month with updated numbers. Your score, savings rate, and every metric will chart here automatically.
              </p>
            </>
          ) : (
            <p className="text-[var(--text-muted)] text-sm">
              Fill in your numbers to get your baseline score.
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Overall score trend */}
          <div className="card">
            <div className="font-semibold text-[var(--text)] mb-4">Overall Score Over Time</div>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--text-muted)" }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "var(--text-muted)" }} />
                <Tooltip
                  contentStyle={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                />
                <Line type="monotone" dataKey="score" stroke="#4f6ef7" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Per-metric trends */}
          <div className="card">
            <div className="font-semibold text-[var(--text)] mb-4">Metric Trends</div>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--text-muted)" }} />
                <YAxis tick={{ fontSize: 11, fill: "var(--text-muted)" }} />
                <Tooltip
                  contentStyle={{ background: "var(--bg-2)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                />
                {METRIC_LINES.map((m) => (
                  <Line key={m.key} type="monotone" dataKey={m.key} name={m.label} stroke={m.color} strokeWidth={2} dot={{ r: 3 }} />
                ))}
              </LineChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap gap-3 mt-3">
              {METRIC_LINES.map((m) => (
                <div key={m.key} className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
                  <span className="w-3 h-0.5 rounded-full inline-block" style={{ background: m.color }} />
                  {m.label}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
