import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { MaterialCommunityIcons } from "@expo/vector-icons";

type SettingsRowProps = {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  subtitle?: string;
  onPress?: () => void;
  showChevron?: boolean;
  isDark?: boolean;
};

export function SettingsRow({
  icon,
  label,
  subtitle,
  onPress,
  showChevron = true,
  isDark = false,
}: SettingsRowProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={styles.row}
    >
      <View style={styles.rowLeft}>
        <View style={styles.iconWrapper}>
          <Ionicons name={icon} size={20} color="#007AFF" />
        </View>
        <View style={styles.textColumn}>
          <Text
            style={[
              styles.rowLabel,
              { color: isDark ? "#F9FAFB" : "#0F172A" },
            ]}
          >
            {label}
          </Text>
          {subtitle ? (
            <Text
              style={[
                styles.rowSubtitle,
                { color: isDark ? "#6B7280" : "#9CA3AF" },
              ]}
            >
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>
      {showChevron && (
        <MaterialCommunityIcons
          name="chevron-right"
          size={22}
          color={isDark ? "#6B7280" : "#9CA3AF"}
        />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  textColumn: {
    flexDirection: "column",
  },
  rowSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  iconWrapper: {
    height: 36,
    width: 36,
    borderRadius: 18,
    backgroundColor: "#DBEAFE",
    alignItems: "center",
    justifyContent: "center",
  },
  rowLabel: {
    fontSize: 16,
    fontWeight: "500",
    color: "#0F172A",
  },
});
