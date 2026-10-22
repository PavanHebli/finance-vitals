import { StyleSheet, Text, TextInput, View } from "react-native";
import { useAppTheme } from "@/hooks/use-app-theme";

interface NumberFieldProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  hint?: string;
  prefix?: string;
}

// A labeled box for typing a number. An empty box means 0.
export function NumberField({ label, value, onChange, hint, prefix = "$" }: NumberFieldProps) {
  const theme = useAppTheme();
  return (
    <View style={styles.wrap}>
      <Text style={[styles.label, { color: theme.textMuted }]}>{label}</Text>
      <View style={[styles.box, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={{ color: theme.textMuted, fontSize: 15 }}>{prefix}</Text>
        <TextInput
          style={[styles.input, { color: theme.text }]}
          value={value === 0 ? "" : String(value)}
          onChangeText={(text) => {
            const parsed = parseFloat(text.replace(/[^0-9.]/g, ""));
            onChange(Number.isNaN(parsed) ? 0 : parsed);
          }}
          placeholder="0"
          placeholderTextColor={theme.textMuted}
          keyboardType="decimal-pad"
        />
      </View>
      {hint && <Text style={[styles.hint, { color: theme.textMuted }]}>{hint}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 4 },
  label: { fontSize: 12, fontWeight: "600" },
  box: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 12 },
  input: { flex: 1, paddingVertical: 11, fontSize: 15 },
  hint: { fontSize: 11 },
});
