import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  cardKind,
  paydayAfter,
  paydayDue,
  perPaycheckToWeekly,
  planPaycheck,
  todayInTimezone,
} from "@vitals/shared";
import type { BudgetCard, PaycheckAllocation } from "@vitals/shared";
import { NumberField } from "@/components/number-field";
import { PlanCardSheet } from "@/components/plan-card-sheet";
import { useAppTheme } from "@/hooks/use-app-theme";
import { formatDay, money } from "@/lib/format";
import { useStore } from "@/lib/store";

// The payday check-in, about a minute:
// confirm what landed in the account, see where it goes (bills, set-asides,
// goals, spending money), see what to move to savings, then start the paycheck.

export default function PaycheckCheckIn() {
  const theme = useAppTheme();
  const router = useRouter();
  const cards = useStore((s) => s.budgetCards);
  const schedule = useStore((s) => s.paySchedule);
  const checkInPaycheck = useStore((s) => s.checkInPaycheck);

  // null until the user types: until then, use the usual paycheck. (Signed-in
  // data can arrive a moment after this screen opens.)
  const [typedAmount, setAmount] = useState<number | null>(null);
  const amount = typedAmount ?? schedule?.paycheckAmount ?? 0;
  // The bill or goal being edited from this screen (a lasting change to the plan).
  const [editing, setEditing] = useState<BudgetCard | null>(null);

  const payday = schedule ? paydayDue(schedule, todayInTimezone(schedule.payTimezone)) : null;

  if (!schedule || !payday) {
    return (
      <SafeAreaView style={[styles.screen, { backgroundColor: theme.bg }]}>
        <View style={styles.content}>
          <Text style={[styles.title, { color: theme.text }]}>Not payday yet</Text>
          <Text style={[styles.sub, { color: theme.textMuted }]}>
            {schedule ? `Your next payday is ${formatDay(schedule.nextPayday)}.` : "Set up your payday plan first."}
          </Text>
          <Pressable onPress={() => router.back()} style={[styles.primaryButton, { backgroundColor: theme.brand }]}>
            <Text style={styles.primaryText}>Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const plan = planPaycheck(cards, amount, payday, schedule.frequency);
  const weekly = perPaycheckToWeekly(plan.spendingMoney, schedule.frequency);

  // Group this paycheck's amounts by the kind of card they go to.
  const kindOf = (a: PaycheckAllocation) => {
    const card = cards.find((c) => c.id === a.cardId);
    return card ? cardKind(card) : "bill";
  };
  const withMoney = plan.allocations.filter((a) => a.amount > 0);
  const bills = withMoney.filter((a) => kindOf(a) === "bill");
  const setAsides = withMoney.filter((a) => kindOf(a) === "occasional");
  const goals = withMoney.filter((a) => kindOf(a) === "goal");
  const toSavings = [...setAsides, ...goals];
  const sum = (list: PaycheckAllocation[]) => list.reduce((total, a) => total + a.amount, 0);

  function edit(a: PaycheckAllocation) {
    const card = cards.find((c) => c.id === a.cardId);
    if (card) setEditing(card);
  }

  function start() {
    if (!payday || amount <= 0) return;
    checkInPaycheck(amount, payday);
    router.back();
  }

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.bg }]}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Text style={{ color: theme.brand, fontSize: 15, fontWeight: "600" }}>Cancel</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={[styles.title, { color: theme.text }]}>Payday · {formatDay(payday)}</Text>
          <NumberField
            label="How much landed in your account?"
            value={amount}
            onChange={setAmount}
            hint="Change it if this paycheck was different."
          />

          <Group title="Bills" items={bills} total={sum(bills)} onPress={edit} />
          {setAsides.length > 0 && <Group title="Set aside for later" items={setAsides} total={sum(setAsides)} onPress={edit} />}
          {goals.length > 0 && <Group title="Goals" items={goals} total={sum(goals)} onPress={edit} />}

          <View style={[styles.box, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <View style={styles.row}>
              <Text style={{ color: theme.text, fontWeight: "800" }}>Spending money</Text>
              <Text style={{ color: plan.spendingMoney < 0 ? "#ef4444" : theme.text, fontWeight: "800" }}>
                {plan.spendingMoney < 0 ? "−" : ""}
                {money(Math.abs(plan.spendingMoney))}
              </Text>
            </View>
            <Text style={{ color: weekly < 0 ? "#ef4444" : theme.textMuted, fontSize: 13 }}>
              {weekly < 0
                ? `Your plan is ${money(-plan.spendingMoney)} more than this paycheck.`
                : `About ${money(weekly)} a week until ${formatDay(paydayAfter(payday, schedule.frequency))}.`}
            </Text>
          </View>

          {toSavings.length > 0 && (
            <View style={[styles.box, { backgroundColor: theme.brandSoft, borderColor: theme.brand }]}>
              <Text style={{ color: theme.text, fontWeight: "800" }}>Move {money(sum(toSavings))} to savings</Text>
              {toSavings.map((a) => (
                <View key={a.cardId} style={styles.row}>
                  <Text style={{ color: theme.textMuted }}>{a.label}</Text>
                  <Text style={{ color: theme.text }}>{money(a.amount)}</Text>
                </View>
              ))}
              <Text style={{ color: theme.textMuted, fontSize: 12 }}>
                Do it in your bank app. Keeping it in a separate account makes it easier not to spend.
              </Text>
            </View>
          )}
          <Text style={{ color: theme.textMuted, fontSize: 12 }}>
            Tap a bill or goal to change it. That changes your plan for every paycheck.
          </Text>
        </ScrollView>

        <View style={styles.footer}>
          <Pressable
            disabled={amount <= 0}
            onPress={start}
            style={[styles.primaryButton, { backgroundColor: theme.brand, opacity: amount > 0 ? 1 : 0.4 }]}
          >
            <Text style={styles.primaryText}>Start this paycheck</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      {/* Once-in-a-while cards have no plan sheet yet (B5), so they stay read-only. */}
      <PlanCardSheet
        visible={editing !== null && cardKind(editing) !== "occasional"}
        onClose={() => setEditing(null)}
        card={editing}
        newKind="bill"
      />
    </SafeAreaView>
  );
}

