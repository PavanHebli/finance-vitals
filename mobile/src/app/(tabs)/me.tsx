import { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Constants from "expo-constants";
import { useRouter } from "expo-router";
import { SCHEMES, type SchemeName } from "@/constants/schemes";
import { useAppTheme, useIsDark } from "@/hooks/use-app-theme";
import { API_URL } from "@/lib/api-config";
import { signOut } from "@/lib/auth";
import { usePrefs } from "@/lib/prefs";
import { setWeeklyReminder } from "@/lib/reminders";
import { useStore } from "@/lib/store";
import { supabase } from "@/lib/supabase";

export default function Me() {
  const theme = useAppTheme();
  const isDark = useIsDark();
  const router = useRouter();

  const prefs = usePrefs();
  const userId = useStore((s) => s.userId);
  const overall = useStore((s) => s.overallScore);
  const resetToGuestState = useStore((s) => s.resetToGuestState);
  const [message, setMessage] = useState("");

  async function leave() {
    await signOut();
    router.replace("/sign-in");
  }

  async function toggleWeekly(on: boolean) {
    prefs.setWeeklyCheckin(on);
    const ok = await setWeeklyReminder(on);
    if (!ok) {
      prefs.setWeeklyCheckin(false);
      setMessage("Allow notifications in Settings to get reminders.");
    }
  }

  function confirmClear() {
    Alert.alert("Clear all data?", "This removes your cards, goals and history. Your account stays.", [
      { text: "Cancel", style: "cancel" },
      { text: "Clear", style: "destructive", onPress: clearData },
    ]);
  }

  async function clearData() {
    if (userId) {
      await supabase.from("budget_cards").delete().eq("user_id", userId);
      await supabase.from("goals").delete().eq("user_id", userId);
      await supabase.from("distribution_log").delete().eq("user_id", userId);
      await supabase.from("snapshots").delete().eq("user_id", userId);
      await supabase.from("profiles").update({ financial_profile: null }).eq("id", userId);
    }
    resetToGuestState();
    setMessage("All data cleared.");
  }

  function confirmDelete() {
    Alert.alert("Delete account?", "This permanently deletes your account and everything in it.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: deleteAccount },
    ]);
  }

  async function deleteAccount() {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/account`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error(await res.text());
      await leave();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not delete the account.");
    }
  }

  const card = [styles.card, { backgroundColor: theme.surface, borderColor: theme.border }];

  return (
    <SafeAreaView edges={["top"]} style={[styles.screen, { backgroundColor: theme.bg }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.profile}>
          <View style={[styles.avatar, { backgroundColor: theme.brand }]}>
            <Text style={styles.avatarText}>{userId ? "✓" : "?"}</Text>
          </View>
          <View>
            <Text style={[styles.name, { color: theme.text }]}>{userId ? "Your account" : "Guest"}</Text>
            <Text style={{ color: theme.textMuted, fontSize: 12 }}>
              {overall !== null ? `Score ${overall}` : "No score yet"}
            </Text>
          </View>
        </View>

        <Text style={[styles.section, { color: theme.textMuted }]}>APPEARANCE</Text>
        <View style={card}>
          <View style={styles.row}>
            <Text style={{ color: theme.text, fontSize: 14 }}>Dark mode</Text>
            <Switch value={isDark} onValueChange={(on) => prefs.setMode(on ? "dark" : "light")} trackColor={{ true: theme.brand }} />
          </View>
          <Text style={[styles.small, { color: theme.textMuted }]}>App theme</Text>
          <View style={styles.row}>
            {(Object.keys(SCHEMES) as SchemeName[]).map((name) => (
              <Pressable
                key={name}
                onPress={() => prefs.setScheme(name)}
                style={[styles.dot, { backgroundColor: SCHEMES[name].dot }, prefs.scheme === name && { borderWidth: 3, borderColor: theme.text }]}
              />
            ))}
          </View>
        </View>

        <Text style={[styles.section, { color: theme.textMuted }]}>NOTIFICATIONS</Text>
        <View style={card}>
          <View style={styles.row}>
            <Text style={{ color: theme.text, fontSize: 14 }}>Weekly check-in</Text>
            <Switch value={prefs.weeklyCheckin} onValueChange={toggleWeekly} trackColor={{ true: theme.brand }} />
          </View>
          <View style={styles.row}>
            <Text style={{ color: theme.text, fontSize: 14 }}>Goal milestones</Text>
            <Switch value={prefs.goalMilestones} onValueChange={prefs.setGoalMilestones} trackColor={{ true: theme.brand }} />
          </View>
        </View>

        <Text style={[styles.section, { color: theme.textMuted }]}>DATA</Text>
        <View style={card}>
          <Pressable onPress={confirmClear}>
            <Text style={styles.danger}>Clear all data</Text>
          </Pressable>
          {userId && (
            <Pressable onPress={confirmDelete}>
              <Text style={styles.danger}>Delete account</Text>
            </Pressable>
          )}
        </View>

        {message !== "" && <Text style={{ color: theme.brand, textAlign: "center", fontSize: 12 }}>{message}</Text>}

        {userId ? (
          <Pressable onPress={leave} style={[styles.signOut, { borderColor: theme.border }]}>
            <Text style={{ color: theme.text, fontWeight: "700" }}>Sign out</Text>
          </Pressable>
        ) : (
          <Pressable onPress={() => router.replace("/sign-in")} style={[styles.signOut, { backgroundColor: theme.brand, borderColor: theme.brand }]}>
            <Text style={{ color: "#ffffff", fontWeight: "700" }}>Sign in to save your data</Text>
          </Pressable>
        )}

        <Text style={[styles.footer, { color: theme.textMuted }]}>
          {userId ? "Your data is saved to your account." : "As a guest, your data is lost when you close the app."}
        </Text>
        <Text style={[styles.footer, { color: theme.textMuted }]}>
          Vitals is for information only and is not financial advice. Version {Constants.expoConfig?.version ?? "1.0.0"}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 16, gap: 10, paddingBottom: 40 },
  profile: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 8 },
  avatar: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#ffffff", fontSize: 20, fontWeight: "800" },
  name: { fontSize: 18, fontWeight: "800" },
  section: { fontSize: 11, fontWeight: "700", marginTop: 8 },
  card: { borderWidth: 1, borderRadius: 14, padding: 14, gap: 14 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  small: { fontSize: 12 },
  dot: { width: 36, height: 36, borderRadius: 18 },
  danger: { color: "#dc3535", fontWeight: "700", fontSize: 14 },
  signOut: { borderWidth: 1.5, borderRadius: 12, paddingVertical: 13, alignItems: "center", marginTop: 8 },
  footer: { textAlign: "center", fontSize: 11, marginTop: 6 },
});
