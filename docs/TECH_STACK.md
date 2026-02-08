# Tech Stack – PinnitApp

เอกสารอธิบายเทคโนโลยีที่ใช้ในแอป Pinnit พร้อมหน้าที่และเหตุผลในการเลือกใช้

---

## 1. ระบบ Navigation

| เทคโนโลยี | หน้าที่ | เหตุผล |
|-----------|---------|--------|
| **expo-router** | File-based routing สำหรับจัดการเส้นทางหน้าในแอป | ใช้โครงสร้างโฟลเดอร์กำหนดเส้นทาง ทำให้เขียน route ได้ง่ายและชัดเจน |
| **@react-navigation/native** | เป็นฐานให้ expo-router | expo-router ทำงานร่วมกับ React Navigation |
| **@react-navigation/bottom-tabs** | แท็บล่าง (หน้าแรก, แผนที่, ตั้งค่า) | สร้าง tab bar ให้สลับหน้าหลักได้สะดวก |
| **@react-navigation/elements** | ส่วนประกอบ UI สำหรับ navigation | ใช้ร่วมกับ React Navigation |
| **Stack** (`app/_layout.tsx`) | Layout หลักแบบ stack | จัดการโครงสร้าง root layout และซ่อน header |
| **Tabs** (`app/(tabs)/_layout.tsx`) | แท็บ 3 หน้า | จัดการแท็บ หน้าแรก / แผนที่ / ตั้ง1ค่า |

**โครงสร้างเส้นทางหลัก:**
- `app/index.tsx` → Redirect ไป `/(tabs)`
- `app/(tabs)/index.tsx` → หน้าแรก (รายการ pins)
- `app/(tabs)/map.tsx` → หน้าแผนที่
- `app/(tabs)/settings.tsx` → หน้าตั้งค่า
- `app/(auth)/login.tsx`, `sign-up.tsx` → หน้าเข้าสู่ระบบและสมัครสมาชิก

---

## 2. หน้า Home (หน้าแรกของแอป)

| เทคโนโลยี | หน้าที่ | เหตุผล |
|-----------|---------|--------|
| **app/(tabs)/index.tsx** | หน้าหลักแสดงรายการ pins | เป็นจุดเริ่มต้นหลักของแอป |
| **useFocusEffect** (expo-router) | โหลด pins ใหม่ทุกครั้งที่กลับมาหน้าแรก | ให้ข้อมูล pins เป็นปัจจุบันเสมอหลังเพิ่ม/ลบ/แก้ไข |
| **Modal** | แสดงหน้าต่างเพิ่ม/แก้ไข pin | ใช้ Modal เปิดหน้าจอย่อยสำหรับกรอกข้อมูล |
| **PinItem** (components) | แสดงแต่ละ pin ในรายการ | แยก component เพื่อซับ swipe-to-delete และ actions |

**หน้าที่หลักของหน้าแรก:**
- แสดงรายการ pins ด้วย FlatList
- กด + เพื่อเพิ่ม pin จากตำแหน่งปัจจุบัน
- กดที่ pin เพื่อเปิดแผนที่
- กดค้างเพื่อแก้ไขชื่อ
- ปัดซ้ายเพื่อลบ

---

## 3. FlatList

| เทคโนโลยี | หน้าที่ | เหตุผล |
|-----------|---------|--------|
| **FlatList** (react-native) | แสดงรายการ pins แบบเลื่อนได้ | รองรับรายการยาวโดยใช้ virtualization (render เฉพาะรายการที่มองเห็น) ช่วยประหยัดหน่วยความจำ |
| **renderItem** | แสดงแต่ละ pin ด้วย PinItem | แยก logic การแสดงออกจาก FlatList |
| **keyExtractor** | ใช้ id ของ pin เป็น key | ลด re-render และช่วย React จัดการรายการได้ดีขึ้น |

**ไฟล์ที่ใช้:** `app/(tabs)/index.tsx`

---

## 4. fetch

| เทคโนโลยี | หน้าที่ | เหตุผล |
|-----------|---------|--------|
| **fetch** (Web API) | โทร HTTP API สำหรับ reverse geocoding | ใช้ API แปลงพิกัด lat/lon เป็นชื่อสถานที่ |
| **utils/geocoding.ts** | ฟังก์ชัน `getLocationName(lat, lon)` | รวม logic การเรียก geocoding API และจัดการข้อผิดพลาดไว้ที่เดียว |

