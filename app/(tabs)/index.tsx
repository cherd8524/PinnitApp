import { Text, View } from "react-native";

export default function Index() {
    return (
        <View className="flex-1 justify-center items-center bg-white">
            <Text className="text-2xl font-bold text-blue-600">
                Welcome to Pinnit App
            </Text>
            <Text className="text-gray-600 mt-4">
                Tailwind CSS is now configured!
            </Text>
            <Text className="text-gray-500 mt-2">
                This is Tab 1 - Home
            </Text>
        </View>
    );
}
