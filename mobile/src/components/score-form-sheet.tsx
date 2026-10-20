import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import type { FormData } from "@vitals/shared";
import { Sheet } from "@/components/sheet";
import { NumberField } from "@/components/number-field";
import { useAppTheme } from "@/hooks/use-app-theme";
import { calculateFromForm } from "@/lib/score";
import { useStore } from "@/lib/store";

interface ScoreFormSheetProps {
  visible: boolean;
  onClose: () => void;
}

type NumberKey = {
  [K in keyof FormData]: FormData[K] extends number ? K : never;
}[keyof FormData];

// "Check your score" without using budget cards: type your numbers, get a score.
export function ScoreFormSheet({ visible, onClose }: ScoreFormSheetProps) {
  const theme = useAppTheme();
  const form = useStore((s) => s.formData);
  const setFormField = useStore((s) => s.setFormField);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function field(label: string, key: NumberKey, hint?: string) {
    return <NumberField label={label} value={form[key]} onChange={(v) => setFormField(key, v)} hint={hint} />;
  }

  async function calculate() {
    setBusy(true);
    setError("");
    try {
      await calculateFromForm();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    }
    setBusy(false);
  }

  const heading = [styles.heading, { color: theme.text }];

  return (
    <Sheet visible={visible} onClose={onClose} title="Check your score">
      <Text style={heading}>Income</Text>
      {field("Monthly income (after tax)", "incomeMain")}
      {field("Other monthly income", "incomeAdditional")}

      <Text style={heading}>Expenses</Text>
      {field("Rent or mortgage", "expensesRent")}
      {field("Groceries", "expensesGroceries")}
      {field("Transport", "expensesTransport")}
      {field("Subscriptions", "expensesSubscriptions")}
      {field("Dining out", "expensesDining")}
      {field("Shopping", "expensesShopping")}
      {field("Everything else", "expensesOther")}

      <Text style={heading}>Where you stand</Text>
      {field("Total savings", "savingsTotal")}
      {field("Investments", "investmentsTotal")}
      {field("Total debt", "debtTotal")}
      {field("Monthly debt payments", "debtMonthly")}

      <Text style={heading}>About you</Text>
      <NumberField
        label="Age"
        prefix=""
        value={form.age ?? 0}
        onChange={(v) => setFormField("age", v === 0 ? null : v)}
      />
      <View style={styles.row}>
        <Text style={{ color: theme.text, fontSize: 14, flex: 1 }}>I have health insurance</Text>
        <Pressable
          onPress={() => setFormField("hasHealthInsurance", !form.hasHealthInsurance)}
          style={[styles.toggle, { backgroundColor: form.hasHealthInsurance ? theme.brand : theme.surface2 }]}
        >
          <Text style={{ color: form.hasHealthInsurance ? "#ffffff" : theme.textMuted, fontWeight: "700" }}>
            {form.hasHealthInsurance ? "Yes" : "No"}
          </Text>
        </Pressable>
      </View>

      {error !== "" && <Text style={styles.error}>Couldn't calculate your score. {error}</Text>}

      <Pressable onPress={calculate} disabled={busy} style={[styles.save, { backgroundColor: theme.brand }]}>
        {busy ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.saveText}>Calculate score</Text>}
      </Pressable>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  heading: { fontSize: 15, fontWeight: "800", marginTop: 6 },
  row: { flexDirection: "row", alignItems: "center" },
  toggle: { borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8 },
  error: { color: "#dc3535", fontSize: 12 },
  save: { borderRadius: 12, paddingVertical: 14, alignItems: "center", marginTop: 4 },
  saveText: { color: "#ffffff", fontWeight: "700", fontSize: 15 },
});