**การใช้งาน:**
- หน้า index / map ใช้ `getLocationName` เมื่อเพิ่ม pin จากตำแหน่งปัจจุบัน เพื่อให้ได้ชื่อสถานที่จากพิกัด
- ใช้ `GEOCODE_API_URL` และ `GEOCODE_API_KEY` จาก `.env`

**หมายเหตุ:** Supabase Client ใช้ fetch ภายในสำหรับ Auth และ Database API โดยตรง ไม่ต้องเรียกเองในแอป

---

## 5. AsyncStorage

| เทคโนโลยี | หน้าที่ | เหตุผล |
|-----------|---------|--------|
| **@react-native-async-storage/async-storage** | เก็บข้อมูลแบบ key-value บนอุปกรณ์ | ใช้เก็บข้อมูลถาวรที่ไม่ต้องมีเซิร์ฟเวอร์เฉพาะ |
| **utils/storage.ts** | โหลด/บันทึก map style | เก็บค่าสไตล์แผนที่ (standard/satellite/hybrid/terrain) |
| **utils/pinsSync.ts** | เก็บ pins, cache, pending sync | รองรับการทำงานแบบ offline และซิงค์กับ Supabase |
| **lib/supabase.ts** | auth persistence | Supabase ใช้ AsyncStorage เป็น session storage |

**Keys ที่ใช้:**
- `@pinnit_dark_mode` – โหมดมืด
- `@pinnit_map_style` – สไตล์แผนที่
- `@pinnit_saved_pins` (STORAGE_KEY) – pins ของผู้ที่ยังไม่ล็อกอิน หรือ cache
- `@pinnit_pins_cache` – cache pins จาก Supabase
- `@pinnit_pending_sync` – pins ที่รอซิงค์
- `@pinnit_last_sync_at` – เวลาซิงค์ล่าสุด

---

## 6. GPS / Map

| เทคโนโลยี | หน้าที่ | เหตุผล |
|-----------|---------|--------|
| **expo-location** | ดึงตำแหน่ง GPS ปัจจุบัน | ให้ API ขอสิทธิ์และอ่านตำแหน่ง |
| **requestForegroundPermissionsAsync** | ขอสิทธิ์ใช้งานตำแหน่ง | ใช้ก่อนอ่านตำแหน่ง |
| **getCurrentPositionAsync** | ดึงตำแหน่งปัจจุบันครั้งเดียว | ใช้เมื่อต้องการตำแหน่งตอนนั้นทันที |
| **watchPositionAsync** | ติดตามตำแหน่งแบบต่อเนื่อง | อัปเดตตำแหน่งเมื่อผู้ใช้เคลื่อนที่ |
| **react-native-maps** | แสดงแผนที่และ markers | ใช้ MapView, Marker, Region ของ React Native Maps |
| **MapView** | แผนที่หลัก | แสดงแผนที่พร้อม markers ของ pins |
| **Marker** | จุดบนแผนที่ | แสดงตำแหน่ง pin และตำแหน่งที่เลือก |
| **Region** | พื้นที่ที่แผนที่แสดง | ใช้ animate เพื่อเลื่อน/ซูมแผนที่ |

**ไฟล์ที่ใช้:**
- `app/(tabs)/index.tsx` – ดึงตำแหน่งปัจจุบันเพื่อเพิ่ม pin
- `app/(tabs)/map.tsx` – แผนที่เต็มหน้าจอ, ปักหมุด, ดูตำแหน่งปัจจุบัน

---

## 7. Supabase

| เทคโนโลยี | หน้าที่ | เหตุผล |
|-----------|---------|--------|
| **@supabase/supabase-js** | Client สำหรับ Supabase | เชื่อมต่อ Auth, Database และ Storage |
| **createClient** | สร้าง Supabase client | ใช้ URL และ Anon Key จาก `.env` |
| **Auth** | ล็อกอิน, สมัครสมาชิก, บันทึก session | รองรับ username+password (email ปลอม `@pinnit.local`) |
| **Database** | ตาราง `pins` | เก็บ id, user_id, name, latitude, longitude, timestamp |
| **RLS (Row Level Security)** | ควบคุมสิทธิ์แถว | ให้ผู้ใช้เห็น/แก้ไขได้เฉพาะ pins ของตัวเอง |
| **emailFromUsername** | แปลง username เป็น email | ใช้รูปแบบ `username@pinnit.local` สำหรับ Auth |

