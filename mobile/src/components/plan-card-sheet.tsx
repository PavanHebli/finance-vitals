import { useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import {
  amountThisPaycheck,
  cardKind,
  monthlyToPerPaycheck,
  nextPaydayFrom,
  perPaycheckToMonthly,
  perPaycheckToWeekly,
  planPaycheck,
  todayInTimezone,
} from "@vitals/shared";
import type { BudgetCard } from "@vitals/shared";
import { NumberField } from "@/components/number-field";
import { Sheet } from "@/components/sheet";
import { useAppTheme } from "@/hooks/use-app-theme";
import { CARD_COLORS } from "@/lib/classify";
import { money } from "@/lib/format";
import { useStore } from "@/lib/store";

// Add or edit a bill or a goal on the payday plan.
// - Bills are typed per month (how people know them) and stored as each
//   paycheck's share. One bill can be marked as rent.
// - Goals are typed per paycheck, with an optional target and what's already saved.
// A preview shows what the weekly spending number becomes before saving.

interface PlanCardSheetProps {
  visible: boolean;
  onClose: () => void;
  card: BudgetCard | null;      // the card being edited; null = a new one
  newKind: "bill" | "goal";     // what to add when card is null
}

export function PlanCardSheet({ visible, onClose, card, newKind }: PlanCardSheetProps) {
  const theme = useAppTheme();
  const cards = useStore((s) => s.budgetCards);
  const schedule = useStore((s) => s.paySchedule);
  const addPlanCard = useStore((s) => s.addPlanCard);
  const updateBudgetCard = useStore((s) => s.updateBudgetCard);
  const setBudgetCardBalance = useStore((s) => s.setBudgetCardBalance);
  const toggleBudgetPause = useStore((s) => s.toggleBudgetPause);
  const deleteBudgetCard = useStore((s) => s.deleteBudgetCard);

  const kind = card ? cardKind(card) : newKind;
  const frequency = schedule?.frequency ?? "biweekly";
  const paycheck = schedule?.paycheckAmount ?? 0;
  const nextPayday = schedule ? nextPaydayFrom(schedule, todayInTimezone(schedule.payTimezone)) : "";

  const [name, setName] = useState("");
  const [monthly, setMonthly] = useState(0);        // bills: per month
  const [perPaycheck, setPerPaycheck] = useState(0); // goals: per paycheck
  const [isRent, setIsRent] = useState(false);
  const [target, setTarget] = useState(0);
  const [saved, setSaved] = useState(0);

  // Fill the form each time the sheet opens.
  useEffect(() => {
    if (!visible) return;
    const current = card ? amountThisPaycheck(card, paycheck, nextPayday, frequency) : 0;
    setName(card?.label ?? "");
    setMonthly(card ? Math.round(perPaycheckToMonthly(current, frequency)) : 0);
    setPerPaycheck(current);
    setIsRent(card?.isHousing ?? false);
    setTarget(card?.goalAmount ?? 0);
    setSaved(card?.balance ?? 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, card]);

  const amountPerPaycheck = kind === "bill" ? monthlyToPerPaycheck(monthly, frequency) : perPaycheck;

  // What the weekly number would be with this change.
  const draft: BudgetCard = {
    ...(card ?? {
      id: "draft", type: "custom", color: "", createdAt: "", paused: false,
      purpose: kind === "goal" ? "saving" : "expense", kind,
    }),
    label: name,
    allocationMode: "fixed",
    allocationValue: amountPerPaycheck,
    balance: kind === "goal" ? saved : card?.balance ?? 0,
    goalAmount: kind === "goal" && target > 0 ? target : undefined,
  } as BudgetCard;
  const draftCards = card ? cards.map((c) => (c.id === card.id ? draft : c)) : [...cards, draft];
  const weeklyAfter = perPaycheckToWeekly(planPaycheck(draftCards, paycheck, nextPayday, frequency).spendingMoney, frequency);

  const canSave = name.trim() !== "" && amountPerPaycheck > 0;

  function save() {
    if (!canSave) return;
    const label = name.trim();

    // Only one bill can be the rent: unmark any other.
    if (kind === "bill" && isRent) {
      for (const other of cards) {
        if (other.isHousing && other.id !== card?.id) updateBudgetCard(other.id, { isHousing: false });
      }
    }

    if (card) {
      updateBudgetCard(card.id, {
        label,
        allocationMode: "fixed",
        allocationValue: amountPerPaycheck,
        // A target of 0 means "no target" (and clears an old one).
        ...(kind === "bill" ? { isHousing: isRent } : { goalAmount: target }),
      });
      if (kind === "goal" && saved !== card.balance) setBudgetCardBalance(card.id, saved);
    } else {
      const customCount = cards.filter((c) => c.type === "custom").length;
      addPlanCard({
        label,
        kind,
        amountPerPaycheck,
        color: CARD_COLORS[customCount % CARD_COLORS.length],
        isHousing: kind === "bill" ? isRent : false,
        goalAmount: kind === "goal" && target > 0 ? target : undefined,
        balance: kind === "goal" ? saved : 0,
      });
    }
    onClose();
  }

  function confirmDelete() {
    if (!card) return;
    Alert.alert(`Delete "${card.label}"?`, "It will be removed from your plan.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => { deleteBudgetCard(card.id); onClose(); } },
    ]);
  }

  const title = card ? `Edit ${kind === "goal" ? "goal" : "bill"}` : kind === "goal" ? "Add a goal" : "Add a bill";

  return (
    <Sheet visible={visible} onClose={onClose} title={title}>
      <Text style={[styles.label, { color: theme.textMuted }]}>Name</Text>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder={kind === "goal" ? "e.g. Cushion, Trip" : "e.g. Phone, Car payment"}
        placeholderTextColor={theme.textMuted}
        style={[styles.input, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }]}
      />

      {kind === "bill" ? (
        <>
          <NumberField
            label="Cost per month"
            value={monthly}
            onChange={setMonthly}
            hint={monthly > 0 ? `${money(amountPerPaycheck)} from each paycheck` : undefined}
          />
          <Pressable
            onPress={() => setIsRent(!isRent)}
            style={[styles.toggle, { borderColor: isRent ? theme.brand : theme.border, backgroundColor: isRent ? theme.brandSoft : theme.surface }]}
          >
            <Text style={{ color: isRent ? theme.brand : theme.text, fontWeight: "600" }}>
              {isRent ? "✓ " : ""}This is my rent or mortgage
            </Text>
          </Pressable>
        </>
      ) : (
        <>
          <NumberField label="Put aside each paycheck" value={perPaycheck} onChange={setPerPaycheck} />
          <NumberField label="Target (optional)" value={target} onChange={setTarget} hint="Saving stops once you reach it." />
          <NumberField label="Already saved" value={saved} onChange={setSaved} />
        </>
      )}

      {amountPerPaycheck > 0 && (
        <Text style={{ color: weeklyAfter < 0 ? "#ef4444" : theme.textMuted, fontSize: 13 }}>
          With this, you can spend about {weeklyAfter < 0 ? "−" : ""}
          {money(Math.abs(weeklyAfter))} a week.
        </Text>
      )}

      <Pressable
        disabled={!canSave}
        onPress={save}
        style={[styles.save, { backgroundColor: theme.brand, opacity: canSave ? 1 : 0.4 }]}
      >
        <Text style={styles.saveText}>{card ? "Save" : kind === "goal" ? "Add goal" : "Add bill"}</Text>
      </Pressable>

      {card && (
        <View style={styles.secondaryRow}>
          <Pressable onPress={() => { toggleBudgetPause(card.id); onClose(); }} hitSlop={8}>
            <Text style={{ color: theme.brand, fontWeight: "600" }}>{card.paused ? "Resume" : "Pause"}</Text>
          </Pressable>
          <Pressable onPress={confirmDelete} hitSlop={8}>
            <Text style={{ color: "#ef4444", fontWeight: "600" }}>Delete</Text>
          </Pressable>
        </View>
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 12, fontWeight: "600" },
  input: { borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 11, fontSize: 15 },
  toggle: { borderWidth: 1.5, borderRadius: 12, padding: 12 },
  save: { borderRadius: 12, paddingVertical: 14, alignItems: "center", marginTop: 4 },
  saveText: { color: "#ffffff", fontSize: 15, fontWeight: "700" },
  secondaryRow: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 4, marginTop: 4 },
});
