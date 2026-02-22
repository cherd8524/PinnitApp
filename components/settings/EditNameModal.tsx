import {
  Modal,
  TouchableOpacity,
  Text,
  TextInput,
  View,
  StyleSheet,
} from "react-native";
import type { SettingsColors } from "./types";

type EditNameModalProps = {
  visible: boolean;
  value: string;
  colors: SettingsColors;
  saving: boolean;
  onChangeText: (text: string) => void;
  onSave: () => void;
  onClose: () => void;
};

export function EditNameModal({
  visible,
  value,
  colors,
  saving,
  onChangeText,
  onSave,
  onClose,
}: EditNameModalProps) {
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
            เปลี่ยนชื่อโปรไฟล์
          </Text>
          <TextInput
            style={[
              styles.input,
              { color: colors.textPrimary, borderColor: colors.border },
            ]}
            placeholder="ชื่อที่แสดง"
            placeholderTextColor={colors.sectionLabel}
            value={value}
            onChangeText={onChangeText}
            autoCapitalize="words"
            editable={!saving}
          />
          <View style={styles.buttons}>
            <TouchableOpacity
              style={[
                styles.button,
                styles.buttonCancel,
                { borderColor: colors.border },
              ]}
              onPress={onClose}
              disabled={saving}
            >
              <Text style={[styles.buttonText, { color: colors.sectionLabel }]}>
                ยกเลิก
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.buttonSave]}
              onPress={onSave}
              disabled={saving}
            >
              <Text style={styles.buttonSaveText}>
                {saving ? "กำลังบันทึก..." : "บันทึก"}
              </Text>
            </TouchableOpacity>
          </View>
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
  input: {
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 16,
  },
  buttons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 16,
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
  },
  buttonCancel: {
    borderWidth: 1,
  },
  buttonSave: {
    backgroundColor: "#007AFF",
  },
  buttonText: {
    fontSize: 15,
    fontWeight: "500",
  },
  buttonSaveText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});
