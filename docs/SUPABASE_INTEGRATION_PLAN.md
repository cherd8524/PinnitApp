# แผนการนำ Supabase เข้ามาใช้ใน Pinnit

## 1. สรุปสถานะปัจจุบัน (หลังอัปเดตฟีเจอร์)

### 1.1 ข้อมูลที่เก็บใน AsyncStorage ปัจจุบัน

| Key | ที่ใช้ | ใช้ทำอะไร |
|-----|--------|-----------|
| `@pinnit_saved_pins` | `utils/storage.ts` | รายการ Saved Pins (โหลด/บันทึกจาก index, map) |
| `@pinnit_dark_mode` | `settings.tsx`, `_layout.tsx` | โหมดมืด (true/false) |
| `@pinnit_map_style` | `utils/storage.ts`, `settings.tsx`, `map.tsx` | สไตล์แผนที่ (standard / satellite / hybrid / terrain) |

### 1.2 โครงสร้าง PinnitItem (สำหรับ Saved Pins)

```ts
// types/pinnit.ts
{
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  createdAt: string;
  timestamp: number;
}
```

### 1.3 จุดที่เรียก loadPins / savePins

- **`app/(tabs)/index.tsx`**: โหลด pins ตอน mount + useFocusEffect, บันทึกตอนเพิ่ม/ลบ/แก้ไข pin
- **`app/(tabs)/map.tsx`**: โหลด pins ตอนโฟกัสและแสดง markers, บันทึกตอน pin จากแผนที่

### 1.4 การตั้งค่าที่เก็บใน AsyncStorage (คงไว้ทั้งหมด)

- Dark mode
- Map style

### 1.5 หน้า Settings — ส่วนสำรองข้อมูลและซิงค์

- ใน **`app/(tabs)/settings.tsx`** มีส่วน **"ข้อมูล"** (Data) ที่มีแถว **"สำรองข้อมูลและซิงค์"** (ไอคอน `cloud-done-outline`) อยู่แล้ว
- ตอนนี้กดแล้วแสดงแค่ **Alert** ข้อความ placeholder: *"สำรองข้อมูลตำแหน่งที่ปักหมุดไว้ในคลาวด์หรือซิงค์ข้ามอุปกรณ์"*
- **ยังไม่ได้เชื่อมกับ logic จริง** — หลังมี Supabase ต้องนำส่วนนี้ไปเชื่อมกับฟังก์ชัน sync/backup จริง

**สรุป:** ตอนนี้ยังไม่มี Login, Pins เก็บเฉพาะใน AsyncStorage และมีการตั้งค่า map style เพิ่มใน storage แล้ว หน้า Settings มี UI สำรอง/ซิงค์แล้วแต่ยังเป็น placeholder

---

## 2. เป้าหมายการ integrate Supabase (ตามที่คิดไว้)

- เชื่อม Supabase ด้วย **Supabase URL** และ **anon key**
- เพิ่มฟีเจอร์ **Login** (Supabase Auth)
- ย้าย **Saved Pins** ไปเก็บบน Supabase (พร้อม sync กับ AsyncStorage ตอน offline/online)
- **การตั้งค่าทั้งหมด** ยังเก็บใน AsyncStorage (ไม่ย้ายขึ้น Supabase)

---

## 3. แผนการทำงาน (Implementation Plan)

### Phase 1: ติดตั้งและตั้งค่า Supabase

1. **ติดตั้ง package**
   ```bash
   npx expo install @supabase/supabase-js
   ```
   สำหรับ React Native ใช้ AsyncStorage เป็น persistence ของ session (Supabase รองรับแล้ว)

