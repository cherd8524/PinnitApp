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

/** สร้าง key สำหรับตัดซ้ำ: ปัดพิกัด 6 ตำแหน่ง เพื่อกันความต่างจาก float หลัง round-trip กับ DB */
function pinDedupeKey(p: PinnitItem): string {
  const lat = Math.round(p.latitude * 1e6) / 1e6;
  const lon = Math.round(p.longitude * 1e6) / 1e6;
  return `${lat}-${lon}-${p.timestamp}`;
}

/** รวม pins จาก DB กับ storage โดยตัดซ้ำ — ถ้ารายการเดียวกันมีทั้งสองที่ ให้แสดงแค่รายการเดียว (เลือกจาก DB ก่อน) */
function mergeAndDedupePins(supabasePins: PinnitItem[], localPins: PinnitItem[]): PinnitItem[] {
  const seen = new Set<string>();
  const result: PinnitItem[] = [];
  for (const p of [...supabasePins, ...localPins]) {
    const key = pinDedupeKey(p);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(p);
  }
  return sortPins(result);
}

/** โหลด pins จาก storage (ข้อมูลไม่มีเจ้าของ) */
async function getStoragePins(): Promise<PinnitItem[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    return (JSON.parse(raw) as PinnitItem[]).map((p) => ({
      ...p,
      ownerLabel: p.ownerLabel ?? "เครื่องนี้",
    }));
  } catch {
    return [];
  }
}

/**
 * Load pins: แสดงข้อมูลใน storage เสมอ (ทั้งล็อกอินและไม่ล็อกอิน)
 * - ไม่ล็อกอิน: โหลดจาก storage เท่านั้น
 * - ล็อกอิน: โหลดจาก database (หรือ cache) แล้วรวมกับ storage เพื่อแสดงทั้งคู่
 */
export async function loadPins(
  isOnline: boolean
): Promise<PinnitItem[]> {
  const { data: { session } } = await supabase.auth.getSession();
  const storagePins = await getStoragePins();

  if (!session?.user) {
    return sortPins(storagePins);
  }

  const ownerName =
    session.user.user_metadata?.full_name ||
    session.user.user_metadata?.username ||
    "บัญชีของฉัน";

  let dbPins: PinnitItem[] = [];

  if (isOnline) {
    try {
      const { data, error } = await supabase
        .from("pins")
        .select("id, name, latitude, longitude, created_at, timestamp")
        .eq("user_id", session.user.id)
        .order("timestamp", { ascending: false });
      if (error) throw error;
      dbPins = (data ?? []).map((row) => ({
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
      await AsyncStorage.setItem(PINS_CACHE_KEY, JSON.stringify(dbPins));
      await AsyncStorage.setItem(LAST_SYNC_KEY, Date.now().toString());
    } catch (e) {
      console.warn("loadPins from Supabase failed, using cache", e);
      const cache = await AsyncStorage.getItem(PINS_CACHE_KEY);
      dbPins = cache ? JSON.parse(cache) : [];
    }
  } else {
    const cache = await AsyncStorage.getItem(PINS_CACHE_KEY);
    dbPins = cache ? JSON.parse(cache) : [];
  }

  const dbPinsWithOwner = dbPins.map((p) => ({
    ...p,
    ownerLabel: p.ownerLabel ?? ownerName,
  }));
  const storagePinsForMerge = storagePins.map((p) => ({
    ...p,
    ownerLabel: p.ownerLabel ?? "รายการในเครื่อง",
  }));
  return mergeAndDedupePins(dbPinsWithOwner, storagePinsForMerge);
}

const STORAGE_OWNER_LABELS = ["เครื่องนี้", "รายการในเครื่อง"];

/** ตรวจว่า pin นี้เป็นของ storage (ไม่มีเจ้าของ) */
function isStoragePin(p: PinnitItem): boolean {
  return !p.ownerLabel || STORAGE_OWNER_LABELS.includes(p.ownerLabel);
}

/** Save pins: ล็อกอิน → แยกบันทึก (ของ user ไป DB/cache, ของ storage ไป STORAGE_KEY); ไม่ล็อกอิน → เก็บเฉพาะ storage */
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
  const ownerName =
    session.user.user_metadata?.full_name ||
    session.user.user_metadata?.username ||
    "บัญชีของฉัน";
  const userPins = sorted.filter((p) => !isStoragePin(p));
  const storageFromList = sorted.filter((p) => isStoragePin(p));
  const userDedupeKeys = new Set(userPins.map(pinDedupeKey));
  const existingRaw = await AsyncStorage.getItem(STORAGE_KEY);
  const existingStorage: PinnitItem[] = existingRaw ? JSON.parse(existingRaw) : [];
  const existingOnly = (Array.isArray(existingStorage) ? existingStorage : []).filter(
    (p) => !userDedupeKeys.has(pinDedupeKey(p))
  );
  const storagePins = mergeAndDedupePins(storageFromList, existingOnly);

  await AsyncStorage.setItem(PINS_CACHE_KEY, JSON.stringify(userPins));
  const freshRaw = await AsyncStorage.getItem(STORAGE_KEY);
  const freshStorage: PinnitItem[] = freshRaw ? JSON.parse(freshRaw) : [];
  const freshOnly = (Array.isArray(freshStorage) ? freshStorage : []).filter(
    (p) => !userDedupeKeys.has(pinDedupeKey(p))
  );
  const finalStoragePins = mergeAndDedupePins(storagePins, freshOnly);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(finalStoragePins));

  if (isOnline) {
    try {
      await supabase.from("pins").delete().eq("user_id", session.user.id);
      if (userPins.length > 0) {
        const rows = userPins.map((p) => ({
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

/** โอนข้อมูลจาก database ใส่ storage: นำรายการของ user (จาก cache/DB) ไปเพิ่มใน STORAGE_KEY โดยไม่ทับของเดิม — เรียกเมื่อ user กด "เก็บสำเนารายการลงเครื่อง" */
export async function copyCacheToLocalOnLogout(): Promise<void> {
  const existingRaw = await AsyncStorage.getItem(STORAGE_KEY);
  const existingPins: PinnitItem[] = existingRaw ? JSON.parse(existingRaw) : [];
  const cacheRaw = await AsyncStorage.getItem(PINS_CACHE_KEY);
  if (!cacheRaw) return;
  const cachePins: PinnitItem[] = JSON.parse(cacheRaw);
  const merged = mergeAndDedupePins(cachePins, existingPins);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
}

/** จำนวน pins ใน storage ที่ยังไม่อยู่ในบัญชี — ล็อกอินแล้วนับเฉพาะรายการที่ยังไม่ได้ซิงค์ (ไม่นับสำเนาที่ copy ลง storage ตอน logout) */
export async function getLocalOnlyPinsCount(): Promise<number> {
  const storageRaw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!storageRaw) return 0;
  let storagePins: PinnitItem[];
  try {
    storagePins = JSON.parse(storageRaw) as PinnitItem[];
    if (!Array.isArray(storagePins)) return 0;
  } catch {
    return 0;
  }
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return storagePins.length;
  const cacheRaw = await AsyncStorage.getItem(PINS_CACHE_KEY);
  const userPins: PinnitItem[] = cacheRaw ? JSON.parse(cacheRaw) : [];
  const userKeys = new Set((Array.isArray(userPins) ? userPins : []).map(pinDedupeKey));
  return storagePins.filter((p) => !userKeys.has(pinDedupeKey(p))).length;
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
  const merged = mergeAndDedupePins(existing, localPins);
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
  await AsyncStorage.removeItem(PENDING_SYNC_KEY);
}
