import {
  Modal,
  TouchableOpacity,
  Text,
  StyleSheet,
  Platform,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { SettingsColors } from "./types";

type AvatarActionSheetModalProps = {
  visible: boolean;
  hasAvatar: boolean;
  colors: SettingsColors;
  onTakePhoto: () => void;
  onViewAvatar: () => void;
  onPickFromLibrary: () => void;
  onRemovePhoto: () => void;
  onClose: () => void;
};

export function AvatarActionSheetModal({
  visible,
  hasAvatar,
  colors,
  onTakePhoto,
  onViewAvatar,
  onPickFromLibrary,
  onRemovePhoto,
  onClose,
}: AvatarActionSheetModalProps) {
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
          style={[styles.container, { backgroundColor: colors.card }]}
          activeOpacity={1}
          onPress={() => {}}
        >
          <View style={[styles.handle, { backgroundColor: colors.sectionLabel }]} />
          <Text style={[styles.sheetTitle, { color: colors.sectionLabel }]}>
            รูปโปรไฟล์
          </Text>
          <TouchableOpacity
            style={styles.option}
            onPress={() => {
              onClose();
              onTakePhoto();
            }}
          >
            <Ionicons name="camera-outline" size={22} color="#007AFF" />
            <Text style={[styles.optionText, { color: colors.textPrimary }]}>
              ถ่ายภาพ
            </Text>
            <Ionicons name="chevron-forward" size={18} color={colors.sectionLabel} />
          </TouchableOpacity>
          {hasAvatar ? (
            <TouchableOpacity
              style={styles.option}
              onPress={() => {
                onClose();
                onViewAvatar();
              }}
            >
              <Ionicons name="eye-outline" size={22} color="#007AFF" />
              <Text style={[styles.optionText, { color: colors.textPrimary }]}>
                ดูรูปโปรไฟล์
              </Text>
              <Ionicons name="chevron-forward" size={18} color={colors.sectionLabel} />
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity
            style={styles.option}
            onPress={() => onPickFromLibrary()}
          >
            <Ionicons
              name={hasAvatar ? "images-outline" : "cloud-upload-outline"}
              size={22}
              color="#007AFF"
            />
            <Text style={[styles.optionText, { color: colors.textPrimary }]}>
              {hasAvatar ? "เปลี่ยนรูปโปรไฟล์" : "อัพโหลดรูปโปรไฟล์"}
            </Text>
            <Ionicons name="chevron-forward" size={18} color={colors.sectionLabel} />
          </TouchableOpacity>
          {hasAvatar ? (
            <TouchableOpacity
              style={styles.option}
              onPress={() => {
                onClose();
                onRemovePhoto();
              }}
            >
              <Ionicons name="trash-outline" size={22} color="#DC2626" />
              <Text style={[styles.optionText, styles.optionDestructive]}>
                ลบรูปโปรไฟล์
              </Text>
              <Ionicons name="chevron-forward" size={18} color={colors.sectionLabel} />
            </TouchableOpacity>
          ) : null}
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <TouchableOpacity style={styles.cancel} onPress={onClose}>
            <Text style={[styles.cancelText, { color: colors.sectionLabel }]}>
              ยกเลิก
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
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    justifyContent: "flex-end",
  },
  container: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 10,
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === "ios" ? 34 : 24,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
    opacity: 0.5,
  },
  sheetTitle: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 4,
    gap: 12,
  },
  optionText: {
    flex: 1,
    fontSize: 16,
    fontWeight: "500",
  },
  optionDestructive: {
    color: "#DC2626",
  },
  divider: {
    height: 1,
    marginVertical: 8,
    opacity: 0.6,
  },
  cancel: {
    paddingVertical: 14,
    alignItems: "center",
  },
  cancelText: {
    fontSize: 16,
    fontWeight: "600",
  },
});