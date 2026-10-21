import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import { importPdf } from "@vitals/shared";
import type { Transaction } from "@vitals/shared";
import { Sheet } from "@/components/sheet";
import { useAppTheme } from "@/hooks/use-app-theme";
import { money } from "@/lib/format";
import { useStore } from "@/lib/store";

const COLORS: Record<string, string> = {
  rent: "#ef4444",
  groceries: "#22c55e",
  transport: "#f97316",
  subscriptions: "#a855f7",
  dining: "#ec4899",
  shopping: "#f59e0b",
  other: "#64748b",
};

interface Row {
  category: string;
  label: string;
  monthly: number;
  color: string;
  include: boolean;
}

// Adds up each category, averaged per month found in the statement.
function summarize(transactions: Transaction[]): Row[] {
  const totals = new Map<string, { total: number; months: Set<string> }>();
  for (const tx of transactions) {
    if (tx.category === "income") continue;
    const entry = totals.get(tx.category) ?? { total: 0, months: new Set<string>() };
    entry.total += tx.amount;
    if (tx.date) entry.months.add(tx.date.slice(0, 7));
    totals.set(tx.category, entry);
  }
  const rows: Row[] = [];
  totals.forEach((entry, category) => {
    const monthly = Math.round(entry.total / Math.max(1, entry.months.size));
    if (monthly <= 0) return;
    rows.push({
      category,
      label: category.charAt(0).toUpperCase() + category.slice(1),
      monthly,
      color: COLORS[category] ?? "#64748b",
      include: true,
    });
  });
  return rows.sort((a, b) => b.monthly - a.monthly);
}

interface ImportSheetProps {
  visible: boolean;
  onClose: () => void;
}

// Pick a bank statement PDF, see spending per category, and turn the ones you
// keep into budget cards.
export function ImportSheet({ visible, onClose }: ImportSheetProps) {
  const theme = useAppTheme();
  const addBudgetCard = useStore((s) => s.addBudgetCard);

  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function pickFile() {
    setError("");
    const picked = await DocumentPicker.getDocumentAsync({ type: "application/pdf", copyToCacheDirectory: true });
    if (picked.canceled) return;
    const asset = picked.assets[0];

    setBusy(true);
    // React Native uploads a file from its address instead of a File object.
    const file = { uri: asset.uri, name: asset.name, type: "application/pdf" } as unknown as File;
    const result = await importPdf(file, "", "");
    setBusy(false);

    if (result.error) {
      setError(result.error);
      return;
    }
    const found = summarize(result.transactions);
    if (found.length === 0) setError("No spending found in that statement.");
    setRows(found);
  }

  function toggle(category: string) {
    setRows(rows.map((r) => (r.category === category ? { ...r, include: !r.include } : r)));
  }

  function createCards() {
    for (const row of rows) {
      if (row.include) addBudgetCard(row.label, "fixed", row.monthly, row.color, "expense", "From bank statement");
    }
    setRows([]);
    onClose();
  }

  return (
    <Sheet visible={visible} onClose={onClose} title="Import a bank statement">
      {rows.length === 0 ? (
        <>
          <Text style={{ color: theme.textMuted, fontSize: 13, lineHeight: 19 }}>
            Choose a PDF statement. We read the spending and suggest a card for each category. The file is not stored.
          </Text>
          {error !== "" && <Text style={{ color: "#dc3535", fontSize: 12 }}>{error}</Text>}
          <Pressable onPress={pickFile} disabled={busy} style={[styles.button, { backgroundColor: theme.brand }]}>
            {busy ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.buttonText}>Choose PDF</Text>}
          </Pressable>
        </>
      ) : (
        <>
          <Text style={{ color: theme.textMuted, fontSize: 13 }}>Monthly average per category. Untick any you don't want.</Text>
          {rows.map((row) => (
            <Pressable
              key={row.category}
              onPress={() => toggle(row.category)}
              style={[styles.row, { backgroundColor: theme.surface, borderColor: row.include ? row.color : theme.border }]}
            >
              <View style={[styles.dot, { backgroundColor: row.include ? row.color : theme.border }]} />
              <Text style={{ flex: 1, color: theme.text, fontWeight: "600" }}>{row.label}</Text>
              <Text style={{ color: theme.text, fontWeight: "800" }}>{money(row.monthly)}</Text>
            </Pressable>
          ))}
          <Pressable onPress={createCards} style={[styles.button, { backgroundColor: theme.brand }]}>
            <Text style={styles.buttonText}>Create cards</Text>
          </Pressable>
        </>
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  button: { borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  buttonText: { color: "#ffffff", fontWeight: "700", fontSize: 15 },
  row: { flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1.5, borderRadius: 12, padding: 12 },
  dot: { width: 12, height: 12, borderRadius: 6 },
});
