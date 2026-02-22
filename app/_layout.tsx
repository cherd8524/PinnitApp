import { useEffect } from "react";
import { Stack } from "expo-router";
import { Appearance, Platform, Text } from "react-native";
import { loadDarkMode } from "@/utils/storage";

export default function RootLayout() {
  useEffect(() => {
    (async () => {
      try {
        const saved = await loadDarkMode();
        if (saved !== null) {
          Appearance.setColorScheme(saved ? "dark" : "light");
        }
      } catch (error) {
        console.error("Error loading dark mode preference:", error);
      }
    })();

    const fontFamily = Platform.select({
      ios: "System",
      android: "Roboto",
      web: "system-ui",
      default: "System",
    });
    if (fontFamily) {
      // React Native Text supports defaultProps; type defs omit it.
      const textDefaultProps = (Text as unknown as { defaultProps?: { style?: object } }).defaultProps ?? {};
      (Text as unknown as { defaultProps: { style?: object } }).defaultProps = {
        ...textDefaultProps,
        style: textDefaultProps.style ? [textDefaultProps.style, { fontFamily }] : { fontFamily },
      };
    }
  }, []);

  return <Stack screenOptions={{ headerShown: false }} />;
}
