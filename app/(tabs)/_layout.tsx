import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { useColorScheme } from "react-native";

export default function TabLayout() {
    const colorScheme = useColorScheme();

    const isDark = colorScheme === "dark";
    const headerBackground = isDark ? "#020617" : "#ffffff";
    const headerTitleColor = isDark ? "#E5E7EB" : "#0F172A";
    const tabBarBackground = isDark ? "#020617" : "#ffffff";

    return (
        <Tabs
            screenOptions={{
                tabBarActiveTintColor: "#007AFF",
                tabBarInactiveTintColor: "#9CA3AF",
                tabBarStyle: {
                    backgroundColor: tabBarBackground,
                    borderTopColor: isDark ? "#111827" : "#E5E7EB",
                },
                headerShown: false,
                headerTitle: "Pinnit",
                headerTitleStyle: {
                    fontSize: 20,
                    fontWeight: "bold",
                    color: headerTitleColor,
                },
                headerTitleAlign: "center",
                headerStyle: {
                    backgroundColor: headerBackground,
                },
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: "Home",
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons
                            name="home-outline"
                            size={size}
                            color={color}
                        />
                    ),
                }}
            />
            <Tabs.Screen
                name="map"
                options={{
                    title: "Map",
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons
                            name="map-outline"
                            size={size}
                            color={color}
                        />
                    ),
                }}
            />
            <Tabs.Screen
                name="settings"
                options={{
                    title: "Settings",
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons
                            name="settings-outline"
                            size={size}
                            color={color}
                        />
                    ),
                }}
            />
        </Tabs>
    );
}
