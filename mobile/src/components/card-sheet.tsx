import { useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import type { BudgetCard } from "@vitals/shared";
import { Sheet } from "@/components/sheet";
import { NumberField } from "@/components/number-field";
import { useAppTheme } from "@/hooks/use-app-theme";
import { CARD_COLORS, classifyCard } from "@/lib/classify";
import { money } from "@/lib/format";
import { useStore } from "@/lib/store";

interface CardSheetProps {
  visible: boolean;
  onClose: () => void;
  // The card being edited. null means "make a new card".
  card: BudgetCard | null;
}

export function CardSheet({ visible, onClose, card }: CardSheetProps) {
  const theme = useAppTheme();
  const budgetCards = useStore((s) => s.budgetCards);
  const addBudgetCard = useStore((s) => s.addBudgetCard);
  const updateBudgetCard = useStore((s) => s.updateBudgetCard);
  const deleteBudgetCard = useStore((s) => s.deleteBudgetCard);
  const transferFromCash = useStore((s) => s.transferFromCash);
  const setBudgetCardBalance = useStore((s) => s.setBudgetCardBalance);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [mode, setMode] = useState<"percent" | "fixed">("percent");
  const [amount, setAmount] = useState(0);
  const [color, setColor] = useState(CARD_COLORS[0]);
  const [purpose, setPurpose] = useState<"expense" | "saving">("expense");
  const [purposeTouched, setPurposeTouched] = useState(false);
  const [goal, setGoal] = useState(0);
  const [balance, setBalance] = useState(0);
  const [transfer, setTransfer] = useState(0);
  const [message, setMessage] = useState("");

  const floatCard = budgetCards.find((c) => c.type === "cash");

  // Fill the form each time the sheet opens.
  useEffect(() => {
    if (!visible) return;
    setName(card?.label ?? "");
    setDescription(card?.description ?? "");
    setMode(card?.allocationMode === "fixed" ? "fixed" : "percent");
    setAmount(card?.allocationValue ?? 0);
    setColor(card?.color ?? CARD_COLORS[0]);
    setPurpose(card?.purpose ?? "expense");
    setPurposeTouched(card !== null);
    setGoal(card?.goalAmount ?? 0);
    setBalance(card?.balance ?? 0);
    setTransfer(0);
    setMessage("");
  }, [visible, card]);

  // For a new card, guess expense vs saving from the words typed.
  function guessPurpose(newName: string, newDescription: string) {
    if (!purposeTouched) setPurpose(classifyCard(newName, newDescription));
  }

  function save() {
    if (!name.trim()) {
      setMessage("Give the card a name.");
      return;
    }
    const goalAmount = purpose === "saving" && goal > 0 ? goal : undefined;
    if (card) {
      updateBudgetCard(card.id, {
        label: name.trim(),
        description,
        allocationMode: mode,
        allocationValue: amount,
        color,
        purpose,
        goalAmount,
      });
      if (balance !== card.balance) setBudgetCardBalance(card.id, balance);
    } else {
      addBudgetCard(name.trim(), mode, amount, color, purpose, description, goalAmount);
    }
    onClose();
  }

  function confirmDelete() {
    if (!card) return;
    Alert.alert("Delete card?", `"${card.label}" and its balance will be removed.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          deleteBudgetCard(card.id);
          onClose();
        },
      },
    ]);
  }

  function doTransfer() {
    if (!card || transfer <= 0) return;
    const result = transferFromCash(card.id, transfer);
    if (result.success) {
      setBalance(balance + transfer);
      setTransfer(0);
      setMessage("Moved from Float.");
    } else {
      setMessage(result.error);
    }
  }

  const header = (
    <View style={[styles.header, { backgroundColor: color }]}>
      <View style={{ flex: 1 }}>
        <Text style={styles.headerSmall}>{card ? "EDIT CARD" : "NEW CARD"}</Text>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {name || "Untitled"}
        </Text>
      </View>
      <Pressable onPress={onClose} style={styles.close}>
        <Text style={{ color: "#ffffff" }}>✕</Text>
      </Pressable>
    </View>
  );

  const inputStyle = [styles.input, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text }];

  return (
    <Sheet visible={visible} onClose={onClose} header={header}>
      <Text style={[styles.label, { color: theme.textMuted }]}>Name</Text>
      <TextInput
        style={inputStyle}
        value={name}
        onChangeText={(text) => {
          setName(text);
          guessPurpose(text, description);
        }}
        placeholder="e.g. Groceries"
        placeholderTextColor={theme.textMuted}
      />

      <Text style={[styles.label, { color: theme.textMuted }]}>What is it for? (optional)</Text>
      <TextInput
        style={inputStyle}
        value={description}
        onChangeText={(text) => {
          setDescription(text);
          guessPurpose(name, text);
        }}
        placeholder="e.g. weekly food shop"
        placeholderTextColor={theme.textMuted}
      />

      <Text style={[styles.label, { color: theme.textMuted }]}>Type</Text>
      <View style={styles.row}>
        {(["expense", "saving"] as const).map((p) => (
          <Pressable
            key={p}
            onPress={() => {
              setPurpose(p);
              setPurposeTouched(true);
            }}
            style={[styles.choice, { borderColor: purpose === p ? theme.brand : theme.border, backgroundColor: purpose === p ? theme.brandSoft : theme.surface }]}
          >
            <Text style={{ color: purpose === p ? theme.brand : theme.textMuted, fontWeight: "700" }}>
              {p === "expense" ? "Expense" : "Saving"}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={[styles.label, { color: theme.textMuted }]}>Each time you split income, give this card</Text>
      <View style={styles.row}>
        {(["percent", "fixed"] as const).map((m) => (
          <Pressable
            key={m}
            onPress={() => setMode(m)}
            style={[styles.choice, { borderColor: mode === m ? theme.brand : theme.border, backgroundColor: mode === m ? theme.brandSoft : theme.surface }]}
          >
            <Text style={{ color: mode === m ? theme.brand : theme.textMuted, fontWeight: "700" }}>
              {m === "percent" ? "% of income" : "$ fixed"}
            </Text>
          </Pressable>
        ))}
      </View>
      <NumberField label="Amount" value={amount} onChange={setAmount} prefix={mode === "percent" ? "%" : "$"} />

      {purpose === "saving" && <NumberField label="Savings goal (optional)" value={goal} onChange={setGoal} />}

      {card && <NumberField label="Balance on this card" value={balance} onChange={setBalance} />}

      {card && floatCard && floatCard.balance > 0 && (
        <View style={[styles.transferBox, { borderColor: theme.border, backgroundColor: theme.surface }]}>
          <Text style={[styles.label, { color: theme.textMuted }]}>Move money here from Float ({money(floatCard.balance)} available)</Text>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <NumberField label="" value={transfer} onChange={setTransfer} />
            </View>
            <Pressable onPress={doTransfer} style={[styles.moveButton, { backgroundColor: theme.brand }]}>
              <Text style={styles.moveText}>Move</Text>
            </Pressable>
          </View>
        </View>
      )}

      <Text style={[styles.label, { color: theme.textMuted }]}>Color</Text>
      <View style={styles.colors}>
        {CARD_COLORS.map((c) => (
          <Pressable
            key={c}
            onPress={() => setColor(c)}
            style={[styles.swatch, { backgroundColor: c }, color === c && { borderWidth: 3, borderColor: theme.text }]}
          />
        ))}
      </View>

      {message !== "" && <Text style={{ color: theme.brand, fontSize: 12 }}>{message}</Text>}

      <Pressable onPress={save} style={[styles.save, { backgroundColor: theme.brand }]}>
        <Text style={styles.saveText}>{card ? "Save changes" : "Add card"}</Text>
      </Pressable>

      {card && (
        <Pressable onPress={confirmDelete} style={styles.deleteButton}>
          <Text style={styles.deleteText}>Delete card</Text>
        </Pressable>
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", padding: 16, gap: 10 },
  headerSmall: { color: "rgba(255,255,255,0.8)", fontSize: 10, fontWeight: "700" },
  headerTitle: { color: "#ffffff", fontSize: 20, fontWeight: "800" },
  close: { width: 30, height: 30, borderRadius: 15, backgroundColor: "rgba(255,255,255,0.22)", alignItems: "center", justifyContent: "center" },
  label: { fontSize: 12, fontWeight: "600" },
  input: { borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 11, fontSize: 15 },
  row: { flexDirection: "row", gap: 8, alignItems: "flex-end" },
  choice: { flex: 1, borderWidth: 1.5, borderRadius: 12, paddingVertical: 10, alignItems: "center" },
  colors: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  swatch: { width: 34, height: 34, borderRadius: 17 },
  transferBox: { borderWidth: 1, borderRadius: 12, padding: 10, gap: 6 },
  moveButton: { borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12 },
  moveText: { color: "#ffffff", fontWeight: "700" },
  save: { borderRadius: 12, paddingVertical: 14, alignItems: "center", marginTop: 4 },
  saveText: { color: "#ffffff", fontWeight: "700", fontSize: 15 },
  deleteButton: { paddingVertical: 12, alignItems: "center" },
  deleteText: { color: "#dc3535", fontWeight: "700" },
});
