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

## 5. สร้าง Storage bucket สำหรับรูปโปรไฟล์

Dashboard → **Storage** → **New bucket**:

- Name: `profile-images`
- Public bucket: เปิด (เพื่อให้ URL รูปใช้ได้)

จากนั้นไป **Policies** ของ bucket นี้ → New policy → For full customization:

- Policy name: `Users can manage own avatar`
- Allowed operation: SELECT, INSERT, UPDATE, DELETE
- Target roles: authenticated
- USING expression: `(bucket_id = 'profile-images' AND (storage.foldername(name))[1] = auth.uid()::text)`
- WITH CHECK: `(bucket_id = 'profile-images' AND (storage.foldername(name))[1] = auth.uid()::text)`

(หรือใช้ template "Allow authenticated users to upload" แล้วแก้ path ให้เป็น `auth.uid()::text`)
