import { useState } from "react";
import {
  ActivityIndicator,
  Image,
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
import { useAppTheme, useIsDark } from "@/hooks/use-app-theme";
import {
  profileIsComplete,
  signInWithApple,
  signInWithEmail,
  signInWithGoogle,
  signUpWithEmail,
} from "@/lib/auth";
import { supabase } from "@/lib/supabase";

type Mode = "signin" | "signup";

export default function SignIn() {
  const theme = useAppTheme();
  const isDark = useIsDark();
  const router = useRouter();

  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const logo = isDark
    ? require("../../../assets/images/vitals-logo-dark.jpeg")
    : require("../../../assets/images/vitals-logo.png");

  function switchMode(next: Mode) {
    setMode(next);
    setPassword("");
    setConfirmPassword("");
    setMessage(null);
  }

  // After any successful sign-in: first-time users fill in their profile,
  // everyone else goes straight to the Budget tab.
  async function goToNextScreen() {
    const { data } = await supabase.auth.getUser();
    if (!data.user) return;
    const complete = await profileIsComplete(data.user.id);
    router.replace(complete ? "/(tabs)/budget" : "/profile-setup");
  }

  // Runs one sign-in attempt: shows a spinner, then either an error or the next screen.
  async function attempt(run: () => Promise<string | null>) {
    setBusy(true);
    setMessage(null);
    const error = await run();
    setBusy(false);
    if (error) {
      setMessage(error);
      return;
    }
    await goToNextScreen();
  }

  async function handleEmail() {
    if (!email.trim() || !password) {
      setMessage("Enter your email and password.");
      return;
    }
    if (mode === "signin") {
      await attempt(() => signInWithEmail(email.trim(), password));
      return;
    }
    if (password !== confirmPassword) {
      setMessage("Passwords don't match.");
      return;
    }
    setBusy(true);
    setMessage(null);
    const error = await signUpWithEmail(email.trim(), password);
    setBusy(false);
    if (error) {
      setMessage(error);
      return;
    }
    switchMode("signin");
    setMessage("Check your email to confirm your account, then sign in.");
  }

  const inputStyle = [
    styles.input,
    { backgroundColor: theme.surface, borderColor: theme.border, color: theme.text },
  ];

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.bg }]}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Image source={logo} style={styles.logo} resizeMode="contain" />
          <Text style={[styles.tagline, { color: theme.textMuted }]}>
            {mode === "signin" ? "Welcome back. Sign in to your account." : "Create your account, free forever."}
          </Text>

          <Pressable
            disabled={busy}
            onPress={() => attempt(signInWithGoogle)}
            style={[styles.socialButton, { backgroundColor: theme.surface, borderColor: theme.border }]}
          >
            <Text style={[styles.socialText, { color: theme.text }]}>Continue with Google</Text>
          </Pressable>
          {Platform.OS === "ios" && (
            <Pressable
              disabled={busy}
              onPress={() => attempt(signInWithApple)}
              style={[styles.socialButton, { backgroundColor: theme.surface, borderColor: theme.border }]}
            >
              <Text style={[styles.socialText, { color: theme.text }]}>Continue with Apple</Text>
            </Pressable>
          )}

          <View style={styles.dividerRow}>
            <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
            <Text style={[styles.dividerText, { color: theme.textMuted }]}>or</Text>
            <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
          </View>

          <View style={[styles.switchRow, { backgroundColor: theme.surface2, borderColor: theme.border }]}>
            {(["signin", "signup"] as Mode[]).map((m) => (
              <Pressable
                key={m}
                onPress={() => switchMode(m)}
                style={[styles.switchButton, mode === m && { backgroundColor: theme.bg }]}
              >
                <Text style={[styles.switchText, { color: mode === m ? theme.text : theme.textMuted }]}>
                  {m === "signin" ? "Sign in" : "Sign up"}
                </Text>
              </Pressable>
            ))}
          </View>

          <TextInput
            style={inputStyle}
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor={theme.textMuted}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
          />
          <TextInput
            style={inputStyle}
            value={password}
            onChangeText={setPassword}
            placeholder="Password"
            placeholderTextColor={theme.textMuted}
            secureTextEntry
            autoCapitalize="none"
          />
          {mode === "signup" && (
            <TextInput
              style={inputStyle}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Confirm password"
              placeholderTextColor={theme.textMuted}
              secureTextEntry
              autoCapitalize="none"
            />
          )}

          <Pressable disabled={busy} onPress={handleEmail} style={[styles.primaryButton, { backgroundColor: theme.brand }]}>
            {busy ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.primaryText}>{mode === "signin" ? "Sign in" : "Create account"}</Text>
            )}
          </Pressable>

          {message && <Text style={[styles.message, { color: theme.textMuted }]}>{message}</Text>}

          <Text style={[styles.trustLine, { color: theme.textMuted }]}>
            Your financial data is private and never sold.
          </Text>

          <Pressable onPress={() => router.replace("/(tabs)/budget")}>
            <Text style={[styles.guestLink, { color: theme.textMuted }]}>Continue without account →</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1 },
  content: { padding: 24, alignItems: "stretch", gap: 12 },
  logo: { width: "100%", height: 90, marginTop: 12 },
  tagline: { fontSize: 15, textAlign: "center", marginBottom: 12 },
  socialButton: { borderWidth: 1, borderRadius: 12, paddingVertical: 13, alignItems: "center" },
  socialText: { fontSize: 15, fontWeight: "600" },
  dividerRow: { flexDirection: "row", alignItems: "center", gap: 10, marginVertical: 4 },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { fontSize: 12 },
  switchRow: { flexDirection: "row", borderWidth: 1, borderRadius: 10, padding: 3 },
  switchButton: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: "center" },
  switchText: { fontSize: 14, fontWeight: "600" },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15 },
  primaryButton: { borderRadius: 12, paddingVertical: 14, alignItems: "center", marginTop: 4 },
  primaryText: { color: "#ffffff", fontSize: 15, fontWeight: "700" },
  message: { fontSize: 13, textAlign: "center" },
  trustLine: { fontSize: 12, textAlign: "center", marginTop: 8 },
  guestLink: { fontSize: 14, textAlign: "center", marginTop: 8 },
});
