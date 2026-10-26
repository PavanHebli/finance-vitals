import { useRef, useState } from "react";
import { ActivityIndicator, Animated, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useAppTheme } from "@/hooks/use-app-theme";
import { METRIC_LABELS, METRIC_ORDER, type Completeness, type MetricName } from "@/lib/completeness";
import { labelColor } from "@/lib/budget-utils";

interface ScoreCardProps {
  score: number | null;
  label: string | null;
  answeredCount: number;
  completeness: Completeness | null;
  selected: MetricName | null;
  onSelectMetric: (name: MetricName) => void;
  narrative: string;
  narrativeLoading: boolean;
  calculating: boolean;
  error: string | null;
  // The one button under the card: "Complete profile", "Calculate score", or none.
  actionLabel: string | null;
  onAction: () => void;
}

const GREEN = "#00843a";
const AMBER = "#dc6e00";

export function ScoreCard(props: ScoreCardProps) {
  const theme = useAppTheme();
  const flip = useRef(new Animated.Value(0)).current;
  const [flipped, setFlipped] = useState(false);

  function toggleFlip() {
    Animated.timing(flip, { toValue: flipped ? 0 : 1, duration: 450, useNativeDriver: true }).start();
    setFlipped(!flipped);
  }

  const frontRotate = flip.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "180deg"] });
  const backRotate = flip.interpolate({ inputRange: [0, 1], outputRange: ["180deg", "360deg"] });

  const faceStyle = [styles.face, { backgroundColor: theme.surface, borderColor: theme.border }];

  return (
    <View style={styles.wrap}>
      <View style={styles.cardArea}>
        {/* Front: score and metric pills */}
        <Animated.View style={[...faceStyle, { transform: [{ perspective: 1000 }, { rotateY: frontRotate }] }]}>
          {props.calculating ? (
            <View style={styles.center}>
              <ActivityIndicator color={theme.brand} />
              <Text style={[styles.small, { color: theme.textMuted }]}>Calculating…</Text>
            </View>
          ) : props.completeness ? (
            <View style={styles.frontTop}>
              <Text style={[styles.bigScore, { color: theme.text }]}>{props.score ?? "—"}</Text>
              {props.label && <Text style={[styles.label, { color: labelColor(props.label) }]}>{props.label}</Text>}
              <Text style={[styles.small, { color: theme.textMuted }]}>{props.answeredCount} of 4 metrics covered</Text>
            </View>
          ) : (
            <View style={styles.empty}>
              <Text style={[styles.emptyTitle, { color: theme.text }]}>Your Vitals score</Text>
              <Text style={[styles.emptyText, { color: theme.textMuted }]}>
                Add your income below, then a few cards, and your score appears here.
              </Text>
            </View>
          )}

          {props.completeness && (
            <View style={styles.pillGrid}>
              {METRIC_ORDER.map((name) => {
                const done = props.completeness![name].complete;
                const color = done ? GREEN : AMBER;
                return (
                  <Pressable
                    key={name}
                    onPress={() => props.onSelectMetric(name)}
                    style={[
                      styles.pill,
                      { borderColor: done ? "rgba(0,160,67,0.3)" : "rgba(220,110,0,0.35)" },
                      { backgroundColor: done ? "rgba(0,160,67,0.1)" : "rgba(220,110,0,0.1)" },
                      props.selected === name && { borderColor: theme.brand, borderWidth: 2 },
                    ]}
                  >
                    <View style={[styles.dot, { backgroundColor: color }]} />
                    <Text style={[styles.pillText, { color }]}>
                      {METRIC_LABELS[name]}
                      {done ? "" : " ?"}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          )}
        </Animated.View>

        {/* Back: the AI narrative */}
        <Animated.View
          pointerEvents={flipped ? "auto" : "none"}
          style={[...faceStyle, styles.back, { transform: [{ perspective: 1000 }, { rotateY: backRotate }] }]}
        >
          <Text style={[styles.backTitle, { color: theme.text }]}>✦ AI Narrative</Text>
          <ScrollView>
            <Text style={[styles.narrative, { color: theme.textMuted }]}>
              {props.narrative ||
                (props.narrativeLoading ? "Writing your story…" : "Calculate your score to get your AI narrative.")}
            </Text>
          </ScrollView>
        </Animated.View>

        <Pressable onPress={toggleFlip} style={[styles.infoButton, { backgroundColor: theme.surface2 }]}>
          <Text style={{ color: theme.textMuted, fontWeight: "800", fontSize: 12 }}>{flipped ? "✕" : "i"}</Text>
        </Pressable>
      </View>

      {props.error && <Text style={styles.error}>Couldn't calculate your score. {props.error}</Text>}

      {props.actionLabel && (
        <Pressable onPress={props.onAction} style={[styles.action, { backgroundColor: theme.brand }]}>
          <Text style={styles.actionText}>{props.actionLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginHorizontal: 12, gap: 8 },
  cardArea: { height: 172 },
  face: { ...StyleSheet.absoluteFill, borderRadius: 16, borderWidth: 1, backfaceVisibility: "hidden", overflow: "hidden" },
  back: { padding: 14 },
  center: { alignItems: "center", paddingTop: 30, gap: 8 },
  empty: { alignItems: "center", justifyContent: "center", flex: 1, paddingHorizontal: 36, gap: 6 },
  emptyTitle: { fontSize: 15, fontWeight: "800" },
  emptyText: { fontSize: 12, lineHeight: 18, textAlign: "center" },
  frontTop: { alignItems: "center", paddingTop: 14 },
  bigScore: { fontSize: 42, lineHeight: 46, fontWeight: "900" },
  label: { fontSize: 14, fontWeight: "700" },
  small: { fontSize: 11 },
  pillGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6, paddingHorizontal: 10, paddingTop: 10 },
  pill: { width: "48.5%", flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 6 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  pillText: { fontSize: 11, fontWeight: "700" },
  backTitle: { fontSize: 13, fontWeight: "800", marginBottom: 6 },
  narrative: { fontSize: 12, lineHeight: 19 },
  infoButton: { position: "absolute", top: 8, right: 8, width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  error: { color: "#dc3535", fontSize: 12 },
  action: { borderRadius: 12, paddingVertical: 12, alignItems: "center" },
  actionText: { color: "#ffffff", fontWeight: "700", fontSize: 14 },
});
