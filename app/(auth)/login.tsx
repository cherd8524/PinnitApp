import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
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

export default function LoginScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const getLoginErrorMessage = (err: unknown): string => {
    const raw = err instanceof Error ? err.message : String(err ?? "");
    const lower = raw.toLowerCase();
    if (lower.includes("invalid login credentials") || lower.includes("invalid_credentials")) {
      return "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง กรุณาลองใหม่";
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

  const handleLogin = async () => {
    const u = username.trim();
    const p = password;
    setErrorMessage(null);
    if (!u || !p) {
      setErrorMessage("กรุณากรอกชื่อผู้ใช้และรหัสผ่าน");
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: emailFromUsername(u),
        password: p,
      });
      if (error) throw error;
      router.replace("/(tabs)/settings");
    } catch (err: unknown) {
      const msg = getLoginErrorMessage(err);
      setErrorMessage(msg);
      Alert.alert("ล็อกอินไม่สำเร็จ", msg, [{ text: "ตกลง" }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.kav}
      >
        <TouchableOpacity
          style={styles.back}
          onPress={() => router.replace("/(tabs)/settings")}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.content}>
          <Text style={[styles.title, { color: colors.text }]}>ล็อกอิน</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            กรอกชื่อผู้ใช้และรหัสผ่าน
          </Text>
          {errorMessage ? (
            <View style={[styles.errorBanner, { backgroundColor: colors.errorBg, borderColor: colors.errorBorder }]}>
              <Ionicons name="alert-circle-outline" size={18} color={colors.errorText} />
              <Text style={[styles.errorText, { color: colors.errorText }]}>{errorMessage}</Text>
            </View>
          ) : null}
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
            placeholder="ชื่อผู้ใช้"
            placeholderTextColor={colors.textSecondary}
            value={username}
            onChangeText={(t) => { setUsername(t); setErrorMessage(null); }}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <View style={styles.passwordWrap}>
            <TextInput
              style={[styles.input, styles.inputWithIcon, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
              placeholder="รหัสผ่าน"
              placeholderTextColor={colors.textSecondary}
              value={password}
            onChangeText={(t) => { setPassword(t); setErrorMessage(null); }}
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
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>ล็อกอิน</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.link}
            onPress={() => router.push("/(auth)/sign-up")}
          >
            <Text style={[styles.linkText, { color: colors.textSecondary }]}>
              ยังไม่มีบัญชี? สมัครสมาชิก
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  kav: { flex: 1 },
  back: { padding: 16 },
  content: { flex: 1, paddingHorizontal: 24, paddingTop: 8 },
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
  link: { marginTop: 24, alignItems: "center" },
  linkText: { fontSize: 15 },
});
