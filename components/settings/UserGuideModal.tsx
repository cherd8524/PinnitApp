import {
  Modal,
  TouchableOpacity,
  Text,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import type { SettingsColors } from "./types";

const USER_GUIDE_CONTENT = {
  intro:
    "คู่มือนี้แนะนำวิธีใช้งานแอปและฟีเจอร์ต่างๆ ของ Pinnit เพื่อให้คุณใช้แอปได้อย่างเต็มประสิทธิภาพ",
  sections: [
    {
      title: "ฟีเจอร์แท็บรายการ",
      body:
        "• กดปุ่ม \"ปักหมุดตำแหน่งปัจจุบัน\" เพื่อเพิ่มตำแหน่งปัจจุบันลงรายการ\n" +
        "• กดที่รายการเพื่อดูตำแหน่งบนแผนที่\n" +
        "• กดค้างเพื่อแก้ไขชื่อหรือตำแหน่ง\n" +
        "• ปัดซ้ายเพื่อลบรายการ",
    },
    {
      title: "ฟีเจอร์แผนที่",
      body:
        "• แสดง markers ของตำแหน่งที่บันทึกทั้งหมด\n" +
        "• กดที่ตำแหน่งบนแผนที่เพื่อปักหมุดใหม่\n" +
        "• เลือกสไตล์แผนที่ได้จากเมนูตั้งค่า",
    },
    {
      title: "ฟีเจอร์บัญชีและซิงค์",
      body:
        "• ล็อกอินเพื่อซิงค์ตำแหน่งกับบัญชี cloud\n" +
        "• เมื่อออฟไลน์ ข้อมูลเก็บในเครื่อง และจะซิงค์เมื่อกลับมาออนไลน์\n" +
        "• อัปโหลดปักหมุดขึ้นบัญชี: นำปักหมุดในเครื่องขึ้นบัญชี\n" +
        "• ดาวน์โหลดปักหมุดลงเครื่อง: ดึงปักหมุดจากบัญชีลงเครื่อง",
    },
    {
      title: "ฟีเจอร์โปรไฟล์",
      body:
        "• กดที่วงกลมรูปโปรไฟล์ เพื่อเปิดเมนู: ถ่ายภาพ, ดูรูปโปรไฟล์, อัพโหลด/เปลี่ยนรูป, ลบรูปโปรไฟล์\n" +
        "• กดไอคอนแก้ไข (ดินสอ) ทางขวาของการ์ดบัญชี เพื่อเปลี่ยนชื่อที่แสดง",
    },
    {
      title: "ฟีเจอร์ตั้งค่า",
      body:
        "• สไตล์แผนที่: มาตรฐาน / ดาวเทียม / ไฮบริด / ภูมิประเทศ\n" +
        "• โหมดมืด: ปรับจอให้เหมาะกับเวลากลางคืน",
    },
  ],
};

type UserGuideModalProps = {
  visible: boolean;
  colors: SettingsColors;
  onClose: () => void;
};

export function UserGuideModal({
  visible,
  colors,
  onClose,
}: UserGuideModalProps) {
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
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
            },
          ]}
          activeOpacity={1}
          onPress={() => {}}
        >
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            คู่มือการใช้งาน
          </Text>
          <ScrollView
            style={styles.scroll}
            showsVerticalScrollIndicator
          >
            <Text style={[styles.text, { color: colors.sectionLabel }]}>
              {USER_GUIDE_CONTENT.intro}
            </Text>
            {USER_GUIDE_CONTENT.sections.map((s) => (
              <View key={s.title}>
                <Text
                  style={[styles.sectionTitle, { color: colors.textPrimary }]}
                >
                  {s.title}
                </Text>
                <Text
                  style={[styles.text, { color: colors.sectionLabel }]}
                >
                  {s.body}
                </Text>
              </View>
            ))}
          </ScrollView>
          <TouchableOpacity
            style={[styles.closeButton, { borderColor: colors.border }]}
            onPress={onClose}
          >
            <Text style={[styles.closeText, { color: colors.sectionLabel }]}>
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
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  content: {
    width: "100%",
    maxWidth: 360,
    maxHeight: "80%",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 4,
  },
  scroll: {
    maxHeight: 400,
    marginVertical: 12,
  },
  text: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "600",
    marginTop: 12,
    marginBottom: 4,
  },
  closeButton: {
    alignSelf: "center",
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderWidth: 1,
    borderRadius: 10,
    marginTop: 8,
  },
  closeText: {
    fontSize: 15,
    fontWeight: "500",
  },
});