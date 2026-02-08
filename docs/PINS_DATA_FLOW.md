# Flow การดำเนินการกับข้อมูลปักหมุด (ฝั่ง Local vs ฝั่ง Database)

เอกสารนี้อธิบายการแบ่งข้อมูลปักหมุดเป็น **สองฝั่ง** — **ฝั่ง local** (กรณีไม่ได้ login) และ **ฝั่ง database** (กรณี login) — การดำเนินการกับข้อมูลจะไม่เกี่ยวข้องกัน เว้นแต่กรณีพิเศษ (ปุ่มอัปโหลดขึ้นบัญชี / ดาวน์โหลดลงเครื่อง)

---

## การนิยาม

- **รายการในเครื่อง** = ข้อมูลที่เกิดจากการกระทำใน local (ไม่ได้ login) และข้อมูลที่ user ดาวน์โหลดลงเครื่อง (ปุ่ม "ดาวน์โหลดปักหมุดลงเครื่อง") — ทั้งสองส่วนเก็บใน local storage (`STORAGE_KEY`) และเมื่อ login จะแสดงในรายการแบบอ่านอย่างเดียว (ลบ/แก้ไขไม่ได้)

- **การลบ/แก้ไข:** ถ้าไม่ใช่เจ้าของปักหมุดจะไม่สามารถกระทำได้  
  - เช่น เมื่อ **login** แล้ว user ไม่สามารถลบ/แก้ไขปักหมุดของ local (รายการในเครื่อง) ได้ เพราะไม่ใช่เจ้าของ  
  - แต่ถ้า **ไม่ได้ login** จะลบ/แก้ไขได้ — เพราะทุกรายการเป็นรายการในเครื่อง (ฝั่ง local) ถือว่าเป็นของผู้ใช้เครื่อง

---

## 1. สรุปแนวคิด: สองฝั่ง

| ฝั่ง | เมื่อไหร่ | แหล่งข้อมูล | การดำเนินการ (แสดง/เพิ่ม/ลบ/แก้ไข) |
|------|-----------|-------------|-------------------------------------|
| **Local** | ไม่ได้ login | เฉพาะ **local storage** (`STORAGE_KEY`) | ทำกับ local storage เท่านั้น |
| **Database** | Login แล้ว | **Supabase (pins)** + cache (`PINS_CACHE_KEY`) | ทำกับ database เท่านั้น |

- **การแสดงผลเมื่อ login:** แสดงทั้ง pins จาก **local storage** และจาก **database** (รวมกันในรายการ) แต่รายการจาก local storage **ไม่สามารถลบหรือแก้ไขได้** — เป็นแบบอ่านอย่างเดียว
- **กรณีพิเศษ:** มีสองปุ่มเท่านั้นที่เชื่อมระหว่างสองฝั่ง  
  - **อัปโหลดปักหมุดขึ้นบัญชี:** ข้อมูลจาก local storage → สร้างใน database ของ user — **อัปโหลดแล้วข้อมูลใน local ยังอยู่เหมือนเดิม**  
  - **ดาวน์โหลดปักหมุดลงเครื่อง:** ข้อมูลจาก database ของ user → เพิ่มใน local storage

---

## 2. แหล่งข้อมูลและ Key

| Key | ความหมาย | เก็บอะไร |
|-----|-----------|----------|
| **STORAGE_KEY** (จาก `.env`) | ฝั่ง local | รายการในเครื่อง (ปักตอนไม่ login + ที่ user ดาวน์โหลดลงเครื่อง) |
| **PINS_CACHE_KEY** (`@pinnit_pins_cache`) | Cache ฝั่ง database | Pins ของ user (ซิงค์กับ Supabase) |
| **LAST_SYNC_KEY** | เวลาซิงค์ล่าสุด | (ใช้แสดงใน Settings) |
| **PENDING_SYNC_KEY** | รอซิงค์เมื่อกลับออนไลน์ | ตั้งเมื่อบันทึกลง DB ไม่ได้ (ออฟไลน์) |

---

## 3. Flow ฝั่ง Local (กรณีไม่ได้ login)

### 3.1 การแสดงปักหมุด

- เรียก `loadPins(isOnline)` → อ่าน **STORAGE_KEY** เท่านั้น → เรียงตาม timestamp → return
- แสดงเฉพาะ pins ในเครื่อง

### 3.2 การเพิ่ม / ลบ / แก้ไข