2. **เพิ่ม env**
   - ใน `.env`: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`
   - ใน `env.d.ts`: declare ค่าทั้งสอง
   - อัปเดต `.env.example`

3. **สร้าง Supabase client**
   - สร้างไฟล์ `lib/supabase.ts`
   - ใช้ `createClient(url, anonKey, { auth: { storage: AsyncStorage } })` เพื่อให้ session  persist และทำงานกับ React Native

### Phase 2: สร้างตารางและนโยบายใน Supabase

1. **ตาราง `pins`**
   - `id` (uuid, PK, default `gen_random_uuid()`)
   - `user_id` (uuid, FK → `auth.users(id)`, สำหรับแยก pins ตาม user)
   - `name` (text)
   - `latitude` (float8)
   - `longitude` (float8)
   - `created_at` (timestamptz, default `now()`)
   - `timestamp` (bigint) — ถ้าต้องการเก็บค่าเดิมสำหรับเรียง/แสดง

   ตัวอย่าง SQL (ใน Supabase SQL Editor):
   ```sql
   create table public.pins (
     id uuid primary key default gen_random_uuid(),
     user_id uuid references auth.users(id) on delete cascade not null,
     name text not null,
     latitude float8 not null,
     longitude float8 not null,
     created_at timestamptz default now(),
     timestamp bigint not null
   );

   alter table public.pins enable row level security (RLS);

   create policy "Users can do everything on own pins"
     on public.pins for all
     using (auth.uid() = user_id)
     with check (auth.uid() = user_id);
   ```

2. **Auth**
   - ใช้ Username + Password เท่านั้น (ไม่ใช้อีเมลจริง). Supabase ใช้ฟิลด์ email เป็นตัวระบุ — ใช้ email ปลอม `{username}@pinnit.local`. Dashboard: เปิด Email/Password, ปิด Confirm email. Sign up/Login เรียกด้วย email = \`${username}@pinnit.local\`

### Phase 3: Login (Auth)

1. **เส้นทางและ UI**
   - สร้าง `app/(auth)/login.tsx` และ `app/(auth)/sign-up.tsx`
   - **ไม่บังคับล็อกอิน:** Root layout แสดง tabs เสมอ; ไม่ redirect ไป Login. หน้า Login/Sign up เข้าจากปุ่ม Login ใน Settings

2. **ตรวจสอบ session**
   - ใช้ getSession/onAuthStateChange เพื่ออัปเดต UI (เช่น Settings โซนบัญชี). หลัง login สำเร็จ → กลับไป Settings/tabs, โหลด pins จาก Supabase ถ้า online

3. **ปุ่ม Logout**
   - ใส่ใน Settings: เรียก `supabase.auth.signOut()` แล้ว redirect ไป Login (แสดงเมื่อล็อกอินแล้วเท่านั้น)

4. **หน้า Settings — โซนบัญชี/โปรไฟล์ (ตามสถานะล็อกอิน)**
   - **กรณียังไม่ได้ล็อกอิน:** แสดง **ปุ่ม Login** (อยู่บนหรือในส่วน "บัญชี") — กดแล้วนำทางไปหน้า Login (หรือเปิด modal Login)
   - **กรณีล็อกอินแล้ว:** แสดง **ชื่อผู้ใช้** (จาก `session.user.user_metadata.full_name`) และ **รูปโปรไฟล์ (avatar)**  
     - รูปโปรไฟล์: **ให้ผู้ใช้อัปโหลดรูปได้** — กดที่รูป/placeholder แล้วเลือกรูปจากเครื่องหรือถ่ายใหม่ → อัปโหลดขึ้น Supabase Storage → เก็บ URL ใน User Metadata (`avatar_url`) แล้วแสดงรูปนั้น
     - ถ้ายังไม่มีรูป: แสดง placeholder (อักษรต้นของชื่อหรือไอคอนคน)

   สรุป: Settings ด้านบน/ส่วนบัญชี = **ไม่ล็อกอิน → ปุ่ม Login** | **ล็อกอินแล้ว → ชื่อ + รูปโปรไฟล์ (อัปโหลดได้)** (และมี Logout อยู่ที่อื่นใน Settings)

5. **ฟอร์ม Sign up — ช่องที่ผู้ใช้กรอก (เรียงจากบนลงล่าง)**
   - **ชื่อที่แสดง** (display name) — **อยู่บนสุด** เก็บใน User Metadata: `data: { full_name: displayName }`
   - **ชื่อผู้ใช้** (username) — ใช้เป็นตัวระบุสำหรับล็อกอิน (ต้องไม่ซ้ำ). เก็บใน User Metadata: `data: { username }`. ภายในเรียก `signUp` ด้วย `email: \`${username}@pinnit.local\`` (ไม่ใช้อีเมลจริง)
   - **รหัสผ่าน** (password) — ส่งไป Supabase Auth
   - **ยืนยันรหัสผ่าน** (confirm password) — ตรวจในแอปเท่านั้น: ต้องตรงกับรหัสผ่าน, ความยาวขั้นต่ำ (เช่น 6 ตัวอักษร)

   สรุปลำดับฟิลด์ Sign up: **ชื่อที่แสดง (บนสุด)** → **ชื่อผู้ใช้ (username)** → รหัสผ่าน → ยืนยันรหัสผ่าน  
   **ฟอร์ม Login:** ชื่อผู้ใช้ (username) + รหัสผ่าน — เรียก `signIn({ email: \`${username}@pinnit.local\`, password })`

   **เก็บรูปโปรไฟล์:** เก็บ URL ใน `user_metadata.avatar_url` (อัปเดตผ่าน `supabase.auth.updateUser({ data: { avatar_url: url } })`) — อ่านชื่อจาก `user_metadata.full_name`, อ่านรูปจาก `user_metadata.avatar_url`

