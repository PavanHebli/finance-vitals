import "@/styles/tailwind.css";
import "@/lib/api-config";

import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from "expo-router";
import { useColorScheme } from "react-native";
import { AccountHydrator } from "@/components/account-hydrator";

// A plain stack. Expo Router finds every screen in the app folder by itself:
// index, (auth)/sign-in, (auth)/profile-setup and (tabs).
export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <AccountHydrator />
      <Stack screenOptions={{ headerShown: false }} />
    </ThemeProvider>
  );
}
