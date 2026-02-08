# Flow การแสดงข้อมูลและจัดการข้อมูล Pins (Local Storage vs บัญชีผู้ใช้)

เอกสารนี้อธิบายการแสดงผลข้อมูลปักหมุดจาก **local storage** และจาก **บัญชีผู้ใช้ (user)** รวมถึงการสร้าง / ลบ / แก้ไข ในทุกเหตุการณ์

---

## 1. แหล่งข้อมูลและ Key ใน AsyncStorage

| Key | ความหมาย | เก็บอะไร |
|-----|-----------|----------|
| **STORAGE_KEY** (จาก `.env`) | ข้อมูลในเครื่อง (ไม่มีเจ้าของ) | Pins ที่ปักตอนไม่ล็อกอิน หรือที่ดาวน์โหลดจากบัญชีลงเครื่อง |
| **PINS_CACHE_KEY** (`@pinnit_pins_cache`) | Cache ของบัญชีผู้ใช้ | Pins ของ user ที่ล็อกอินอยู่ (ซิงค์กับ Supabase) |
| **LAST_SYNC_KEY** | เวลาซิงค์ล่าสุด | ใช้แสดงใน Settings |
| **PENDING_SYNC_KEY** | มีการรอซิงค์หรือไม่ | ตั้งเมื่อบันทึกไม่ขึ้น DB ได้ (ออฟไลน์) |

- **Local storage** = ข้อมูลที่อยู่ใต้ `STORAGE_KEY` เท่านั้น  
- **ของ user** = ข้อมูลใน Supabase ตาราง `pins` (และ cache ใน `PINS_CACHE_KEY`)

---

## 2. การแสดงข้อมูล (Load / โหลดรายการ)

### 2.1 ฟังก์ชันหลัก: `loadPins(isOnline)`

- เรียกจาก: หน้าหลัก (index), หน้าแผนที่ (map), หลัง sync ใน Settings  
- ส่ง `isOnline` เพื่อตัดสินใจดึงจาก DB หรือใช้ cache

### 2.2 Flow ตามสถานะ

#### กรณี **ไม่ล็อกอิน**

1. อ่าน `STORAGE_KEY` เท่านั้น
2. แปลงเป็น array ของ pins แล้วใส่ `ownerLabel: "เครื่องนี้"` ถ้ายังไม่มี
3. เรียงตาม `timestamp` (ใหม่ก่อน) แล้ว return  
→ **แสดงเฉพาะ pins ในเครื่อง (local storage)**

#### กรณี **ล็อกอิน**

1. อ่าน `STORAGE_KEY` → ได้ **storagePins** (ใส่ `ownerLabel: "รายการในเครื่อง"` สำหรับ merge)
2. ดึงข้อมูลของ user:
   - **ออนไลน์:** query Supabase `pins` ที่ `user_id = session.user.id` → ได้ **dbPins** แล้วเขียนลง `PINS_CACHE_KEY` และอัปเดต `LAST_SYNC_KEY`
   - **ออฟไลน์:** อ่านจาก `PINS_CACHE_KEY` → ได้ **dbPins**
3. ใส่ `ownerLabel` ให้ dbPins (ชื่อ user / "บัญชีของฉัน")
4. **รวมและตัดซ้ำ:** `mergeAndDedupePins(dbPins, storagePins)`
   - ใช้ key ตัดซ้ำ: `latitude` (ปัด 6 ตำแหน่ง) + `longitude` (ปัด 6 ตำแหน่ง) + `timestamp`
   - ถ้ารายการเดียวกันมีทั้งใน DB และใน storage ให้ **เหลือแค่รายการจาก DB** (ใส่ DB ก่อนในอาร์กิวเมนต์)
5. เรียงตาม `timestamp` แล้ว return  
→ **แสดงทั้ง pins ของบัญชีและ pins ในเครื่อง โดยไม่ซ้ำรายการ**

---

## 3. การสร้าง Pin (Create)

### 3.1 จุดที่สร้าง

- **หน้าหลัก (index):** กดปักหมุดตำแหน่งปัจจุบัน → `handleConfirmPin`
- **หน้าแผนที่ (map):** กดบนแผนที่เลือกตำแหน่ง → ยืนยันชื่อ → บันทึก

### 3.2 การกำหนดเจ้าของ (ownerLabel)

