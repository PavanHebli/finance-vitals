import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import {
  amountThisPaycheck,
  cardKind,
  nextPaydayFrom,
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

export function PlanView({ onEditCard }: { onEditCard: (card: BudgetCard) => void }) {
  const theme = useAppTheme();
  const cards = useStore((s) => s.budgetCards);
  const schedule = useStore((s) => s.paySchedule);
  if (!schedule) return null;

  const paycheck = schedule.paycheckAmount ?? 0;
  const today = todayInTimezone(schedule.payTimezone);
  // If the saved payday has passed, show the next real one.
  const nextPayday = nextPaydayFrom(schedule, today);
  const plan = planPaycheck(cards, paycheck, nextPayday, schedule.frequency);
  const weekly = perPaycheckToWeekly(plan.spendingMoney, schedule.frequency);

  const custom = cards.filter((c) => c.type === "custom");
  const bills = custom.filter((c) => cardKind(c) === "bill");
  const setAsides = custom.filter((c) => cardKind(c) === "occasional");
  const goals = custom.filter((c) => cardKind(c) === "goal");

  const amount = (card: BudgetCard) => amountThisPaycheck(card, paycheck, nextPayday, schedule.frequency);
  const total = (list: BudgetCard[]) => list.reduce((sum, c) => sum + amount(c), 0);

  return (
    <View style={styles.wrap}>
      <View style={[styles.hero, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={{ color: theme.textMuted, fontSize: 13 }}>You can spend about</Text>
        <Text style={[styles.heroNumber, { color: weekly < 0 ? "#ef4444" : theme.text }]}>
          {weekly < 0 ? "−" : ""}
          {money(Math.abs(weekly))} a week
        </Text>
        <Text style={{ color: theme.textMuted, fontSize: 13 }}>
          until your next payday ({formatDay(nextPayday)}) · {money(paycheck)} a paycheck
        </Text>
        {plan.spendingMoney < 0 && (
          <Text style={{ color: "#ef4444", fontSize: 13, marginTop: 6 }}>
            Your plan is {money(-plan.spendingMoney)} more than your paycheck.
          </Text>
        )}
      </View>

      <Section title="Bills this paycheck" total={total(bills)} empty="No bills yet.">
        {bills.map((card) => (
          <Row key={card.id} card={card} value={money(amount(card))} onPress={() => onEditCard(card)} />
        ))}
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
    </View>
  );
}

function Section({ title, total, empty, children }: { title: string; total: number; empty?: string; children: ReactNode }) {
  const theme = useAppTheme();
  const hasRows = Array.isArray(children) ? children.length > 0 : Boolean(children);
  return (
    <View style={[styles.section, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>{title}</Text>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>{money(total)}</Text>
      </View>
      {hasRows ? children : empty ? <Text style={{ color: theme.textMuted, fontSize: 13 }}>{empty}</Text> : null}
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
  heroNumber: { fontSize: 34, fontWeight: "900" },
  section: { borderWidth: 1, borderRadius: 14, padding: 14, gap: 10 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sectionTitle: { fontSize: 15, fontWeight: "800" },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  goal: { borderWidth: 1, borderRadius: 14, padding: 14, gap: 6 },
  barTrack: { height: 8, borderRadius: 4, overflow: "hidden" },
  barFill: { height: 8, borderRadius: 4 },
});
