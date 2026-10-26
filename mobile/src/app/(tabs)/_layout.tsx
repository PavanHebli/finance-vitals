import { Tabs } from "expo-router";
import { View, type ColorValue } from "react-native";
import { ChatFab } from "@/components/chat-fab";
import { Icon, type IconName } from "@/components/icons";
import { useAppTheme } from "@/hooks/use-app-theme";

// Tab structure matches the "Vitals iOS v5" design artifact exactly:
// Budget, Score, Progress, Me (not Settings — the design's own term, since
// it combines profile + settings + appearance in one screen).
function tabOptions(title: string, icon: IconName) {
  return {
    title,
    tabBarIcon: ({ color }: { color: ColorValue }) => <Icon name={icon} color={color} size={22} />,
  };
}

export default function TabsLayout() {
  const theme = useAppTheme();
  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: theme.brand,
          tabBarInactiveTintColor: theme.textMuted,
          tabBarLabelStyle: { fontSize: 10, fontWeight: "600" },
          tabBarStyle: { backgroundColor: theme.surface, borderTopColor: theme.border },
        }}
      >
        <Tabs.Screen name="budget" options={tabOptions("Budget", "budget")} />
        <Tabs.Screen name="score" options={tabOptions("Score", "score")} />
        <Tabs.Screen name="progress" options={tabOptions("Progress", "progress")} />
        <Tabs.Screen name="me" options={tabOptions("Me", "me")} />
      </Tabs>
      <ChatFab />
    </View>
  );
}