interface GroupProps {
  title: string;
  items: PaycheckAllocation[];
  total: number;
  onPress: (a: PaycheckAllocation) => void;
}

function Group({ title, items, total, onPress }: GroupProps) {
  const theme = useAppTheme();
  return (
    <View style={[styles.box, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={styles.row}>
        <Text style={{ color: theme.text, fontWeight: "800" }}>{title}</Text>
        <Text style={{ color: theme.text, fontWeight: "800" }}>{money(total)}</Text>
      </View>
      {items.length === 0 && <Text style={{ color: theme.textMuted, fontSize: 13 }}>None</Text>}
      {items.map((a) => (
        <Pressable key={a.cardId} onPress={() => onPress(a)} style={styles.row}>
          <Text style={{ color: theme.textMuted }}>{a.label}</Text>
          <Text style={{ color: theme.text }}>{money(a.amount)} ›</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1 },
  topBar: { paddingHorizontal: 24, paddingVertical: 12 },
  content: { paddingHorizontal: 24, paddingBottom: 24, gap: 12 },
  title: { fontSize: 24, fontWeight: "800" },
  sub: { fontSize: 14, lineHeight: 20 },
  box: { borderWidth: 1, borderRadius: 14, padding: 14, gap: 8 },
  row: { flexDirection: "row", justifyContent: "space-between" },
  footer: { paddingHorizontal: 24, paddingBottom: 16 },
  primaryButton: { borderRadius: 12, paddingVertical: 14, alignItems: "center", marginTop: 8 },
  primaryText: { color: "#ffffff", fontSize: 15, fontWeight: "700" },
});
