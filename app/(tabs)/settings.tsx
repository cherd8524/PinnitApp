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
import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from "react-native";
import { useRouter } from "expo-router";
import { Session } from "@supabase/supabase-js";
import * as ImagePicker from "expo-image-picker";
import { SettingsRow } from "@/components/SettingsRow";
import {
  AccountCard,
  AvatarActionSheetModal,
  AvatarViewerModal,
  EditNameModal,
  MapStyleModal,
  UserGuideModal,
} from "@/components/settings";
import { ABOUT_APP, PRIVACY_POLICY, TERMS_OF_SERVICE } from "@/constants/about";
import { MAP_STYLE_LABELS } from "@/constants/settings";
import { getSessionSafe, supabase } from "@/lib/supabase";
import {
  loadDarkMode,
  loadMapStyle,
  saveDarkMode,
  saveMapStyle,
  type MapStyleType,
} from "@/utils/storage";
import {
  getLastSyncAt,
  getLocalOnlyPinsCount,
  mergeLocalPinsToSupabase,
  copyCacheToLocalOnLogout,
} from "@/utils/pinsSync";
import { useNetworkStatus } from "@/utils/network";
import { uploadProfileImage } from "@/utils/avatarUpload";

const IMAGE_PICKER_OPTIONS = {
  allowsEditing: true as const,
  aspect: [1, 1] as [number, number],
  quality: 0.8,
  base64: true,
} as const;