**การทำงาน:**
- **ไม่ล็อกอิน:** ใช้ AsyncStorage อย่างเดียว (STORAGE_KEY)
- **ล็อกอิน:** โหลดจาก Supabase + รวมกับ pins ในเครื่อง แล้ว cache ลง AsyncStorage
- **ออฟไลน์:** ใช้ cache และ pending sync แล้วซิงค์เมื่อกลับมาออนไลน์

**ไฟล์ที่เกี่ยวข้อง:**
- `lib/supabase.ts` – สร้าง client และฟังก์ชันช่วย
- `utils/pinsSync.ts` – โหลด/บันทึก/ซิงค์ pins
- `app/(auth)/login.tsx`, `sign-up.tsx` – หน้าเข้าสู่ระบบและสมัครสมาชิก

---

## 8. เครือข่าย (Network)

| เทคโนโลยี | หน้าที่ | เหตุผล |
|-----------|---------|--------|
| **@react-native-community/netinfo** | ตรวจสอบสถานะเครือข่าย | รองรับการทำงานแบบ online/offline |
| **useNetworkStatus** (utils/network.ts) | Custom hook คืนค่า online/offline | ใช้ตัดสินใจว่าจะโหลด/ซิงค์จาก Supabase หรือใช้ cache |

**การใช้งาน:**
- หน้า index, map, settings ใช้ `isOnline` เพื่อเลือกระหว่าง Supabase กับ cache
- แสดงข้อความ "ออฟไลน์" เมื่อไม่มีเครือข่าย

---

## 9. เทคโนโลยีเสริมอื่นๆ

| เทคโนโลยี | หน้าที่ | เหตุผล |
|-----------|---------|--------|
| **react-native-dotenv** | โหลดตัวแปรจาก `.env` | จัดการ SUPABASE_URL, SUPABASE_ANON_KEY, GEOCODE_API_* ฯลฯ |
| **@expo/vector-icons** / **Ionicons** | ไอคอนในแอป | ให้ไอคอนที่สอดคล้องกับแพลตฟอร์ม |
| **react-native-safe-area-context** | SafeAreaView | ป้องกันเนื้อหาถูก notch หรือ gesture bar บัง |
| **expo-haptics** | การสั่น | ให้ feedback เมื่อกด (ถ้ามีการใช้งาน) |
| **react-native-gesture-handler** | จัดการ gesture | รองรับ swipe, pan ของ PinItem |
| **react-native-reanimated** | Animation | ใช้ใน swipe-to-delete และ animation อื่นๆ |
| **TypeScript** | ระบบชนิดข้อมูล | ช่วยป้องกันข้อผิดพลาดและทำให้โค้ดอ่านง่ายขึ้น |

---

## 10. สรุปโครงสร้างหลัก

```
PinnitApp
├── app/
│   ├── _layout.tsx         → Root Stack (โหลด dark mode)
│   ├── index.tsx           → Redirect → /(tabs)
│   ├── (tabs)/
│   │   ├── _layout.tsx     → Bottom Tabs
│   │   ├── index.tsx       → หน้าแรก (FlatList + pins)
│   │   ├── map.tsx         → แผนที่ (MapView + Location)
│   │   └── settings.tsx    → ตั้งค่า
│   └── (auth)/
│       ├── login.tsx
│       └── sign-up.tsx
├── lib/supabase.ts         → Supabase client
├── utils/
│   ├── geocoding.ts        → fetch reverse geocoding
│   ├── network.ts          → NetInfo (online/offline)
│   ├── pinsSync.ts         → Supabase + AsyncStorage
│   └── storage.ts          → AsyncStorage (map style, etc.)
├── components/
│   ├── PinItem.tsx         → รายการ pin (swipe-to-delete)
│   └── SettingsRow.tsx
└── types/pinnit.ts         → PinnitItem
```
