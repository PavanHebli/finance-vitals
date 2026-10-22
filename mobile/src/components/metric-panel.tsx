import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Slider from "@react-native-community/slider";
import { fetchSimulate } from "@vitals/shared";
import type { Metrics, MetricScores } from "@vitals/shared";
import { useAppTheme } from "@/hooks/use-app-theme";
import { METRIC_KEYS, METRIC_LABELS, type Completeness, type MetricName } from "@/lib/completeness";
import { describeMetric, statusColor, statusWord } from "@/lib/budget-utils";
import { money } from "@/lib/format";

// Which number the slider changes for each metric, and how it is worded.
const SLIDERS: Record<MetricName, { field: string; label: string; fallbackMax: number }> = {
  savingsRate: { field: "income_main", label: "If monthly income were", fallbackMax: 10000 },
  debtToIncome: { field: "debt_monthly", label: "If monthly debt payments were", fallbackMax: 2000 },
  housingRatio: { field: "expenses_rent", label: "If monthly rent or mortgage were", fallbackMax: 4000 },
  emergencyFund: { field: "savings_total", label: "If total savings were", fallbackMax: 20000 },
};

interface MetricPanelProps {
  name: MetricName;
  completeness: Completeness;
  metrics: Metrics | null;
  metricScores: MetricScores | null;
  source: string;
  // The numbers last sent to the score API, so the slider can try a change.
  baseForm: Record<string, unknown>;
}

// Opens under a metric pill. Answered: shows the real value, its points and
// where it came from, with a slider to see what a different number would do.
// Not answered: says what is missing.
export function MetricPanel({ name, completeness, metrics, metricScores, source, baseForm }: MetricPanelProps) {
  const theme = useAppTheme();
  const status = completeness[name];
  const slider = SLIDERS[name];
  const current = Number(baseForm[slider.field] ?? 0);
  const max = Math.max(current * 2, slider.fallbackMax);

  const [value, setValue] = useState(current);
  const [simScore, setSimScore] = useState<number | null>(null);
  const [simError, setSimError] = useState(false);

  async function trySlider(next: number) {
    setSimError(false);
    try {
      const result = await fetchSimulate(baseForm, { [slider.field]: next });
      setSimScore(result.sim_score);
    } catch {
      setSimError(true);
    }
  }

  const entry = metricScores ? metricScores[METRIC_KEYS[name]] : null;
  const box = [styles.box, { backgroundColor: theme.surface, borderColor: theme.brand }];

  if (!status.complete || !metrics || !entry || !("score" in entry)) {
    return (
      <View style={box}>
        <Text style={[styles.title, { color: theme.text }]}>{METRIC_LABELS[name]} not calculated yet</Text>
        <Text style={[styles.text, { color: theme.textMuted }]}>{status.hint ?? "Calculate your score to see this."}</Text>
      </View>
    );
  }

  return (
    <View style={box}>
      <Text style={[styles.title, { color: theme.text }]}>
        {METRIC_LABELS[name]}: {describeMetric(name, metrics)}
      </Text>
      <Text style={[styles.text, { color: statusColor(entry.status) }]}>
        {entry.score} of 25 points · {statusWord(entry.status)}
      </Text>
      <Text style={[styles.text, { color: theme.textMuted }]}>Based on: {source}</Text>

      <View style={styles.sliderHeader}>
        <Text style={[styles.sliderLabel, { color: theme.text }]}>{slider.label}</Text>
        <Text style={[styles.sliderValue, { color: theme.brand }]}>{money(value)}</Text>
      </View>
      <Slider
        minimumValue={0}
        maximumValue={max}
        step={max > 5000 ? 50 : 10}
        value={value}
        onValueChange={setValue}
        onSlidingComplete={trySlider}
        minimumTrackTintColor={theme.brand}
        maximumTrackTintColor={theme.border}
        thumbTintColor={theme.brand}
      />
      {simScore !== null && (
        <Text style={[styles.result, { color: theme.text, backgroundColor: theme.brandSoft }]}>
          With that, your score would be {simScore}
        </Text>
      )}
      {simError && <Text style={[styles.text, { color: "#dc3535" }]}>Couldn't try that. Check your connection.</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { marginHorizontal: 12, borderWidth: 1.5, borderRadius: 14, padding: 12, gap: 6 },
  title: { fontSize: 13, fontWeight: "700" },
  text: { fontSize: 12, lineHeight: 17 },
  sliderHeader: { flexDirection: "row", justifyContent: "space-between", marginTop: 8 },
  sliderLabel: { fontSize: 12, fontWeight: "600" },
  sliderValue: { fontSize: 13, fontWeight: "800" },
  result: { fontSize: 12, fontWeight: "600", borderRadius: 10, padding: 8, overflow: "hidden" },
});
