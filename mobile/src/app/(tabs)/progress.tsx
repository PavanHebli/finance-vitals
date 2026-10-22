import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppTheme } from "@/hooks/use-app-theme";
import { METRIC_KEYS, METRIC_LABELS, METRIC_ORDER } from "@/lib/completeness";
import { useStore } from "@/lib/store";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function monthName(savedAt: string): string {
  return MONTHS[parseInt(savedAt.slice(5, 7), 10) - 1] ?? savedAt;
}

export default function Progress() {
  const theme = useAppTheme();
  const snapshots = useStore((s) => s.snapshots);

  // Oldest first, so the chart reads left to right.
  const sorted = [...snapshots].sort((a, b) => a.saved_at.localeCompare(b.saved_at));

  if (sorted.length === 0) {
    return (
      <SafeAreaView edges={["top"]} style={[styles.screen, { backgroundColor: theme.bg }]}>
        <View style={styles.empty}>
          <Text style={[styles.title, { color: theme.text }]}>Progress</Text>
          <Text style={[styles.emptyText, { color: theme.textMuted }]}>
            Your score history shows up here. Check your score from the Budget or Score tab to save your first month.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const first = sorted[0].outputs.overall_score;
  const last = sorted[sorted.length - 1].outputs.overall_score;
  const change = last - first;
  const latest = sorted[sorted.length - 1];
  const earliest = sorted[0];

  return (
    <SafeAreaView edges={["top"]} style={[styles.screen, { backgroundColor: theme.bg }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: theme.text }]}>Progress</Text>

        <View style={styles.statsRow}>
          <Stat label="Started" value={String(first)} />
          <Stat label="Trend" value={change > 0 ? `+${change}` : String(change)} color={change >= 0 ? "#00a043" : "#dc3535"} />
          <Stat label="Now" value={String(last)} />
        </View>

        <View style={[styles.chart, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          {sorted.map((snap) => {
            const score = snap.outputs.overall_score;
            return (
              <View key={snap.saved_at} style={styles.barColumn}>
                <Text style={[styles.barValue, { color: theme.text }]}>{score}</Text>
                <View style={[styles.bar, { height: Math.max(4, score * 1.2), backgroundColor: theme.brand }]} />
                <Text style={[styles.barLabel, { color: theme.textMuted }]}>{monthName(snap.saved_at)}</Text>
              </View>
            );
          })}
        </View>

        {sorted.length > 1 && (
          <View style={[styles.box, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.boxTitle, { color: theme.text }]}>What changed</Text>
            {METRIC_ORDER.map((name) => {
              const before = earliest.outputs.metric_scores[METRIC_KEYS[name]];
              const after = latest.outputs.metric_scores[METRIC_KEYS[name]];
              if (!("score" in before) || !("score" in after)) return null;
              const diff = after.score - before.score;
              return (
                <View key={name} style={styles.changeRow}>
                  <Text style={{ color: theme.text, fontSize: 13 }}>{METRIC_LABELS[name]}</Text>
                  <Text style={{ color: diff >= 0 ? "#00a043" : "#dc3535", fontWeight: "700", fontSize: 13 }}>
                    {before.score} → {after.score} ({diff >= 0 ? "+" : ""}{diff})
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        <Text style={[styles.streak, { color: theme.textMuted }]}>
          {sorted.length} {sorted.length === 1 ? "month" : "months"} checked in
        </Text>
      </ScrollView>
    </SafeAreaView>
  );

  function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
    return (
      <View style={[styles.stat, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={[styles.statLabel, { color: theme.textMuted }]}>{label}</Text>
        <Text style={[styles.statValue, { color: color ?? theme.text }]}>{value}</Text>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 16, gap: 14, paddingBottom: 40 },
  title: { fontSize: 24, fontWeight: "900" },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 10 },
  emptyText: { textAlign: "center", fontSize: 13, lineHeight: 19 },
  statsRow: { flexDirection: "row", gap: 8 },
  stat: { flex: 1, borderWidth: 1, borderRadius: 12, padding: 10, alignItems: "center" },
  statLabel: { fontSize: 11, fontWeight: "700" },
  statValue: { fontSize: 22, fontWeight: "900" },
  chart: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-around", borderWidth: 1, borderRadius: 14, padding: 14, minHeight: 190 },
  barColumn: { alignItems: "center", gap: 4 },
  bar: { width: 22, borderRadius: 6 },
  barValue: { fontSize: 11, fontWeight: "700" },
  barLabel: { fontSize: 10 },
  box: { borderWidth: 1, borderRadius: 14, padding: 12, gap: 8 },
  boxTitle: { fontSize: 14, fontWeight: "800" },
  changeRow: { flexDirection: "row", justifyContent: "space-between" },
  streak: { textAlign: "center", fontSize: 12 },
});
