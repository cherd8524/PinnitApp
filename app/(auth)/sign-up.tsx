import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useColorScheme } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { supabase, emailFromUsername } from "@/lib/supabase";

const MIN_PASSWORD_LENGTH = 6;
const USERNAME_MIN_LENGTH = 3;
const USERNAME_MAX_LENGTH = 24;
/** ชื่อผู้ใช้ใช้ได้เฉพาะ a-z, A-Z, 0-9 และ _ */
const USERNAME_REGEX = /^[a-zA-Z0-9_]+$/;

function validateUsername(value: string): { valid: true } | { valid: false; message: string } {
  const u = value.trim();
  if (u.length < USERNAME_MIN_LENGTH) {
    return { valid: false, message: `ชื่อผู้ใช้ต้องมีอย่างน้อย ${USERNAME_MIN_LENGTH} ตัวอักษร` };
  }
  if (u.length > USERNAME_MAX_LENGTH) {
    return { valid: false, message: `ชื่อผู้ใช้ต้องไม่เกิน ${USERNAME_MAX_LENGTH} ตัวอักษร` };
  }
  if (!USERNAME_REGEX.test(u)) {
    return {
      valid: false,
      message: "ชื่อผู้ใช้ใช้ได้เฉพาะตัวอักษรอังกฤษ ตัวเลข และขีดล่าง (_)",
    };
  }
  return { valid: true };
}

