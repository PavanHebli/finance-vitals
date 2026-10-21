import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Slider from "@react-native-community/slider";
import Svg, { Circle } from "react-native-svg";
import { budgetToFormData, fetchSimulate } from "@vitals/shared";
import { ScoreFormSheet } from "@/components/score-form-sheet";
import { useAppTheme } from "@/hooks/use-app-theme";
import { describeMetric, labelColor, statusColor, statusWord } from "@/lib/budget-utils";
import { METRIC_KEYS, METRIC_LABELS, METRIC_ORDER, type MetricName } from "@/lib/completeness";
import { money } from "@/lib/format";
import { useStore } from "@/lib/store";

const SIZE = 150;
const STROKE = 12;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

// The slider on each What-If tile changes one number and asks the backend what the score would be.
const TILES: Record<MetricName, { field: string; label: string; max: number }> = {
  savingsRate: { field: "income_main", label: "Monthly income", max: 15000 },
  debtToIncome: { field: "debt_monthly", label: "Monthly debt payments", max: 3000 },
  housingRatio: { field: "expenses_rent", label: "Rent or mortgage", max: 5000 },
  emergencyFund: { field: "savings_total", label: "Total savings", max: 50000 },
};

export default function ScoreTab() {
  const theme = useAppTheme();
  const overall = useStore((s) => s.overallScore);
  const mirror = useStore((s) => s.mirror);
  const metrics = useStore((s) => s.metrics);
  const metricScores = useStore((s) => s.metricScores);
  const narrative = useStore((s) => s.narrativeText);
  const narrativeLoading = useStore((s) => s.narrativeLoading);
  const cards = useStore((s) => s.budgetCards);
  const log = useStore((s) => s.distributionLog);
  const profile = useStore((s) => s.financialProfile);
  const snapshots = useStore((s) => s.snapshots);

  const [tab, setTab] = useState<"story" | "whatif">("story");
  const [openTile, setOpenTile] = useState<MetricName | null>(null);
  const [values, setValues] = useState<Partial<Record<MetricName, number>>>({});
  const [simScores, setSimScores] = useState<Partial<Record<MetricName, number>>>({});
  const [formOpen, setFormOpen] = useState(false);

  const hasScore = overall !== null && metrics !== null && metricScores !== null && mirror !== null;
  const baseForm = budgetToFormData(cards, log, profile);

  async function trySlider(name: MetricName, next: number) {
    try {
      const result = await fetchSimulate(baseForm, { [TILES[name].field]: next });
      setSimScores({ ...simScores, [name]: result.sim_score });
    } catch {
      // The tile just shows no result if the backend can't be reached.
    }
  }

  if (!hasScore) {
    return (
      <SafeAreaView edges={["top"]} style={[styles.screen, { backgroundColor: theme.bg }]}>
        <View style={styles.empty}>
          <Text style={[styles.title, { color: theme.text }]}>No score yet</Text>
          <Text style={[styles.emptyText, { color: theme.textMuted }]}>
            Add income and a few cards on the Budget tab, or enter your numbers directly.
          </Text>
          <Pressable onPress={() => setFormOpen(true)} style={[styles.button, { backgroundColor: theme.brand }]}>
            <Text style={styles.buttonText}>Check your score</Text>
          </Pressable>
        </View>
        <ScoreFormSheet visible={formOpen} onClose={() => setFormOpen(false)} />
      </SafeAreaView>
    );
  }

  // Change since the check-in before the latest one.
  const sortedSnaps = [...snapshots].sort((a, b) => a.saved_at.localeCompare(b.saved_at));
  let changeText = "";
  if (sortedSnaps.length >= 2) {
    const diff = sortedSnaps[sortedSnaps.length - 1].outputs.overall_score - sortedSnaps[sortedSnaps.length - 2].outputs.overall_score;
    changeText = `${diff >= 0 ? "+" : ""}${diff} from last check-in`;
  }

  const filled = CIRCUMFERENCE * (1 - overall / 100);

  return (
    <SafeAreaView edges={["top"]} style={[styles.screen, { backgroundColor: theme.bg }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.ringWrap}>
          <Svg width={SIZE} height={SIZE}>
            <Circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} stroke={theme.surface2} strokeWidth={STROKE} fill="none" />
            <Circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              stroke={labelColor(mirror.label)}
              strokeWidth={STROKE}
              fill="none"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={filled}
              strokeLinecap="round"
              rotation={-90}
              origin={`${SIZE / 2}, ${SIZE / 2}`}
            />
          </Svg>
          <View style={styles.ringCenter}>
            <Text style={[styles.ringScore, { color: theme.text }]}>{overall}</Text>
            <Text style={[styles.ringLabel, { color: labelColor(mirror.label) }]}>{mirror.label}</Text>
          </View>
        </View>

        {changeText !== "" && <Text style={[styles.change, { color: theme.textMuted }]}>{changeText}</Text>}

        <View style={[styles.tabs, { backgroundColor: theme.surface2 }]}>
          {(["story", "whatif"] as const).map((t) => (
            <Pressable key={t} onPress={() => setTab(t)} style={[styles.tab, tab === t && { backgroundColor: theme.surface }]}>
              <Text style={{ color: tab === t ? theme.text : theme.textMuted, fontWeight: "700" }}>
                {t === "story" ? "Your Story" : "What If?"}
              </Text>
            </Pressable>
          ))}
        </View>

        {tab === "story" ? (
          <View style={styles.section}>
            <View style={[styles.box, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Text style={[styles.boxTitle, { color: theme.text }]}>✦ AI Narrative</Text>
              <Text style={[styles.body, { color: theme.textMuted }]}>
                {narrative || (narrativeLoading ? "Writing your story…" : mirror.description)}
              </Text>
            </View>
            <View style={styles.miniGrid}>
              {METRIC_ORDER.map((name) => {
                const entry = metricScores[METRIC_KEYS[name]];
                const hasEntry = "score" in entry;
                return (
                  <View key={name} style={[styles.mini, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                    <Text style={[styles.miniName, { color: theme.textMuted }]}>{METRIC_LABELS[name]}</Text>
                    <Text style={[styles.miniValue, { color: theme.text }]}>{describeMetric(name, metrics)}</Text>
                    {hasEntry && (
                      <Text style={{ color: statusColor(entry.status), fontSize: 11, fontWeight: "700" }}>
                        {entry.score}/25 · {statusWord(entry.status)}
                      </Text>
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        ) : (
          <View style={styles.section}>
            {METRIC_ORDER.map((name) => {
              const tile = TILES[name];
              const current = Number(baseForm[tile.field] ?? 0);
              const value = values[name] ?? current;
              const open = openTile === name;
              return (
                <View key={name} style={[styles.box, { backgroundColor: theme.surface, borderColor: open ? theme.brand : theme.border }]}>
                  <Pressable onPress={() => setOpenTile(open ? null : name)} style={styles.tileHeader}>
                    <Text style={[styles.boxTitle, { color: theme.text }]}>{METRIC_LABELS[name]}</Text>
                    <Text style={{ color: theme.textMuted }}>{open ? "▲" : "▼"}</Text>
                  </Pressable>
                  {open && (
                    <View>
                      <View style={styles.tileHeader}>
                        <Text style={{ color: theme.textMuted, fontSize: 12 }}>{tile.label}</Text>
                        <Text style={{ color: theme.brand, fontWeight: "800" }}>{money(value)}</Text>
                      </View>
                      <Slider
                        minimumValue={0}
                        maximumValue={Math.max(current * 2, tile.max)}
                        step={10}
                        value={value}
                        onValueChange={(v) => setValues({ ...values, [name]: v })}
                        onSlidingComplete={(v) => trySlider(name, v)}
                        minimumTrackTintColor={theme.brand}
                        maximumTrackTintColor={theme.border}
                        thumbTintColor={theme.brand}
                      />
                      {simScores[name] !== undefined && (
                        <Text style={[styles.result, { color: theme.text, backgroundColor: theme.brandSoft }]}>
                          Your score would be {simScores[name]}
                        </Text>
                      )}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}

        <Pressable onPress={() => setFormOpen(true)} style={[styles.button, { backgroundColor: theme.brand, marginHorizontal: 16 }]}>
          <Text style={styles.buttonText}>Recalculate with new numbers</Text>
        </Pressable>
      </ScrollView>
      <ScoreFormSheet visible={formOpen} onClose={() => setFormOpen(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingVertical: 16, gap: 14, paddingBottom: 40 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 10 },
  title: { fontSize: 22, fontWeight: "900" },
  emptyText: { textAlign: "center", fontSize: 13, lineHeight: 19 },
  button: { borderRadius: 12, paddingVertical: 13, paddingHorizontal: 22, alignItems: "center" },
  buttonText: { color: "#ffffff", fontWeight: "700", fontSize: 14 },
  ringWrap: { alignSelf: "center", width: SIZE, height: SIZE, alignItems: "center", justifyContent: "center" },
  ringCenter: { position: "absolute", alignItems: "center" },
  ringScore: { fontSize: 42, fontWeight: "900" },
  change: { textAlign: "center", fontSize: 12, marginTop: -6 },
  ringLabel: { fontSize: 13, fontWeight: "700" },
  tabs: { flexDirection: "row", marginHorizontal: 16, borderRadius: 12, padding: 3 },
  tab: { flex: 1, paddingVertical: 8, alignItems: "center", borderRadius: 10 },
  section: { paddingHorizontal: 16, gap: 10 },
  box: { borderWidth: 1.5, borderRadius: 14, padding: 12, gap: 6 },
  boxTitle: { fontSize: 14, fontWeight: "800" },
  body: { fontSize: 13, lineHeight: 20 },
  miniGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  mini: { width: "48.5%", borderWidth: 1, borderRadius: 12, padding: 10, gap: 2 },
  miniName: { fontSize: 11, fontWeight: "700" },
  miniValue: { fontSize: 12, fontWeight: "600" },
  tileHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  result: { fontSize: 12, fontWeight: "600", borderRadius: 10, padding: 8, overflow: "hidden" },
});
