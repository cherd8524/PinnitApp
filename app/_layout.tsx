import { useEffect } from "react";
import { Stack } from "expo-router";
import { Appearance } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const DARK_MODE_KEY = "@pinnit_dark_mode";

export default function RootLayout() {
  useEffect(() => {
    // Load dark mode preference when app starts
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(DARK_MODE_KEY);
        if (saved !== null) {
          const isDark = saved === "true";
          Appearance.setColorScheme(isDark ? "dark" : "light");
        }
      } catch (error) {
        console.error("Error loading dark mode preference:", error);
      }
    })();
  }, []);

  return <Stack screenOptions={{ headerShown: false }} />;
}
