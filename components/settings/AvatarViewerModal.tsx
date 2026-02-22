import { Modal, TouchableOpacity, Text, StyleSheet } from "react-native";
import { Image } from "expo-image";
import type { SettingsColors } from "./types";

type AvatarViewerModalProps = {
  visible: boolean;
  avatarUrl: string | undefined;
  avatarVersion?: string | number;
  colors: SettingsColors;
  onClose: () => void;
};

export function AvatarViewerModal({
  visible,
  avatarUrl,
  avatarVersion = "",
  colors,
  onClose,
}: AvatarViewerModalProps) {
  const uri = avatarUrl
    ? avatarUrl.includes("?")
      ? `${avatarUrl}&v=${avatarVersion}`
      : `${avatarUrl}?v=${avatarVersion}`
    : undefined;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity
          style={styles.content}
          activeOpacity={1}
          onPress={() => {}}
        >
          {uri ? (
            <Image
              source={{ uri }}
              style={styles.image}
              resizeMode="contain"
            />
          ) : null}
          <TouchableOpacity
            style={[
              styles.closeButton,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
            onPress={onClose}
          >
            <Text
              style={[styles.closeText, { color: colors.textPrimary }]}
            >
              ปิด
            </Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.85)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  content: {
    width: "100%",
    maxWidth: 360,
    alignItems: "center",
  },
  image: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 16,
  },
  closeButton: {
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
  },
  closeText: {
    fontSize: 16,
    fontWeight: "600",
  },
});
