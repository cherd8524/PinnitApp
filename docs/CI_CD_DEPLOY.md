# CI/CD และการ Deploy ด้วย Docker (Expo Go ทุกที่)

เอกสารนี้อธิบายการตั้งค่า CI/CD สำหรับ branch **master** บน GitHub และการ deploy แอปเป็น Docker บน server เพื่อให้เปิดด้วย **Expo Go** ได้จากทุกที่ (ผ่าน tunnel)

## สิ่งที่ได้จากชุดนี้

- **Push ขึ้น master** → GitHub Actions build Docker image แล้ว push ขึ้น GitHub Container Registry (ghcr.io)
- **Deploy (ถ้าเปิดใช้)** → SSH เข้า server แล้ว pull image ล่าสุด แล้วรัน container ใหม่
- **บน server** → รัน `expo start --tunnel` ใน container ทำให้ได้ URL สาธารณะ ให้คนเปิด Expo Go แล้วสแกน QR / ใส่ URL เพื่อเข้าแอปได้จากทุกที่

## 1. โครงสร้างไฟล์ที่เกี่ยวข้อง

| ไฟล์ | ความหมาย |
|------|----------|
| `Dockerfile` | Build image ที่รัน `expo start --tunnel` |
| `.dockerignore` | ไม่ copy node_modules, .env, .git เข้า image |
| `.github/workflows/deploy.yml` | Workflow: build + push image, (ถ้าเปิด) deploy ขึ้น server |
| `docker-compose.yml` | ใช้รัน container บน server หรือทดสอบ locally |

## 2. ขั้นตอนเริ่มต้น (ไม่ deploy อัตโนมัติ)

แค่ให้ push ขึ้น master แล้ว build และ push image อัตโนมัติ:

1. **Push โค้ดและ workflow ขึ้น GitHub**  
   - สร้าง/ใช้ repo แล้ว push branch `master` (รวมโฟลเดอร์ `.github/workflows/`)

2. **เปิดสิทธิ์ให้ workflow เขียน packages**  
   - Repo → **Settings** → **Actions** → **General**  
   - ใต้ "Workflow permissions" เลือก **Read and write permissions** แล้ว Save

3. **ผลลัพธ์**  
   - ทุกครั้งที่ push ขึ้น `master` จะมี job **build** รัน แล้ว push image ไปที่  
     `ghcr.io/<ORG_หรือ_USERNAME>/pinnitapp:latest`  
   - ดูได้ที่แท็บ **Actions** และ **Packages** ของ repo

ยังไม่ต้องตั้งค่า SSH หรือ deploy ก็ได้ แค่ build + push image อย่างเดียว

## 3. รัน Docker บน server (หรือเครื่องตัวเอง) เพื่อใช้ Expo Go

### วิธีที่ 1: รันด้วย docker run (หลัง build จาก CI แล้ว)

บน server ที่มี Docker:

```bash
# ถ้า image อยู่ที่ ghcr.io และเป็น private ต้อง login ก่อน
echo "YOUR_GITHUB_PAT" | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin

docker pull ghcr.io/YOUR_ORG/pinnitapp:latest

docker run -d --name pinnitapp --restart unless-stopped \
  -e GEOCODE_API_KEY="your_key" \
  -e GEOCODE_API_URL="https://geocode.maps.co/reverse" \
  -e SUPABASE_URL="https://xxx.supabase.co" \
  -e SUPABASE_ANON_KEY="your_anon_key" \
  ghcr.io/YOUR_ORG/pinnitapp:latest
```

จากนั้นดู log เพื่อเอา URL ของ tunnel (สำหรับ Expo Go):

```bash
docker logs -f pinnitapp
```

จะเห็น URL แบบ `exp://xxx.xxx.xxx.xxx` หรือ QR code ให้สแกนด้วย Expo Go ได้จากทุกที่

### วิธีที่ 2: ใช้ docker-compose

1. คัดลอก `.env.example` เป็น `.env` แล้วกรอกค่า (GEOCODE, SUPABASE ฯลฯ)
2. ถ้าใช้ image จาก CI แก้ `docker-compose.yml` เป็นใช้ `image: ghcr.io/YOUR_ORG/pinnitapp:latest` และ comment หรือลบ `build: .`
3. รัน:

