import { View, Text } from "react-native";

// Placeholder. Real screen (per the "Vitals iOS v5" design artifact):
// score flip-card (front: ring + 2x2 metric pills, back: AI narrative),
// AI insight strip, 2-column card grid (Income/Float system cards + custom
// cards with colored headers), chat FAB. Separate follow-up task.
export default function Budget() {
  return (
    <View className="flex-1 items-center justify-center bg-white">
      <Text className="text-xl font-bold text-black">Budget</Text>
    </View>
  );
}
