## 1. Tech Stack Documentation

รายงานฉบับนี้นำเสนอการออกแบบและการทำงานของแอปพลิเคชัน PinnitApp ซึ่งเป็นแอปสำหรับปักหมุดตำแหน่งบนแผนที่เพื่อบันทึกสถานที่สำคัญไว้ใช้งานในภายหลัง ผู้ใช้สามารถใช้งานได้ทั้งในกรณีที่ยังไม่ได้ล็อกอิน (ข้อมูลถูกเก็บไว้ในเครื่อง) และกรณีที่เข้าสู่ระบบด้วยบัญชีผู้ใช้ (ข้อมูลถูกจัดเก็บในฐานข้อมูลบน Supabase) รายงานจะอธิบายส่วนประกอบหลักของระบบ ได้แก่ ระบบนำทาง (navigation) หน้าแรกของแอป (Home) การแสดงผลด้วย FlatList การดึงข้อมูลด้วย fetch การจัดเก็บข้อมูลด้วย AsyncStorage การใช้งาน GPS/แผนที่ และระบบ Backend ผ่าน Supabase

PinnitApp พัฒนาด้วยเทคโนโลยีหลักคือ Expo / React Native และภาษา TypeScript โดยใช้ `expo-router` เป็นระบบ routing หลัก ร่วมกับ React Navigation ในการจัดการโครงสร้างหน้าจอของแอป ด้านแผนที่ใช้ไลบรารี `react-native-maps` ควบคู่กับ `expo-location` ในการอ่านตำแหน่ง GPS ของผู้ใช้ สำหรับการจัดเก็บข้อมูลถาวรในเครื่องใช้ `@react-native-async-storage/async-storage` ส่วนข้อมูลถาวรบน Cloud ใช้บริการ Supabase ผ่านไลบรารี `@supabase/supabase-js`

## 2. ระบบ Navigation

ระบบ Navigation ของ PinnitApp ออกแบบบนพื้นฐานของ `expo-router` ซึ่งเป็น file-based routing ที่ใช้โครงสร้างโฟลเดอร์และชื่อไฟล์ภายในไดเรกทอรี `app/` เป็นตัวกำหนดเส้นทางของหน้าต่าง ๆ ในแอป ด้านใน `expo-router` ทำงานร่วมกับ React Navigation เพื่อจัดการ Stack และ Bottom Tabs ให้ผู้ใช้สามารถสลับระหว่างหน้าแรก หน้าแผนที่ และหน้าตั้งค่าได้อย่างสะดวก โครงสร้างสำคัญประกอบด้วย `app/_layout.tsx` ซึ่งทำหน้าที่เป็น Root Stack Layout สำหรับทั้งแอป `app/index.tsx` ที่ทำการ redirect ไปยังกลุ่มแท็บ `/(tabs)` และ `app/(tabs)/_layout.tsx` ที่นิยาม Bottom Tabs สำหรับหน้าแรก (`index.tsx`), หน้าแผนที่ (`map.tsx`) และหน้าตั้งค่า (`settings.tsx`) นอกจากนี้ยังมีโฟลเดอร์ `app/(auth)/` ซึ่งประกอบด้วยหน้า `login.tsx` และ `sign-up.tsx` สำหรับการเข้าสู่ระบบและสมัครสมาชิก

ในมุมมองของผู้ใช้ ลำดับการนำทางจะเริ่มต้นจากการเปิดแอป PinnitApp ขึ้นมา ระบบจะแสดงหน้าแท็บหลักให้ใช้งานได้ทันที โดยไม่บังคับให้เข้าสู่ระบบก่อน ผู้ใช้สามารถสลับไปมาระหว่างหน้าแรก หน้าแผนที่ และหน้าตั้งค่าได้ผ่านแถบแท็บด้านล่าง หากต้องการเข้าสู่ระบบหรือลงทะเบียน จึงค่อยไปที่หน้าตั้งค่าแล้วเลือกเมนูที่เกี่ยวข้องเพื่อเข้าสู่หน้าล็อกอินหรือสมัครสมาชิก เมื่ออยู่ในหน้าแรก ผู้ใช้สามารถแตะที่รายการปักหมุดเพื่อเปลี่ยนไปยังหน้าแผนที่ ซึ่งจะแสดงตำแหน่งของหมุดที่เลือกและเลื่อนมุมมองแผนที่ไปยังจุดนั้นโดยอัตโนมัติ

