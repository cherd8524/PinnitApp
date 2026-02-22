import { Modal, TouchableOpacity, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { MAP_STYLE_LABELS } from "@/constants/settings";
import type { MapStyleType } from "@/utils/storage";
import type { SettingsColors } from "./types";

type MapStyleModalProps = {
  visible: boolean;
  currentStyle: MapStyleType;
  colors: SettingsColors;
  onSelect: (style: MapStyleType) => void;
  onClose: () => void;
};

export function MapStyleModal({
  visible,
  currentStyle,
  colors,
  onSelect,
  onClose,
}: MapStyleModalProps) {
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
          style={[
            styles.content,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
          activeOpacity={1}
          onPress={() => {}}
        >
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            สไตล์แผนที่
          </Text>
          <Text style={[styles.subtitle, { color: colors.sectionLabel }]}>
            เลือกการแสดงผลแผนที่
          </Text>
          {(Object.keys(MAP_STYLE_LABELS) as MapStyleType[]).map((style) => (
            <TouchableOpacity
              key={style}
              style={[styles.option, { borderBottomColor: colors.border }]}
              onPress={() => onSelect(style)}
              activeOpacity={0.7}
            >
              <Text style={[styles.optionLabel, { color: colors.textPrimary }]}>
                {MAP_STYLE_LABELS[style]}
              </Text>
              {currentStyle === style && (
                <Ionicons name="checkmark-circle" size={22} color="#007AFF" />
              )}
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={onClose}
            activeOpacity={0.8}
          >
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
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  content: {
    width: "100%",
    maxWidth: 340,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 16,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: "500",
  },
  cancelButton: {
    marginTop: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  cancelText: {
    fontSize: 16,
    fontWeight: "500",
  },
});
