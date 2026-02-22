import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, Session } from "@supabase/supabase-js";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@env";

const supabaseUrl = SUPABASE_URL;
const supabaseAnonKey = SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_ANON_KEY in .env");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

/** Use this instead of supabase.auth.getSession() so invalid/expired refresh tokens are cleared and the app treats the user as signed out instead of throwing. */
export async function getSessionSafe(): Promise<{ data: { session: Session | null }; error: unknown }> {
  try {
    const result = await supabase.auth.getSession();
    return { data: { session: result.data.session }, error: result.error };
  } catch (err: unknown) {
    const msg = err && typeof err === "object" && "message" in err ? String((err as { message?: unknown }).message) : "";
    if (msg.includes("Refresh Token") && (msg.includes("Not Found") || msg.includes("invalid") || msg.includes("expired"))) {
      await supabase.auth.signOut();
      return { data: { session: null }, error: err };
    }
    throw err;
  }
}

export const AUTH_EMAIL_DOMAIN = "pinnit.local";

export function emailFromUsername(username: string): string {
  return `${username.toLowerCase().trim()}@${AUTH_EMAIL_DOMAIN}`;
}
