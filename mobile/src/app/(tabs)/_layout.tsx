import { Tabs } from "expo-router";
import { View } from "react-native";
import { ChatFab } from "@/components/chat-fab";
import { useAppTheme } from "@/hooks/use-app-theme";

// Tab structure matches the "Vitals iOS v5" design artifact exactly:
// Budget, Score, Progress, Me (not Settings — the design's own term, since
// it combines profile + settings + appearance in one screen).
export default function TabsLayout() {
  const theme = useAppTheme();
  return (
    <View style={{ flex: 1 }}>
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.brand,
        tabBarInactiveTintColor: theme.textMuted,
        tabBarStyle: { backgroundColor: theme.surface, borderTopColor: theme.border },
      }}
    >
      <Tabs.Screen name="budget" options={{ title: "Budget" }} />
      <Tabs.Screen name="score" options={{ title: "Score" }} />
      <Tabs.Screen name="progress" options={{ title: "Progress" }} />
      <Tabs.Screen name="me" options={{ title: "Me" }} />
    </Tabs>
    <ChatFab />
    </View>
  );
}
