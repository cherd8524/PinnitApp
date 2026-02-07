import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Appearance,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { Session } from "@supabase/supabase-js";
import { SettingsRow } from "@/components/SettingsRow";
import {
  loadMapStyle,
  saveMapStyle,
  type MapStyleType,
} from "@/utils/storage";
import * as ImagePicker from "expo-image-picker";
import * as ImageManipulator from "expo-image-manipulator";
import { supabase } from "@/lib/supabase";
import { loadPins, getLastSyncAt, runPendingSync, getLocalOnlyPinsCount, mergeLocalPinsToSupabase, copyCacheToLocalOnLogout } from "@/utils/pinsSync";
import { useNetworkStatus } from "@/utils/network";

const DARK_MODE_KEY = "@pinnit_dark_mode";

const MAP_STYLE_LABELS: Record<MapStyleType, string> = {
  standard: "มาตรฐาน",
  satellite: "ดาวเทียม",
  hybrid: "ไฮบริด",
  terrain: "ภูมิประเทศ",
};

export default function SettingsScreen() {
  const systemColorScheme = useColorScheme();
  const [darkMode, setDarkMode] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mapStyle, setMapStyle] = useState<MapStyleType>("standard");
  const [showMapStyleModal, setShowMapStyleModal] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null);
  const [syncLoading, setSyncLoading] = useState(false);
  const [localOnlyPinsCount, setLocalOnlyPinsCount] = useState(0);
  const router = useRouter();
  const isOnline = useNetworkStatus();

  // Auth session
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => setSession(s));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: string, s: Session | null) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
  };

  const displayName = session?.user?.user_metadata?.full_name ?? session?.user?.user_metadata?.username ?? "ผู้ใช้";
  const avatarUrl = session?.user?.user_metadata?.avatar_url as string | undefined;

  useEffect(() => {
    getLastSyncAt().then(setLastSyncAt);
    if (session) {
      getLocalOnlyPinsCount().then(setLocalOnlyPinsCount);
    } else {
      setLocalOnlyPinsCount(0);
    }
  }, [session]);

  const handleBackupSync = async () => {
    if (!session) {
      Alert.alert("กรุณาล็อกอิน", "ล็อกอินเพื่อใช้ฟีเจอร์สำรองข้อมูลและซิงค์");
      return;
    }
    if (!isOnline) {
      Alert.alert("ออฟไลน์", "ขณะนี้ไม่มีเครือข่าย จะซิงค์เมื่อมีอินเทอร์เน็ต");
      return;
    }
    if (localOnlyPinsCount > 0) {
      Alert.alert(
        "มีข้อมูลในเครื่องที่ยังไม่ได้ซิงค์",
        `มีตำแหน่งในเครื่อง ${localOnlyPinsCount} จุด ที่ยังไม่ได้ซิงค์กับบัญชีนี้ ต้องการนำขึ้นบัญชีหรือไม่?\n\n(ถ้าไม่ใช่ข้อมูลของคุณ เช่น ยืมเครื่องเพื่อน ให้กดยกเลิก)`,
        [
          { text: "ยกเลิก", style: "cancel" },
          {
            text: "นำขึ้นบัญชี",
            onPress: async () => {
              setSyncLoading(true);
              try {
                await mergeLocalPinsToSupabase();
                setLocalOnlyPinsCount(0);
                const t = await getLastSyncAt();
                setLastSyncAt(t);
                Alert.alert("ซิงค์เรียบร้อย", "นำข้อมูลในเครื่องขึ้นบัญชีแล้ว");
              } catch (e) {
                console.error("Merge sync error", e);
                Alert.alert("ซิงค์ไม่สำเร็จ", "กรุณาลองอีกครั้ง");
              } finally {
                setSyncLoading(false);
              }
            },
          },
        ]
      );
      return;
    }
    setSyncLoading(true);
    try {
      await runPendingSync();
      await loadPins(true);
      const t = await getLastSyncAt();
      setLastSyncAt(t);
      Alert.alert("ซิงค์เรียบร้อย", t ? `ซิงค์ล่าสุดเมื่อ ${new Date(t).toLocaleString("th-TH")}` : "ข้อมูลถูกซิงค์แล้ว");
    } catch (e) {
      console.error("Backup sync error", e);
      Alert.alert("ซิงค์ไม่สำเร็จ", "กรุณาลองอีกครั้ง");
    } finally {
      setSyncLoading(false);
    }
  };

  const backupSyncSubtitle =
    !session
      ? "ล็อกอินเพื่อซิงค์"
      : !isOnline
        ? "ออฟไลน์"
        : localOnlyPinsCount > 0
          ? `มี ${localOnlyPinsCount} จุดในเครื่อง ยังไม่ได้ซิงค์ — กดเพื่อเลือกนำขึ้นบัญชีหรือไม่`
          : lastSyncAt
            ? `ซิงค์ล่าสุด ${new Date(lastSyncAt).toLocaleString("th-TH", { dateStyle: "short", timeStyle: "short" })}`
            : "กดเพื่อซิงค์ตอนนี้";

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

  // Load map style on mount
  useEffect(() => {
    loadMapStyle().then(setMapStyle);
  }, []);

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
      Alert.alert("เกิดข้อผิดพลาด", "ไม่สามารถบันทึกการตั้งค่าโหมดมืดได้");
    }
  };

  const handleSelectMapStyle = async (style: MapStyleType) => {
    try {
      setMapStyle(style);
      await saveMapStyle(style);
      setShowMapStyleModal(false);
    } catch (error) {
      console.error("Error saving map style:", error);
      Alert.alert("เกิดข้อผิดพลาด", "ไม่สามารถบันทึกการตั้งค่าสไตล์แผนที่ได้");
    }
  };

  const handleAvatarPress = async () => {
    if (!session?.user) return;
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
      });
      if (result.canceled || !result.assets[0]) return;
      const uri = result.assets[0].uri;
      const manipulated = await ImageManipulator.manipulateAsync(uri, [{ resize: { width: 400 } }], { compress: 0.8 });
      const path = `${session.user.id}/avatar`;
      const res = await fetch(manipulated.uri);
      const body = await res.blob();
      const { error: uploadErr } = await supabase.storage.from("profile-images").upload(path, body, { upsert: true });
      if (uploadErr) throw uploadErr;
      const { data: urlData } = supabase.storage.from("profile-images").getPublicUrl(path);
      await supabase.auth.updateUser({ data: { avatar_url: urlData.publicUrl } });
      setSession({ ...session, user: { ...session.user, user_metadata: { ...session.user.user_metadata, avatar_url: urlData.publicUrl } } } as Session);
    } catch (e) {
      console.error("Avatar upload error", e);
      const msg =
        e instanceof Error && (e.message?.includes("expo-image-picker") || e.message?.includes("expo-image-manipulator") || (e as { code?: string }).code === "MODULE_NOT_FOUND")
          ? "กรุณาติดตั้งแพ็กเกจ: npx expo install expo-image-picker expo-image-manipulator แล้ว build ใหม่ (npx expo prebuild)"
          : e instanceof Error
            ? e.message
            : "อัปโหลดไม่สำเร็จ กรุณาลองอีกครั้ง";
      Alert.alert("อัปโหลดไม่สำเร็จ", msg);
    }
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
            ตั้งค่า
          </Text>
          <Text
            style={[styles.headerSubtitle, { color: colors.sectionLabel }]}
          >
            ปรับแต่ง Pinnit ให้เหมาะกับการใช้งานของคุณ
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.sectionLabel }]}>
            บัญชี
          </Text>
          <View
            style={[
              styles.card,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            {!session ? (
              <TouchableOpacity
                style={styles.accountRow}
                onPress={() => (router.push as (href: string) => void)("/(auth)/login")}
              >
                <View style={styles.accountRowLeft}>
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
                <Ionicons name="chevron-forward" size={22} color={colors.sectionLabel} />
              </TouchableOpacity>
            ) : (
              <View style={styles.accountBlock}>
                <View style={styles.accountRow}>
                  <View style={styles.accountRowLeft}>
                    <TouchableOpacity onPress={handleAvatarPress} activeOpacity={0.8}>
                      {avatarUrl ? (
                        <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
                      ) : (
                        <View style={styles.avatarPlaceholder}>
                          <Ionicons name="image-outline" size={28} color={colors.sectionLabel} />
                        </View>
                      )}
                    </TouchableOpacity>
                    <View>
                      <Text style={[styles.accountName, { color: colors.textPrimary }]}>
                        {displayName}
                      </Text>
                      <Text style={[styles.accountSub, { color: colors.sectionLabel }]}>
                        {session.user?.user_metadata?.username ?? session.user?.email?.split("@")[0] ?? "ล็อกอินแล้ว"}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text
            style={[styles.sectionLabel, { color: colors.sectionLabel }]}
          >
            แผนที่
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
              label="สไตล์แผนที่"
              onPress={() => setShowMapStyleModal(true)}
              isDark={isDark}
              subtitle={MAP_STYLE_LABELS[mapStyle]}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text
            style={[styles.sectionLabel, { color: colors.sectionLabel }]}
          >
            การตั้งค่า
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
                    โหมดมืด
                  </Text>
                  <Text
                    style={[
                      styles.darkSubtitle,
                      { color: colors.sectionLabel },
                    ]}
                  >
                    ปรับจอให้เข้ากับเวลากลางคืน
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

        {session ? (
          <View style={styles.section}>
            <Text
              style={[styles.sectionLabel, { color: colors.sectionLabel }]}
            >
              ข้อมูล
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
                icon="cloud-done-outline"
                label="สำรองข้อมูลและซิงค์"
                subtitle={syncLoading ? "กำลังซิงค์..." : backupSyncSubtitle}
                onPress={handleBackupSync}
                isDark={isDark}
              />
              <View
                style={[
                  styles.cardDivider,
                  { backgroundColor: isDark ? "#374151" : "#E5E7EB" },
                ]}
              />
              <SettingsRow
                icon="save-outline"
                label="เก็บสำเนารายการลงเครื่อง"
                subtitle="จะเห็นรายการหลังออกจากระบบ"
                onPress={async () => {
                  try {
                    await copyCacheToLocalOnLogout();
                    Alert.alert("บันทึกแล้ว", "เก็บสำเนาลงเครื่องแล้ว");
                  } catch (e) {
                    console.error("Copy to local error", e);
                    Alert.alert("บันทึกไม่สำเร็จ", "กรุณาลองอีกครั้ง");
                  }
                }}
                isDark={isDark}
              />
            </View>
          </View>
        ) : null}

        <View style={styles.section}>
          <Text
            style={[styles.sectionLabel, { color: colors.sectionLabel }]}
          >
            เกี่ยวกับ
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
              label="เกี่ยวกับ Pinnit"
              onPress={() => {
                Alert.alert(
                  "เกี่ยวกับ Pinnit App",
                  "Pinnit v1.0.0\n\nแอปปักหมุดตำแหน่งที่เรียบง่ายและสวยงาม\n\nสร้างด้วย ❤️ เพื่อติดตามสถานที่โปรดของคุณ\n\n━━━━━━━━━━━━━━━━━━━━\n\nข้อมูลนักพัฒนา:\n\nพัฒนาโดย: Cherdsak Kh.\nหลักสูตร: SCS337\nโปรเจกต์: PinnitApp\n\nแอปนี้สร้างขึ้นเป็นส่วนหนึ่งของโปรเจกต์หลักสูตร เพื่อสาธิตฟีเจอร์เกี่ยวกับตำแหน่งและการพัฒนาแอปมือถือสมัยใหม่"
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
              label="นโยบายความเป็นส่วนตัว"
              onPress={() => {
                Alert.alert(
                  "นโยบายความเป็นส่วนตัว",
                  "• ข้อมูลที่เก็บ: ตำแหน่งที่ปักหมุด ชื่อบัญชี รูปโปรไฟล์ (ถ้าอัปโหลด) เก็บในอุปกรณ์และบนเซิร์ฟเวอร์เมื่อคุณล็อกอิน\n\n" +
                  "• การใช้ข้อมูล: ใช้เพื่อให้บริการแอป ซิงค์และสำรอง pins ของคุณ ไม่ขายหรือแชร์ข้อมูลให้บุคคลที่สาม\n\n" +
                  "• ความปลอดภัย: การเชื่อมต่อใช้ HTTPS ข้อมูลบัญชีอยู่ภายใต้ Supabase Auth\n\n" +
                  "• การตั้งค่า (โหมดมืด, สไตล์แผนที่): เก็บเฉพาะในอุปกรณ์ ไม่ส่งขึ้นเซิร์ฟเวอร์"
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
              label="เงื่อนไขการให้บริการ"
              onPress={() => {
                Alert.alert(
                  "เงื่อนไขการให้บริการ",
                  "• การใช้งาน: คุณใช้ Pinnit เพื่อบันทึกและจัดการตำแหน่งที่ปักหมุดส่วนตัว\n\n" +
                  "• ข้อห้าม: ไม่อนุญาตให้ใช้แอปเพื่อละเมิดกฎหมาย หรือเก็บข้อมูลตำแหน่งของผู้อื่นโดยไม่ยินยอม\n\n" +
                  "• บริการ: เราให้บริการ \"ตามสภาพ\" การซิงค์ขึ้นอยู่กับเครือข่ายและเซิร์ฟเวอร์\n\n" +
                  "• การเปลี่ยนแปลง: เราอาจอัปเดตเงื่อนไขนี้ได้ โดยการใช้งานต่อถือว่าคุณยอมรับ"
                );
              }}
              isDark={isDark}
            />
          </View>
        </View>

        {session ? (
          <View style={[styles.section, { marginTop: 32 }]}>
            <TouchableOpacity
              style={[styles.logoutButton, { borderColor: colors.border }]}
              onPress={() => {
                Alert.alert("ออกจากระบบ", "ต้องการออกจากระบบหรือไม่?", [
                  { text: "ยกเลิก", style: "cancel" },
                  { text: "ออกจากระบบ", style: "destructive", onPress: () => handleLogout() },
                ]);
              }}
            >
              <Ionicons name="log-out-outline" size={20} color="#DC2626" />
              <Text style={styles.logoutText}>ออกจากระบบ</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Pinnit App · v1.0.0
          </Text>
        </View>
      </ScrollView>

      {/* Map Style Selection Modal */}
      <Modal
        visible={showMapStyleModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowMapStyleModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowMapStyleModal(false)}
        >
          <TouchableOpacity
            style={[
              styles.mapStyleModalContent,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
              },
            ]}
            activeOpacity={1}
            onPress={() => { }}
          >
            <Text
              style={[
                styles.mapStyleModalTitle,
                { color: colors.textPrimary },
              ]}
            >
              สไตล์แผนที่
            </Text>
            <Text
              style={[
                styles.mapStyleModalSubtitle,
                { color: colors.sectionLabel },
              ]}
            >
              เลือกการแสดงผลแผนที่
            </Text>
            {(Object.keys(MAP_STYLE_LABELS) as MapStyleType[]).map((style) => (
              <TouchableOpacity
                key={style}
                style={[
                  styles.mapStyleOption,
                  {
                    borderBottomColor: colors.border,
                  },
                ]}
                onPress={() => handleSelectMapStyle(style)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.mapStyleOptionLabel,
                    { color: colors.textPrimary },
                  ]}
                >
                  {MAP_STYLE_LABELS[style]}
                </Text>
                {mapStyle === style && (
                  <Ionicons name="checkmark-circle" size={22} color="#007AFF" />
                )}
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.mapStyleCancelButton}
              onPress={() => setShowMapStyleModal(false)}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.mapStyleCancelText,
                  { color: colors.sectionLabel },
                ]}
              >
                ยกเลิก
              </Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
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
  accountBlock: {
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  accountRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  accountRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#DBEAFE",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  avatarInitial: {
    fontSize: 22,
    fontWeight: "600",
    color: "#1D4ED8",
  },
  accountName: {
    fontSize: 17,
    fontWeight: "600",
  },
  accountSub: {
    fontSize: 13,
    marginTop: 2,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginHorizontal: 20,
    marginBottom: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderRadius: 12,
  },
  logoutText: {
    fontSize: 15,
    color: "#DC2626",
    fontWeight: "500",
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  mapStyleModalContent: {
    width: "100%",
    maxWidth: 340,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
  },
  mapStyleModalTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 4,
  },
  mapStyleModalSubtitle: {
    fontSize: 14,
    marginBottom: 16,
  },
  mapStyleOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  mapStyleOptionLabel: {
    fontSize: 16,
    fontWeight: "500",
  },
  mapStyleCancelButton: {
    marginTop: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  mapStyleCancelText: {
    fontSize: 16,
    fontWeight: "500",
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

