import { View, Text } from "react-native";

// Placeholder. Real screen (per the design artifact): avatar + score badge,
// Appearance (dark mode, app theme — 5 color schemes matching the DB's
// user_settings.color_scheme enum), Notifications, Data (export/delete).
// Separate follow-up task.
export default function Me() {
  return (
    <View className="flex-1 items-center justify-center bg-white">
      <Text className="text-xl font-bold text-black">Me</Text>
    </View>
  );
}
