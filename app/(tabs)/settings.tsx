import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Appearance,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SettingsRow } from "@/components/SettingsRow";

const DARK_MODE_KEY = "@pinnit_dark_mode";

export default function SettingsScreen() {
  const systemColorScheme = useColorScheme();
  const [darkMode, setDarkMode] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load saved preference on mount
  useEffect(() => {
    (async () => {
      try {
        const saved = await AsyncStorage.getItem(DARK_MODE_KEY);
        if (saved !== null) {
          const isDark = saved === "true";
          setDarkMode(isDark);
          Appearance.setColorScheme(isDark ? "dark" : "light");
        } else {
          // First time: use system preference
          const isDark = systemColorScheme === "dark";
          setDarkMode(isDark);
        }
      } catch (error) {
        console.error("Error loading dark mode preference:", error);
        setDarkMode(systemColorScheme === "dark");
      } finally {
        setIsLoading(false);
      }
    })();
  }, [systemColorScheme]);

  const isDark = darkMode ?? systemColorScheme === "dark";

  const colors = useMemo(
    () => ({
      background: isDark ? "#020617" : "#F8FAFC",
      card: isDark ? "#1F2937" : "#FFFFFF",
      border: isDark ? "#374151" : "#E5E7EB",
      sectionLabel: isDark ? "#9CA3AF" : "#6B7280",
      textPrimary: isDark ? "#F9FAFB" : "#020617",
    }),
    [isDark]
  );

  const handleDarkModeToggle = async (value: boolean) => {
    try {
      setDarkMode(value);
      Appearance.setColorScheme(value ? "dark" : "light");
      await AsyncStorage.setItem(DARK_MODE_KEY, value.toString());
    } catch (error) {
      console.error("Error saving dark mode preference:", error);
      Alert.alert("Error", "Failed to save dark mode preference.");
    }
  };

  const handleClearAllData = () => {
    Alert.alert(
      "Clear All Data",
      "Are you sure you want to permanently delete all pinned locations and settings?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            // TODO: integrate with storage clearing
            Alert.alert("Done", "All data has been cleared.");
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: colors.background }]}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.header}>
          <Text
            style={[
              styles.headerTitle,
              { color: colors.textPrimary },
              { marginTop: 10 }
            ]}
          >
            Settings
          </Text>
          <Text
            style={[styles.headerSubtitle, { color: colors.sectionLabel }]}
          >
            Tune Pinnit to match how you move and pin.
          </Text>
        </View>

        <View style={styles.section}>
          <Text
            style={[styles.sectionLabel, { color: colors.sectionLabel }]}
          >
            Location
          </Text>
          <View
            style={[
              styles.card,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
              },
            ]}
          >
            <SettingsRow
              icon="location-outline"
              label="Location Accuracy"
              onPress={() => {
                Alert.alert(
                  "Location Accuracy",
                  "High accuracy mode uses more battery but provides more precise location data."
                );
              }}
              isDark={isDark}
            />
            <View
              style={[
                styles.cardDivider,
                { backgroundColor: isDark ? "#374151" : "#E5E7EB" },
              ]}
            />
            <SettingsRow
              icon="refresh-outline"
              label="Update Interval"
              onPress={() => {
                Alert.alert(
                  "Update Interval",
                  "Configure how often your location is updated on the map."
                );
              }}
              isDark={isDark}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text
            style={[styles.sectionLabel, { color: colors.sectionLabel }]}
          >
            Map
          </Text>
          <View
            style={[
              styles.card,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
              },
            ]}
          >
            <SettingsRow
              icon="map-outline"
              label="Map Style"
              onPress={() => {
                Alert.alert(
                  "Map Style",
                  "Choose between standard, satellite, or terrain map views."
                );
              }}
              isDark={isDark}
            />
            <View
              style={[
                styles.cardDivider,
                { backgroundColor: isDark ? "#374151" : "#E5E7EB" },
              ]}
            />
            <SettingsRow
              icon="resize-outline"
              label="Default Zoom Level"
              onPress={() => {
                Alert.alert(
                  "Default Zoom Level",
                  "Set the default zoom level when opening the map."
                );
              }}
              isDark={isDark}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text
            style={[styles.sectionLabel, { color: colors.sectionLabel }]}
          >
            Preferences
          </Text>
          <View
            style={[
              styles.card,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
              },
            ]}
          >

            <View style={styles.darkRow}>
              <View style={styles.darkRowLeft}>
                <View style={styles.darkIconWrapper}>
                  <Ionicons
                    name={
                      darkMode ? "moon-outline" : "sunny-outline"
                    }
                    size={20}
                    color="#007AFF"
                  />
                </View>
                <View style={styles.darkTextColumn}>
                  <Text
                    style={[
                      styles.darkTitle,
                      { color: colors.textPrimary },
                    ]}
                  >
                    Dark Mode
                  </Text>
                  <Text
                    style={[
                      styles.darkSubtitle,
                      { color: colors.sectionLabel },
                    ]}
                  >
                    Match your screen to the night.
                  </Text>
                </View>
              </View>
              <Switch
                value={darkMode ?? false}
                onValueChange={handleDarkModeToggle}
                disabled={isLoading}
                trackColor={{
                  false: "#E5E7EB",
                  true: "#007AFF",
                }}
                thumbColor={darkMode ? "#F9FAFB" : "#F3F4F6"}
              />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text
            style={[styles.sectionLabel, { color: colors.sectionLabel }]}
          >
            Data
          </Text>
          <View
            style={[
              styles.card,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
              },
            ]}
          >
            <SettingsRow
              icon="download-outline"
              label="Export Pins"
              onPress={() => {
                Alert.alert(
                  "Export Pins",
                  "Export all your pinned locations as a JSON file."
                );
              }}
              isDark={isDark}
            />
            <View
              style={[
                styles.cardDivider,
                { backgroundColor: isDark ? "#374151" : "#E5E7EB" },
              ]}
            />
            <SettingsRow
              icon="cloud-upload-outline"
              label="Import Pins"
              onPress={() => {
                Alert.alert(
                  "Import Pins",
                  "Import pinned locations from a JSON file."
                );
              }}
              isDark={isDark}
            />
            <View
              style={[
                styles.cardDivider,
                { backgroundColor: isDark ? "#374151" : "#E5E7EB" },
              ]}
            />
            <SettingsRow
              icon="cloud-done-outline"
              label="Backup & Sync"
              onPress={() => {
                Alert.alert(
                  "Backup & Sync",
                  "Backup your pins to cloud storage or sync across devices."
                );
              }}
              isDark={isDark}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text
            style={[styles.sectionLabel, { color: colors.sectionLabel }]}
          >
            About
          </Text>
          <View
            style={[
              styles.card,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
              },
            ]}
          >
            <SettingsRow
              icon="information-circle-outline"
              label="About Pinnit"
              onPress={() => {
                Alert.alert(
                  "About Pinnit",
                  "Pinnit v1.0.0\n\nA simple and elegant location pinning app.\n\nMade with ❤️ for keeping track of your favorite places.\n\n━━━━━━━━━━━━━━━━━━━━\n\nDeveloper Information:\n\nDeveloped by: CS-VRU67/2-68\nCourse: SCS337\nProject: PinnitApp\n\nThis app was created as part of a course project to demonstrate location-based features and modern mobile app development."
                );
              }}
              isDark={isDark}
            />
            <View
              style={[
                styles.cardDivider,
                { backgroundColor: isDark ? "#374151" : "#E5E7EB" },
              ]}
            />
            <SettingsRow
              icon="shield-checkmark-outline"
              label="Privacy Policy"
              onPress={() => {
                Alert.alert(
                  "Privacy Policy",
                  "Your location data is stored locally on your device. We do not collect or share any personal information."
                );
              }}
              isDark={isDark}
            />
            <View
              style={[
                styles.cardDivider,
                { backgroundColor: isDark ? "#374151" : "#E5E7EB" },
              ]}
            />
            <SettingsRow
              icon="document-text-outline"
              label="Terms of Service"
              onPress={() => {
                Alert.alert(
                  "Terms of Service",
                  "By using Pinnit, you agree to use the app responsibly and respect location privacy."
                );
              }}
              isDark={isDark}
            />
          </View>
        </View>

        <View style={styles.dangerSection}>
          <Text style={styles.dangerLabel}>Danger Zone</Text>
          <TouchableOpacity
            onPress={handleClearAllData}
            activeOpacity={0.85}
            style={styles.dangerCard}
          >
            <View style={styles.dangerLeft}>
              <View style={styles.dangerIconWrapper}>
                <MaterialCommunityIcons
                  name="trash-can-outline"
                  size={20}
                  color="#EF4444"
                />
              </View>
              <View style={styles.dangerTextColumn}>
                <Text style={styles.dangerTitle}>
                  Clear All Data
                </Text>
                <Text style={styles.dangerSubtitle}>
                  This cannot be undone.
                </Text>
              </View>
            </View>
            <MaterialCommunityIcons
              name="chevron-right"
              size={22}
              color="#FCA5A5"
            />
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Pinnit App · v1.0.0
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.4,
  },
  headerSubtitle: {
    marginTop: 8,
    fontSize: 14,
  },
  section: {
    marginTop: 24,
  },
  sectionLabel: {
    paddingHorizontal: 20,
    paddingBottom: 8,
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  card: {
    borderRadius: 18,
    marginHorizontal: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  cardDivider: {
    height: 1,
    opacity: 0.7,
  },
  darkRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  darkRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  darkIconWrapper: {
    height: 36,
    width: 36,
    borderRadius: 18,
    backgroundColor: "#DBEAFE",
    alignItems: "center",
    justifyContent: "center",
  },
  darkTextColumn: {
    flexDirection: "column",
  },
  darkTitle: {
    fontSize: 16,
    fontWeight: "500",
  },
  darkSubtitle: {
    marginTop: 4,
    fontSize: 12,
  },
  dangerSection: {
    marginTop: 32,
  },
  dangerLabel: {
    paddingHorizontal: 20,
    paddingBottom: 8,
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: "#EF4444",
  },
  dangerCard: {
    marginHorizontal: 16,
    borderRadius: 18,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#F87171",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 3,
  },
  dangerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  dangerIconWrapper: {
    height: 36,
    width: 36,
    borderRadius: 18,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
  },
  dangerTextColumn: {
    flexDirection: "column",
  },
  dangerTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#DC2626",
  },
  dangerSubtitle: {
    marginTop: 4,
    fontSize: 12,
    color: "#B91C1C",
  },
  footer: {
    marginTop: 32,
    paddingHorizontal: 20,
  },
  footerText: {
    textAlign: "center",
    fontSize: 12,
    color: "#9CA3AF",
  },
});

