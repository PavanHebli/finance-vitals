import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { Sheet } from "@/components/sheet";
import { NumberField } from "@/components/number-field";
import { useAppTheme } from "@/hooks/use-app-theme";
import { useStore } from "@/lib/store";

interface ProfileSheetProps {
  visible: boolean;
  onClose: () => void;
}

// The few numbers a budget card can't tell us: debt and savings you already have.
// Rent and expenses are optional; they stay "not set" until the user fills them.
export function ProfileSheet({ visible, onClose }: ProfileSheetProps) {
  const theme = useAppTheme();
  const profile = useStore((s) => s.financialProfile);
  const setFinancialProfile = useStore((s) => s.setFinancialProfile);

  const [debtTotal, setDebtTotal] = useState(0);
  const [debtMonthly, setDebtMonthly] = useState(0);
  const [savingsTotal, setSavingsTotal] = useState(0);
  const [rent, setRent] = useState<number | undefined>(undefined);
  const [expenses, setExpenses] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (!visible) return;
    setDebtTotal(profile.debtTotal);
    setDebtMonthly(profile.debtMonthly);
    setSavingsTotal(profile.savingsTotal);
    setRent(profile.housingMonthly);
    setExpenses(profile.expensesMonthly);
  }, [visible, profile]);

  function save() {
    setFinancialProfile({
      debtTotal,
      debtMonthly,
      savingsTotal,
      housingMonthly: rent,
      expensesMonthly: expenses,
      profileComplete: true,
    });
    onClose();
  }

  return (
    <Sheet visible={visible} onClose={onClose} title="Your financial profile">
      <Text style={[styles.intro, { color: theme.textMuted }]}>
        Your cards already tell us income, rent and spending. These are the things they can't.
      </Text>
      <NumberField label="Total debt you owe" value={debtTotal} onChange={setDebtTotal} hint="Loans, credit cards, anything you pay interest on." />
      <NumberField label="Monthly debt payments" value={debtMonthly} onChange={setDebtMonthly} />
      <NumberField label="Total savings" value={savingsTotal} onChange={setSavingsTotal} hint="Cash in savings and checking accounts." />

      <Text style={[styles.section, { color: theme.text }]}>Optional</Text>
      <NumberField
        label="Rent or mortgage per month"
        value={rent ?? 0}
        onChange={setRent}
        hint={rent === undefined ? "Not set. A card named Rent is used instead if you add one." : undefined}
      />
      <NumberField
        label="Total monthly expenses"
        value={expenses ?? 0}
        onChange={setExpenses}
        hint={expenses === undefined ? "Not set. Your expense cards are used if you add some." : undefined}
      />

      <Pressable onPress={save} style={[styles.save, { backgroundColor: theme.brand }]}>
        <Text style={styles.saveText}>Save</Text>
      </Pressable>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  intro: { fontSize: 13, lineHeight: 18 },
  section: { fontSize: 14, fontWeight: "800", marginTop: 6 },
  save: { borderRadius: 12, paddingVertical: 14, alignItems: "center", marginTop: 4 },
  saveText: { color: "#ffffff", fontWeight: "700", fontSize: 15 },
});
