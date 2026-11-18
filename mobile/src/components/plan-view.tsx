import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import {
  amountThisPaycheck,
  cardKind,
  daysBetween,
  nextPaydayFrom,
  paydayDue,
  perPaycheckToWeekly,
  planPaycheck,
  todayInTimezone,
} from "@vitals/shared";
import type { BudgetCard } from "@vitals/shared";
import { useAppTheme } from "@/hooks/use-app-theme";
import { formatDay, money } from "@/lib/format";
import { useStore } from "@/lib/store";

// The payday plan, as in DECISIONS.md: one number on top, then Bills (one
// list), Set aside for later (one list) and Goals (a card each). Shown on the
// Budget tab once a pay schedule exists. Amounts are per paycheck.

interface PlanViewProps {
  onEditCard: (card: BudgetCard) => void;
  onAddCard: (kind: "bill" | "goal") => void;
}

export function PlanView({ onEditCard, onAddCard }: PlanViewProps) {
  const theme = useAppTheme();
  const router = useRouter();
  const cards = useStore((s) => s.budgetCards);
  const schedule = useStore((s) => s.paySchedule);
  if (!schedule) return null;

  const paycheck = schedule.paycheckAmount ?? 0;
  const today = todayInTimezone(schedule.payTimezone);
  // If the saved payday has passed, show the next real one.
  const nextPayday = nextPaydayFrom(schedule, today);
  const plan = planPaycheck(cards, paycheck, nextPayday, schedule.frequency);
  const weekly = perPaycheckToWeekly(plan.spendingMoney, schedule.frequency);
  // A payday that has arrived (or was missed) and hasn't been checked in yet.
  const due = paydayDue(schedule, today);
  const daysLeft = daysBetween(today, nextPayday);

  const custom = cards.filter((c) => c.type === "custom");
  const bills = custom.filter((c) => cardKind(c) === "bill");
  const setAsides = custom.filter((c) => cardKind(c) === "occasional");
  const goals = custom.filter((c) => cardKind(c) === "goal");

  const amount = (card: BudgetCard) => amountThisPaycheck(card, paycheck, nextPayday, schedule.frequency);
  const total = (list: BudgetCard[]) => list.reduce((sum, c) => sum + amount(c), 0);

  return (
    <View style={styles.wrap}>
      {due && (
        <Pressable
          onPress={() => router.push("/paycheck")}
          style={[styles.payday, { backgroundColor: theme.brand }]}
        >
          <Text style={styles.paydayTitle}>It's payday ({formatDay(due)})</Text>
          <Text style={styles.paydayText}>Plan this paycheck in about a minute →</Text>
        </Pressable>
      )}
      <View style={[styles.hero, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={{ color: theme.textMuted, fontSize: 13 }}>You can spend about</Text>
        <Text style={[styles.heroNumber, { color: weekly < 0 ? "#ef4444" : theme.text }]}>
          {weekly < 0 ? "−" : ""}
          {money(Math.abs(weekly))} a week
        </Text>
        <Text style={{ color: theme.textMuted, fontSize: 13 }}>
          until your next payday ({formatDay(nextPayday)}
          {daysLeft > 0 ? `, ${daysLeft} ${daysLeft === 1 ? "day" : "days"} away` : ""}) · {money(paycheck)} a paycheck
        </Text>
        {plan.spendingMoney < 0 && (
          <Text style={{ color: "#ef4444", fontSize: 13, marginTop: 6 }}>
            Your plan is {money(-plan.spendingMoney)} more than your paycheck.
          </Text>
        )}
      </View>

      <Section title="Bills this paycheck" total={total(bills)}>
        {bills.length === 0 && <Text style={{ color: theme.textMuted, fontSize: 13 }}>No bills yet.</Text>}
        {bills.map((card) => (
          <Row key={card.id} card={card} value={money(amount(card))} onPress={() => onEditCard(card)} />
        ))}
        <AddButton label="+ Add bill" onPress={() => onAddCard("bill")} />
      </Section>

      {setAsides.length > 0 && (
        <Section title="Set aside for later" total={total(setAsides)}>
          {setAsides.map((card) => (
            <Row
              key={card.id}
              card={card}
              detail={card.goalAmount && card.dueDate ? `${money(card.goalAmount)} due ${formatDay(card.dueDate)}` : undefined}
              value={`${money(amount(card))} this paycheck`}
              onPress={() => onEditCard(card)}
            />
          ))}
        </Section>
      )}

      <Text style={[styles.sectionTitle, { color: theme.text }]}>Goals</Text>
      {goals.length === 0 && <Text style={{ color: theme.textMuted, fontSize: 13 }}>No goals yet.</Text>}
      {goals.map((card) => (
        <GoalCard key={card.id} card={card} perPaycheck={amount(card)} onPress={() => onEditCard(card)} />
      ))}
      <AddButton label="+ Add goal" onPress={() => onAddCard("goal")} />
    </View>
  );
}

function AddButton({ label, onPress }: { label: string; onPress: () => void }) {
  const theme = useAppTheme();
  return (
    <Pressable onPress={onPress} hitSlop={8}>
      <Text style={{ color: theme.brand, fontSize: 14, fontWeight: "700" }}>{label}</Text>
    </Pressable>
  );
}

function Section({ title, total, children }: { title: string; total: number; children: ReactNode }) {
  const theme = useAppTheme();
  return (
    <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>{title}</Text>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>{money(total)}</Text>
      </View>
      {children}
    </View>
  );
}

function Row({ card, value, detail, onPress }: { card: BudgetCard; value: string; detail?: string; onPress: () => void }) {
  const theme = useAppTheme();
  return (
    <Pressable onPress={onPress} style={[styles.row, { opacity: card.paused ? 0.5 : 1 }]}>
      <View style={{ flex: 1 }}>
        <Text style={{ color: theme.text, fontSize: 15 }}>
          {card.label}
          {card.paused ? " (paused)" : ""}
        </Text>
        {detail && <Text style={{ color: theme.textMuted, fontSize: 12 }}>{detail}</Text>}
      </View>
      <Text style={{ color: theme.text, fontSize: 15 }}>{value}</Text>
    </Pressable>
  );
}

function GoalCard({ card, perPaycheck, onPress }: { card: BudgetCard; perPaycheck: number; onPress: () => void }) {
  const theme = useAppTheme();
  const target = card.goalAmount ?? 0;
  const progress = target > 0 ? Math.min(1, card.balance / target) : 0;
  return (
    <Pressable
      onPress={onPress}
      style={[styles.goal, { backgroundColor: theme.surface, borderColor: theme.border, opacity: card.paused ? 0.5 : 1 }]}
    >
      <View style={styles.sectionHeader}>
        <Text style={{ color: theme.text, fontSize: 15, fontWeight: "700" }}>
          {card.label}
          {card.paused ? " (paused)" : ""}
        </Text>
        <Text style={{ color: theme.brand, fontSize: 14, fontWeight: "700" }}>+{money(perPaycheck)}</Text>
      </View>
      <Text style={{ color: theme.textMuted, fontSize: 13 }}>
        {target > 0 ? `${money(card.balance)} of ${money(target)}` : `${money(card.balance)} saved`}
      </Text>
      {target > 0 && (
        <View style={[styles.barTrack, { backgroundColor: theme.surface2 }]}>
          <View style={[styles.barFill, { backgroundColor: card.color, width: `${progress * 100}%` }]} />
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 16, gap: 12 },
  hero: { borderWidth: 1, borderRadius: 16, padding: 16, gap: 2 },
  payday: { borderRadius: 16, padding: 16, gap: 2 },
  paydayTitle: { color: "#ffffff", fontSize: 17, fontWeight: "800" },
  paydayText: { color: "#ffffff", fontSize: 13 },
  heroNumber: { fontSize: 34, fontWeight: "900" },
  section: { borderWidth: 1, borderRadius: 14, padding: 14, gap: 10 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sectionTitle: { fontSize: 15, fontWeight: "800" },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  goal: { borderWidth: 1, borderRadius: 14, padding: 14, gap: 6 },
  barTrack: { height: 8, borderRadius: 4, overflow: "hidden" },
  barFill: { height: 8, borderRadius: 4 },
});
