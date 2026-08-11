"use client";

import type { Metrics, MetricScores, StatusColor } from "@/lib/types";
import { STATUS_COLORS, STATUS_LABELS } from "@/lib/types";

const METRICS_CONFIG = [
  {
    key: "savings_rate" as const,
    label: "Savings Rate",
    format: (v: number) => `${v}%`,
    benchmark: "Target: ≥ 20%",
  },
  {
    key: "debt_to_income" as const,
    label: "Debt-to-Income",
    format: (v: number) => `${v}%`,
    benchmark: "Safe zone: < 20%",
  },
  {
    key: "emergency_fund_months" as const,
    label: "Emergency Fund",
    format: (v: number) => `${v} mo`,
    benchmark: "Goal: 3–6 months",
  },
  {
    key: "housing_ratio" as const,
    label: "Housing Ratio",
    format: (v: number) => `${v}%`,
    benchmark: "HUD limit: ≤ 30%",
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
}: {
  metrics: Metrics;
  metricScores: MetricScores;
}) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {METRICS_CONFIG.map(({ key, label, format, benchmark }) => {
        const ms     = metricScores[key];
        const status = ms.status as StatusColor;
        const value  = metrics[key];

        return (
          <div
            key={key}
            className="card border-t-2"
            style={{ borderTopColor: STATUS_COLORS[status] }}
          >
            <div className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">
              {label}
            </div>
            <div className="text-2xl font-bold text-[var(--text)] mb-2">{format(value)}</div>
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
