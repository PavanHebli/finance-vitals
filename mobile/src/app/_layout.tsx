import "@/styles/tailwind.css";
import "@/lib/api-config";

import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from "expo-router";
import { useColorScheme } from "react-native";
import { AccountHydrator } from "@/components/account-hydrator";

// No auth-based routing yet (that is item B6). For now this is a plain stack so
// the (auth) and (tabs) screens are both reachable.
export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <AccountHydrator />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </ThemeProvider>
  );
}
