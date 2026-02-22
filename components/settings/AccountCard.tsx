import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { Image } from "expo-image";
import type { SettingsColors } from "./types";

type AccountCardProps = {
  isLoggedIn: boolean;
  displayName: string;
  subtitle: string;
  avatarUrl?: string | null;
  avatarVersion?: string | number;
  avatarUploading: boolean;
  isDark: boolean;
  colors: SettingsColors;
  onLogin: () => void;
  onAvatarPress: () => void;
  onEditName: () => void;
};

export function AccountCard({
  isLoggedIn,
  displayName,
  subtitle,
  avatarUrl,
  avatarVersion = "",
  avatarUploading,
  isDark,
  colors,
  onLogin,
  onAvatarPress,
  onEditName,
}: AccountCardProps) {
  if (!isLoggedIn) {
    return (
      <TouchableOpacity style={styles.row} onPress={onLogin}>
        <View style={styles.rowLeft}>
          <View style={styles.avatarPlaceholder}>
            <Ionicons name="person-outline" size={28} color="#007AFF" />
          </View>
          <View>
            <Text style={[styles.accountName, { color: colors.textPrimary }]}>
              ล็อกอิน
            </Text>
            <Text style={[styles.accountSub, { color: colors.sectionLabel }]}>
              ล็อกอินเพื่อซิงค์และสำรอง pins
            </Text>
          </View>
        </View>
        <MaterialCommunityIcons
          name="chevron-right"
          size={22}
          color={isDark ? "#6B7280" : "#9CA3AF"}
        />
      </TouchableOpacity>
    );
  }

  const avatarUri = avatarUrl
    ? avatarUrl.includes("?")
      ? `${avatarUrl}&v=${avatarVersion}`
      : `${avatarUrl}?v=${avatarVersion}`
    : null;

  return (
    <View style={styles.row}>
      <View style={styles.rowLeft}>
        <TouchableOpacity
          onPress={onAvatarPress}
          disabled={avatarUploading}
          style={styles.avatarTouchable}
        >
          <View style={styles.avatarPlaceholder}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarInitial}>
                {displayName.charAt(0).toUpperCase()}
              </Text>
            )}
          </View>
          <View
            style={[
              styles.avatarBadge,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            <Ionicons name="camera" size={14} color="#007AFF" />
          </View>
        </TouchableOpacity>
        <View style={styles.nameBlock}>
          <Text style={[styles.accountName, { color: colors.textPrimary }]}>
            {displayName || "ผู้ใช้"}
          </Text>
          <Text style={[styles.accountSub, { color: colors.sectionLabel }]}>
            {avatarUploading ? "กำลังอัปโหลด..." : subtitle}
          </Text>
        </View>
      </View>
      <TouchableOpacity
        onPress={onEditName}
        style={styles.editIcon}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        activeOpacity={0.7}
      >
        <Ionicons
          name="pencil-outline"
          size={22}
          color={isDark ? "#6B7280" : "#9CA3AF"}
        />
      </TouchableOpacity>
    </View>
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
    gap: 14,
    flex: 1,
  },
  avatarTouchable: {
    position: "relative",
  },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#DBEAFE",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  avatarBadge: {
    position: "absolute",
    right: 0,
    bottom: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: {
    fontSize: 22,
    fontWeight: "600",
    color: "#1D4ED8",
  },
  nameBlock: {
    flex: 1,
    justifyContent: "center",
  },
  accountName: {
    fontSize: 17,
    fontWeight: "600",
  },
  accountSub: {
    fontSize: 13,
    marginTop: 2,
  },
  editIcon: {
    marginLeft: 4,
  },
});