```bash
docker compose up -d
docker compose logs -f pinnitapp
```

ใช้ URL/QR จาก log เปิดใน Expo Go ได้เช่นกัน

## 4. เปิดใช้ Deploy อัตโนมัติ (SSH ไป server)

ถ้าต้องการให้ push ขึ้น master แล้วให้ GitHub Actions SSH เข้า server แล้ว pull + รัน container ให้เอง:

### 4.1 สร้าง Secrets ใน GitHub

ไปที่ Repo → **Settings** → **Secrets and variables** → **Actions** แล้วเพิ่ม:

| Secret | ความหมาย |
|--------|----------|
| `SSH_HOST` | IP หรือ hostname ของ server |
| `SSH_USER` | user สำหรับ SSH (เช่น root หรือ ubuntu) |
| `SSH_PRIVATE_KEY` | เนื้อหา private key ทั้งก้อน (รวมบรรทัด BEGIN/END) |
| `SSH_PORT` | (ถ้าไม่ใช้ 22) พอร์ต SSH |
| `GHCR_TOKEN` | GitHub PAT ที่มีสิทธิ์ `read:packages` (ให้ server ดึง image จาก ghcr.io ได้) |
| `GEOCODE_API_KEY` | ค่าเดียวกับใน .env |
| `GEOCODE_API_URL` | เช่น https://geocode.maps.co/reverse |
| `SUPABASE_URL` | URL โปรเจกต์ Supabase |
| `SUPABASE_ANON_KEY` | anon key ของ Supabase |

### 4.2 เปิดใช้ job deploy

- **แบบใช้ Environment:**  
  - สร้าง Environment ชื่อ `production` ใน Repo → Settings → Environments  
  - ใน workflow มี `environment: production` อยู่แล้ว  

- **แบบใช้ตัวแปร repo:**  
  - ไป Settings → Secrets and variables → Variables  
  - สร้าง variable ชื่อ `DEPLOY_ENABLED` ค่า `true`  

หรือจะรัน deploy แบบมือเดียว: ไปที่ Actions → เลือก workflow "Build and Deploy (master)" → **Run workflow** แล้วถ้ามี input `deploy` ก็เลือกให้รัน deploy

### 4.3 บน server

- ติดตั้ง Docker (และ Docker Compose ถ้าใช้)
- ใส่ public key ของ `SSH_PRIVATE_KEY` ที่ใช้ใน GitHub ลงใน `~/.ssh/authorized_keys` ของ `SSH_USER`
- ถ้าใช้ GHCR แบบ private ให้บน server เคย `docker login ghcr.io` ด้วย PAT ที่มี read:packages อย่างน้อยครั้งหนึ่ง (หรือ workflow จะ login ด้วย `GHCR_TOKEN` ที่ส่งไปใน script ก็ได้)

หลัง push ขึ้น master และมี secrets + เปิด deploy แล้ว workflow จะ build → push image → SSH เข้า server → pull image ล่าสุด → stop/rm container เก่า → run container ใหม่

## 5. หมายเหตุสำคัญ

- **Tunnel** ใช้บริการของ Expo (คล้าย ngrok) ทำให้ได้ URL สาธารณะ ไม่ต้องเปิด port บน server ให้ตรงกับ Metro โดยตรง
- **Environment variables** (GEOCODE, SUPABASE) ต้องส่งเข้า container ตอนรัน (เช่น `-e` หรือ `env_file`) เพื่อให้ Metro แทนค่าในแอปตอน bundle
- **Expo Go** ใช้ได้กับแอปที่ยังเป็น development build (โหลดจาก Metro ผ่าน tunnel) ถ้าอนาคตจะใช้ production build แยก (เช่น EAS Build) จะต้องออกแบบ workflow เพิ่มอีกชุด

ถ้าต้องการให้ช่วยไล่เช็กชื่อ repo/org ใน workflow หรือชื่อ image ให้ตรงกับของจริง บอกชื่อ GitHub org/user กับ repo ได้เลย