- **ไม่ล็อกอิน:** `ownerLabel = "เครื่องนี้"`
- **ล็อกอิน:** `ownerLabel = full_name หรือ username หรือ "บัญชีของฉัน"`

→ Pin ใหม่จะถูกมองว่าเป็นของ **storage** หรือของ **user** ตาม `ownerLabel` ตอน save

### 3.3 Flow หลังสร้าง

1. สร้าง object `newPin` (id, name, lat, lng, timestamp, ownerLabel)
2. รวมกับรายการที่โหลดมา: `updatedPins = [newPin, ...pins]`
3. เรียก **`savePins(updatedPins, isOnline)`**

(รายละเอียดการบันทึกของ `savePins` อยู่ที่หัวข้อ 5)

---

## 4. การลบ Pin (Delete)

### 4.1 จุดที่ลบ

- **หน้าหลัก:** กดลบที่รายการ → ยืนยัน → `handleDeletePin`
- **หน้าแผนที่:** (ถ้ามีการลบจากแผนที่ ก็จะ filter ออกจาก list แล้วเรียก savePins)

### 4.2 Flow

1. Filter ออกจาก list: `updatedPins = pins.filter((pin) => pin.id !== pinId)`
2. เรียก **`savePins(updatedPins, isOnline)`**

→ การลบ = บันทึก list ที่เหลือ; การแยกว่าเป็นของ user หรือของ storage เกิดขึ้นใน `savePins` ตาม `ownerLabel` และการ merge กับ storage เดิม (ดูหัวข้อ 5)

---

## 5. การแก้ไข Pin (Edit)

### 5.1 จุดที่แก้ไข

- **หน้าหลัก:** กดแก้ไขชื่อ → เปลี่ยนชื่อ → ยืนยัน → `handleConfirmEditPin`

### 5.2 Flow

1. แทนที่ชื่อใน list: `updatedPins = pins.map(... pin.name = editPinName ...)`
2. เรียก **`savePins(updatedPins, isOnline)`**

→ โครงสร้างและ `ownerLabel` ไม่เปลี่ยน แค่ชื่อเปลี่ยน; การเขียนลง storage / cache / DB ใช้ logic เดียวกับหัวข้อ 5 (savePins)

---

## 6. การบันทึก (Save) — ฟังก์ชัน `savePins(pins, isOnline)`

ใช้ทั้งตอน **สร้าง / ลบ / แก้ไข** รายการ

### 6.1 ไม่ล็อกอิน

1. เรียง `pins` ตาม timestamp
2. เขียนทับ `STORAGE_KEY` ด้วย `JSON.stringify(sorted)`  
→ **เก็บเฉพาะในเครื่อง**

### 6.2 ล็อกอิน

1. แยกตามเจ้าของ:
   - **userPins** = รายการที่ `ownerLabel` ไม่ใช่ "เครื่องนี้" หรือ "รายการในเครื่อง"
   - **storageFromList** = รายการที่ถือว่าเป็นของ storage (ไม่มีเจ้าของ)
2. อ่าน `STORAGE_KEY` เดิม → **existingStorage**
3. **existingOnly** = รายการใน existingStorage ที่ dedupe key ไม่ซ้ำกับ userPins (ป้องกันลบของในเครื่องเมื่อลบแค่ของ user)
4. **storagePins** = รวมและตัดซ้ำระหว่าง `storageFromList` กับ `existingOnly`
5. เขียน **PINS_CACHE_KEY** = `userPins`
6. อ่าน **STORAGE_KEY อีกครั้ง** (fresh) → **freshOnly** = รายการที่ key ไม่ซ้ำ userPins
7. **finalStoragePins** = รวมและตัดซ้ำระหว่าง `storagePins` กับ `freshOnly`
8. **Safeguard:** ถ้า `finalStoragePins.length === 0` ให้อ่าน STORAGE_KEY อีกครั้ง ถ้ามีข้อมูลอยู่ไม่ให้เขียนทับเป็น `[]` (ป้องกันข้อมูลในเครื่องหายเมื่อลบทุกรายการในหน้ารายการ)
9. เขียน **STORAGE_KEY** = `finalStoragePins`
10. **ออนไลน์:** ลบ pins ของ user ใน DB แล้ว insert `userPins` ขึ้น Supabase; อัปเดต LAST_SYNC_KEY และลบ PENDING_SYNC_KEY  
    **ออฟไลน์:** ตั้ง PENDING_SYNC_KEY เพื่อให้กลับออนไลน์แล้ว sync ทีหลัง

