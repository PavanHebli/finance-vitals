"use client";

import type { Metrics, MetricScores, StatusColor } from "@/lib/types";
import { STATUS_COLORS, STATUS_LABELS } from "@/lib/types";

const METRICS_CONFIG = [
  {
    key: "savings_rate" as const,
    label: "Savings Rate",
    format: (v: number) => `${v}%`,
    benchmark: "Target: ≥ 20%",
    higherIsBetter: true,
  },
  {
    key: "debt_to_income" as const,
    label: "Debt-to-Income",
    format: (v: number) => `${v}%`,
    benchmark: "Safe zone: < 20%",
    higherIsBetter: false,
  },
  {
    key: "emergency_fund_months" as const,
    label: "Emergency Fund",
    format: (v: number) => `${v} mo`,
    benchmark: "Goal: 3–6 months",
    higherIsBetter: true,
  },
  {
    key: "housing_ratio" as const,
    label: "Housing Ratio",
    format: (v: number) => `${v}%`,
    benchmark: "HUD limit: ≤ 30%",
    higherIsBetter: false,
  },
];

const BADGE_CLASSES: Record<StatusColor, string> = {
  danger:  "badge-danger",
  warning: "badge-warning",
  ok:      "badge-ok",
  good:    "badge-good",
};

export function MetricCards({
  metrics,
  metricScores,
  previousMetrics,
}: {
  metrics: Metrics;
  metricScores: MetricScores;
  previousMetrics?: Metrics | null;
}) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {METRICS_CONFIG.map(({ key, label, format, benchmark, higherIsBetter }) => {
        const ms       = metricScores[key];
        const status   = ms.status as StatusColor;
        const value    = metrics[key];
        const prevVal  = previousMetrics?.[key];
        const delta    = prevVal !== undefined
          ? Math.round((value - prevVal) * 10) / 10
          : null;
        const improved = delta !== null && delta !== 0 && (higherIsBetter ? delta > 0 : delta < 0);
        const declined = delta !== null && delta !== 0 && (higherIsBetter ? delta < 0 : delta > 0);

        return (
          <div
            key={key}
            className="card border-t-2 transition-shadow hover:shadow-sm"
            style={{ borderTopColor: STATUS_COLORS[status] }}
          >
            <div className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">
              {label}
            </div>

            <div className="flex items-baseline gap-1.5 mb-2">
              <span
                className="text-2xl font-bold text-[var(--text)]"
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                {format(value)}
              </span>
              {delta !== null && delta !== 0 && (
                <span className={`text-xs font-semibold leading-none ${improved ? "text-green-500" : declined ? "text-red-500" : ""}`}>
                  {delta > 0 ? "▲" : "▼"} {format(Math.abs(delta))}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className={BADGE_CLASSES[status]}>{STATUS_LABELS[status]}</span>
              <span className="text-xs text-[var(--text-muted)]">{ms.score}/25</span>
            </div>
            <div className="text-xs text-[var(--text-muted)] mt-2">{benchmark}</div>
          </div>
        );
      })}
    </div>
  );
}
