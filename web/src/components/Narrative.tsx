"use client";

import { useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Metrics, MetricScores } from "@/lib/types";
import { analytics } from "@/lib/analytics";

const EDUCATION: Record<string, Record<string, { title: string; body: string }>> = {
  savings_rate: {
    danger:  { title: "You're spending more than you earn", body: "Every month you go deeper into the hole — this is unsustainable. Without reversing this, you'll eventually run out of money or accumulate debt just to cover basic expenses." },
    warning: { title: "Your savings rate is too low", body: "Keeping less than 10% of your income means wealth builds very slowly. The standard target is 20%. At this rate, one unexpected expense can wipe out everything you've saved." },
  },
  debt_to_income: {
    danger:  { title: "Your debt load is at a critical level", body: "Over 43% of your income going to debt is the threshold banks use to deny mortgage applications. You have almost no financial flexibility." },
    warning: { title: "Your debt is limiting your financial progress", body: "Between 20-43% of income going to debt leaves little room to save or invest. Every dollar going to debt is a dollar not building your future." },
  },
  emergency_fund_months: {
    danger:  { title: "You have no real safety net", body: "Less than 1 month of expenses saved means one job loss, car repair, or medical bill pushes you straight into debt. The standard recommendation is 3-6 months." },
    warning: { title: "Your safety net is thinner than it should be", body: "1-3 months is a start but most experts recommend at least 3 months minimum. A job loss can easily last longer than your current cushion." },
  },
  housing_ratio: {
    danger:  { title: "Housing is consuming your income", body: "Over 50% on rent or mortgage leaves almost nothing for savings, debt payments, or emergencies. One missed paycheck puts you at risk of not being able to pay rent." },
    warning: { title: "Housing costs are stretching your budget", body: "Spending 35-50% of income on housing makes other financial goals significantly harder. The standard guideline is 30% or less." },
  },
};

const STATUS_COLORS: Record<string, string> = {
  danger:  "border-red-400 bg-red-50 dark:bg-red-950/30",
  warning: "border-orange-400 bg-orange-50 dark:bg-orange-950/30",
};

export function Narrative({
  text,
  loading,
  metrics,
  metricScores,
}: {
  text: string;
  loading: boolean;
  metrics: Metrics;
  metricScores: MetricScores;
}) {
  const didTrack = useRef(false);
  useEffect(() => {
    if (!loading && text && !didTrack.current) {
      didTrack.current = true;
      analytics.updateSession({ narrative_completed: true });
    }
  }, [loading, text]);

  const flagged = (["savings_rate", "debt_to_income", "emergency_fund_months", "housing_ratio"] as const)
    .map((key) => {
      const status = metricScores[key].status;
      if (status !== "danger" && status !== "warning") return null;
      const edu = EDUCATION[key]?.[status];
      if (!edu) return null;
      return { key, status, ...edu };
    })
    .filter(Boolean);

  return (
    <div className="space-y-6">
      {/* Narrative text */}
      <div className="card min-h-[160px]">
        {loading && !text && (
          <div className="flex gap-1 items-center text-[var(--text-muted)] text-sm">
            <span className="animate-pulse">Generating your story</span>
            <span className="animate-bounce delay-75">.</span>
            <span className="animate-bounce delay-150">.</span>
            <span className="animate-bounce delay-300">.</span>
          </div>
        )}
        <div className="prose-vitals text-[var(--text)] text-sm leading-relaxed">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
        </div>
        {loading && text && (
          <span className="inline-block w-1 h-4 bg-[var(--brand)] animate-pulse ml-0.5" />
        )}
      </div>

      {/* "Why this matters" education blocks */}
      {!loading && flagged.length > 0 && (
        <details className="group">
          <summary className="cursor-pointer text-sm font-medium text-[var(--text-muted)] hover:text-[var(--text)] transition-colors list-none flex items-center gap-2">
            <span className="group-open:hidden">▶</span>
            <span className="hidden group-open:inline">▼</span>
            Why this matters
          </summary>
          <div className="mt-3 space-y-3">
            {flagged.map((item) => item && (
              <div
                key={item.key}
                className={`border-l-4 p-4 rounded-r-lg ${STATUS_COLORS[item.status]}`}
              >
                <div className={`font-semibold text-sm mb-1 ${item.status === "danger" ? "text-red-700 dark:text-red-400" : "text-orange-700 dark:text-orange-400"}`}>
                  {item.title}
                </div>
                <div className="text-sm text-[var(--text)]">{item.body}</div>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
