import { useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import {
  addMonths,
  amountThisPaycheck,
  dateFromParts,
  markOccasionalPaid,
  nextPaydayFrom,
  paychecksBefore,
  perPaycheckToWeekly,
  planPaycheck,
  todayInTimezone,
} from "@vitals/shared";
import type { BudgetCard } from "@vitals/shared";
import { NumberField } from "@/components/number-field";
import { Sheet } from "@/components/sheet";
import { useAppTheme } from "@/hooks/use-app-theme";
import { CARD_COLORS } from "@/lib/classify";
import { formatDay, money } from "@/lib/format";
import { useStore } from "@/lib/store";

// Add or edit a cost that comes once in a while: car insurance every 6 months,
// a yearly subscription, holiday gifts. You give the cost and the due date;
// the plan puts aside an even share from each paycheck before then.
// When the bill comes, "Mark as paid" uses what was set aside and asks when
// it is due next.

interface OccasionalSheetProps {
  visible: boolean;
  onClose: () => void;
  card: BudgetCard | null; // null = a new one
}

// When it is due next, counted from the date it was due.
const NEXT_CHOICES = [
  { label: "In 1 month", months: 1 },
  { label: "In 3 months", months: 3 },
  { label: "In 6 months", months: 6 },
  { label: "In 1 year", months: 12 },
];

// The next 12 months, starting with this one: { year, month (1-12), label }.
function monthChoices(today: string) {
  const [year, month] = today.split("-").map(Number);
  const choices = [];
  for (let i = 0; i < 12; i++) {
    const first = addMonths(`${year}-${String(month).padStart(2, "0")}-01`, i);
    const [y, m] = first.split("-").map(Number);
    const name = new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-US", { month: "short", timeZone: "UTC" });
    choices.push({ year: y, month: m, label: y === year ? name : `${name} ${y}` });
  }
  return choices;
}

export function OccasionalSheet({ visible, onClose, card }: OccasionalSheetProps) {
  const theme = useAppTheme();
  const cards = useStore((s) => s.budgetCards);
  const schedule = useStore((s) => s.paySchedule);
  const addPlanCard = useStore((s) => s.addPlanCard);
  const updateBudgetCard = useStore((s) => s.updateBudgetCard);
  const setBudgetCardBalance = useStore((s) => s.setBudgetCardBalance);
  const toggleBudgetPause = useStore((s) => s.toggleBudgetPause);
  const deleteBudgetCard = useStore((s) => s.deleteBudgetCard);

  const frequency = schedule?.frequency ?? "biweekly";
  const paycheck = schedule?.paycheckAmount ?? 0;
  const today = schedule ? todayInTimezone(schedule.payTimezone) : "";
  const nextPayday = schedule ? nextPaydayFrom(schedule, today) : "";
  const months = today ? monthChoices(today) : [];

  const [name, setName] = useState("");
  const [cost, setCost] = useState(0);
  const [dueYear, setDueYear] = useState(0);
  const [dueMonth, setDueMonth] = useState(0); // 1-12, 0 = not picked yet
  const [dueDay, setDueDay] = useState(1);
  const [setAside, setSetAside] = useState(0);
  const [paying, setPaying] = useState(false); // showing the "Mark as paid" choices

  // Fill the form each time the sheet opens.
  useEffect(() => {
    if (!visible) return;
    setName(card?.label ?? "");
    setCost(card?.goalAmount ?? 0);
    setSetAside(card?.balance ?? 0);
    setPaying(false);
    if (card?.dueDate) {
      const [y, m, d] = card.dueDate.split("-").map(Number);
      setDueYear(y);
      setDueMonth(m);
      setDueDay(d);
    } else {
      setDueYear(0);
      setDueMonth(0);
      setDueDay(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, card]);

  const dueDate = dueMonth > 0 ? dateFromParts(dueYear, dueMonth, dueDay) : "";
  const dateOk = dueDate !== "" && dueDate >= today;

  // The card as it would be saved, to preview the per-paycheck share and the weekly number.
  const draft: BudgetCard = {
    ...(card ?? {
      id: "draft", type: "custom", color: "", createdAt: "", paused: false, purpose: "expense", kind: "occasional",
    }),
    label: name,
    allocationMode: "fixed",
    allocationValue: 0,
    goalAmount: cost,
    balance: setAside,
    dueDate: dueDate || undefined,
  } as BudgetCard;
  const perPaycheck = dateOk ? amountThisPaycheck(draft, paycheck, nextPayday, frequency) : 0;
  const paychecksLeft = dateOk ? paychecksBefore(nextPayday, frequency, dueDate) : 0;
  const draftCards = card ? cards.map((c) => (c.id === card.id ? draft : c)) : [...cards, draft];
  const weeklyAfter = perPaycheckToWeekly(planPaycheck(draftCards, paycheck, nextPayday, frequency).spendingMoney, frequency);

  const canSave = name.trim() !== "" && cost > 0 && dateOk;

  let preview = "";
  if (canSave) {
    if (setAside >= cost) preview = "Already covered: nothing more to put aside.";
    else if (paychecksLeft <= 0) preview = `Due before your next payday: the ${money(cost - setAside)} still needed comes from the next paycheck.`;
    else preview = `${money(perPaycheck)} from each paycheck, ${paychecksLeft} ${paychecksLeft === 1 ? "paycheck" : "paychecks"} before ${formatDay(dueDate)}.`;
  }

  function save() {
    if (!canSave) return;
    const label = name.trim();
    if (card) {
      updateBudgetCard(card.id, { label, goalAmount: cost, dueDate });
      if (setAside !== card.balance) setBudgetCardBalance(card.id, setAside);
    } else {
      const customCount = cards.filter((c) => c.type === "custom").length;
      addPlanCard({
        label,
        kind: "occasional",
        amountPerPaycheck: 0, // worked out from the cost and due date instead
        color: CARD_COLORS[customCount % CARD_COLORS.length],
        goalAmount: cost,
        dueDate,
        balance: setAside,
      });
    }
    onClose();
  }

  function markPaid(months: number) {
    if (!card) return;
    const from = card.dueDate ?? today;
    const paid = markOccasionalPaid(card, addMonths(from, months));
    updateBudgetCard(card.id, { dueDate: paid.dueDate });
    setBudgetCardBalance(card.id, paid.balance);
    onClose();
  }

  function confirmDelete(message: string) {
    if (!card) return;
    Alert.alert(`Delete "${card.label}"?`, message, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => { deleteBudgetCard(card.id); onClose(); } },
    ]);
  }

  const chip = (selected: boolean) => [
    styles.chip,
    { borderColor: selected ? theme.brand : theme.border, backgroundColor: selected ? theme.brandSoft : theme.surface },
  ];
  const chipText = (selected: boolean) => ({ color: selected ? theme.brand : theme.text, fontWeight: selected ? ("700" as const) : ("500" as const) });

  // "Mark as paid": what happens to the money, then when it is due next.
  if (card && paying) {
    const cardCost = card.goalAmount ?? 0;
    const short = cardCost - card.balance;
    return (
      <Sheet visible={visible} onClose={onClose} title={`Paid ${card.label}`}>
        <Text style={{ color: theme.text, fontSize: 14, lineHeight: 20 }}>
          {short > 0
            ? `You had ${money(card.balance)} set aside for the ${money(cardCost)} bill. The other ${money(short)} came from your spending money.`
            : `The ${money(cardCost)} you set aside paid it.${short < 0 ? ` The extra ${money(-short)} stays for next time.` : ""}`}
        </Text>
        <Text style={[styles.label, { color: theme.textMuted }]}>When is it due next?</Text>
        <View style={styles.chipRow}>
          {NEXT_CHOICES.map((c) => (
            <Pressable key={c.months} onPress={() => markPaid(c.months)} style={chip(false)}>
              <Text style={chipText(false)}>{c.label}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={{ color: theme.textMuted, fontSize: 12 }}>
          Counted from {card.dueDate ? formatDay(card.dueDate) : "today"}. You can change the date afterwards.
        </Text>
        <View style={styles.secondaryRow}>
          <Pressable onPress={() => setPaying(false)} hitSlop={8}>
            <Text style={{ color: theme.brand, fontWeight: "600" }}>Back</Text>
          </Pressable>
          <Pressable onPress={() => confirmDelete("It won't come again, so it is removed from your plan.")} hitSlop={8}>
            <Text style={{ color: "#ef4444", fontWeight: "600" }}>Not again: remove it</Text>
          </Pressable>
        </View>
      </Sheet>
    );
  }

  return (
    <Sheet visible={visible} onClose={onClose} title={card ? "Edit once-in-a-while cost" : "Add a once-in-a-while cost"}>
      <Text style={[styles.label, { color: theme.textMuted }]}>Name</Text>
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="e.g. Car insurance, Gifts, Amazon Prime"
        placeholderTextColor={theme.textMuted}
        style={[styles.input, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }]}
      />

      <NumberField label="What it costs" value={cost} onChange={setCost} />

      <Text style={[styles.label, { color: theme.textMuted }]}>When is it due?</Text>
      <View style={styles.chipRow}>
        {months.map((m) => {
          const selected = m.year === dueYear && m.month === dueMonth;
          return (
            <Pressable key={`${m.year}-${m.month}`} onPress={() => { setDueYear(m.year); setDueMonth(m.month); }} style={chip(selected)}>
              <Text style={chipText(selected)}>{m.label}</Text>
            </Pressable>
          );
        })}
      </View>
      {dueMonth > 0 && (
        <NumberField
          label="Day of the month"
          prefix=""
          value={dueDay}
          onChange={setDueDay}
          hint={dateOk ? `Due ${formatDay(dueDate)}` : "That day has already passed. Pick a later one."}
        />
      )}

      <NumberField label="Already set aside" value={setAside} onChange={setSetAside} />

      {preview !== "" && <Text style={{ color: theme.text, fontSize: 13 }}>{preview}</Text>}
      {canSave && (
        <Text style={{ color: weeklyAfter < 0 ? "#ef4444" : theme.textMuted, fontSize: 13 }}>
          With this, you can spend about {weeklyAfter < 0 ? "−" : ""}
          {money(Math.abs(weeklyAfter))} a week.
        </Text>
      )}

      <Pressable disabled={!canSave} onPress={save} style={[styles.save, { backgroundColor: theme.brand, opacity: canSave ? 1 : 0.4 }]}>
        <Text style={styles.saveText}>{card ? "Save" : "Add"}</Text>
      </Pressable>

      {card && (
        <>
          <Pressable onPress={() => setPaying(true)} style={[styles.paid, { borderColor: theme.brand }]}>
            <Text style={{ color: theme.brand, fontSize: 15, fontWeight: "700" }}>Mark as paid</Text>
          </Pressable>
          <View style={styles.secondaryRow}>
            <Pressable onPress={() => { toggleBudgetPause(card.id); onClose(); }} hitSlop={8}>
              <Text style={{ color: theme.brand, fontWeight: "600" }}>{card.paused ? "Resume" : "Pause"}</Text>
            </Pressable>
            <Pressable onPress={() => confirmDelete("It will be removed from your plan.")} hitSlop={8}>
              <Text style={{ color: "#ef4444", fontWeight: "600" }}>Delete</Text>
            </Pressable>
          </View>
        </>
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 12, fontWeight: "600" },
  input: { borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 11, fontSize: 15 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  save: { borderRadius: 12, paddingVertical: 14, alignItems: "center", marginTop: 4 },
  saveText: { color: "#ffffff", fontSize: 15, fontWeight: "700" },
  paid: { borderWidth: 1.5, borderRadius: 12, paddingVertical: 12, alignItems: "center" },
  secondaryRow: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 4, marginTop: 4 },
});
