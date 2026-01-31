import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";

export default function TabLayout() {
    return (
        <Tabs
            screenOptions={{
                tabBarLabel: "Pinnit",
                tabBarActiveTintColor: "#007AFF",
                headerShown: false,
            }}
        >
            <Tabs.Screen
                name="index"
                options={{
                    title: "Home",
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="home" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="tab2"
                options={{
                    title: "Tab 2",
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="search" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="tab3"
                options={{
                    title: "Tab 3",
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="person" size={size} color={color} />
                    ),
                }}
            />
        </Tabs>
    );
}
