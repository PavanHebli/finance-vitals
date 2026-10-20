import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import type { BudgetCard } from "@vitals/shared";
import { useAppTheme } from "@/hooks/use-app-theme";
import { money } from "@/lib/format";
import { useStore } from "@/lib/store";

// The grey Income card: how much is waiting to be split, plus a box to add more.
// Tap the big number to correct it to an exact amount.
export function IncomeCard({ card }: { card: BudgetCard }) {
  const theme = useAppTheme();
  const addBudgetIncome = useStore((s) => s.addBudgetIncome);
  const setBudgetCardBalance = useStore((s) => s.setBudgetCardBalance);

  const [adding, setAdding] = useState("");
  const [editing, setEditing] = useState(false);
  const [correction, setCorrection] = useState("");

  function handleAdd() {
    const amount = parseFloat(adding.replace(/[^0-9.]/g, ""));
    if (!amount || amount <= 0) return;
    addBudgetIncome(amount);
    setAdding("");
  }

  function saveCorrection() {
    const amount = parseFloat(correction.replace(/[^0-9.]/g, ""));
    setEditing(false);
    if (!Number.isNaN(amount) && amount >= 0 && amount !== card.balance) {
      setBudgetCardBalance(card.id, amount);
    }
  }

  return (
    <View style={[styles.sysCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <Text style={[styles.sysName, { color: theme.text }]}>Income</Text>
      <Text style={[styles.sysSub, { color: theme.textMuted }]}>Monthly source</Text>

      {editing ? (
        <TextInput
          autoFocus
          style={[styles.amount, { color: theme.text, borderBottomColor: theme.brand }]}
          value={correction}
          onChangeText={setCorrection}
          onBlur={saveCorrection}
          onSubmitEditing={saveCorrection}
          keyboardType="decimal-pad"
        />
      ) : (
        <Pressable
          onPress={() => {
            setCorrection(card.balance > 0 ? String(card.balance) : "");
            setEditing(true);
          }}
        >
          <Text style={[styles.amount, { color: theme.text }]}>{money(card.balance)}</Text>
        </Pressable>
      )}
      <Text style={[styles.per, { color: theme.textMuted }]}>to split · tap to correct</Text>

      <View style={styles.addRow}>
        <TextInput
          style={[styles.addInput, { backgroundColor: theme.bg, borderColor: theme.border, color: theme.text }]}
          value={adding}
          onChangeText={setAdding}
          placeholder="Amount…"
          placeholderTextColor={theme.textMuted}
          keyboardType="decimal-pad"
          onSubmitEditing={handleAdd}
        />
        <Pressable onPress={handleAdd} style={[styles.addButton, { backgroundColor: theme.brand }]}>
          <Text style={styles.addText}>Add</Text>
        </Pressable>
      </View>
    </View>
  );
}

// The grey Float card: money not given to any card, plus what the next split adds.
export function FloatCard({ card, nextSplit }: { card: BudgetCard; nextSplit: number }) {
  const theme = useAppTheme();
  return (
    <View style={[styles.sysCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <Text style={[styles.sysName, { color: theme.text }]}>Float</Text>
      <Text style={[styles.sysSub, { color: theme.textMuted }]}>Unallocated cash</Text>
      <Text style={[styles.amount, { color: theme.text }]}>{money(card.balance)}</Text>
      <Text style={[styles.per, { color: theme.textMuted }]}>accumulated</Text>
      {nextSplit > 0 && <Text style={styles.next}>Next split: +{money(nextSplit)}</Text>}
    </View>
  );
}

function allocationText(card: BudgetCard): string {
  if (card.allocationValue === 0) return "Tap to set allocation";
  return card.allocationMode === "percent" ? `${card.allocationValue}% of income` : `${money(card.allocationValue)} fixed`;
}

// A colored card the user made (rent, groceries, a savings goal...). Tap to edit.
export function CategoryCard({ card, onPress }: { card: BudgetCard; onPress: () => void }) {
  const theme = useAppTheme();
  const togglePause = useStore((s) => s.toggleBudgetPause);

  const isSaving = card.purpose === "saving";
  const hasGoal = isSaving && !!card.goalAmount;
  const goalPercent = hasGoal ? Math.min(100, ((card.savedSoFar ?? 0) / card.goalAmount!) * 100) : 0;

  return (
    <Pressable
      onPress={onPress}
      style={[styles.catCard, { backgroundColor: theme.surface, borderColor: theme.border }, card.paused && { opacity: 0.5 }]}
    >
      <View style={[styles.catHeader, { backgroundColor: card.color }]}>
        <View style={styles.catTop}>
          <Text style={styles.chip}>{card.paused ? "PAUSED" : isSaving ? "SAVING" : "EXPENSE"}</Text>
          <Pressable onPress={() => togglePause(card.id)} hitSlop={8} style={styles.pauseButton}>
            <Text style={styles.pauseText}>{card.paused ? "▶" : "❚❚"}</Text>
          </Pressable>
        </View>
        <Text style={styles.catName} numberOfLines={1}>
          {card.label}
        </Text>
      </View>
      <View style={styles.catBody}>
        <Text style={[styles.catAmount, { color: theme.text }]}>{money(card.balance)}</Text>
        <Text style={[styles.per, { color: theme.textMuted }]}>{allocationText(card)}</Text>
        {hasGoal && (
          <View>
            <View style={[styles.track, { backgroundColor: theme.surface2 }]}>
              <View style={[styles.fill, { width: `${goalPercent}%`, backgroundColor: card.color }]} />
            </View>
            <Text style={[styles.goalText, { color: card.color }]}>
              {Math.round(goalPercent)}% of {money(card.goalAmount!)}
            </Text>
          </View>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  sysCard: { width: "48.5%", borderWidth: 1, borderRadius: 14, padding: 11 },
  sysName: { fontSize: 13, fontWeight: "700" },
  sysSub: { fontSize: 10, marginBottom: 6 },
  amount: { fontSize: 18, fontWeight: "800", borderBottomWidth: 0 },
  per: { fontSize: 10, marginTop: 2 },
  next: { fontSize: 11, fontWeight: "700", color: "#14b8a6", marginTop: 6 },
  addRow: { flexDirection: "row", gap: 5, marginTop: 8 },
  addInput: { flex: 1, minWidth: 0, borderWidth: 1, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 4, fontSize: 11 },
  addButton: { borderRadius: 8, paddingHorizontal: 9, justifyContent: "center" },
  addText: { color: "#ffffff", fontSize: 11, fontWeight: "700" },
  catCard: { width: "48.5%", borderWidth: 1, borderRadius: 14, overflow: "hidden" },
  catHeader: { padding: 9, gap: 6 },
  catTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  chip: { fontSize: 9, fontWeight: "700", color: "#ffffff", backgroundColor: "rgba(255,255,255,0.22)", paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8, overflow: "hidden" },
  pauseButton: { width: 22, height: 22, borderRadius: 6, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" },
  pauseText: { color: "#ffffff", fontSize: 8 },
  catName: { fontSize: 14, fontWeight: "800", color: "#ffffff" },
  catBody: { padding: 10, gap: 2 },
  catAmount: { fontSize: 17, fontWeight: "800" },
  track: { height: 4, borderRadius: 2, marginTop: 6, overflow: "hidden" },
  fill: { height: 4, borderRadius: 2 },
  goalText: { fontSize: 10, fontWeight: "700", marginTop: 3 },
});