5.1 **อัปโหลดรูปโปรไฟล์ (Supabase Storage + แอป)**
   - **Supabase:** สร้าง Storage bucket ชื่อ **`profile-images`** ตั้งเป็น public ถ้าต้องการให้ URL เปิดดูได้โดยไม่ต้องส่ง token
   - **นโยบาย Storage (RLS):** ให้ user อัปโหลด/อัปเดต/ลบได้เฉพาะไฟล์ของตัวเอง เช่น path = `{user_id}/avatar.jpg` (ใช้ `auth.uid()` ตรวจใน policy)
   - **ในแอป:**
     1. ใช้ `expo-image-picker` เลือกรูปจากแกลเลอรี่หรือกล้อง (ขอ permission ถ้าจำเป็น)
     2. **บีบอัด/ปรับขนาด** ด้วย `expo-image-manipulator` ก่อนอัปโหลด (เช่น resize เป็นความกว้างสูงสุด 400px, quality 0.8) เพื่อลดขนาดไฟล์และ bandwidth
     3. อัปโหลดไฟล์ไป Storage: `supabase.storage.from('profile-images').upload(\`${userId}/avatar\`, fileBlob, { upsert: true })`
     4. ดึง public URL: `supabase.storage.from('profile-images').getPublicUrl(...)` หรือใช้ `.createSignedUrl` ถ้า bucket เป็น private
     5. อัปเดต User Metadata: `supabase.auth.updateUser({ data: { avatar_url: publicUrl } })`
   - **UI:** ใน Settings โซนโปรไฟล์ กดที่รูปหรือปุ่ม "เปลี่ยนรูป" → เปิด picker → หลังอัปโหลดสำเร็จ แสดงรูปใหม่ทันที

### Phase 4: Saved Pins + AsyncStorage (Online/Offline)

1. **เก็บการตั้งค่าทั้งหมดใน AsyncStorage อย่างเดียว (ไม่เปลี่ยน)**
   - `@pinnit_dark_mode`
   - `@pinnit_map_style`
   - ไม่ต้องย้ายขึ้น Supabase

2. **เลเยอร์ Pins: Supabase เป็น source of truth ตอน online**
   - สร้าง module สำหรับ pins ที่ทำงานกับทั้ง Supabase และ AsyncStorage เช่น `utils/pinsSync.ts` หรือขยาย `utils/storage.ts`:
     - **โหลด:**  
       - ถ้า online: fetch จาก Supabase (where `user_id = auth.uid()`), เรียงตาม `timestamp` หรือ `created_at`, แล้ว **เขียนลง AsyncStorage** เป็น cache  
       - ถ้า offline: อ่านจาก AsyncStorage (key เดิม `@pinnit_saved_pins` หรือแยกเป็น `@pinnit_pins_cache`) แล้วใช้เป็นรายการแสดง
     - **เพิ่ม/แก้ไข/ลบ:**  
       - ถ้า online: ทำบน Supabase ก่อน แล้วอัปเดต cache ใน AsyncStorage ตามผลลัพธ์  
       - ถ้า offline: อัปเดตเฉพาะ AsyncStorage (เก็บคิว pending sync; เก็บคิว “pending sync” — เมื่อกลับมา online sync ขึ้น Supabase อัตโนมัติ ในรอบแรก)

3. **ให้ UI ยังใช้ “โหลด/บันทึก pins” เหมือนเดิม**
   - หน้า index และ map ยังเรียกฟังก์ชันระดับสูงแบบเดิม (เช่น `loadPins()`, `savePins()` หรือ `addPin()`, `updatePin()`, `deletePin()`) แต่ implementation ภายในจะ:
     - ตรวจสอบ network / session
     - เลือกอ่านจาก Supabase หรือ AsyncStorage
     - เลือกเขียนไป Supabase แล้วค่อยอัปเดต AsyncStorage

4. **รูปแบบ id**
   - บน Supabase ใช้ `uuid`; ในแอป `PinnitItem.id` ยังเป็น string ได้ (ใช้ uuid จาก Supabase หรือ generate ชั่วคราวสำหรับ pending offline)

