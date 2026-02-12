import { useEffect } from "react";
import { Stack } from "expo-router";
import { Appearance, Platform, Text } from "react-native";
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

  useEffect(() => {
    // Set a modern sans-serif font globally for all Text components
    const fontFamily = Platform.select({
      ios: "System",
      android: "Roboto",
      web: "system-ui",
      default: "System",
    });

    if (fontFamily) {
      // Apply default font family to all Text components
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      Text.defaultProps = Text.defaultProps || {};
      // Preserve any existing default style and merge
      if (Text.defaultProps.style) {
        Text.defaultProps.style = [
          Text.defaultProps.style,
          { fontFamily },
        ];
      } else {
        Text.defaultProps.style = { fontFamily };
      }
    }
  }, []);

  return <Stack screenOptions={{ headerShown: false }} />;
}