→ **ของ user ไปที่ DB + cache, ของเครื่องไปที่ STORAGE_KEY โดยไม่ลบของในเครื่องที่ไม่ได้อยู่ใน list (เช่น รายการที่ถูก dedupe เป็นของ user)**

---

## 7. เหตุการณ์พิเศษ

### 7.1 นำปักหมุดขึ้นบัญชี (ปุ่ม "นำปักหมุดขึ้นบัญชี")

- **หน้าที่:** นำข้อมูลจาก **local storage** เพิ่มใส่ **บัญชีผู้ใช้** ที่ล็อกอินอยู่
- **ฟังก์ชัน:** `mergeLocalPinsToSupabase()`

Flow:

1. อ่าน `STORAGE_KEY` → **localPins**
2. ถ้า localPins ว่าง → ออกจากฟังก์ชัน
3. ดึง pins ของ user จาก Supabase → **existing**
4. **merged** = `mergeAndDedupePins(existing, localPins)` (ตัดซ้ำ, DB ก่อน)
5. ลบ pins ของ user ใน DB แล้ว insert ทุกรายการใน **merged**
6. อัปเดต **PINS_CACHE_KEY** = merged, **LAST_SYNC_KEY**, ลบ **PENDING_SYNC_KEY**
7. **ไม่ลบหรือเคลียร์ STORAGE_KEY** (ข้อมูลในเครื่องยังอยู่)

→ ผล: รายการในเครื่องไปอยู่บนบัญชีด้วย โดยไม่ลบออกจากเครื่อง

---

### 7.2 ดาวน์โหลดปักหมุดลงเครื่อง (ปุ่ม "ดาวน์โหลดปักหมุดลงเครื่อง")

- **หน้าที่:** นำข้อมูลของ **user** เพิ่มลง **local storage**
- **ฟังก์ชัน:** `copyCacheToLocalOnLogout()`

Flow:

1. อ่าน **STORAGE_KEY** → **existingPins**
2. อ่าน **PINS_CACHE_KEY** → **cachePins** (ของ user)
3. ถ้า cache ว่าง → ออกจากฟังก์ชัน
4. **merged** = `mergeAndDedupePins(cachePins, existingPins)` (cache ก่อน เพื่อไม่ทับของเดิม)
5. เขียน **STORAGE_KEY** = merged

→ ผล: รายการในบัญชีถูกเพิ่มลงเครื่อง โดยไม่ทับหรือเคลียร์ของเดิมใน STORAGE_KEY

---

### 7.3 การซิงค์เฉพาะเมื่อกลับออนไลน์ (runPendingSync)

- **นโยบาย:** ไม่มีการซิงค์เมื่อกดปุ่ม (ยกเลิกการซิงค์ทั่วไป) เว้นแต่กรณีเดียว: **ล็อกอินค้างไว้ แล้วเน็ตหลุด เมื่อกลับออนไลน์** ระบบจะนำปักหมุดที่ปักตอนเน็ตหลุดขึ้นบัญชีอัตโนมัติ
- **ฟังก์ชัน:** `runPendingSync()`
- **เรียกเมื่อ:** เฉพาะเมื่อ `isOnline` เปลี่ยนเป็น true (กลับออนไลน์) ในหน้าหลัก (index) และหน้าแผนที่ (map) — ไม่เรียกเมื่อกดปุ่ม "นำปักหมุดขึ้นบัญชี" หรือเมื่อแค่โฟกัสหน้าจอ

Flow:

1. ถ้าไม่มี session หรือไม่มี PENDING_SYNC_KEY → return false
2. อ่าน **PINS_CACHE_KEY** → pins
3. ลบ pins ของ user ใน DB แล้ว insert pins จาก cache ขึ้น Supabase
4. อัปเดต LAST_SYNC_KEY, ลบ PENDING_SYNC_KEY
5. return true

→ ผล: อัปโหลด cache ขึ้น DB (ปักหมุดที่ปักตอนออฟไลน์ขึ้นบัญชี)

---

### 7.4 Logout

