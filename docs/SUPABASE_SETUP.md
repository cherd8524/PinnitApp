# Supabase Setup (ทำครั้งเดียว)

## 0. ติดตั้ง packages ในโปรเจกต์

```bash
npx expo install @supabase/supabase-js
npx expo install @react-native-community/netinfo
npx expo install expo-image-picker expo-image-manipulator
```

จากนั้นเพิ่มใน `.env` (คัดลอกจาก `.env.example`):

- `SUPABASE_URL=...`
- `SUPABASE_ANON_KEY=...`

## 1. สร้างโปรเจกต์ที่ supabase.com

- ไป https://supabase.com → New Project
- ตั้งค่า Database password แล้วจดไว้

## 2. ใส่ URL และ Anon Key ใน .env

จาก Dashboard → Project Settings → API:

- **Project URL** → ใน `.env` ใส่ `SUPABASE_URL=...`
- **anon public** key → ใน `.env` ใส่ `SUPABASE_ANON_KEY=...`

## 3. ปิด Confirm email

Dashboard → **Authentication** → **Providers** → **Email** → ปิด **Confirm email**

## 4. รัน SQL สร้างตาราง pins

Dashboard → **SQL Editor** → New query → วางแล้วรัน:

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

alter table public.pins enable row level security;

create policy "Users can do everything on own pins"
  on public.pins for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

## 5. สร้าง Storage bucket สำหรับรูปโปรไฟล์ (Pinnit App ใช้ bucket ชื่อ `pinnit-app`)

Dashboard → **Storage** → **New bucket** (หรือใช้ bucket ที่มีอยู่แล้ว):

- Name: `pinnit-app`
- Public bucket: เปิด (เพื่อให้ URL รูปใช้ได้)

แอปอัปโหลดรูปโปรไฟล์ไป path แบบ `avatars/{user_id}.jpg` (หรือ .png, .webp) ดังนั้น RLS ต้องอนุญาตเฉพาะเมื่อ path ขึ้นต้นด้วย `avatars/` และชื่อไฟล์ (ก่อนนามสกุล) ตรงกับ `auth.uid()` เท่านั้น

### ตั้งค่า RLS ด้วย SQL (แนะนำ)

Dashboard → **SQL Editor** → New query → วางแล้วรัน (แก้ `pinnit-app` ถ้าใช้ชื่อ bucket อื่น):

```sql
-- สร้าง policy สำหรับ bucket pinnit-app (path: avatars/{auth.uid()}.ext)
-- SELECT: ให้ผู้ใช้ที่ล็อกอินดูไฟล์ใน avatars/ ได้เฉพาะของตัวเอง
create policy "Users can read own avatar"
on storage.objects for select
to authenticated
using (
  bucket_id = 'pinnit-app'
  and name like 'avatars/' || auth.uid()::text || '.%'
);

-- INSERT: อัปโหลดได้เฉพาะ path avatars/{auth.uid()}.xxx
create policy "Users can insert own avatar"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'pinnit-app'
  and name like 'avatars/' || auth.uid()::text || '.%'
);

-- UPDATE: แก้ไขได้เฉพาะไฟล์ของตัวเอง
create policy "Users can update own avatar"
on storage.objects for update
to authenticated
using (
  bucket_id = 'pinnit-app'
  and name like 'avatars/' || auth.uid()::text || '.%'
)
with check (
  bucket_id = 'pinnit-app'
  and name like 'avatars/' || auth.uid()::text || '.%'
);

-- DELETE: ลบได้เฉพาะไฟล์ของตัวเอง
create policy "Users can delete own avatar"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'pinnit-app'
  and name like 'avatars/' || auth.uid()::text || '.%'
);
```

ถ้ามี policy เดิมที่ทำให้เกิด error "new row violates row-level security policy" ให้ลบ policy เก่าของ bucket `pinnit-app` ออกก่อน (Storage → bucket → Policies) แล้วค่อยรัน SQL ด้านบน
