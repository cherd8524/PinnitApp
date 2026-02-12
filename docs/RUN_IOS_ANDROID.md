# รันแอปบน iOS และ Android

## วิธีที่ 1: ใช้ Expo Go (ทดสอบเร็ว ไม่ต้อง build เอง)

เหมาะสำหรับทดสอบฟีเจอร์ส่วนใหญ่ (บาง native module เช่น image picker ใช้ได้ใน Expo Go)

```bash
npm start
# หรือ
npx expo start
```

จากนั้น:
- **iOS:** กด `i` ในเทอร์มินัล หรือสแกน QR ด้วยกล้องแล้วเปิดใน Expo Go
- **Android:** กด `a` ในเทอร์มินัล หรือสแกน QR ด้วยแอป Expo Go

ต้องติดตั้ง **Expo Go** บนเครื่อง/อุปกรณ์ก่อน และเครื่องพัฒนากับมือถือต้องอยู่ในเครือข่ายเดียวกัน (หรือใช้ tunnel: `npx expo start --tunnel`).

---

## วิธีที่ 2: Development Build (รันทั้ง iOS และ Android แบบ build เอง)

ใช้เมื่อต้องการฟีเจอร์ native เต็ม (เช่น `expo-image-picker` กับ plugin ใน `app.json`) หรือทดสอบบน simulator/emulator โดยไม่ใช้ Expo Go.

### ขั้นตอนทั่วไป

1. **ติดตั้ง dependencies**
   ```bash
   npm install
   ```

2. **สร้างโฟลเดอร์ native (ครั้งแรก หรือหลังเพิ่ม/แก้ plugin ใน app.json)**
   ```bash
   npx expo prebuild
   ```
   จะได้โฟลเดอร์ `ios/` และ `android/`

3. **รัน iOS**
   - ต้องมี Xcode (บน macOS) และ iOS Simulator หรือเครื่อง iPhone
   ```bash
   npm run ios
   # หรือ
   npx expo run:ios
   ```

4. **รัน Android**
   - ต้องมี Android Studio และตั้งค่า ANDROID_HOME แล้ว หรือใช้ Android Emulator
   ```bash
   npm run android
   # หรือ
   npx expo run:android
   ```

### รันทั้งสองระบบ (สลับได้)

- **iOS:** `npm run ios` หรือ `npx expo run:ios`
- **Android:** `npm run android` หรือ `npx expo run:android`

ไม่ต้องรันพร้อมกัน: เปิดเทอร์มินัลหนึ่งสำหรับ Metro (`npx expo start`) แล้วเปิดอีกเทอร์มินัลรัน `expo run:ios` หรือ `expo run:android` ตามที่ต้องการก็ได้

### หลังแก้ app.json (เช่น เพิ่ม plugin)

ถ้าเพิ่มหรือแก้ config plugin (เช่น `expo-image-picker`) ต้อง prebuild ใหม่แล้วค่อยรัน:

```bash
npx expo prebuild --clean
npm run ios    # หรือ npm run android
```

---

## สรุปคำสั่ง

| เป้าหมาย              | คำสั่ง |
|------------------------|--------|
| เปิด Metro + เลือกอุปกรณ์ | `npm start` |
| รันบน iOS (build เอง)   | `npm run ios` |
| รันบน Android (build เอง) | `npm run android` |
| Prebuild ใหม่ (หลังแก้ plugin) | `npx expo prebuild --clean` |
