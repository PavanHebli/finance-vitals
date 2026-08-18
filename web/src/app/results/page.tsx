"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import * as Tabs from "@radix-ui/react-tabs";
import { Sparkles, Zap } from "lucide-react";
import { useStore, toApiFormData } from "@/lib/store";
import { streamNarrative } from "@/lib/api";
import { analytics } from "@/lib/analytics";
import { HealthScore } from "@/components/HealthScore";
import { Narrative } from "@/components/Narrative";
import { Simulator } from "@/components/Simulator";
import { InlineChat } from "@/components/InlineChat";
import { ExportMenu } from "@/components/ExportMenu";
import { GoalSection } from "@/components/GoalSection";
import type { Snapshot } from "@/lib/types";

// Returns snapshots from months other than the current one
function getPreviousSnapshots(snapshots: Snapshot[]) {
  const currentMonth = new Date().toISOString().slice(0, 7);
  return [...snapshots]
    .filter((s) => s.saved_at !== currentMonth)
    .sort((a, b) => a.saved_at.localeCompare(b.saved_at));
}

// Days since that snapshot's month ended
function daysSinceMonth(savedAt: string): number {
  const [y, m] = savedAt.split("-").map(Number);
  const monthEnd = new Date(m === 12 ? y + 1 : y, m === 12 ? 0 : m, 1);
  return Math.max(0, Math.floor((Date.now() - monthEnd.getTime()) / 86_400_000));
}

// Consecutive-month streak from snapshot array
function calcStreak(snapshots: Snapshot[]): number {
  if (snapshots.length === 0) return 0;
  const sorted = [...snapshots].sort((a, b) => a.saved_at.localeCompare(b.saved_at));
  let streak = 1;
  for (let i = sorted.length - 1; i > 0; i--) {
    const [cy, cm] = sorted[i].saved_at.split("-").map(Number);
    const [py, pm] = sorted[i - 1].saved_at.split("-").map(Number);
    if ((cy - py) * 12 + (cm - pm) === 1) streak++;
    else break;
  }
  return streak;
}

const TABS = [
  { id: "story",  label: "Your Story", Icon: Sparkles },
  { id: "whatif", label: "What If?",   Icon: Zap      },
];

export default function ResultsPage() {
  const router = useRouter();
  const {
    formData, metrics, metricScores, overallScore, mirror,
    narrativeText, narrativeLoading, snapshots,
    activeTab, setActiveTab,
    setNarrativeText, setNarrativeLoading, appendNarrative,
  } = useStore();

  useEffect(() => {
    if (!overallScore) router.replace("/form");
    else analytics.updateSession({ viewed_results: true });
  }, [overallScore, router]);

  useEffect(() => {
    if (!overallScore || !metrics || !metricScores || !mirror) return;
    const { narrativeText: cur, narrativeLoading: loading } = useStore.getState();
    if (cur || loading) return;

    setNarrativeLoading(true);
    setNarrativeText("");
    streamNarrative(
      {
        form_data:     toApiFormData(formData),
        metrics,
        metric_scores: metricScores,
        overall_score: overallScore,
        mirror,
        provider: formData.provider,
        api_key:  formData.apiKey,
      },
      (chunk) => appendNarrative(chunk),
    )
      .catch((err) => setNarrativeText(`Error: ${err.message}`))
      .finally(() => setNarrativeLoading(false));
  }, [overallScore]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!overallScore || !metrics || !metricScores || !mirror) return null;

  const previousSnaps  = getPreviousSnapshots(snapshots);
  const lastSnap       = previousSnaps.at(-1) ?? null;
  const streak         = calcStreak(snapshots);
  const days           = lastSnap ? daysSinceMonth(lastSnap.saved_at) : null;

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">

      {/* Returning user banner */}
      {lastSnap && (
        <div className="flex items-center justify-between mb-6 px-4 py-3 rounded-xl bg-[var(--bg-2)] border border-[var(--border)]">
          <p className="text-sm text-[var(--text)]">
            Welcome back.{" "}
            <span className="text-[var(--text-muted)]">
              Last check-in {days === 0 ? "today" : `${days} day${days === 1 ? "" : "s"} ago`}
            </span>
            {" — "}your score was{" "}
            <span className="font-semibold">{lastSnap.outputs.overall_score}</span>.
          </p>
          {streak >= 2 && (
            <span className="text-sm font-semibold text-[var(--brand)] shrink-0 ml-4">
              🔥 {streak}-month streak
            </span>
          )}
        </div>
      )}

      {/* Score */}
      <HealthScore
        score={overallScore}
        mirror={mirror}
        metrics={metrics}
        metricScores={metricScores}
      />

      {/* Export */}
      <div className="flex justify-end mt-4">
        <ExportMenu />
      </div>

      {/* Goals */}
      <GoalSection />

      {/* Tabs */}
      <Tabs.Root
        value={activeTab}
        onValueChange={(tab) => {
          analytics.track("tab_changed", { tab, previous: activeTab });
          setActiveTab(tab);
        }}
      >
        <Tabs.List className="flex gap-1 border-b border-[var(--border)] mb-6">
          {TABS.map(({ id, label, Icon }) => (
            <Tabs.Trigger
              key={id}
              value={id}
              className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium text-[var(--text-muted)] border-b-2 border-transparent data-[state=active]:text-[var(--brand)] data-[state=active]:border-[var(--brand)] transition-colors"
            >
              <Icon size={14} />
              {label}
            </Tabs.Trigger>
          ))}
        </Tabs.List>

        <Tabs.Content value="story" className="outline-none">
          <Narrative
            text={narrativeText}
            loading={narrativeLoading}
            metrics={metrics}
            metricScores={metricScores}
          />
          <InlineChat />
        </Tabs.Content>

        <Tabs.Content value="whatif" className="outline-none">
          <Simulator />
        </Tabs.Content>


      </Tabs.Root>
    </div>
  );
}