- **เพิ่ม:** สร้าง pin ใหม่ (ownerLabel = "เครื่องนี้") → เรียก `savePins(pins, isOnline)` → เขียนทับ **STORAGE_KEY**
- **ลบ:** ลบออกจาก list → เรียก `savePins(pins, isOnline)` → เขียนทับ **STORAGE_KEY**
- **แก้ไข:** แก้ชื่อใน list → เรียก `savePins(pins, isOnline)` → เขียนทับ **STORAGE_KEY**

→ ทุกการดำเนินการทำกับ **local storage เท่านั้น**

---

## 4. Flow ฝั่ง Database (กรณี login)

### 4.1 การแสดงปักหมุด

- เรียก `loadPins(isOnline)`:
  - ใช้ข้อมูลจาก **database ของ user เป็นหลัก** (ดึงจาก Supabase หรือจาก cache ถ้าออฟไลน์) → dbPins
  - อ่าน **STORAGE_KEY** → storagePins (ใส่ ownerLabel "รายการในเครื่อง")
  - รวมและตัดซ้ำ: `mergeAndDedupePins(dbPins, storagePins)` — **ถ้าซ้ำกันทั้ง local และ database ให้เอาข้อมูลจาก database**
  - return รายการรวม
- **ผล:** แสดงทั้ง pins ของบัญชีและ pins ในเครื่องในรายการเดียว (ของ DB เป็นหลัก ถ้าซ้ำใช้ของ DB) แต่รายการจาก local storage **ไม่สามารถลบหรือแก้ไขได้** (ปุ่มลบ/แก้ไขถูกซ่อน หรือกดแล้วแจ้งเตือน)

### 4.2 การเพิ่ม / ลบ / แก้ไข (ทำกับ database เท่านั้น)

- **เพิ่ม:** สร้าง pin ใหม่ (ownerLabel = ชื่อ user) → เรียก `savePins(pins, isOnline)` → เขียนเฉพาะ **PINS_CACHE_KEY** และ **Supabase** — **ไม่แตะ STORAGE_KEY**
- **ลบ:** ลบเฉพาะ pin ของบัญชีออกจาก list (ถ้าเป็น pin จาก local จะไม่ให้ลบ) → เรียก `savePins(pins, isOnline)` → อัปเดตเฉพาะ cache + DB
- **แก้ไข:** แก้ชื่อเฉพาะ pin ของบัญชี (ถ้าเป็น pin จาก local จะไม่ให้แก้) → เรียก `savePins(pins, isOnline)` → อัปเดตเฉพาะ cache + DB

→ **การดำเนินการกับข้อมูลเมื่อ login ทำกับ database (และ cache) เท่านั้น ไม่กระทบ local storage**

### 4.3 การแยกรายการในเครื่อง (read-only) — กฎ "ไม่ใช่เจ้าของจะลบ/แก้ไขไม่ได้"

- ใช้ `isStoragePin(p)` ตรวจจาก `ownerLabel`: ถ้าเป็น "เครื่องนี้" หรือ "รายการในเครื่อง" ถือว่าเป็นรายการในเครื่อง (user ที่ login อยู่ไม่ใช่เจ้าของ)
- ใน UI (เช่น PinItem): ส่ง `readOnly={true}` ให้รายการที่ `isStoragePin(item)` เมื่อ login → ไม่แสดงปุ่มลบ (swipe) และกด long press แจ้ง "คุณไม่ใช่เจ้าของปักหมุดนี้ จึงไม่สามารถแก้ไขหรือลบได้"
- **ไม่ได้ login:** ทุกรายการเป็นของ local → ถือว่าเป็นเจ้าของ → ลบ/แก้ไขได้

---

## 5. การบันทึก (savePins) ตามฝั่ง

### 5.1 ไม่ล็อกอิน

1. เรียง `pins` ตาม timestamp  
2. เขียนทับ **STORAGE_KEY** ด้วย list ที่ส่งมา  

→ เก็บเฉพาะในเครื่อง

### 5.2 ล็อกอิน

1. แยก **userPins** = รายการที่ `!isStoragePin(p)` (ของบัญชีเท่านั้น)  
2. เขียน **PINS_CACHE_KEY** = userPins  
3. ถ้าออนไลน์: ลบ pins ของ user ใน DB แล้ว insert userPins ขึ้น Supabase; อัปเดต LAST_SYNC_KEY, ลบ PENDING_SYNC_KEY  
4. ถ้าออฟไลน์: ตั้ง PENDING_SYNC_KEY  

