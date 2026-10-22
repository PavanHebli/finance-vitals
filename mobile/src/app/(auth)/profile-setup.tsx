import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useAppTheme } from "@/hooks/use-app-theme";
import { supabase } from "@/lib/supabase";

const GENDERS = [
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
  { value: "other", label: "Other" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
];

// Shown once, right after a first sign-in. Every field is optional.
export default function ProfileSetup() {
  const theme = useAppTheme();
  const router = useRouter();

  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [gender, setGender] = useState<string | null>(null);
  const [country, setCountry] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Google and Apple already know the user's name, so start with it filled in.
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const meta = data.user?.user_metadata;
      if (meta?.full_name) setName(meta.full_name);
    });
  }, []);

  async function save(fields: Record<string, unknown>) {
    setBusy(true);
    setMessage(null);
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      router.replace("/sign-in");
      return;
    }
    const { error } = await supabase
      .from("profiles")
      .update({ ...fields, profile_completed: true })
      .eq("id", data.user.id);
    setBusy(false);
    if (error) {
      setMessage(error.message);
      return;
    }
    router.replace("/(tabs)/budget");
  }

  function handleSave() {
    if (birthDate && !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) {
      setMessage("Enter the date as YYYY-MM-DD, or leave it blank.");
      return;
    }
    save({
      display_name: name.trim() || null,
      date_of_birth: birthDate || null,
      gender,
      country: country.trim() || null,
    });
  }

  const inputStyle = [
    styles.input,
    { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text },
  ];

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.bg }]}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={[styles.title, { color: theme.text }]}>Tell us about you</Text>
          <Text style={[styles.sub, { color: theme.textMuted }]}>
            All of this is optional and you can skip it. It only helps personalize your insights.
          </Text>

          <Text style={[styles.label, { color: theme.textMuted }]}>Name</Text>
          <TextInput style={inputStyle} value={name} onChangeText={setName} placeholder="Your name" placeholderTextColor={theme.textMuted} />

          <Text style={[styles.label, { color: theme.textMuted }]}>Date of birth</Text>
          <TextInput
            style={inputStyle}
            value={birthDate}
            onChangeText={setBirthDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={theme.textMuted}
            keyboardType="numbers-and-punctuation"
          />

          <Text style={[styles.label, { color: theme.textMuted }]}>Gender</Text>
          <View style={styles.chipRow}>
            {GENDERS.map((g) => (
              <Pressable
                key={g.value}
                onPress={() => setGender(gender === g.value ? null : g.value)}
                style={[
                  styles.chip,
                  { borderColor: theme.border, backgroundColor: theme.surface },
                  gender === g.value && { borderColor: theme.brand, backgroundColor: theme.brandSoft },
                ]}
              >
                <Text style={{ color: gender === g.value ? theme.brand : theme.text, fontSize: 13, fontWeight: "600" }}>
                  {g.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={[styles.label, { color: theme.textMuted }]}>Country</Text>
          <TextInput style={inputStyle} value={country} onChangeText={setCountry} placeholder="e.g. United States" placeholderTextColor={theme.textMuted} />

          {message && <Text style={[styles.message, { color: theme.textMuted }]}>{message}</Text>}

          <Pressable disabled={busy} onPress={handleSave} style={[styles.primaryButton, { backgroundColor: theme.brand }]}>
            {busy ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.primaryText}>Save and continue</Text>}
          </Pressable>
          <Pressable disabled={busy} onPress={() => save({})}>
            <Text style={[styles.skip, { color: theme.textMuted }]}>Skip for now</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1 },
  content: { padding: 24, gap: 8 },
  title: { fontSize: 24, fontWeight: "800", marginTop: 12 },
  sub: { fontSize: 14, marginBottom: 12, lineHeight: 20 },
  label: { fontSize: 12, fontWeight: "700", textTransform: "uppercase", marginTop: 8 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { borderWidth: 1.5, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  message: { fontSize: 13, textAlign: "center", marginTop: 8 },
  primaryButton: { borderRadius: 12, paddingVertical: 14, alignItems: "center", marginTop: 16 },
  primaryText: { color: "#ffffff", fontSize: 15, fontWeight: "700" },
  skip: { fontSize: 14, textAlign: "center", marginTop: 12 },
});