export default function SignUpScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const getSignUpErrorMessage = (err: unknown): string => {
    const raw = err instanceof Error ? err.message : String(err ?? "");
    const lower = raw.toLowerCase();
    if (lower.includes("already registered") || lower.includes("user already exists")) {
      return "ชื่อผู้ใช้นี้มีคนใช้แล้ว กรุณาเลือกชื่ออื่น";
    }
    if (lower.includes("network") || lower.includes("fetch")) {
      return "เชื่อมต่อไม่ได้ กรุณาตรวจสอบอินเทอร์เน็ต";
    }
    if (raw.trim()) return raw;
    return "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง";
  };

  const colors = {
    background: isDark ? "#020617" : "#F8FAFC",
    card: isDark ? "#1F2937" : "#FFFFFF",
    border: isDark ? "#374151" : "#E5E7EB",
    text: isDark ? "#F9FAFB" : "#020617",
    textSecondary: isDark ? "#9CA3AF" : "#6B7280",
    errorBg: isDark ? "#450A0A" : "#FEF2F2",
    errorBorder: isDark ? "#7F1D1D" : "#FECACA",
    errorText: "#DC2626",
  };

  const handleSignUp = async () => {
    const name = displayName.trim();
    const u = username.trim();
    const p = password;
    const cp = confirmPassword;
    setErrorMessage(null);
    if (!name || !u || !p || !cp) {
      const msg = "กรุณากรอกข้อมูลทุกช่องให้ครบ";
      setErrorMessage(msg);
      Alert.alert("กรุณากรอกข้อมูล", msg, [{ text: "ตกลง" }]);
      return;
    }
    const usernameCheck = validateUsername(u);
    if (!usernameCheck.valid) {
      setErrorMessage(usernameCheck.message);
      Alert.alert("รูปแบบชื่อผู้ใช้ไม่ถูกต้อง", usernameCheck.message, [{ text: "ตกลง" }]);
      return;
    }
    if (p !== cp) {
      const msg = "รหัสผ่านกับยืนยันรหัสผ่านไม่ตรงกัน";
      setErrorMessage(msg);
      Alert.alert("รหัสผ่านไม่ตรงกัน", msg, [{ text: "ตกลง" }]);
      return;
    }
    if (p.length < MIN_PASSWORD_LENGTH) {
      const msg = `รหัสผ่านต้องมีอย่างน้อย ${MIN_PASSWORD_LENGTH} ตัวอักษร`;
      setErrorMessage(msg);
      Alert.alert("รหัสผ่านสั้นเกินไป", msg, [{ text: "ตกลง" }]);
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: emailFromUsername(u),
        password: p,
        options: {
          data: { full_name: name, username: u },
        },
      });
      if (error) throw error;
      Alert.alert("สมัครสำเร็จ", "คุณสามารถล็อกอินได้เลย", [
        { text: "ตกลง", onPress: () => router.replace("/(auth)/login") },
      ]);
    } catch (err: unknown) {
      const msg = getSignUpErrorMessage(err);
      setErrorMessage(msg);
      Alert.alert("สมัครไม่สำเร็จ", msg, [{ text: "ตกลง" }]);
    } finally {
      setLoading(false);
    }
  };

  const clearError = () => setErrorMessage(null);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.kav}
      >
        <TouchableOpacity
          style={styles.back}
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={[styles.title, { color: colors.text }]}>สมัครสมาชิก</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            กรอกข้อมูลด้านล่างเพื่อสร้างบัญชี
          </Text>
          {errorMessage ? (
            <View style={[styles.errorBanner, { backgroundColor: colors.errorBg, borderColor: colors.errorBorder }]}>
              <Ionicons name="alert-circle-outline" size={18} color={colors.errorText} />
              <Text style={[styles.errorText, { color: colors.errorText }]}>{errorMessage}</Text>
            </View>
          ) : null}
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
            placeholder="ชื่อที่แสดง"
            placeholderTextColor={colors.textSecondary}
            value={displayName}
            onChangeText={(t) => { setDisplayName(t); clearError(); }}
          />
          <View style={styles.usernameFieldWrap}>
            <TextInput
              style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
              placeholder="ชื่อผู้ใช้ (สำหรับล็อกอิน)"
              placeholderTextColor={colors.textSecondary}
              value={username}
              onChangeText={(t) => { setUsername(t); clearError(); }}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Text style={[styles.fieldHint, { color: colors.textSecondary }]}>
              ใช้ได้เฉพาะตัวอักษรอังกฤษ ตัวเลข และ _ (3–24 ตัว)
            </Text>
          </View>
          <View style={styles.passwordWrap}>
            <TextInput
              style={[styles.input, styles.inputWithIcon, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
              placeholder="รหัสผ่าน (อย่างน้อย 6 ตัว)"
              placeholderTextColor={colors.textSecondary}
              value={password}
              onChangeText={(t) => { setPassword(t); clearError(); }}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() => setShowPassword((v) => !v)}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons
                name={showPassword ? "eye-off-outline" : "eye-outline"}
                size={22}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          </View>
          <View style={styles.passwordWrap}>
            <TextInput
              style={[styles.input, styles.inputWithIcon, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
              placeholder="ยืนยันรหัสผ่าน"
              placeholderTextColor={colors.textSecondary}
              value={confirmPassword}
              onChangeText={(t) => { setConfirmPassword(t); clearError(); }}
              secureTextEntry={!showConfirmPassword}
            />
            <TouchableOpacity
              style={styles.eyeButton}
              onPress={() => setShowConfirmPassword((v) => !v)}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons
                name={showConfirmPassword ? "eye-off-outline" : "eye-outline"}
                size={22}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSignUp}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>สมัครสมาชิก</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  kav: { flex: 1 },
  back: { padding: 16 },
  content: { paddingHorizontal: 24, paddingTop: 8, paddingBottom: 40 },
  title: { fontSize: 28, fontWeight: "700", marginBottom: 8 },
  subtitle: { fontSize: 16, marginBottom: 24 },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    marginBottom: 16,
    borderWidth: 1,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
  },
  usernameFieldWrap: {
    marginBottom: 16,
  },
  fieldHint: {
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    marginBottom: 16,
  },
  passwordWrap: {
    position: "relative",
    marginBottom: 16,
  },
  inputWithIcon: {
    marginBottom: 0,
    paddingRight: 48,
  },
  eyeButton: {
    position: "absolute",
    right: 12,
    top: 0,
    bottom: 0,
    justifyContent: "center",
  },
  button: {
    backgroundColor: "#007AFF",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: "#fff", fontSize: 17, fontWeight: "600" },
});
