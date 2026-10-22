import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { Redirect } from "expo-router";
import { useAppTheme } from "@/hooks/use-app-theme";
import { usePrefs } from "@/lib/prefs";
import { supabase } from "@/lib/supabase";

// The very first screen. It only decides where to send you:
// already signed in goes to the Budget tab, otherwise to the sign-in screen
// (which has a "Continue without account" link, so guests are never blocked).
export default function Index() {
  const theme = useAppTheme();
  const [destination, setDestination] = useState<"/(tabs)/budget" | "/sign-in" | null>(null);

  useEffect(() => {
    usePrefs.getState().load();
    supabase.auth.getSession().then(({ data }) => {
      setDestination(data.session ? "/(tabs)/budget" : "/sign-in");
    });
  }, []);

  if (!destination) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: theme.bg }}>
        <ActivityIndicator color={theme.brand} />
      </View>
    );
  }
  return <Redirect href={destination} />;
}