→ **ไม่อ่านหรือเขียน STORAGE_KEY เลย** — local storage ไม่ถูกแก้ไขโดยการเพิ่ม/ลบ/แก้ไขตอน login

---

## 6. กรณีพิเศษ

### 6.1 อัปโหลดปักหมุดขึ้นบัญชี (ปุ่ม "อัปโหลดปักหมุดขึ้นบัญชี")

- **หน้าที่:** นำข้อมูลจาก **local storage** ไปสร้างใน **database ของ user**
- **ฟังก์ชัน:** `mergeLocalPinsToSupabase()`
- Flow:
  1. อ่าน STORAGE_KEY → localPins  
  2. ดึง pins ของ user จาก Supabase → existing  
  3. merged = mergeAndDedupePins(existing, localPins)  
  4. ลบ pins ของ user ใน DB แล้ว insert merged  
  5. อัปเดต PINS_CACHE_KEY = merged, LAST_SYNC_KEY  
- **อัปโหลดแล้วข้อมูลใน local ยังอยู่เหมือนเดิม** (ไม่ลบหรือแก้ STORAGE_KEY)
- ปุ่มไม่แสดงจำนวนจุด — กดแล้วถ้าไม่มีข้อมูลในเครื่องจะแจ้ง "ไม่มีรายการที่ต้องนำขึ้นบัญชี"

### 6.2 ดาวน์โหลดปักหมุดลงเครื่อง (ปุ่ม "ดาวน์โหลดปักหมุดลงเครื่อง")

- **หน้าที่:** นำข้อมูลจาก **database ของ user** เพิ่มลง **local storage** — เมื่อดาวน์โหลดแล้ว **owner เปลี่ยนเป็นของตัวเครื่อง** (ownerLabel = "เครื่องนี้")
- **ฟังก์ชัน:** `copyCacheToLocalOnLogout()`
- Flow:
  1. อ่าน STORAGE_KEY → existingPins  
  2. อ่าน PINS_CACHE_KEY → cachePins  
  3. ตั้ง ownerLabel ของ cachePins เป็น "เครื่องนี้" (ของตัวเครื่อง)  
  4. merged = mergeAndDedupePins(cachePins, existingPins)  
  5. เขียน STORAGE_KEY = merged  
- **ผล:** รายการในบัญชีถูกเพิ่มลงเครื่อง (ไม่ทับของเดิม) และถือว่าเป็นรายการในเครื่อง

### 6.3 เมื่อกลับออนไลน์หลังเน็ตหลุด (ล็อกอินค้างไว้)

- **ฟังก์ชัน:** `runPendingSync()`
- เรียกเมื่อ `isOnline` กลายเป็น true (ในหน้าหลักและหน้าแผนที่)
- นำ pins ที่ปักตอนออฟไลน์ (ที่อยู่ใน cache) ขึ้น database อัตโนมัติ

---

## 7. สรุปตารางเหตุการณ์

| เหตุการณ์ | ฝั่ง Local (ไม่ login) | ฝั่ง Database (login) |
|-----------|-------------------------|-------------------------|
| **แสดง** | โหลดจาก STORAGE_KEY เท่านั้น | ใช้ข้อมูลจาก DB เป็นหลัก + merge กับ local; ถ้าซ้ำใช้ของ DB (รายการในเครื่องเป็น read-only) |
| **เพิ่ม** | เขียน STORAGE_KEY | เขียน PINS_CACHE_KEY + DB เท่านั้น ไม่แตะ STORAGE_KEY |
| **ลบ** | เขียน STORAGE_KEY | ลบได้เฉพาะ pin ของบัญชี → อัปเดต cache + DB |
| **แก้ไข** | เขียน STORAGE_KEY | แก้ได้เฉพาะ pin ของบัญชี → อัปเดต cache + DB |
| **อัปโหลดขึ้นบัญชี** | — | อ่าน STORAGE_KEY → สร้างใน DB (ข้อมูลในเครื่องยังอยู่เหมือนเดิม) |
| **ดาวน์โหลดลงเครื่อง** | — | อ่าน cache → เพิ่มใน STORAGE_KEY |
| **กลับออนไลน์** | — | runPendingSync() → อัปโหลด cache ขึ้น DB |

---

*อ้างอิงจาก `utils/pinsSync.ts`, `app/(tabs)/index.tsx`, `app/(tabs)/map.tsx`, `app/(tabs)/settings.tsx`, `components/PinItem.tsx`*
