# 📍 Pinnit App

แอปบันทึกตำแหน่งที่ชอบ — บันทึกจุดบนแผนที่ ดูและจัดการ pins ได้ง่าย  
สร้างด้วย **React Native** และ **Expo** ใช้ได้โดยไม่ต้องล็อกอิน (ข้อมูลเก็บในเครื่อง) หรือล็อกอินเพื่อซิงค์ pins กับ **Supabase** และใช้ร่วมกันข้ามอุปกรณ์ได้

---

## สารบัญ / Table of Contents

- [เกี่ยวกับ / About](#-เกี่ยวกับ--about)
- [ฟีเจอร์ / Features](#-ฟีเจอร์--features)
- [เริ่มต้นใช้งาน / Getting Started](#-getting-started)
- [สคริปต์ / Scripts](#-available-scripts)
- [โครงสร้างโปรเจกต์ / Project Structure](#-project-structure)
- [เทคโนโลยี / Tech Stack](#-technology-stack)
- [การใช้งาน / Usage](#-usage-guide)
- [การตั้งค่า / Configuration](#-configuration)
- [หน้าจอแอป / App Screens](#-app-screens)
- [สิทธิ์แอป / Permissions](#-permissions)
- [แก้ปัญหา / Troubleshooting](#-troubleshooting)
- [เอกสารเทคนิค / Tech Docs](#-เอกสารเทคนิค--tech-documentation)
- [ผู้พัฒนา / Credits](#-developer-information)

---

## 📱 เกี่ยวกับ / About

**Pinnit** เป็นแอปมือถือที่ให้คุณบันทึกตำแหน่งสำคัญและจัดการได้จากที่เดียว

- **ใช้โดยไม่ล็อกอิน** — ข้อมูล pins เก็บในเครื่อง (AsyncStorage) เท่านั้น
- **ใช้พร้อมล็อกอิน** — ข้อมูล sync กับ Supabase ได้ อัปโหลด/ดาวน์โหลด pins ระหว่างบัญชีกับเครื่อง

Pinnit lets you:

- **Pin ตำแหน่งปัจจุบัน** — บันทึกพิกัดพร้อมชื่อจาก reverse geocoding (หรือตั้งชื่อเอง)
- **ดูบนแผนที่** — ดู pins ทั้งหมดบนแผนที่ (react-native-maps)
- **แก้ไขชื่อ** — กดค้างที่รายการเพื่อแก้ชื่อ pin (เฉพาะ pin ที่เป็นเจ้าของ)
- **ปัดเพื่อลบ** — ลบ pin ด้วยการปัด (swipe); pin ที่ไม่ใช่เจ้าของแสดงแบบอ่านอย่างเดียว
- **โหมดมืด & สไตล์แผนที่** — เก็บค่าการตั้งค่าในเครื่อง
- **ซิงค์กับ Cloud** — ล็อกอินด้วย username; อัปโหลด pins จากเครื่องขึ้นบัญชี หรือดาวน์โหลดจากบัญชีลงเครื่อง (ตั้งค่าใน Settings)

---

## ✨ ฟีเจอร์ / Features

| ฟีเจอร์ | รายละเอียด |
|--------|-------------|
| 🗺️ แผนที่ | แผนที่อินเทอร์แอคทีฟ (react-native-maps) + ติดตามตำแหน่ง (expo-location) |
| 📌 Pin ตำแหน่ง | แตะบนแผนที่หรือปุ่ม "ปักหมุดตำแหน่งปัจจุบัน" ในหน้า Home; reverse geocoding หาชื่อสถานที่ |
| ✏️ แก้ไขชื่อ | กดค้างที่รายการ pin เพื่อแก้ชื่อ (เฉพาะ pin ที่เป็นเจ้าของ) |
| 🗑️ ลบแบบปัด | ปัดที่รายการเพื่อลบ; pin จาก cloud ที่ไม่ใช่เจ้าของเป็น read-only |
| 👤 ล็อกอิน/สมัคร | หน้า Login & Sign-up (app/(auth)); ล็อกอินด้วย username → sync กับ Supabase |
| ☁️ ซิงค์บัญชี | อัปโหลด pins จากเครื่องขึ้นบัญชี / ดาวน์โหลด pins จากบัญชีลงเครื่อง (Settings) |
| 🌙 โหมดมืด | เปิด/ปิดโหมดมืด และจำค่าที่เลือก (AsyncStorage) |
| 📱 หลายแพลตฟอร์ม | iOS, Android, Web |
| 🎨 UI | ดีไซน์เรียบง่าย; รายการ pins ใช้ FlatList (virtualization) |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** (v18 ขึ้นไป)
- **npm** หรือ **yarn**
- **Expo** (ใช้ผ่าน `npx` ได้)
- **Git**

สำหรับรันบนมือถือ/จำลอง:

- **iOS**: Xcode (Simulator) หรือแอป **Expo Go**
- **Android**: Android Studio (Emulator) หรือแอป **Expo Go**

### Clone & Install

```bash
git clone <repository-url>
cd PinnitApp
npm install
```

### Environment Variables

สร้างไฟล์ `.env` ที่โฟลเดอร์ราก (คัดจาก `.env.example`):

```bash
cp .env.example .env
```

แก้ไข `.env` และใส่ค่าที่จำเป็น:

```env
# Geocoding (reverse: พิกัด → ชื่อสถานที่)
GEOCODE_API_KEY=your_api_key_here
GEOCODE_API_URL=https://geocode.maps.co/reverse
STORAGE_KEY=@pinnit_saved_pins

# Supabase (Auth + ฐานข้อมูล pins) — สร้างโปรเจกต์ที่ https://supabase.com
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
```

> 🔑 Geocoding API: [geocode.maps.co](https://geocode.maps.co/) · Supabase: [supabase.com](https://supabase.com)

---

## 📋 Available Scripts

| คำสั่ง | คำอธิบาย |
|--------|----------|
| `npm start` | เปิด Expo dev server |
| `npm run start:ios` | เปิดพร้อมรันบน iOS (localhost) |
| `npm run android` | รันบน Android emulator/device |
| `npm run ios` | รันบน iOS simulator |
| `npm run web` | รันเวอร์ชันเว็บ |
| `npm run lint` | ตรวจโค้ดด้วย ESLint |
| `npm run reset-project` | รีเซ็ตโปรเจกต์ (ย้าย starter code ไป `app-example`) |

---

## 🏗️ Project Structure

```
PinnitApp/
├── app/                      # หน้าจอและ routing (Expo Router, file-based)
│   ├── _layout.tsx           # Root Stack layout
│   ├── index.tsx             # Redirect ไป /(tabs)
│   ├── (tabs)/               # Bottom tabs
│   │   ├── _layout.tsx       # Tab layout
│   │   ├── index.tsx         # Home — รายการ pins (local + Supabase)
│   │   ├── map.tsx           # แผนที่ + markers
│   │   └── settings.tsx      # ตั้งค่า, ล็อกอิน/สมัคร, อัปโหลด/ดาวน์โหลด pins
│   └── (auth)/               # กลุ่มหน้าจอ Auth (ไม่มี tabs)
│       ├── login.tsx         # เข้าสู่ระบบ (username → email @pinnit.local)
│       └── sign-up.tsx       # สมัครสมาชิก
├── lib/
│   └── supabase.ts           # Supabase client (Auth + DB)
├── components/
│   ├── PinItem.tsx           # รายการ pin; swipe-to-delete, long-press แก้ชื่อ, read-only
│   └── SettingsRow.tsx       # แถวตั้งค่า
├── types/
│   └── pinnit.ts             # PinnitItem และ types ที่เกี่ยวข้อง
├── utils/
│   ├── storage.ts            # AsyncStorage (pins, settings, cache, pending sync)
│   ├── pinsSync.ts           # โหลด/บันทึก/ซิงค์ ระหว่าง local กับ Supabase
│   ├── geocoding.ts          # getLocationName(lat, lon) — reverse geocoding (fetch)
│   └── format.ts             # จัดรูปแบบเวลา
├── docs/
│   └── TECH_STACK_DOCUMENTATION.md   # รายงานเทคนิคฉบับเต็ม
├── assets/
├── .env.example / .env
├── babel.config.js, tsconfig.json, package.json
└── README.md
```

---

## 🛠️ Technology Stack

| หมวด | เทคโนโลยี |
|------|-----------|
| Framework | React Native 0.81, Expo ~54 |
| Language | TypeScript 5.9 |
| Routing | Expo Router ~6 (file-based), React Navigation (Stack + Bottom Tabs) |
| แผนที่ | react-native-maps (MapView, Marker, Region) |
| ตำแหน่ง | expo-location (getCurrentPositionAsync, watchPositionAsync, permissions) |
| เก็บข้อมูลในเครื่อง | @react-native-async-storage/async-storage (pins, settings, cache, sync state) |
| Backend & DB | Supabase (@supabase/supabase-js) — Auth + ตาราง `pins`, RLS |
| ดึงข้อมูล | fetch (geocoding API), Supabase SDK (select/insert/update/delete) |
| รายการ | FlatList (virtualization, keyExtractor, renderItem → PinItem) |
| Env | react-native-dotenv (GEOCODE_*, STORAGE_KEY, SUPABASE_*) |
| ไอคอน | @expo/vector-icons (Ionicons) |

---

## 📖 Usage Guide

### รันแอป

1. เปิด dev server:
   ```bash
   npm start
   ```
2. เลือกแพลตฟอร์ม:
   - กด `a` = Android  
   - กด `i` = iOS  
   - กด `w` = Web  
   - หรือสแกน QR ด้วย **Expo Go** บนมือถือ

### Build สำหรับ Production (EAS Build)

Expo แนะนำใช้ **EAS Build** สำหรับ build จริง:

```bash
npm install -g eas-cli
eas build --platform android
eas build --platform ios
```

ดูรายละเอียด: [Expo EAS Build](https://docs.expo.dev/build/introduction/)

---

## 🔧 Configuration

- **Environment**: คัดลอก `.env.example` → `.env` แล้วใส่ `GEOCODE_*` และ `SUPABASE_*`
- **Babel**: ใช้ `react-native-dotenv` ใน `babel.config.js`
- **Path aliases**: ใช้ `@/` สำหรับ import (เช่น `@/lib/supabase`, `@/utils/pinsSync`, `@/types/pinnit`)
- **AsyncStorage keys** (อ้างอิงจากเอกสารเทคนิค): `@pinnit_saved_pins` (local pins), `@pinnit_dark_mode`, `@pinnit_map_style`, `@pinnit_pins_cache`, `@pinnit_pending_sync`, `@pinnit_last_sync_at`

---

## 📱 App Screens

| หน้าจอ | หน้าที่ |
|--------|--------|
| **Home** (`(tabs)/index`) | รายการ pins (local + จาก Supabase เมื่อล็อกอิน), ปุ่ม "ปักหมุดตำแหน่งปัจจุบัน" เพื่อเพิ่ม pin, แตะรายการ → ไป Map ที่ pin นั้น, กดค้างแก้ชื่อ / ปัดลบ (เฉพาะเจ้าของ) |
| **Map** (`(tabs)/map`) | MapView + markers ทุก pin + ตำแหน่งปัจจุบัน, แตะบนแผนที่เพื่อเพิ่ม pin, เลื่อนมุมมองไปยัง pin ที่เลือกจาก Home |
| **Settings** (`(tabs)/settings`) | โหมดมืด, สไตล์แผนที่, ล็อกอิน/สมัคร, อัปโหลด pins ขึ้นบัญชี, ดาวน์โหลด pins ลงเครื่อง, export/import, เกี่ยวกับแอป |
| **Login** (`(auth)/login`) | เข้าสู่ระบบด้วย username (ภายในใช้ email แบบ username@pinnit.local) |
| **Sign-up** (`(auth)/sign-up`) | สมัครสมาชิก |

---

## 🔐 Permissions

- **Location** — สำหรับตำแหน่งปัจจุบันและติดตามการเคลื่อนที่
- **Storage** — สำหรับเก็บ pins ในเครื่อง

---

## 🐛 Troubleshooting

| ปัญหา | วิธีแก้ |
|--------|--------|
| Metro ไม่รัน / แก้โค้ดแล้วไม่อัปเดต | `npx expo start --clear` |
| ค่าใน `.env` ไม่โหลด | ตรวจว่า `.env` อยู่ที่ root, restart Metro หลังแก้ `.env` |
| ตำแหน่งไม่ทำงาน | เปิดสิทธิ์ Location ของแอป/เครื่อง, บน iOS Simulator: Features → Location |
| Build/ติดตั้งผิดพลาด | ลบ `node_modules` แล้ว `npm install` ใหม่ |

---

## 📄 เอกสารเทคนิค / Tech Documentation

รายงานการออกแบบและเทคนิคที่ใช้ใน PinnitApp (Navigation, Home/FlatList, Fetch, AsyncStorage, GPS/Map, Supabase) อธิบายโดยละเอียดใน:

- **[docs/TECH_STACK_DOCUMENTATION.md](docs/TECH_STACK_DOCUMENTATION.md)** — รายงานฉบับเต็ม (ภาษาไทย)

---

## 👨‍💻 Developer Information

| รายการ | รายละเอียด |
|--------|-------------|
| **Developer** | Cherdsak Kh. |
| **Email** | cherd8524@gmail.com |
| **Project** | PinnitApp v1.0.0 |

---

## 📚 Resources

- [Expo Documentation](https://docs.expo.dev/)
- [React Native](https://reactnative.dev/)
- [Expo Router](https://docs.expo.dev/router/introduction/)
- [Supabase](https://supabase.com/docs)
- [react-native-maps](https://github.com/react-native-maps/react-native-maps)
- [geocode.maps.co](https://geocode.maps.co/)

---

Made with ❤️ for keeping track of your favorite places.
