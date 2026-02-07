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

/** Load pins: from Supabase when online + session, else from cache/AsyncStorage */
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
  const getLocalCachePins = async (): Promise<PinnitItem[]> => {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    try {
      return JSON.parse(raw) as PinnitItem[];
    } catch {
      return [];
    }
  };

  if (isOnline) {
    try {
      const { data, error } = await supabase
        .from("pins")
        .select("id, name, latitude, longitude, created_at, timestamp")
        .eq("user_id", session.user.id)
        .order("timestamp", { ascending: false });
      if (error) throw error;
      const ownerName =
        session.user.user_metadata?.full_name ||
        session.user.user_metadata?.username ||
        "บัญชีของฉัน";
      const supabasePins: PinnitItem[] = (data ?? []).map((row) => ({
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
      const rawLocal = await getLocalCachePins();
      const localPins: PinnitItem[] = rawLocal.map((p) => ({
        ...p,
        ownerLabel: p.ownerLabel ?? "รายการในเครื่อง",
      }));
      const merged = mergeAndDedupePins(supabasePins, localPins);
      await AsyncStorage.setItem(PINS_CACHE_KEY, JSON.stringify(merged));
      await AsyncStorage.setItem(LAST_SYNC_KEY, Date.now().toString());
      return merged;
    } catch (e) {
      console.warn("loadPins from Supabase failed, using cache", e);
    }
  }
  const cache = await AsyncStorage.getItem(PINS_CACHE_KEY);
  const supabasePins: PinnitItem[] = cache ? JSON.parse(cache) : [];
  const rawLocal = await getLocalCachePins();
  const ownerName =
    session.user.user_metadata?.full_name ||
    session.user.user_metadata?.username ||
    "บัญชีของฉัน";
  const localPins: PinnitItem[] = rawLocal.map((p) => ({
    ...p,
    ownerLabel: p.ownerLabel ?? "รายการในเครื่อง",
  }));
  const supabaseWithOwner: PinnitItem[] = supabasePins.map((p) => ({
    ...p,
    ownerLabel: p.ownerLabel ?? ownerName,
  }));
  if (supabaseWithOwner.length > 0 || localPins.length > 0) {
    return mergeAndDedupePins(supabaseWithOwner, localPins);
  }
  return [];
}

/** Save pins: เมื่อ login + online จะ sync ขึ้น Supabase ทันที (pin อัตโนมัติ); ไม่มี session เก็บในเครื่อง; offline เก็บ pending */
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
      // Login + online → sync ขึ้น Supabase ทันที
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

/** เรียกเมื่อ user เลือก "บันทึกลงเครื่องแล้วออก" ตอน logout: copy pins จาก cache ลง STORAGE_KEY เพื่อให้หลังออกจากระบบรายการยังแสดงในเครื่อง (cache = ข้อมูลผู้ยังไม่ล็อกอิน, Supabase = ข้อมูลผู้ล็อกอิน) */
export async function copyCacheToLocalOnLogout(): Promise<void> {
  const cache = await AsyncStorage.getItem(PINS_CACHE_KEY);
  if (cache) {
    await AsyncStorage.setItem(STORAGE_KEY, cache);
  }
}

/** จำนวน pins ในเครื่องที่ยังไม่ได้ซิงค์ (ปักตอนยังไม่ล็อกอิน) — ใช้เมื่อมี session แล้วเพื่อแจ้ง user */
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

/** นำข้อมูลในเครื่อง (STORAGE_KEY) ขึ้น Supabase แล้วล้าง STORAGE_KEY — เรียกเมื่อ user กด sync และยืนยัน */
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
