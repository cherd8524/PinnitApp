import AsyncStorage from "@react-native-async-storage/async-storage";
import { PinnitItem } from "@/types/pinnit";
import { STORAGE_KEY } from "@env";
import { supabase } from "@/lib/supabase";

const PINS_CACHE_KEY = "@pinnit_pins_cache";
const PENDING_SYNC_KEY = "@pinnit_pending_sync";
const LAST_SYNC_KEY = "@pinnit_last_sync_at";

export { LAST_SYNC_KEY };

function sortPins(pins: PinnitItem[]): PinnitItem[] {
  return [...pins].sort((a, b) => b.timestamp - a.timestamp);
}

function mergeAndDedupePins(supabasePins: PinnitItem[], localPins: PinnitItem[]): PinnitItem[] {
  const seen = new Set<string>();
  const result: PinnitItem[] = [];
  for (const p of [...supabasePins, ...localPins]) {
    const key = `${p.latitude}-${p.longitude}-${p.timestamp}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(p);
  }
  return sortPins(result);
}

/**
 * Load pins:
 * - ไม่ล็อกอิน: โหลดจาก storage เท่านั้น (ข้อมูลไม่มีเจ้าของ)
 * - ล็อกอิน: โหลดจาก database เท่านั้น (หรือ cache เมื่อออฟไลน์) — ไม่รวมกับ storage
 * Storage กับ database แยกกัน ไม่ merge เว้นแต่ user กดโอนข้อมูลเอง
 */
export async function loadPins(
  isOnline: boolean
): Promise<PinnitItem[]> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      const pins = (JSON.parse(raw) as PinnitItem[]).map((p) => ({
        ...p,
        ownerLabel: p.ownerLabel ?? "เครื่องนี้",
      }));
      return sortPins(pins);
    }
    return [];
  }

  const ownerName =
    session.user.user_metadata?.full_name ||
    session.user.user_metadata?.username ||
    "บัญชีของฉัน";

  if (isOnline) {
    try {
      const { data, error } = await supabase
        .from("pins")
        .select("id, name, latitude, longitude, created_at, timestamp")
        .eq("user_id", session.user.id)
        .order("timestamp", { ascending: false });
      if (error) throw error;
      const pins: PinnitItem[] = (data ?? []).map((row) => ({
        id: row.id,
        name: row.name,
        latitude: row.latitude,
        longitude: row.longitude,
        createdAt: row.created_at
          ? new Date(row.created_at).toISOString()
          : new Date(row.timestamp).toISOString(),
        timestamp: Number(row.timestamp),
        ownerLabel: ownerName,
      }));
      await AsyncStorage.setItem(PINS_CACHE_KEY, JSON.stringify(pins));
      await AsyncStorage.setItem(LAST_SYNC_KEY, Date.now().toString());
      return pins;
    } catch (e) {
      console.warn("loadPins from Supabase failed, using cache", e);
    }
  }

  const cache = await AsyncStorage.getItem(PINS_CACHE_KEY);
  const pins: PinnitItem[] = cache ? JSON.parse(cache) : [];
  return pins.map((p) => ({
    ...p,
    ownerLabel: p.ownerLabel ?? ownerName,
  }));
}

/** Save pins: ล็อกอิน → ติดต่อ database (Supabase); ไม่ล็อกอิน → เก็บเฉพาะ storage (AsyncStorage) */
export async function savePins(
  pins: PinnitItem[],
  isOnline: boolean
): Promise<void> {
  const sorted = sortPins(pins);
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(sorted));
    return;
  }
  await AsyncStorage.setItem(PINS_CACHE_KEY, JSON.stringify(sorted));
  if (isOnline) {
    try {
      await supabase.from("pins").delete().eq("user_id", session.user.id);
      if (sorted.length > 0) {
        const rows = sorted.map((p) => ({
          user_id: session.user.id,
          name: p.name,
          latitude: p.latitude,
          longitude: p.longitude,
          timestamp: p.timestamp,
        }));
        await supabase.from("pins").insert(rows);
      }
      await AsyncStorage.setItem(LAST_SYNC_KEY, Date.now().toString());
      await AsyncStorage.removeItem(PENDING_SYNC_KEY);
    } catch (e) {
      console.warn("savePins to Supabase failed, marking pending", e);
      await AsyncStorage.setItem(PENDING_SYNC_KEY, "1");
    }
  } else {
    await AsyncStorage.setItem(PENDING_SYNC_KEY, "1");
  }
}

/** Run pending sync: upload cache to Supabase. Call when back online. */
export async function runPendingSync(): Promise<boolean> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return false;
  const pending = await AsyncStorage.getItem(PENDING_SYNC_KEY);
  if (!pending) return false;
  const cache = await AsyncStorage.getItem(PINS_CACHE_KEY);
  const pins: PinnitItem[] = cache ? JSON.parse(cache) : [];
  try {
    await supabase.from("pins").delete().eq("user_id", session.user.id);
    if (pins.length > 0) {
      const rows = pins.map((p) => ({
        user_id: session.user.id,
        name: p.name,
        latitude: p.latitude,
        longitude: p.longitude,
        timestamp: p.timestamp,
      }));
      await supabase.from("pins").insert(rows);
    }
    await AsyncStorage.setItem(LAST_SYNC_KEY, Date.now().toString());
    await AsyncStorage.removeItem(PENDING_SYNC_KEY);
    return true;
  } catch (e) {
    console.warn("runPendingSync failed", e);
    return false;
  }
}

export async function getLastSyncAt(): Promise<number | null> {
  const s = await AsyncStorage.getItem(LAST_SYNC_KEY);
  return s ? parseInt(s, 10) : null;
}

/** โอนข้อมูลจาก database ใส่ storage: copy รายการของ user (จาก cache/DB) ลง STORAGE_KEY — เรียกเมื่อ user กด "เก็บสำเนารายการลงเครื่อง" */
export async function copyCacheToLocalOnLogout(): Promise<void> {
  const cache = await AsyncStorage.getItem(PINS_CACHE_KEY);
  if (cache) {
    await AsyncStorage.setItem(STORAGE_KEY, cache);
  }
}

/** จำนวน pins ใน storage (ข้อมูลไม่มีเจ้าของ) — ใช้เมื่อล็อกอินแล้ว เพื่อแจ้งว่ามีรายการใน storage ที่จะ "นำขึ้นบัญชี" ได้ */
export async function getLocalOnlyPinsCount(): Promise<number> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return 0;
  try {
    const pins = JSON.parse(raw) as PinnitItem[];
    return Array.isArray(pins) ? pins.length : 0;
  } catch {
    return 0;
  }
}

/** นำข้อมูลใน storage (ไม่มีเจ้าของ) ขึ้น database (เป็นของ user) — เรียกเมื่อ user กด "นำขึ้นบัญชี" และยืนยัน */
export async function mergeLocalPinsToSupabase(): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return;
  const localRaw = await AsyncStorage.getItem(STORAGE_KEY);
  const localPins: PinnitItem[] = localRaw ? JSON.parse(localRaw) : [];
  if (localPins.length === 0) return;
  const { data } = await supabase
    .from("pins")
    .select("id, name, latitude, longitude, created_at, timestamp")
    .eq("user_id", session.user.id);
  const existing: PinnitItem[] = (data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    latitude: row.latitude,
    longitude: row.longitude,
    createdAt: row.created_at ? new Date(row.created_at).toISOString() : "",
    timestamp: Number(row.timestamp),
  }));
  const merged = sortPins([...existing, ...localPins]);
  const rows = merged.map((p) => ({
    user_id: session.user.id,
    name: p.name,
    latitude: p.latitude,
    longitude: p.longitude,
    timestamp: p.timestamp,
  }));
  await supabase.from("pins").delete().eq("user_id", session.user.id);
  if (rows.length > 0) {
    await supabase.from("pins").insert(rows);
  }
  await AsyncStorage.setItem(PINS_CACHE_KEY, JSON.stringify(merged));
  await AsyncStorage.setItem(LAST_SYNC_KEY, Date.now().toString());
  await AsyncStorage.removeItem(STORAGE_KEY);
  await AsyncStorage.removeItem(PENDING_SYNC_KEY);
}