### Phase 5: การตรวจสอบ Online/Offline และ Pending Sync

- ใช้ `@react-native-community/netinfo` หรือ Expo’s network API เพื่อรู้สถานะ online/offline
- ตอนเปิดแอปหรือกลับมา foreground: ถ้า online ให้โหลด pins จาก Supabase แล้วอัปเดต cache ใน AsyncStorage
- **Pending sync (รอบแรก):** ตอนกลับมา online ให้ **sync การเปลี่ยนแปลงจาก AsyncStorage ขึ้น Supabase อัตโนมัติ** (คิวที่เก็บไว้ตอน offline: เพิ่ม/แก้ไข/ลบ pin)

### Phase 6: หน้า Settings — สำรองข้อมูลและซิงค์

- **ตำแหน่งในโค้ด:** `app/(tabs)/settings.tsx` ส่วน "ข้อมูล" → แถว "สำรองข้อมูลและซิงค์" (ตอนนี้แค่ `Alert` placeholder)
- **หลังมี Supabase ให้เชื่อมกับฟังก์ชันจริง:**
  1. **เมื่อกด "สำรองข้อมูลและซิงค์":**
     - ถ้า **ไม่ได้ล็อกอิน**: แจ้งให้ล็อกอินก่อนจึงจะใช้สำรอง/ซิงค์ได้ (หรือซ่อนแถวนี้เมื่อไม่มี session)
     - ถ้า **ล็อกอินแล้ว + online**: เรียก sync (ดึง pins ล่าสุดจาก Supabase → อัปเดต cache ใน AsyncStorage) แล้วแสดงผล เช่น "ซิงค์เรียบร้อย" หรือ "ซิงค์ล่าสุดเมื่อ …"
     - ถ้า **ออฟไลน์**: แจ้งว่า "ขณะนี้ออฟไลน์ — จะซิงค์เมื่อมีเครือข่าย" หรือแสดงปุ่ม "ซิงค์เมื่อมีเน็ต"
  2. **แสดงสถานะ (subtitle ของแถว):**
     - เช่น "ซิงค์ล่าสุดเมื่อ 12:30" หรือ "ออฟไลน์" หรือ "พร้อมซิงค์" (อ่านจาก AsyncStorage key เช่น `@pinnit_last_sync_at` ถ้าต้องการเก็บเวลา sync ไว้)
  3. **ตัวเลือก (ถ้าต้องการ):**
     - "ซิงค์ตอนนี้" — บังคับดึงจาก Supabase มาเขียน cache
     - ไม่ต้องมีปุ่ม export/import แยก ถ้าโฟกัสแค่ sync กับ Supabase

- **เก็บใน AsyncStorage เพิ่ม (สำหรับ UI):**
  - `@pinnit_last_sync_at` (optional) — เก็บ timestamp ครั้งล่าสุดที่ sync สำเร็จ เพื่อแสดงใน Settings

---

## 4. สรุปการใช้งาน AsyncStorage หลังใช้ Supabase

| ข้อมูล | ที่เก็บ | หมายเหตุ |
|--------|--------|----------|
| **Saved Pins (cache)** | AsyncStorage | โหลดจาก Supabaseเมื่อ online แล้วเขียน cache; ตอน offline อ่านจาก cache |
| **Dark mode** | AsyncStorage | ไม่เปลี่ยน เก็บในเครื่องอย่างเดียว |
| **Map style** | AsyncStorage | ไม่เปลี่ยน เก็บในเครื่องอย่างเดียว |
| **Auth session** | AsyncStorage (ผ่าน Supabase client) | Supabase ใช้ AsyncStorage เป็น `auth.storage` ให้แล้ว |
| **Last sync at (optional)** | AsyncStorage | เก็บเวลา sync ล่าสุด สำหรับแสดงใน Settings → สำรองข้อมูลและซิงค์ |

---

## 5. ลำดับงานแนะนำ (Checklist)

