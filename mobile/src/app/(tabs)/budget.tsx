import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { cardKind, planDebtMonthly, todayInTimezone } from "@vitals/shared";
import type { BudgetCard } from "@vitals/shared";
import { Icon } from "@/components/icons";
import { CategoryCard, FloatCard, IncomeCard } from "@/components/budget-cards";
import { CardSheet } from "@/components/card-sheet";
import { ImportSheet } from "@/components/import-sheet";
import { MetricPanel } from "@/components/metric-panel";
import { PlanCardSheet } from "@/components/plan-card-sheet";
import { PlanView } from "@/components/plan-view";
import { ProfileSheet } from "@/components/profile-sheet";
import { plainText } from "@/components/rich-text";
import { ScoreCard } from "@/components/score-card";
import { ScoreFormSheet } from "@/components/score-form-sheet";
import { useAppTheme } from "@/hooks/use-app-theme";
import { previewSplit } from "@/lib/budget-utils";
import {
  checkCompleteness,
  METRIC_ORDER,
  metricSources,
  monthlyIncome,
  partialScore,
  type MetricName,
} from "@/lib/completeness";
import { money } from "@/lib/format";
import { calculateFromBudget, currentScoreForm } from "@/lib/score";
import { useStore } from "@/lib/store";

export default function Budget() {
  const theme = useAppTheme();
  const router = useRouter();

  const cards = useStore((s) => s.budgetCards);
  const log = useStore((s) => s.distributionLog);
  const profile = useStore((s) => s.financialProfile);
  const metrics = useStore((s) => s.metrics);
  const metricScores = useStore((s) => s.metricScores);
  const mirror = useStore((s) => s.mirror);
  const narrative = useStore((s) => s.narrativeText);
  const narrativeLoading = useStore((s) => s.narrativeLoading);
  const distributeBudget = useStore((s) => s.distributeBudget);
  const paySchedule = useStore((s) => s.paySchedule);

  const [selected, setSelected] = useState<MetricName | null>(null);
  const [calculating, setCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingCard, setEditingCard] = useState<BudgetCard | null>(null);
  const [cardSheetOpen, setCardSheetOpen] = useState(false);
  // The plan's own editor (bills and goals), used once a payday plan exists.
  const [planSheetOpen, setPlanSheetOpen] = useState(false);
  const [planSheetKind, setPlanSheetKind] = useState<"bill" | "goal">("bill");
  const [profileOpen, setProfileOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [splitMessage, setSplitMessage] = useState("");

  const incomeCard = cards.find((c) => c.type === "income");
  const floatCard = cards.find((c) => c.type === "cash");
  const customCards = cards.filter((c) => c.type === "custom");
  const nextSplit = previewSplit(cards);

  const hasIncome = monthlyIncome(cards, log, paySchedule) > 0;
  const completeness = hasIncome ? checkCompleteness(cards, log, profile, paySchedule) : null;
  const sources = metricSources(cards, profile, paySchedule !== null);
  // Monthly debt payments: the plan's loan bills, or the profile without a plan.
  const debtMonthlyShown = paySchedule
    ? planDebtMonthly(cards, paySchedule, todayInTimezone(paySchedule.payTimezone))
    : profile.debtMonthly;
  const baseForm = useMemo(() => currentScoreForm(cards, log, profile, paySchedule), [cards, log, profile, paySchedule]);

  // Partial score: only the answered metrics, scaled to 0-100.
  let shownScore: number | null = null;
  let answeredCount = 0;
  if (completeness && metricScores) {
    const partial = partialScore(metricScores, completeness);
    answeredCount = partial.count;
    if (partial.count > 0) shownScore = partial.score;
  }
  if (completeness && answeredCount === 0) {
    answeredCount = METRIC_ORDER.filter((name) => completeness[name].complete).length;
  }

  async function runScore() {
    setCalculating(true);
    setError(null);
    try {
      await calculateFromBudget();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    }
    setCalculating(false);
  }

  // Re-score a moment after the cards change, once there is income and a profile.
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!hasIncome || !profile.profileComplete) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(runScore, 1500);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseForm]);

  function openCard(card: BudgetCard | null) {
    setEditingCard(card);
    setCardSheetOpen(true);
  }

  function openPlanCard(card: BudgetCard | null, kind: "bill" | "goal" = "bill") {
    // Once-in-a-while costs get their own editor in a later step; until then
    // the general card editor handles them.
    if (card && cardKind(card) === "occasional") {
      openCard(card);
      return;
    }
    setEditingCard(card);
    setPlanSheetKind(kind);
    setPlanSheetOpen(true);
  }

  function split() {
    const result = distributeBudget();
    if (!result.success) {
      Alert.alert("Can't split yet", result.error);
    } else {
      setSplitMessage("Income split across your cards.");
      setTimeout(() => setSplitMessage(""), 2500);
    }
  }

  let actionLabel: string | null = null;
  let onAction: () => void = runScore;
  if (hasIncome && !profile.profileComplete) {
    actionLabel = "Complete profile";
    onAction = () => setProfileOpen(true);
  } else if (hasIncome && !metrics) {
    actionLabel = "Calculate score";
  }

  return (
    <SafeAreaView edges={["top"]} style={[styles.screen, { backgroundColor: theme.bg }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>Budget</Text>
        <View style={styles.headerButtons}>
          <Pressable onPress={() => setImportOpen(true)} style={[styles.iconButton, { backgroundColor: theme.surface2 }]}>
            <Icon name="import" color={theme.textMuted} size={16} />
          </Pressable>
          <Pressable onPress={() => setFormOpen(true)} style={[styles.iconButton, { backgroundColor: theme.surface2 }]}>
            <Icon name="form" color={theme.textMuted} size={16} />
          </Pressable>
          {/* With a payday plan, the payday check-in replaces Split (coming next). */}
          {!paySchedule && (
            <Pressable onPress={split} style={[styles.iconButton, { backgroundColor: theme.brand }]}>
              <Icon name="split" color="#ffffff" size={16} />
            </Pressable>
          )}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {!paySchedule && (
          <Pressable
            onPress={() => router.push("/plan-setup")}
            style={[styles.setupBanner, { backgroundColor: theme.brandSoft, borderColor: theme.brand }]}
          >
            <Text style={[styles.setupTitle, { color: theme.text }]}>Plan your paycheck</Text>
            <Text style={{ color: theme.textMuted, fontSize: 13 }}>
              See what you can spend each week after rent and bills. About a minute.
            </Text>
          </Pressable>
        )}
        {paySchedule && (
          <PlanView onEditCard={(card) => openPlanCard(card)} onAddCard={(kind) => openPlanCard(null, kind)} />
        )}
        <ScoreCard
          score={shownScore}
          label={mirror?.label ?? null}
          answeredCount={answeredCount}
          completeness={completeness}
          selected={selected}
          onSelectMetric={(name) => setSelected(selected === name ? null : name)}
          narrative={narrative}
          narrativeLoading={narrativeLoading}
          calculating={calculating}
          error={error}
          actionLabel={actionLabel}
          onAction={onAction}
        />

        {/* The profile numbers, always visible and editable once answered. */}
        {profile.profileComplete && (
          <Pressable onPress={() => setProfileOpen(true)} style={[styles.profileRow, { borderColor: theme.border }]}>
            <Text style={{ color: theme.textMuted, fontSize: 12, flex: 1 }}>
              Debt {money(profile.debtTotal)} ({money(debtMonthlyShown)} a month) · Savings {money(profile.savingsTotal)}
            </Text>
            <Text style={{ color: theme.brand, fontSize: 12, fontWeight: "700" }}>Edit</Text>
          </Pressable>
        )}

        {selected && completeness && (
          <MetricPanel
            key={selected}
            name={selected}
            completeness={completeness}
            metrics={metrics}
            metricScores={metricScores}
            source={sources[selected]}
          />
        )}

        {narrative !== "" && (
          <Pressable
            onPress={() => router.navigate("/(tabs)/score")}
            style={[styles.insight, { backgroundColor: theme.brandSoft, borderColor: theme.border }]}
          >
            <View style={[styles.insightIcon, { backgroundColor: theme.brand }]}>
              <Icon name="spark" color="#ffffff" size={12} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.insightTitle, { color: theme.text }]}>AI Insight</Text>
              <Text style={[styles.insightText, { color: theme.textMuted }]} numberOfLines={2}>
                {plainText(narrative)}
              </Text>
              <Text style={[styles.insightCta, { color: theme.brand }]}>View full story →</Text>
            </View>
          </Pressable>
        )}

        {splitMessage !== "" && <Text style={[styles.splitNote, { color: theme.brand }]}>{splitMessage}</Text>}

        {/* The old card grid, until a payday plan is set up. */}
        {!paySchedule && (
          <>
            <Text style={[styles.sectionLabel, { color: theme.textMuted }]}>CARDS</Text>
            <View style={styles.grid}>
              {incomeCard && <IncomeCard card={incomeCard} />}
              {floatCard && <FloatCard card={floatCard} nextSplit={nextSplit.get(floatCard.id) ?? 0} />}
              {customCards.map((card) => (
                <CategoryCard key={card.id} card={card} onPress={() => openCard(card)} />
              ))}
            </View>
          </>
        )}
        {!paySchedule && (
          <Pressable onPress={() => openCard(null)} style={[styles.addCard, { borderColor: theme.brand }]}>
            <Text style={{ color: theme.brand, fontSize: 13, fontWeight: "700" }}>+ Add card</Text>
          </Pressable>
        )}
      </ScrollView>

      <CardSheet visible={cardSheetOpen} onClose={() => setCardSheetOpen(false)} card={editingCard} />
      <PlanCardSheet visible={planSheetOpen} onClose={() => setPlanSheetOpen(false)} card={editingCard} newKind={planSheetKind} />
      <ProfileSheet visible={profileOpen} onClose={() => setProfileOpen(false)} />
      <ImportSheet visible={importOpen} onClose={() => setImportOpen(false)} />
      <ScoreFormSheet visible={formOpen} onClose={() => setFormOpen(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  profileRow: { flexDirection: "row", alignItems: "center", gap: 8, marginHorizontal: 16, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 8 },
  screen: { flex: 1 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, paddingVertical: 10 },
  title: { fontSize: 24, fontWeight: "900" },
  headerButtons: { flexDirection: "row", gap: 8, alignItems: "center" },
  iconButton: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  content: { paddingBottom: 40, gap: 12 },
  setupBanner: { marginHorizontal: 16, borderWidth: 1.5, borderRadius: 14, padding: 14, gap: 4 },
  setupTitle: { fontSize: 16, fontWeight: "800" },
  insight: { marginHorizontal: 12, borderWidth: 1, borderRadius: 12, padding: 10, flexDirection: "row", gap: 8 },
  insightIcon: { width: 22, height: 22, borderRadius: 6, alignItems: "center", justifyContent: "center", marginTop: 1 },
  insightTitle: { fontSize: 11, fontWeight: "700" },
  insightText: { fontSize: 10, lineHeight: 15, marginTop: 2 },
  insightCta: { fontSize: 10, fontWeight: "700", marginTop: 4 },
  sectionLabel: { fontSize: 10, fontWeight: "700", letterSpacing: 0.7, paddingHorizontal: 14, marginBottom: -6 },
  splitNote: { textAlign: "center", fontSize: 12, fontWeight: "600" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingHorizontal: 12 },
  addCard: { marginHorizontal: 12, paddingVertical: 11, borderWidth: 1.5, borderStyle: "dashed", borderRadius: 14, alignItems: "center" },
});