export default function SettingsScreen() {
  const router = useRouter();
  const systemColorScheme = useColorScheme();
  const isOnline = useNetworkStatus();

  // —— Modal visibility ——
  const [showMapStyleModal, setShowMapStyleModal] = useState(false);
  const [showUserGuideModal, setShowUserGuideModal] = useState(false);
  const [showEditNameModal, setShowEditNameModal] = useState(false);
  const [showAvatarActionSheet, setShowAvatarActionSheet] = useState(false);
  const [showAvatarViewer, setShowAvatarViewer] = useState(false);

  // —— Auth & session ——
  const [session, setSession] = useState<Session | null>(null);

  // —— Profile (avatar, display name) ——
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [editNameValue, setEditNameValue] = useState("");
  const [nameSaving, setNameSaving] = useState(false);

  // —— Sync ——
  const [lastSyncAt, setLastSyncAt] = useState<number | null>(null);
  const [syncLoading, setSyncLoading] = useState(false);

  // —— Appearance (dark mode, map style) ——
  const [darkMode, setDarkMode] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mapStyle, setMapStyle] = useState<MapStyleType>("standard");

  const avatarUrl = session?.user?.user_metadata?.avatar_url as string | undefined;
  const displayName =
    session?.user?.user_metadata?.full_name ??
    session?.user?.user_metadata?.username ??
    "ผู้ใช้";

  // —— Effects ——
  useEffect(() => {
    getSessionSafe().then(({ data: { session: s } }) => setSession(s));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: string, s: Session | null) => setSession(s));
    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
  };

  const handleLogoutPress = () => {
    Alert.alert("ออกจากระบบ", "ต้องการออกจากระบบหรือไม่?", [
      { text: "ยกเลิก", style: "cancel" },
      { text: "ออกจากระบบ", style: "destructive", onPress: handleLogout },
    ]);
  };

  // —— Profile: avatar ——
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
        ...IMAGE_PICKER_OPTIONS,
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
      ...IMAGE_PICKER_OPTIONS,
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

  // —— Profile: display name ——
  const openEditNameModal = () => {
    const current =
      session?.user?.user_metadata?.full_name ??
      session?.user?.user_metadata?.username ??
      "";
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

  useEffect(() => {
    getLastSyncAt().then(setLastSyncAt);
  }, [session]);

  // —— Sync ——
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

  const handleDownloadPinsToLocal = async () => {
    try {
      await copyCacheToLocalOnLogout();
      Alert.alert("บันทึกแล้ว", "ดาวน์โหลดปักหมุดลงเครื่องแล้ว");
    } catch (e) {
      console.error("Copy to local error", e);
      Alert.alert("บันทึกไม่สำเร็จ", "กรุณาลองอีกครั้ง");
    }
  };

  const backupSyncSubtitle =
    !session
      ? "ล็อกอินก่อนจึงจะนำรายการในเครื่องไปเก็บในบัญชีได้"
      : !isOnline
        ? "ไม่มีเน็ต — รายการที่ปักตอนเน็ตหลุดจะขึ้นบัญชีอัตโนมัติเมื่อกลับออนไลน์"
        : "นำรายการในเครื่องไปเก็บในบัญชี";

  // —— Appearance (dark mode, map style) ——
  useEffect(() => {
    (async () => {
      try {
        const saved = await loadDarkMode();
        if (saved !== null) {
          setDarkMode(saved);
          Appearance.setColorScheme(saved ? "dark" : "light");
        } else {
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

  // —— Appearance (handlers) ——
  const handleDarkModeToggle = async (value: boolean) => {
    try {
      setDarkMode(value);
      Appearance.setColorScheme(value ? "dark" : "light");
      await saveDarkMode(value);
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

  // —— About (info dialogs) ——
  const handleAboutPress = () => {
    Alert.alert(ABOUT_APP.title, ABOUT_APP.body);
  };

  const handlePrivacyPress = () => {
    Alert.alert(PRIVACY_POLICY.title, PRIVACY_POLICY.body);
  };

  const handleTermsPress = () => {
    Alert.alert(TERMS_OF_SERVICE.title, TERMS_OF_SERVICE.body);
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
            <AccountCard
              isLoggedIn={!!session}
              displayName={displayName}
              subtitle={
                session?.user?.user_metadata?.username ??
                session?.user?.email?.split("@")[0] ??
                "ล็อกอินแล้ว"
              }
              avatarUrl={avatarUrl}
              avatarVersion={session?.user?.user_metadata?.avatar_updated_at ?? ""}
              avatarUploading={avatarUploading}
              isDark={isDark}
              colors={colors}
              onLogin={() => router.navigate("/(auth)/login")}
              onAvatarPress={() => setShowAvatarActionSheet(true)}
              onEditName={openEditNameModal}
            />
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
                onPress={handleDownloadPinsToLocal}
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
              onPress={handleAboutPress}
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
              onPress={handlePrivacyPress}
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
              onPress={handleTermsPress}
              isDark={isDark}
            />
          </View>
        </View>

        {session ? (
          <View style={[styles.section, { marginTop: 32 }]}>
            <TouchableOpacity
              style={[styles.logoutButton, { borderColor: colors.border }]}
              onPress={handleLogoutPress}
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

      <AvatarActionSheetModal
        visible={showAvatarActionSheet}
        hasAvatar={!!avatarUrl}
        colors={colors}
        onTakePhoto={handleTakePhoto}
        onViewAvatar={() => setShowAvatarViewer(true)}
        onPickFromLibrary={() => {
          setShowAvatarActionSheet(false);
          handlePickFromLibrary();
        }}
        onRemovePhoto={handleRemoveProfilePhoto}
        onClose={() => setShowAvatarActionSheet(false)}
      />

      <AvatarViewerModal
        visible={showAvatarViewer}
        avatarUrl={avatarUrl}
        avatarVersion={session?.user?.user_metadata?.avatar_updated_at ?? ""}
        colors={colors}
        onClose={() => setShowAvatarViewer(false)}
      />

      <EditNameModal
        visible={showEditNameModal}
        value={editNameValue}
        colors={colors}
        saving={nameSaving}
        onChangeText={setEditNameValue}
        onSave={handleSaveDisplayName}
        onClose={() => setShowEditNameModal(false)}
      />

      <UserGuideModal
        visible={showUserGuideModal}
        colors={colors}
        onClose={() => setShowUserGuideModal(false)}
      />

      <MapStyleModal
        visible={showMapStyleModal}
        currentStyle={mapStyle}
        colors={colors}
        onSelect={handleSelectMapStyle}
        onClose={() => setShowMapStyleModal(false)}
      />
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

