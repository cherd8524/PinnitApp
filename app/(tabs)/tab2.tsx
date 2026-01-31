import { Text, View } from "react-native";

export default function Tab2() {
  return (
    <View className="flex-1 justify-center items-center bg-white">
      <Text className="text-2xl font-bold text-green-600">
        Tab 2
      </Text>
      <Text className="text-gray-600 mt-4">
        This is the second tab
      </Text>
    </View>
  );
}
