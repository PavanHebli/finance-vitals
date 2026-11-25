import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import type { Metrics, MetricScores } from "@vitals/shared";
import { useAppTheme } from "@/hooks/use-app-theme";
import { METRIC_KEYS, METRIC_LABELS, type Completeness, type MetricName } from "@/lib/completeness";
import { describeMetric, statusColor, statusWord } from "@/lib/budget-utils";

interface MetricPanelProps {
  name: MetricName;
  completeness: Completeness;
  metrics: Metrics | null;
  metricScores: MetricScores | null;
  source: string;
}

// Opens under a metric pill. Answered: shows the real value, its points and
// where it came from. The "what if" sliders live on the Score tab only.
// Not answered: says what is missing.
export function MetricPanel({ name, completeness, metrics, metricScores, source }: MetricPanelProps) {
  const theme = useAppTheme();
  const router = useRouter();
  const status = completeness[name];
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
      <Pressable onPress={() => router.navigate("/(tabs)/score")} hitSlop={8}>
        <Text style={[styles.link, { color: theme.brand }]}>Try what-ifs →</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { marginHorizontal: 12, borderWidth: 1.5, borderRadius: 14, padding: 12, gap: 6 },
  title: { fontSize: 13, fontWeight: "700" },
  text: { fontSize: 12, lineHeight: 17 },
  link: { fontSize: 12, fontWeight: "700", marginTop: 4 },
});