- (Ref: https://github.com/cherd8524/PinnitApp/blob/master/app/_layout.tsx#L2)
- (Ref: https://github.com/cherd8524/PinnitApp/blob/master/app/index.tsx#L1)
- (Ref: https://github.com/cherd8524/PinnitApp/blob/master/app/(tabs)/_layout.tsx#L2)
- (Ref: https://github.com/cherd8524/PinnitApp/blob/master/app/(auth)/_layout.tsx#L1)
- (Ref: https://github.com/cherd8524/PinnitApp/blob/master/app/(auth)/login.tsx)
- (Ref: https://github.com/cherd8524/PinnitApp/blob/master/app/(auth)/sign-up.tsx)

## 3. หน้า Home (หน้าแรกของแอป)

หน้า Home ซึ่งนิยามในไฟล์ `app/(tabs)/index.tsx` ทำหน้าที่เป็นจุดเริ่มต้นหลักของการใช้งาน PinnitApp โดยแสดงรายการปักหมุด (pins) ทั้งหมดที่ผู้ใช้สามารถมองเห็นได้ในขณะนั้น ซึ่งอาจมาจากสองแหล่งคือ รายการที่เก็บในเครื่อง (local storage) และรายการที่เก็บในฐานข้อมูล Supabase (กรณีผู้ใช้ล็อกอิน) เมื่อผู้ใช้กดปุ่ม "ปักหมุดตำแหน่งปัจจุบัน" ในหน้า Home ระบบจะอ่านตำแหน่ง GPS ปัจจุบันของผู้ใช้ เรียกใช้บริการ reverse geocoding เพื่อหาชื่อสถานที่ และสร้างรายการปักหมุดใหม่เพิ่มเข้าไปในรายการ

ผู้ใช้สามารถแตะที่รายการปักหมุดเพื่อเปิดหน้าแผนที่และเลื่อนไปยังตำแหน่งที่เกี่ยวข้องได้ทันที หากผู้ใช้เป็นเจ้าของปักหมุดนั้น (เช่น เป็นปักหมุดจากบัญชีของตนเองหรือจากอุปกรณ์ของตนเองในโหมดไม่ล็อกอิน) จะสามารถกดค้างที่รายการเพื่อแก้ไขชื่อปักหมุดได้ รวมถึงสามารถปัดรายการไปด้านข้างเพื่อแสดงปุ่มลบและลบปักหมุดออกจากระบบได้ ในทางกลับกัน หากเป็นปักหมุดที่มาจากฝั่ง local เมื่อผู้ใช้กำลังล็อกอินอยู่ ระบบจะแสดงเป็นรายการแบบอ่านอย่างเดียวเพื่อรักษากฎว่า “ไม่ใช่เจ้าของจะลบ/แก้ไขไม่ได้”

ในเชิงเทคนิค หน้า Home ใช้ `useFocusEffect` ในการโหลดรายการปักหมุดทุกครั้งที่หน้าได้รับโฟกัส ทำให้เมื่อผู้ใช้เพิ่ม แก้ไข หรือ ลบปักหมุดจากหน้าจออื่นแล้วกลับมาหน้าแรก ข้อมูลจะถูกอัปเดตอย่างถูกต้องเสมอ การแสดงผลแต่ละรายการแยกออกเป็นคอมโพเนนต์ย่อยชื่อ `PinItem` ซึ่งรองรับการปัดเพื่อลบ การแสดงสถานะ read-only และการตอบสนองต่อการกดค้างเพื่อแก้ไขชื่อ โดยมีไฟล์ `utils/pinsSync.ts` เป็นตัวกลางในการโหลด บันทึก และซิงค์ข้อมูลระหว่าง local storage และ Supabase

- (Ref: https://github.com/cherd8524/PinnitApp/blob/master/app/(tabs)/index.tsx#L93)
- (Ref: https://github.com/cherd8524/PinnitApp/blob/master/app/(tabs)/index.tsx#L26)
- (Ref: https://github.com/cherd8524/PinnitApp/blob/master/app/(tabs)/index.tsx#L329)
- (Ref: https://github.com/cherd8524/PinnitApp/blob/master/components/PinItem.tsx)
- (Ref: https://github.com/cherd8524/PinnitApp/blob/master/utils/pinsSync.ts)

## 4. FlatList

การแสดงรายการปักหมุดในหน้า Home ใช้คอมโพเนนต์ `FlatList` ของ React Native เพื่อรองรับรายการจำนวนมากอย่างมีประสิทธิภาพ `FlatList` จะทำงานด้วยแนวคิด virtualization คือเรนเดอร์เฉพาะรายการที่มองเห็นบนหน้าจอและบริเวณใกล้เคียง ช่วยลดการใช้หน่วยความจำและทำให้การเลื่อนหน้าจอราบรื่น โครงสร้างของ `FlatList` จะกำหนดให้ใช้ฟังก์ชัน `renderItem` ในการนำข้อมูลแต่ละรายการ (pin) ไปแสดงด้วยคอมโพเนนต์ `PinItem` ซึ่งภายในจัดการทั้งชื่อปักหมุด เวลา การตอบสนองต่อการแตะ การกดค้าง และการปัดเพื่อลบ

นอกจากนี้ `FlatList` ยังใช้ `keyExtractor` โดยกำหนดให้ใช้ `id` ของปักหมุดแต่ละรายการเป็นค่า key เพื่อให้ React สามารถติดตามและอัปเดตรายการที่เปลี่ยนแปลงได้อย่างถูกต้อง ลดการเรนเดอร์ซ้ำโดยไม่จำเป็น และช่วยให้ประสิทธิภาพของหน้า Home สูงขึ้น แม้จำนวนปักหมุดจะมีมากก็ตาม

- (Ref: https://github.com/cherd8524/PinnitApp/blob/master/app/(tabs)/index.tsx#L542)
- (Ref: https://github.com/cherd8524/PinnitApp/blob/master/app/(tabs)/index.tsx#L328)
- (Ref: https://github.com/cherd8524/PinnitApp/blob/master/app/(tabs)/index.tsx#L544)
- (Ref: https://github.com/cherd8524/PinnitApp/blob/master/app/(tabs)/index.tsx#L545)
- (Ref: https://github.com/cherd8524/PinnitApp/blob/master/components/PinItem.tsx)

## 5. Fetch (Data Fetching)

ในส่วนของการดึงข้อมูลจากบริการภายนอก PinnitApp ใช้ Web API `fetch` ผ่านฟังก์ชันช่วยเหลือที่นิยามไว้ในไฟล์ `utils/geocoding.ts` ฟังก์ชันหลักคือ `getLocationName(lat, lon)` ซึ่งรับค่าละติจูดและลองจิจูด แล้วใช้ `fetch` เรียก API reverse geocoding เพื่อนำพิกัดดังกล่าวไปแปลงเป็นชื่อสถานที่ที่มนุษย์อ่านเข้าใจได้ การตั้งค่า URL และคีย์สำหรับการเชื่อมต่อบริการนี้ถูกอ่านมาจากไฟล์ `.env` ผ่านตัวแปร เช่น `GEOCODE_API_URL` และ `GEOCODE_API_KEY` ทำให้สามารถเปลี่ยนแปลงปลายทางของ API ได้โดยไม่ต้องแก้ไขโค้ดหลักของแอป

ฟังก์ชัน `getLocationName` ถูกเรียกใช้งานทุกครั้งที่มีการสร้างปักหมุดใหม่จากตำแหน่งปัจจุบันของผู้ใช้ เช่น เมื่อผู้ใช้กดปุ่มเพิ่มปักหมุดในหน้า Home ระบบจะอ่านพิกัด GPS แล้วส่งให้ฟังก์ชันนี้เพื่อดึงชื่อสถานที่มาประกอบกับปักหมุด หากเกิดกรณีที่ API ไม่ตอบสนองหรือเกิดข้อผิดพลาด ฟังก์ชันจะจัดการข้อผิดพลาดและอาจใช้ชื่อสำรอง (เช่น ชื่อทั่วไปหรือชื่อที่สร้างจากพิกัด) เพื่อให้แอปยังสามารถทำงานต่อได้อย่างต่อเนื่อง

นอกจากนั้น การเชื่อมต่อกับ Supabase ก็อาศัยแนวคิดเดียวกัน คือการส่งคำสั่ง HTTP ผ่าน SDK `@supabase/supabase-js` ซึ่งภายในก็ใช้ `fetch` แต่ผู้พัฒนาไม่จำเป็นต้องเรียกใช้ `fetch` ตรง ๆ สามารถเขียนโค้ดในรูปแบบฟังก์ชันเชิงวัตถุ เช่น `.select()`, `.insert()` และ `.update()` แทน

- (Ref: https://github.com/cherd8524/PinnitApp/blob/master/utils/geocoding.ts#L4)
- (Ref: https://github.com/cherd8524/PinnitApp/blob/master/utils/geocoding.ts#L10)

## 6. Async Storage

การจัดเก็บข้อมูลถาวรบนอุปกรณ์ของผู้ใช้ PinnitApp ใช้ไลบรารี `@react-native-async-storage/async-storage` ในการเก็บข้อมูลแบบ key-value โครงสร้างการจัดเก็บแบ่งออกเป็นสองกลุ่มหลักคือ ข้อมูลการตั้งค่าของผู้ใช้ และข้อมูลปักหมุด/สถานะการซิงค์ สำหรับการตั้งค่า แอปใช้ key เช่น `@pinnit_dark_mode` เพื่อเก็บสถานะโหมดมืด และ `@pinnit_map_style` เพื่อเก็บรูปแบบการแสดงผลของแผนที่ ทำให้เมื่อผู้ใช้เปิดแอปในครั้งถัดไป สามารถคืนค่าการตั้งค่าเดิมได้โดยอัตโนมัติ

ส่วนของข้อมูลปักหมุดและการซิงค์มีการใช้ key หลายตัวร่วมกัน ได้แก่ `@pinnit_saved_pins` (ในเอกสารเรียก `STORAGE_KEY`) สำหรับเก็บ “รายการในเครื่อง” ซึ่งรวมทั้งปักหมุดที่สร้างในขณะไม่ได้ล็อกอิน และปักหมุดที่ผู้ใช้เลือกดาวน์โหลดจากบัญชีลงมาเก็บบนอุปกรณ์ นอกจากนี้ยังมี `@pinnit_pins_cache` สำหรับเก็บสำเนาของปักหมุดที่มาจาก Supabase ของผู้ใช้ ซึ่งใช้เมื่อต้องทำงานแบบออฟไลน์, `@pinnit_pending_sync` สำหรับเก็บรายการที่ยังซิงค์ขึ้นฐานข้อมูลไม่สำเร็จเมื่อออฟไลน์ และ `@pinnit_last_sync_at` สำหรับเก็บเวลาที่มีการซิงค์ล่าสุดไว้แสดงในหน้าตั้งค่า

เมื่อผู้ใช้ยังไม่ได้ล็อกอิน การเพิ่ม ลบ หรือแก้ไขปักหมุดทั้งหมดจะทำงานกับ `STORAGE_KEY` เพียงอย่างเดียว จึงถือว่าเป็นข้อมูลฝั่ง local ทั้งหมด แต่เมื่อผู้ใช้ล็อกอินแล้ว การดำเนินการกับปักหมุดของบัญชีจะทำงานผ่านชุดฟังก์ชันใน `utils/pinsSync.ts` ซึ่งบันทึกข้อมูลไปยัง Supabase และ `@pinnit_pins_cache` โดยไม่แก้ไข `STORAGE_KEY` เพื่อแยกความรับผิดชอบของสองฝั่งข้อมูลให้ชัดเจน

- (Ref: https://github.com/cherd8524/PinnitApp/blob/master/utils/storage.ts#L1)
- (Ref: https://github.com/cherd8524/PinnitApp/blob/master/utils/storage.ts#L5)
- (Ref: https://github.com/cherd8524/PinnitApp/blob/master/utils/storage.ts#L6)
- (Ref: https://github.com/cherd8524/PinnitApp/blob/master/utils/pinsSync.ts#L6)
- (Ref: https://github.com/cherd8524/PinnitApp/blob/master/utils/pinsSync.ts#L7)
- (Ref: https://github.com/cherd8524/PinnitApp/blob/master/utils/pinsSync.ts#L8)
- (Ref: https://github.com/cherd8524/PinnitApp/blob/master/lib/supabase.ts#L1)
- (Ref: https://github.com/cherd8524/PinnitApp/blob/master/lib/supabase.ts#L14)

## 7. GPS / Map

การทำงานร่วมกับ GPS และแผนที่ใน PinnitApp เป็นหัวใจสำคัญของแอป โดยใช้ `expo-location` สำหรับจัดการการขออนุญาตและอ่านตำแหน่งของผู้ใช้ และ `react-native-maps` สำหรับการแสดงผลแผนที่และปักหมุด ในระดับโค้ด แอปจะเรียก `requestForegroundPermissionsAsync` เพื่อขอสิทธิ์เข้าถึงตำแหน่งก่อน จากนั้นจึงใช้ `getCurrentPositionAsync` เพื่ออ่านตำแหน่งปัจจุบันครั้งเดียวเมื่อผู้ใช้ต้องการสร้างปักหมุดใหม่ และอาจใช้ `watchPositionAsync` เมื่อจำเป็นต้องติดตามตำแหน่งแบบต่อเนื่อง

ในหน้า Home การกดปุ่มเพิ่มปักหมุดจะทำให้ระบบอ่านตำแหน่งปัจจุบันผ่าน `expo-location` แล้วสร้างรายการปักหมุดใหม่ ในขณะที่หน้าแผนที่ (`app/(tabs)/map.tsx`) จะแสดงคอมโพเนนต์ `MapView` แบบเต็มหน้าจอ โดยมี `Marker` สำหรับแต่ละปักหมุดที่มีอยู่ในระบบ รวมถึง marker สำหรับตำแหน่งปัจจุบันของผู้ใช้ด้วย การควบคุมมุมมองของแผนที่จะใช้วัตถุ `Region` เพื่อระบุศูนย์กลางและระดับการซูม และสามารถสั่งให้แผนที่เลื่อนหรือซูมไปยังตำแหน่งของปักหมุดใดปักหมุดหนึ่งเมื่อผู้ใช้เลือกจากหน้า Home

- (Ref: https://github.com/cherd8524/PinnitApp/blob/master/app/(tabs)/index.tsx#L19)
- (Ref: https://github.com/cherd8524/PinnitApp/blob/master/app/(tabs)/index.tsx#L115)
- (Ref: https://github.com/cherd8524/PinnitApp/blob/master/app/(tabs)/index.tsx#L123)
- (Ref: https://github.com/cherd8524/PinnitApp/blob/master/app/(tabs)/index.tsx#L134)
- (Ref: https://github.com/cherd8524/PinnitApp/blob/master/app/(tabs)/map.tsx#L13)
- (Ref: https://github.com/cherd8524/PinnitApp/blob/master/app/(tabs)/map.tsx#L14)
- (Ref: https://github.com/cherd8524/PinnitApp/blob/master/app/(tabs)/map.tsx#L378)
- (Ref: https://github.com/cherd8524/PinnitApp/blob/master/app/(tabs)/map.tsx#L393)
- (Ref: https://github.com/cherd8524/PinnitApp/blob/master/app/(tabs)/map.tsx#L411)
- (Ref: https://github.com/cherd8524/PinnitApp/blob/master/app/(tabs)/map.tsx#L509)
- (Ref: https://github.com/cherd8524/PinnitApp/blob/master/app/(tabs)/map.tsx#L524)
- (Ref: https://github.com/cherd8524/PinnitApp/blob/master/app/(tabs)/map.tsx#L538)

## 8. Supabase (Backend & Database)

Supabase ทำหน้าที่เป็น Backend หลักของ PinnitApp ทั้งในส่วนของการยืนยันตัวตน (Authentication) และฐานข้อมูลปักหมุด (Database) แอปใช้ไลบรารี `@supabase/supabase-js` ในการสร้าง client ผ่านไฟล์ `lib/supabase.ts` โดยกำหนดค่า URL และ Anon Key จากตัวแปรในไฟล์ `.env` ด้าน Authentication แอปออกแบบให้ผู้ใช้ล็อกอินด้วย “username” แต่ภายในจะถูกแปลงเป็นอีเมลในรูปแบบ `username@pinnit.local` เพื่อใช้ร่วมกับระบบของ Supabase ได้สะดวก เมื่อผู้ใช้เข้าสู่ระบบสำเร็จ session จะถูกเก็บไว้ใน AsyncStorage ทำให้ผู้ใช้ไม่ต้องล็อกอินใหม่ทุกครั้งที่เปิดแอป

ในส่วนของฐานข้อมูล มีการออกแบบตาราง `pins` เพื่อเก็บข้อมูลปักหมุดของผู้ใช้ เช่น รหัสปักหมุด (`id`), รหัสผู้ใช้ (`user_id`), ชื่อปักหมุด (`name`), ค่าพิกัด (`latitude`, `longitude`) และเวลา (`created_at`) พร้อมเปิดใช้ Row Level Security (RLS) เพื่อกำหนดกฎว่าผู้ใช้แต่ละคนสามารถเห็นและแก้ไขได้เฉพาะปักหมุดที่มี `user_id` ตรงกับตนเองเท่านั้น เมื่อผู้ใช้ล็อกอินและโหลดข้อมูลเข้าสู่หน้า Home แอปจะดึงข้อมูลจาก Supabase หรือจาก cache (`@pinnit_pins_cache`) แล้วรวมเข้ากับ “รายการในเครื่อง” จาก `STORAGE_KEY` โดยหากมีรายการซ้ำกันระหว่างสองฝั่ง ระบบจะให้ข้อมูลจากฐานข้อมูลเป็นหลัก และรายการที่มาจาก local จะถูกแสดงเป็นแบบอ่านอย่างเดียว

เมื่อมีการเพิ่ม ลบ หรือแก้ไขปักหมุดในขณะที่ผู้ใช้ล็อกอิน การดำเนินการทั้งหมดจะทำผ่านฟังก์ชันใน `utils/pinsSync.ts` ซึ่งจะอัปเดตทั้ง Supabase และ cache โดยไม่แตะต้อง `STORAGE_KEY` และในหน้าตั้งค่ายังมีปุ่มพิเศษสองปุ่มคือ ปุ่ม “อัปโหลดปักหมุดขึ้นบัญชี” สำหรับนำรายการจาก `STORAGE_KEY` ไปสร้างเป็นปักหมุดใน Supabase ของผู้ใช้ (โดยไม่ลบข้อมูลในเครื่อง) และปุ่ม “ดาวน์โหลดปักหมุดลงเครื่อง” สำหรับดึงข้อมูลจาก Supabase (ผ่าน cache) มารวมเข้ากับ `STORAGE_KEY` และทำให้รายการเหล่านั้นถือว่าเป็นของอุปกรณ์

- (Ref: https://github.com/cherd8524/PinnitApp/blob/master/lib/supabase.ts#L2)
- (Ref: https://github.com/cherd8524/PinnitApp/blob/master/lib/supabase.ts#L12)
- (Ref: https://github.com/cherd8524/PinnitApp/blob/master/lib/supabase.ts#L14)
- (Ref: https://github.com/cherd8524/PinnitApp/blob/master/utils/pinsSync.ts)

## 9. Supabase (Storage)

Supabase Storage ทำหน้าที่เป็นที่เก็บไฟล์ของ PinnitApp ในส่วนรูปโปรไฟล์เท่านั้น แอปใช้ client เดียวกับ Backend และ Auth ผ่าน `lib/supabase.ts` โดยไม่ต้องตั้งค่าเพิ่ม ด้านการจัดเก็บ แอปใช้ bucket ชื่อ `pinnit-app` แบบ public และเก็บรูปใน path `avatars/{user_id}.jpg` (หรือ .png, .webp ตามประเภทไฟล์) เพื่อให้แต่ละผู้ใช้มีไฟล์รูปไม่เกินหนึ่งไฟล์ต่อคน

การเข้าถึง Storage อยู่ภายใต้ Row Level Security (RLS) โดย policy กำหนดให้ผู้ใช้ที่ล็อกอิน (authenticated) สามารถ SELECT, INSERT, UPDATE และ DELETE ได้เฉพาะไฟล์ที่ path ตรงกับ `avatars/{auth.uid()}.%` เท่านั้น จึงป้องกันไม่ให้ผู้ใช้รายหนึ่งอัปโหลดหรือแก้ไขรูปของผู้อื่น หลังอัปโหลดสำเร็จ แอปจะได้ public URL จาก `getPublicUrl()` แล้วบันทึก URL ลงใน `user_metadata.avatar_url` ของผู้ใช้ผ่าน Supabase Auth เพื่อให้หน้าตั้งค่าและส่วนอื่นของแอปสามารถแสดงรูปโปรไฟล์ได้ทันที

ในหน้าตั้งค่า (`app/(tabs)/settings.tsx`) เมื่อผู้ใช้ที่ล็อกอินแล้วแตะที่วงกลมรูปโปรไฟล์ ระบบจะแสดง **action sheet** (เมนูตัวเลือกแบบ bottom sheet) ให้เลือกได้ดังนี้

- **ถ่ายภาพ** — ใช้ `expo-image-picker` เรียก `launchCameraAsync()` ขอสิทธิ์กล้องแล้วถ่ายรูป (ตัดเป็นอัตราส่วน 1:1 ได้) หากอุปกรณ์ไม่มีกล้องหรือเป็นเอมูเลเตอร์ที่รองรับกล้องไม่ได้ แอปจะจับ error และแจ้งให้ผู้ใช้เลือก "อัพโหลดรูปโปรไฟล์" แทน
- **ดูรูปโปรไฟล์** — แสดงเมื่อมีรูปอยู่แล้ว เปิดโมดัลพื้นหลังมืดเพื่อแสดงรูปโปรไฟล์ขนาดใหญ่ พร้อมปุ่มปิด
- **อัพโหลดรูปโปรไฟล์** — แสดงเมื่อยังไม่มีรูป เปิด Image Picker ให้เลือกรูปจากคลัง (ตัดเป็นอัตราส่วน 1:1 ได้)
- **เปลี่ยนรูปโปรไฟล์** — แสดงเมื่อมีรูปอยู่แล้ว เปิด Image Picker เหมือนอัพโหลด เพื่อเลือกรูปใหม่แทนรูปเดิม
- **ลบรูปโปรไฟล์** — แสดงเมื่อมีรูปอยู่แล้ว หลังยืนยันจะเรียก `supabase.auth.updateUser({ data: { ...user_metadata, avatar_url: null, avatar_updated_at: null } })` เพื่อล้าง URL รูปใน metadata (Supabase Auth รวมค่า metadata แบบ merge ดังนั้นต้องส่ง `null` เพื่อให้ค่าถูกล้าง) จากนั้น UI จะกลับไปแสดงตัวอักษรแรกของชื่อในวงกลม
- **ยกเลิก** — ปิด action sheet

เมื่อผู้ใช้เลือกถ่ายภาพหรือเลือกรูปจากคลัง รูปจะถูกส่งในรูปแบบ base64 ไปยังฟังก์ชัน `uploadProfileImage()` ใน `utils/avatarUpload.ts` ฟังก์ชันนี้จะแปลง base64 เป็น ArrayBuffer ด้วยไลบรารี `base64-arraybuffer` แล้วเรียก `supabase.storage.from('pinnit-app').upload()` พร้อมกำหนด `upsert: true` เพื่อเขียนทับรูปเดิมของผู้ใช้คนเดียวกัน เมื่ออัปโหลดเสร็จ แอปจะอัปเดต `user_metadata` ด้วย URL รูปใหม่และค่า `avatar_updated_at` เพื่อให้ UI แสดงรูปล่าสุด

- (Ref: https://github.com/cherd8524/PinnitApp/blob/master/lib/supabase.ts)
- (Ref: https://github.com/cherd8524/PinnitApp/blob/master/utils/avatarUpload.ts#L27)
- (Ref: https://github.com/cherd8524/PinnitApp/blob/master/utils/avatarUpload.ts#L36)
- (Ref: https://github.com/cherd8524/PinnitApp/blob/master/utils/avatarUpload.ts#L45)
- (Ref: https://github.com/cherd8524/PinnitApp/blob/master/app/(tabs)/settings.tsx#L44)
- (Ref: https://github.com/cherd8524/PinnitApp/blob/master/app/(tabs)/settings.tsx#L118)

## 10. Supabase (Auth)

Supabase Auth ทำหน้าที่เป็นระบบยืนยันตัวตนหลักของ PinnitApp สำหรับการล็อกอิน สมัครสมาชิก และออกจากระบบ แอปใช้รูปแบบอีเมล–รหัสผ่าน โดยเชื่อมต่อผ่าน client ใน `lib/supabase.ts` เดียวกับ Backend และ Storage และกำหนดให้เก็บ session ใน AsyncStorage พร้อมเปิด `persistSession` เพื่อให้ผู้ใช้ไม่ต้องล็อกอินใหม่ทุกครั้งที่เปิดแอป หน้าการสมัครและล็อกอินอยู่ที่ `app/(auth)/sign-up.tsx` และ `app/(auth)/login.tsx` ตามลำดับ

แอปออกแบบให้ผู้ใช้กรอก “username” และรหัสผ่านเป็นหลัก โดยภายในจะแปลง username เป็นอีเมลในรูปแบบ `username@pinnit.local` ผ่านฟังก์ชัน `emailFromUsername()` ใน `lib/supabase.ts` แล้วเรียก `supabase.auth.signUp()` หรือ `signInWithPassword()` ตามหน้า เมื่อเข้าสู่ระบบสำเร็จ ระบบจะได้ session และออบเจกต์ `user` ซึ่งมี `user_metadata` ใช้เก็บข้อมูลเพิ่มเติม เช่น ชื่อแสดง (full_name), ชื่อผู้ใช้ (username) และ URL รูปโปรไฟล์ (avatar_url) หลายหน้าในแอปจะเรียก `supabase.auth.getSession()` ตอนโหลดและฟัง `supabase.auth.onAuthStateChange()` เพื่ออัปเดต UI ตามสถานะล็อกอิน เช่น แสดงชื่อผู้ใช้และรูปโปรไฟล์ในหน้าตั้งค่า หรือแสดงข้อความ “บัญชีของฉัน” ในหน้าแรกและหน้าแผนที่

ในหน้าตั้งค่า การ์ดบัญชีผู้ใช้ (เมื่อล็อกอินแล้ว) แสดงรูปโปรไฟล์หรือตัวอักษรแรกของชื่อ ชื่อแสดง และชื่อผู้ใช้/อีเมล ทางขวาของการ์ดมีไอคอนแก้ไข (pencil-outline) เมื่อกดจะเปิด โมดัลเปลี่ยนชื่อโปรไฟล์ ให้กรอกชื่อแสดง (full_name) แล้วบันทึกผ่าน `supabase.auth.updateUser({ data: { ...user_metadata, full_name } })` เพื่ออัปเดต metadata โดยไม่เปลี่ยนอีเมลหรือรหัสผ่าน

เมื่อผู้ใช้เปลี่ยนรูปโปรไฟล์จาก action sheet (ถ่ายภาพหรือเลือกรูปจากคลัง) แอปจะอัปโหลดรูปขึ้น Storage แล้วเรียก `supabase.auth.updateUser({ data: { ...user_metadata, avatar_url, avatar_updated_at } })` เพื่ออัปเดต metadata เมื่อผู้ใช้เลือกลบรูปโปรไฟล์ แอปจะส่ง `avatar_url: null` และ `avatar_updated_at: null` ใน data เพื่อให้ค่าใน metadata ถูกล้าง (เนื่องจาก Supabase รวม metadata แบบ merge) การออกจากระบบทำด้วย `supabase.auth.signOut()` จากนั้น session จะเป็น null และแอปจะกลับไปใช้โหมดไม่ล็อกอิน ข้อมูลปักหมุดที่แสดงจะมาจาก “รายการในเครื่อง” เท่านั้น จนกว่าผู้ใช้จะล็อกอินอีกครั้ง

- (Ref: https://github.com/cherd8524/PinnitApp/blob/master/lib/supabase.ts#L12)
- (Ref: https://github.com/cherd8524/PinnitApp/blob/master/lib/supabase.ts#L24)
- (Ref: https://github.com/cherd8524/PinnitApp/blob/master/lib/supabase.ts#L38)
- (Ref: https://github.com/cherd8524/PinnitApp/blob/master/app/(auth)/sign-up.tsx#L112)
- (Ref: https://github.com/cherd8524/PinnitApp/blob/master/app/(auth)/login.tsx#L63)
- (Ref: https://github.com/cherd8524/PinnitApp/blob/master/app/(tabs)/settings.tsx#L96)