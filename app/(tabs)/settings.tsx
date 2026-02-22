import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Appearance,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";
import { Session } from "@supabase/supabase-js";
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
import { SettingsRow } from "@/components/SettingsRow";
import {
  loadMapStyle,
  saveMapStyle,
  type MapStyleType,
} from "@/utils/storage";
import { getSessionSafe, supabase } from "@/lib/supabase";
import { getLastSyncAt, getLocalOnlyPinsCount, mergeLocalPinsToSupabase, copyCacheToLocalOnLogout } from "@/utils/pinsSync";
import { useNetworkStatus } from "@/utils/network";
import { uploadProfileImage } from "@/utils/avatarUpload";

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
  const [showUserGuideModal, setShowUserGuideModal] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null);
  const [syncLoading, setSyncLoading] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [showEditNameModal, setShowEditNameModal] = useState(false);
  const [editNameValue, setEditNameValue] = useState("");
  const [nameSaving, setNameSaving] = useState(false);
  const [showAvatarActionSheet, setShowAvatarActionSheet] = useState(false);
  const [showAvatarViewer, setShowAvatarViewer] = useState(false);
  const router = useRouter();
  const isOnline = useNetworkStatus();

  const avatarUrl = session?.user?.user_metadata?.avatar_url as string | undefined;

  // Auth session
  useEffect(() => {
    getSessionSafe().then(({ data: { session: s } }) => setSession(s));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: string, s: Session | null) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
  };

  const pickerOptions = {
    allowsEditing: true as const,
    aspect: [1, 1] as [number, number],
    quality: 0.8,
    base64: true,
  };

  const uploadAvatarFromAsset = async (asset: { base64?: string | null; mimeType?: string | null }) => {
    if (!session?.user?.id) return;
    const base64 = asset?.base64 ?? null;
    if (!base64) {
      Alert.alert("ไม่สามารถใช้รูปนี้ได้", "รูปอาจมีขนาดใหญ่เกินไป ลองเลือกรูปที่เล็กกว่า");
      return;
    }
    setAvatarUploading(true);
    try {
      const contentType = asset.mimeType ?? "image/jpeg";
      const publicUrl = await uploadProfileImage(session.user.id, base64, contentType);
      const meta = session.user.user_metadata ?? {};
      await supabase.auth.updateUser({
        data: { ...meta, avatar_url: publicUrl, avatar_updated_at: Date.now() },
      });
      const { data: { session: newSession } } = await getSessionSafe();
      setSession(newSession);
      Alert.alert("สำเร็จ", "อัปเดตรูปโปรไฟล์แล้ว");
    } catch (e) {
      console.error("Profile photo upload error", e);
      Alert.alert("อัปโหลดไม่สำเร็จ", "กรุณาลองอีกครั้ง");
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleTakePhoto = async () => {
    setShowAvatarActionSheet(false);
    if (!session?.user?.id) return;
    if (!isOnline) {
      Alert.alert("ออฟไลน์", "ต้องเชื่อมต่ออินเทอร์เน็ตเพื่ออัปโหลดรูปโปรไฟล์");
      return;
    }
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("ต้องใช้สิทธิ์", "เปิดสิทธิ์กล้องเพื่อถ่ายภาพโปรไฟล์");
      return;
    }
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        ...pickerOptions,
      });
      if (result.canceled) return;
      await uploadAvatarFromAsset(result.assets[0]);
    } catch (e) {
      console.warn("Camera error", e);
      Alert.alert(
        "ไม่สามารถเปิดกล้องได้",
        "อุปกรณ์นี้อาจไม่มีกล้องหรือใช้เอมูเลเตอร์ กรุณาเลือก \"อัพโหลดรูปโปรไฟล์\" เพื่อเลือกรูปจากคลังแทน"
      );
    }
  };

  /** @deprecated ใช้ action sheet แทน; เก็บไว้เพื่อ backward ref */
  const handleChangeProfilePhoto = () => setShowAvatarActionSheet(true);

  const handlePickFromLibrary = async () => {
    setShowAvatarActionSheet(false);
    if (!session?.user?.id) return;
    if (!isOnline) {
      Alert.alert("ออฟไลน์", "ต้องเชื่อมต่ออินเทอร์เน็ตเพื่ออัปโหลดรูปโปรไฟล์");
      return;
    }
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("ต้องใช้สิทธิ์", "เปิดสิทธิ์เข้าถึงรูปภาพเพื่อเลือกรูปโปรไฟล์");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      ...pickerOptions,
    });
    if (result.canceled) return;
    await uploadAvatarFromAsset(result.assets[0]);
  };

  const handleRemoveProfilePhoto = async () => {
    if (!session?.user?.id) return;
    Alert.alert(
      "ลบรูปโปรไฟล์",
      "ต้องการลบรูปโปรไฟล์และกลับไปใช้ตัวอักษรแรกแทนหรือไม่?",
      [
        { text: "ยกเลิก", style: "cancel" },
        {
          text: "ลบ",
          style: "destructive",
          onPress: async () => {
            const meta = session.user.user_metadata ?? {};
            try {
              const { data: { user: updatedUser }, error } = await supabase.auth.updateUser({
                data: { ...meta, avatar_url: null, avatar_updated_at: null },
              });
              if (error) throw error;
              if (updatedUser && session) {
                setSession({ ...session, user: updatedUser });
              } else {
                const { data: { session: newSession } } = await getSessionSafe();
                setSession(newSession);
              }
              Alert.alert("สำเร็จ", "ลบรูปโปรไฟล์แล้ว");
            } catch (e) {
              console.error("Remove profile photo error", e);
              Alert.alert("ไม่สำเร็จ", "กรุณาลองอีกครั้ง");
            }
          },
        },
      ]
    );
  };

  const openEditNameModal = () => {
    const current = session?.user?.user_metadata?.full_name ?? session?.user?.user_metadata?.username ?? "";
    setEditNameValue(current);
    setShowEditNameModal(true);
  };

  const handleSaveDisplayName = async () => {
    const name = (editNameValue ?? "").trim();
    if (!session?.user?.id) return;
    setNameSaving(true);
    try {
      const meta = session.user.user_metadata ?? {};
      await supabase.auth.updateUser({
        data: { ...meta, full_name: name || undefined },
      });
      const { data: { session: newSession } } = await getSessionSafe();
      setSession(newSession);
      setShowEditNameModal(false);
      Alert.alert("สำเร็จ", "อัปเดตชื่อโปรไฟล์แล้ว");
    } catch (e) {
      console.error("Update display name error", e);
      Alert.alert("ไม่สำเร็จ", "กรุณาลองอีกครั้ง");
    } finally {
      setNameSaving(false);
    }
  };

  const displayName = session?.user?.user_metadata?.full_name ?? session?.user?.user_metadata?.username ?? "ผู้ใช้";

  useEffect(() => {
    getLastSyncAt().then(setLastSyncAt);
  }, [session]);

  const handleBackupSync = async () => {
    if (!session) {
      Alert.alert("กรุณาล็อกอิน", "ล็อกอินเพื่ออัปโหลดปักหมุดขึ้นบัญชี");
      return;
    }
    if (!isOnline) {
      Alert.alert("ออฟไลน์", "ขณะนี้ไม่มีเครือข่าย");
      return;
    }
    const count = await getLocalOnlyPinsCount();
    if (count === 0) {
      Alert.alert("ไม่มีรายการที่ต้องนำขึ้นบัญชี", "ไม่มีข้อมูลในเครื่องที่ยังไม่อยู่ในบัญชี");
      return;
    }
    setSyncLoading(true);
    try {
      await mergeLocalPinsToSupabase();
      const t = await getLastSyncAt();
      setLastSyncAt(t);
      Alert.alert("สำเร็จ", "อัปโหลดปักหมุดขึ้นบัญชีแล้ว");
    } catch (e) {
      console.error("Merge sync error", e);
      Alert.alert("ไม่สำเร็จ", "กรุณาลองอีกครั้ง");
    } finally {
      setSyncLoading(false);
    }
  };

  const backupSyncSubtitle =
    !session
      ? "ล็อกอินก่อนจึงจะนำรายการในเครื่องไปเก็บในบัญชีได้"
      : !isOnline
        ? "ไม่มีเน็ต — รายการที่ปักตอนเน็ตหลุดจะขึ้นบัญชีอัตโนมัติเมื่อกลับออนไลน์"
        : "นำรายการในเครื่องไปเก็บในบัญชี";

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
                onPress={() => router.navigate("/(auth)/login")}
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
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={22}
                  color={isDark ? "#6B7280" : "#9CA3AF"}
                />
              </TouchableOpacity>
            ) : (
              <View style={styles.accountRow}>
                <View style={styles.accountRowLeft}>
                  <TouchableOpacity
                    onPress={() => setShowAvatarActionSheet(true)}
                    disabled={avatarUploading}
                    style={styles.avatarTouchable}
                  >
                    <View style={styles.avatarPlaceholder}>
                      {avatarUrl ? (
                        <Image
                          source={{
                            uri: avatarUrl.includes("?")
                              ? `${avatarUrl}&v=${session?.user?.user_metadata?.avatar_updated_at ?? ""}`
                              : `${avatarUrl}?v=${session?.user?.user_metadata?.avatar_updated_at ?? ""}`,
                          }}
                          style={styles.avatarImage}
                        />
                      ) : (
                        <Text style={styles.avatarInitial}>
                          {displayName.charAt(0).toUpperCase()}
                        </Text>
                      )}
                    </View>
                    <View style={[styles.avatarBadge, { backgroundColor: colors.card, borderColor: colors.border }]}>
                      <Ionicons name="camera" size={14} color="#007AFF" />
                    </View>
                  </TouchableOpacity>
                  <View style={styles.accountNameBlock}>
                    <Text style={[styles.accountName, { color: colors.textPrimary }]}>
                      {displayName || "ผู้ใช้"}
                    </Text>
                    <Text style={[styles.accountSub, { color: colors.sectionLabel }]}>
                      {avatarUploading ? "กำลังอัปโหลด..." : (session.user?.user_metadata?.username ?? session.user?.email?.split("@")[0] ?? "ล็อกอินแล้ว")}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={openEditNameModal}
                  style={styles.accountRowRightIcon}
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
                label="อัปโหลดปักหมุดขึ้นบัญชี"
                subtitle={syncLoading ? "กำลังอัปโหลด..." : backupSyncSubtitle}
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
                label="ดาวน์โหลดปักหมุดลงเครื่อง"
                subtitle="เก็บสำเนารายการในบัญชีไว้ในเครื่อง"
                onPress={async () => {
                  try {
                    await copyCacheToLocalOnLogout();
                    Alert.alert("บันทึกแล้ว", "ดาวน์โหลดปักหมุดลงเครื่องแล้ว");
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
              icon="book-outline"
              label="คู่มือการใช้งาน"
              onPress={() => setShowUserGuideModal(true)}
              isDark={isDark}
            />
            <View
              style={[
                styles.cardDivider,
                { backgroundColor: isDark ? "#374151" : "#E5E7EB" },
              ]}
            />
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
                  "แอป Pinnit นี้จัดทำเป็นกรณีศึกษาภายในวิชาเรียน ไม่ได้ปล่อยให้บริการในระดับสาธารณะ\n\n" +
                  "• ข้อมูลที่เก็บ: ตำแหน่งปักหมุด ชื่อบัญชี รูปโปรไฟล์ เก็บในอุปกรณ์และบน Supabase เมื่อล็อกอิน ใช้เพื่อการเรียนและทดสอบฟีเจอร์เท่านั้น\n\n" +
                  "• การใช้ข้อมูล: ไม่มีการนำข้อมูลไปใช้เชิงพาณิชย์หรือแชร์ให้บุคคลที่สาม\n\n" +
                  "• ความปลอดภัย: การเชื่อมต่อใช้ HTTPS บัญชีอยู่ภายใต้ Supabase Auth การตั้งค่า (โหมดมืด, สไตล์แผนที่) เก็บเฉพาะในอุปกรณ์"
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
                  "แอป Pinnit เป็นโปรเจกต์กรณีศึกษาสำหรับวิชาเรียน (React Native / Expo) ไม่ได้ให้บริการสำหรับผู้ใช้ทั่วไป\n\n" +
                  "• วัตถุประสงค์: ใช้เพื่อการเรียนรู้และสาธิตการพัฒนาแอปมือถือ เทคโนโลยีที่ใช้ (แผนที่, Auth, Storage, ซิงค์ข้อมูล) เป็นไปเพื่อการศึกษาทางเทคนิค\n\n" +
                  "• การใช้งาน: ใช้แอปในบริบทของห้องเรียนหรือการทดสอบเท่านั้น บริการซิงค์และเซิร์ฟเวอร์อาจไม่มีการรับประกันความต่อเนื่อง\n\n" +
                  "• ข้อจำกัด: แอปไม่ใช่ผลิตภัณฑ์เชิงพาณิชย์ เงื่อนไขนี้อาจมีการปรับปรุงตามบริบทของรายวิชา"
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

      {/* Avatar action sheet */}
      <Modal
        visible={showAvatarActionSheet}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAvatarActionSheet(false)}
      >
        <TouchableOpacity
          style={styles.actionSheetOverlay}
          activeOpacity={1}
          onPress={() => setShowAvatarActionSheet(false)}
        >
          <TouchableOpacity
            style={[styles.actionSheetContainer, { backgroundColor: colors.card }]}
            activeOpacity={1}
            onPress={() => {}}
          >
            <View style={[styles.actionSheetHandle, { backgroundColor: colors.sectionLabel }]} />
            <Text style={[styles.actionSheetTitle, { color: colors.sectionLabel }]}>
              รูปโปรไฟล์
            </Text>
            <TouchableOpacity
              style={styles.actionSheetOption}
              onPress={() => { setShowAvatarActionSheet(false); handleTakePhoto(); }}
            >
              <Ionicons name="camera-outline" size={22} color="#007AFF" />
              <Text style={[styles.actionSheetOptionText, { color: colors.textPrimary }]}>
                ถ่ายภาพ
              </Text>
              <Ionicons name="chevron-forward" size={18} color={colors.sectionLabel} />
            </TouchableOpacity>
            {avatarUrl ? (
              <TouchableOpacity
                style={styles.actionSheetOption}
                onPress={() => { setShowAvatarActionSheet(false); setShowAvatarViewer(true); }}
              >
                <Ionicons name="eye-outline" size={22} color="#007AFF" />
                <Text style={[styles.actionSheetOptionText, { color: colors.textPrimary }]}>
                  ดูรูปโปรไฟล์
                </Text>
                <Ionicons name="chevron-forward" size={18} color={colors.sectionLabel} />
              </TouchableOpacity>
            ) : null}
            {avatarUrl ? (
              <TouchableOpacity
                style={styles.actionSheetOption}
                onPress={() => handlePickFromLibrary()}
              >
                <Ionicons name="images-outline" size={22} color="#007AFF" />
                <Text style={[styles.actionSheetOptionText, { color: colors.textPrimary }]}>
                  เปลี่ยนรูปโปรไฟล์
                </Text>
                <Ionicons name="chevron-forward" size={18} color={colors.sectionLabel} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.actionSheetOption}
                onPress={() => handlePickFromLibrary()}
              >
                <Ionicons name="cloud-upload-outline" size={22} color="#007AFF" />
                <Text style={[styles.actionSheetOptionText, { color: colors.textPrimary }]}>
                  อัพโหลดรูปโปรไฟล์
                </Text>
                <Ionicons name="chevron-forward" size={18} color={colors.sectionLabel} />
              </TouchableOpacity>
            )}
            {avatarUrl ? (
              <TouchableOpacity
                style={styles.actionSheetOption}
                onPress={() => { setShowAvatarActionSheet(false); handleRemoveProfilePhoto(); }}
              >
                <Ionicons name="trash-outline" size={22} color="#DC2626" />
                <Text style={[styles.actionSheetOptionText, styles.actionSheetOptionDestructive]}>
                  ลบรูปโปรไฟล์
                </Text>
                <Ionicons name="chevron-forward" size={18} color={colors.sectionLabel} />
              </TouchableOpacity>
            ) : null}
            <View style={[styles.actionSheetDivider, { backgroundColor: colors.border }]} />
            <TouchableOpacity
              style={styles.actionSheetCancel}
              onPress={() => setShowAvatarActionSheet(false)}
            >
              <Text style={[styles.actionSheetCancelText, { color: colors.sectionLabel }]}>
                ยกเลิก
              </Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Avatar viewer modal */}
      <Modal
        visible={showAvatarViewer}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAvatarViewer(false)}
      >
        <TouchableOpacity
          style={styles.avatarViewerOverlay}
          activeOpacity={1}
          onPress={() => setShowAvatarViewer(false)}
        >
          <TouchableOpacity
            style={styles.avatarViewerContent}
            activeOpacity={1}
            onPress={() => {}}
          >
            {avatarUrl ? (
              <Image
                source={{
                  uri: avatarUrl.includes("?")
                    ? `${avatarUrl}&v=${session?.user?.user_metadata?.avatar_updated_at ?? ""}`
                    : `${avatarUrl}?v=${session?.user?.user_metadata?.avatar_updated_at ?? ""}`,
                }}
                style={styles.avatarViewerImage}
                resizeMode="contain"
              />
            ) : null}
            <TouchableOpacity
              style={[styles.avatarViewerClose, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => setShowAvatarViewer(false)}
            >
              <Text style={[styles.avatarViewerCloseText, { color: colors.textPrimary }]}>
                ปิด
              </Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Edit profile name modal */}
      <Modal
        visible={showEditNameModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowEditNameModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowEditNameModal(false)}
        >
          <TouchableOpacity
            style={[
              styles.editNameModalContent,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
            activeOpacity={1}
            onPress={() => {}}
          >
            <Text style={[styles.mapStyleModalTitle, { color: colors.textPrimary }]}>
              เปลี่ยนชื่อโปรไฟล์
            </Text>
            <TextInput
              style={[
                styles.editNameInput,
                { color: colors.textPrimary, borderColor: colors.border },
              ]}
              placeholder="ชื่อที่แสดง"
              placeholderTextColor={colors.sectionLabel}
              value={editNameValue}
              onChangeText={setEditNameValue}
              autoCapitalize="words"
              editable={!nameSaving}
            />
            <View style={styles.editNameButtons}>
              <TouchableOpacity
                style={[styles.editNameButton, styles.editNameButtonCancel, { borderColor: colors.border }]}
                onPress={() => setShowEditNameModal(false)}
                disabled={nameSaving}
              >
                <Text style={[styles.editNameButtonText, { color: colors.sectionLabel }]}>
                  ยกเลิก
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.editNameButton, styles.editNameButtonSave]}
                onPress={handleSaveDisplayName}
                disabled={nameSaving}
              >
                <Text style={styles.editNameButtonSaveText}>
                  {nameSaving ? "กำลังบันทึก..." : "บันทึก"}
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* User Guide Modal */}
      <Modal
        visible={showUserGuideModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowUserGuideModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowUserGuideModal(false)}
        >
          <TouchableOpacity
            style={[
              styles.userGuideModalContent,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
              },
            ]}
            activeOpacity={1}
            onPress={() => {}}
          >
            <Text style={[styles.mapStyleModalTitle, { color: colors.textPrimary }]}>
              คู่มือการใช้งาน
            </Text>
            <ScrollView
              style={styles.userGuideScroll}
              showsVerticalScrollIndicator={true}
            >
              <Text style={[styles.userGuideText, { color: colors.sectionLabel }]}>
                คู่มือนี้แนะนำวิธีใช้งานแอปและฟีเจอร์ต่างๆ ของ Pinnit เพื่อให้คุณใช้แอปได้อย่างเต็มประสิทธิภาพ
              </Text>
              <Text style={[styles.userGuideSection, { color: colors.textPrimary }]}>
                ฟีเจอร์แท็บรายการ
              </Text>
              <Text style={[styles.userGuideText, { color: colors.sectionLabel }]}>
                • กดปุ่ม "ปักหมุดตำแหน่งปัจจุบัน" เพื่อเพิ่มตำแหน่งปัจจุบันลงรายการ
                {"\n"}• กดที่รายการเพื่อดูตำแหน่งบนแผนที่
                {"\n"}• กดค้างเพื่อแก้ไขชื่อหรือตำแหน่ง
                {"\n"}• ปัดซ้ายเพื่อลบรายการ
              </Text>
              <Text style={[styles.userGuideSection, { color: colors.textPrimary }]}>
                ฟีเจอร์แผนที่
              </Text>
              <Text style={[styles.userGuideText, { color: colors.sectionLabel }]}>
                • แสดง markers ของตำแหน่งที่บันทึกทั้งหมด
                {"\n"}• กดที่ตำแหน่งบนแผนที่เพื่อปักหมุดใหม่
                {"\n"}• เลือกสไตล์แผนที่ได้จากเมนูตั้งค่า
              </Text>
              <Text style={[styles.userGuideSection, { color: colors.textPrimary }]}>
                ฟีเจอร์บัญชีและซิงค์
              </Text>
              <Text style={[styles.userGuideText, { color: colors.sectionLabel }]}>
                • ล็อกอินเพื่อซิงค์ตำแหน่งกับบัญชี cloud
                {"\n"}• เมื่อออฟไลน์ ข้อมูลเก็บในเครื่อง และจะซิงค์เมื่อกลับมาออนไลน์
                {"\n"}• อัปโหลดปักหมุดขึ้นบัญชี: นำปักหมุดในเครื่องขึ้นบัญชี
                {"\n"}• ดาวน์โหลดปักหมุดลงเครื่อง: ดึงปักหมุดจากบัญชีลงเครื่อง
              </Text>
              <Text style={[styles.userGuideSection, { color: colors.textPrimary }]}>
                ฟีเจอร์โปรไฟล์
              </Text>
              <Text style={[styles.userGuideText, { color: colors.sectionLabel }]}>
                • กดที่วงกลมรูปโปรไฟล์ เพื่อเปิดเมนู: ถ่ายภาพ, ดูรูปโปรไฟล์, อัพโหลด/เปลี่ยนรูป, ลบรูปโปรไฟล์
                {"\n"}• กดไอคอนแก้ไข (ดินสอ) ทางขวาของการ์ดบัญชี เพื่อเปลี่ยนชื่อที่แสดง
              </Text>
              <Text style={[styles.userGuideSection, { color: colors.textPrimary }]}>
                ฟีเจอร์ตั้งค่า
              </Text>
              <Text style={[styles.userGuideText, { color: colors.sectionLabel }]}>
                • สไตล์แผนที่: มาตรฐาน / ดาวเทียม / ไฮบริด / ภูมิประเทศ
                {"\n"}• โหมดมืด: ปรับจอให้เหมาะกับเวลากลางคืน
              </Text>
            </ScrollView>
            <TouchableOpacity
              style={[styles.modalCloseButton, { borderColor: colors.border }]}
              onPress={() => setShowUserGuideModal(false)}
            >
              <Text style={[styles.modalCloseText, { color: colors.sectionLabel }]}>
                ปิด
              </Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

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
  accountRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  accountRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    flex: 1,
  },
  accountRowRightIcon: {
    marginLeft: 4,
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
  accountName: {
    fontSize: 17,
    fontWeight: "600",
  },
  accountSub: {
    fontSize: 13,
    marginTop: 2,
  },
  accountNameBlock: {
    flex: 1,
    justifyContent: "center",
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
  actionSheetOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    justifyContent: "flex-end",
  },
  actionSheetContainer: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 10,
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === "ios" ? 34 : 24,
  },
  actionSheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
    opacity: 0.5,
  },
  actionSheetTitle: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  actionSheetOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 4,
    gap: 12,
  },
  actionSheetOptionText: {
    flex: 1,
    fontSize: 16,
    fontWeight: "500",
  },
  actionSheetOptionDestructive: {
    color: "#DC2626",
  },
  actionSheetDivider: {
    height: 1,
    marginVertical: 8,
    opacity: 0.6,
  },
  actionSheetCancel: {
    paddingVertical: 14,
    alignItems: "center",
  },
  actionSheetCancelText: {
    fontSize: 16,
    fontWeight: "600",
  },
  avatarViewerOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.85)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  avatarViewerContent: {
    width: "100%",
    maxWidth: 360,
    alignItems: "center",
  },
  avatarViewerImage: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 16,
  },
  avatarViewerClose: {
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
  },
  avatarViewerCloseText: {
    fontSize: 16,
    fontWeight: "600",
  },
  mapStyleModalContent: {
    width: "100%",
    maxWidth: 340,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
  },
  userGuideModalContent: {
    width: "100%",
    maxWidth: 360,
    maxHeight: "80%",
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
  },
  editNameModalContent: {
    width: "100%",
    maxWidth: 340,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
  },
  editNameInput: {
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 16,
  },
  editNameButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 16,
  },
  editNameButton: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
  },
  editNameButtonCancel: {
    borderWidth: 1,
  },
  editNameButtonSave: {
    backgroundColor: "#007AFF",
  },
  editNameButtonText: {
    fontSize: 15,
    fontWeight: "500",
  },
  editNameButtonSaveText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  userGuideScroll: {
    maxHeight: 400,
    marginVertical: 12,
  },
  userGuideSection: {
    fontSize: 15,
    fontWeight: "600",
    marginTop: 12,
    marginBottom: 4,
  },
  userGuideText: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 4,
  },
  modalCloseButton: {
    alignSelf: "center",
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderWidth: 1,
    borderRadius: 10,
    marginTop: 8,
  },
  modalCloseText: {
    fontSize: 15,
    fontWeight: "500",
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