- ไม่มีการเคลียร์ **STORAGE_KEY** หรือ **PINS_CACHE_KEY** โดยอัตโนมัติ
- ถ้าต้องการให้ pins ของ user ยังเห็นหลัง logout ต้องกด **"ดาวน์โหลดปักหมุดลงเครื่อง"** ก่อนออกจากระบบ

---

## 8. การนับ "รายการในเครื่องที่ยังไม่อยู่ในบัญชี"

- **ฟังก์ชัน:** `getLocalOnlyPinsCount()`
- ใช้แสดงใน Settings ที่ปุ่ม "นำปักหมุดขึ้นบัญชี"

Logic:

- **ไม่ล็อกอิน:** return จำนวนทั้งหมดใน `STORAGE_KEY`
- **ล็อกอิน:** นับเฉพาะรายการใน `STORAGE_KEY` ที่ **dedupe key ไม่ตรงกับ** รายการใน `PINS_CACHE_KEY`  
→ ไม่นับสำเนาที่เคยดาวน์โหลดจากบัญชีลงเครื่องแล้ว

---

## 9. สรุปตารางเหตุการณ์

| เหตุการณ์ | ไม่ล็อกอิน | ล็อกอิน |
|-----------|------------|--------|
| **แสดงรายการ** | โหลดจาก STORAGE_KEY เท่านั้น | โหลด DB (หรือ cache) + STORAGE_KEY แล้ว merge ตัดซ้ำ (DB ก่อน) |
| **สร้าง pin** | ใส่ ownerLabel "เครื่องนี้" → savePins → เขียนเฉพาะ STORAGE_KEY | ใส่ ownerLabel ชื่อ user → savePins → แยกเป็น userPins + storage; user ไป DB+cache, storage ไป STORAGE_KEY (รวมกับของเดิม + safeguard) |
| **ลบ pin** | savePins(list ที่เหลือ) → เขียนทับ STORAGE_KEY | savePins(list ที่เหลือ) → แยก user/storage; เขียน cache + STORAGE_KEY (รวม existing, ไม่ลบของในเครื่องที่ซ่อนด้วย dedupe); ออนไลน์ก็อัปเดต DB |
| **แก้ไขชื่อ pin** | savePins(list ที่แก้แล้ว) → เขียนทับ STORAGE_KEY | savePins(list ที่แก้แล้ว) → logic เดียวกับลบ (แยก user/storage, merge กับ storage เดิม, เขียน cache + STORAGE_KEY + DB ถ้าออนไลน์) |
| **นำปักหมุดขึ้นบัญชี** | — | อ่าน STORAGE_KEY + DB → merge ตัดซ้ำ → เขียนกลับขึ้น DB + อัปเดต cache; ไม่เคลียร์ STORAGE_KEY |
| **ดาวน์โหลดปักหมุดลงเครื่อง** | — | อ่าน cache + STORAGE_KEY → merge ตัดซ้ำ → เขียนกลับ STORAGE_KEY (เพิ่มของบัญชีลงเครื่อง) |
| **กลับออนไลน์** | — | เรียก runPendingSync เมื่อ isOnline กลายเป็น true (ถ้ามี PENDING_SYNC_KEY) → นำปักหมุดที่ปักตอนเน็ตหลุดขึ้นบัญชีอัตโนมัติ |

---

## 10. หมายเหตุสำคัญ

- **Dedupe key:** `latitude` (ปัด 6 ตำแหน่ง) + `longitude` (ปัด 6 ตำแหน่ง) + `timestamp`  
  ใช้ทั้งตอนแสดงผล (merge DB + storage) และตอนนับ "รายการในเครื่องที่ยังไม่อยู่บัญชี"
- **ownerLabel** กำหนดว่า pin อยู่ในกลุ่ม "ของ user" หรือ "ของ storage" ตอน save; ค่าเช่น "เครื่องนี้", "รายการในเครื่อง" = storage.
- **Safeguard ใน savePins:** เมื่อล็อกอินและ list ที่จะเขียนเป็น storage ว่าง จะไม่เขียนทับ STORAGE_KEY เป็น `[]` ถ้าอ่านล่าสุดแล้วยังมีข้อมูลอยู่ (ป้องกันข้อมูลในเครื่องหายเมื่อลบทุกรายการในหน้ารายการ)

---

*อ้างอิงจาก `utils/pinsSync.ts`, `app/(tabs)/index.tsx`, `app/(tabs)/map.tsx`, `app/(tabs)/settings.tsx`*
