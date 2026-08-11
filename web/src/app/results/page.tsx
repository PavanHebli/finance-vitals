"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import * as Tabs from "@radix-ui/react-tabs";
import { useStore, toApiFormData } from "@/lib/store";
import { streamNarrative } from "@/lib/api";
import { HealthScore } from "@/components/HealthScore";
import { Narrative } from "@/components/Narrative";
import { Simulator } from "@/components/Simulator";
import { InlineChat } from "@/components/InlineChat";
import { ExportMenu } from "@/components/ExportMenu";

export default function ResultsPage() {
  const router = useRouter();
  const {
    formData, metrics, metricScores, overallScore, mirror,
    narrativeText, narrativeLoading,
    activeTab, setActiveTab,
    setNarrativeText, setNarrativeLoading, appendNarrative,
  } = useStore();

  // Redirect if no results yet
  useEffect(() => {
    if (!overallScore) router.replace("/form");
  }, [overallScore, router]);

  // Stream narrative on first load (only if not already streamed)
  useEffect(() => {
    if (!overallScore || !metrics || !metricScores || !mirror) return;
    const { narrativeText: curText, narrativeLoading: curLoading } = useStore.getState();
    if (curText || curLoading) return;

    const provider = formData.provider;
    const apiKey   = formData.apiKey;

    setNarrativeLoading(true);
    setNarrativeText("");

    streamNarrative(
      {
        form_data:     toApiFormData(formData),
        metrics,
        metric_scores: metricScores,
        overall_score: overallScore,
        mirror,
        provider,
        api_key: apiKey,
      },
      (chunk) => appendNarrative(chunk)
    )
      .catch((err) => setNarrativeText(`Error: ${err.message}`))
      .finally(() => setNarrativeLoading(false));
  }, [overallScore]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!overallScore || !metrics || !metricScores || !mirror) return null;

  const TABS = [
    { id: "story",  label: "Your Story" },
    { id: "whatif", label: "What If?" },
  ];

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Score header */}
      <HealthScore
        score={overallScore}
        mirror={mirror}
        metrics={metrics}
        metricScores={metricScores}
      />

      {/* Export */}
      <div className="flex justify-end mt-4 mb-6">
        <ExportMenu />
      </div>

      {/* Tabs */}
      <Tabs.Root value={activeTab} onValueChange={setActiveTab}>
        <Tabs.List className="flex gap-1 border-b border-[var(--border)] mb-6">
          {TABS.map((t) => (
            <Tabs.Trigger
              key={t.id}
              value={t.id}
              className="px-4 py-2.5 text-sm font-medium text-[var(--text-muted)] border-b-2 border-transparent data-[state=active]:text-[var(--brand)] data-[state=active]:border-[var(--brand)] transition-colors"
            >
              {t.label}
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