- [ ] ติดตั้ง `@supabase/supabase-js` และตั้งค่า env (URL, anon key)
- [ ] สร้าง `lib/supabase.ts` ด้วย AsyncStorage เป็น auth storage
- [ ] สร้างตาราง `pins` และ RLS ใน Supabase
- [ ] เปิด Auth (Email/Password), ปิด Confirm email; ใช้ username แทนอีเมล (email ปลอม `username@pinnit.local`)
- [ ] สร้างหน้า Login (username + password) และ Sign up (ชื่อที่แสดง → ชื่อผู้ใช้ → รหัสผ่าน → ยืนยันรหัสผ่าน) + เชื่อมกับ Supabase Auth
- [ ] Root layout: **ไม่บังคับล็อกอิน** — แสดง tabs เสมอ; Login/Sign up เข้าจากปุ่ม Login ใน Settings
- [ ] เพิ่ม Logout ใน Settings (แสดงเมื่อล็อกอินแล้ว)
- [ ] หน้า Settings โซนบัญชี: **ยังไม่ล็อกอิน** → แสดงปุ่ม Login | **ล็อกอินแล้ว** → แสดงชื่อผู้ใช้ + รูปโปรไฟล์ (อัปโหลดได้)
- [ ] อัปโหลดรูปโปรไฟล์: สร้าง Storage bucket **`profile-images`** + RLS, ในแอปใช้ expo-image-picker → บีบอัด/ปรับขนาด → อัปโหลด → อัปเดต `user_metadata.avatar_url`
- [ ] Implement โหลด/บันทึก pins ที่ใช้ Supabase + cache ลง AsyncStorage
- [ ] ตรวจสอบ online/offline: ตอน offline ใช้ cache; **pending sync:** เมื่อกลับมา online sync การเปลี่ยนแปลง (เพิ่ม/แก้/ลบ pin) ขึ้น Supabase อัตโนมัติ
- [ ] **Settings — สำรองข้อมูลและซิงค์:** เชื่อมแถว "สำรองข้อมูลและซิงค์" กับฟังก์ชัน sync จริง (ดึงจาก Supabase → cache), แสดงสถานะ/ข้อความตาม session และเครือข่าย, (optional) เก็บ `@pinnit_last_sync_at` สำหรับ subtitle
- [ ] ทดสอบ: Login → เพิ่ม/แก้ไข/ลบ pin → Offline → เปิดแอปใช้ cache → Online → sync

ถ้าต้องการให้ช่วยลงมือเขียนโค้ดตามแผนนี้ (เช่น เริ่มจาก Phase 1–2 หรือ Phase 4) บอกได้เลยว่าจะเริ่มจาก phase ไหนและโครงโฟลเดอร์ที่ต้องการ (เช่น ใช้ `lib/` หรือ `utils/` สำหรับ supabase client).

---

## 6. การตรวจสอบความถูกต้องของแผน (ล่าสุด)

- **Phase 1–2:** ตรงกับวิธีใช้ Supabase + Expo. โครงตาราง `pins` และ RLS ใช้ได้. Auth ใช้ Username + Password (email ปลอม `username@pinnit.local`), ปิด Confirm email.
- **Phase 3:** ไม่บังคับล็อกอิน — เข้า tabs เสมอ, ปุ่ม Login ใน Settings. Sign up: ชื่อที่แสดง → ชื่อผู้ใช้ (username) → รหัสผ่าน → ยืนยันรหัสผ่าน. Login: username + password. Storage bucket รูปโปรไฟล์: `profile-images`.
- **Phase 4–5:** Pins ใช้ Supabase + cache; **pending sync** เมื่อกลับมา online sync การเปลี่ยนแปลงขึ้น Supabase อัตโนมัติ (รอบแรก).
- **Phase 6:** สำรองข้อมูลและซิงค์ ตรงแผน.

---

## 7. ข้อตัดสินใจแล้ว (จากคุณ)

| หัวข้อ | คำตอบ |
|--------|--------|
| **1. แอพบังคับล็อกอินหรือไม่** | **ไม่บังคับ** — เข้าแอปหลักได้เสมอ ไม่ล็อกอินก็ใช้ pins ในเครื่องได้ มีปุ่ม Login ใน Settings |
| **2. ยืนยันอีเมล / ใช้ username แทน email** | **ไม่ใช้อีเมล** — ใช้ **username** แทน (Supabase ภายในใช้ email ปลอม `username@pinnit.local`, ปิด Confirm email) |
| **3. Auth provider** | **Username + Password** เท่านั้น |
| **4. ชื่อ Storage bucket รูปโปรไฟล์** | **`profile-images`** |
| **5. Pending sync ตอนออฟไลน์** | **ต้องการในรอบแรก** — เพิ่ม/แก้ไข/ลบ pin ตอนไม่มีเน็ต แล้ว sync ขึ้น Supabase อัตโนมัติเมื่อกลับมา online |
