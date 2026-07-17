# 🤖 REPLIT ONBOARDING — PKK Digital v1.0

**File ini dibaca oleh Replit saat sesi baru dimulai.**  
**Anda (User) cukup berikan link repo GitHub dan instruksi singkat.**  
**Replit akan baca file ini dan langsung paham konteks penuh.**

---

## 1. IDENTITAS PROYEK

| Field | Value |
|-------|-------|
| **Nama** | PKK Digital |
| **Slug** | pkk-digital |
| **Tipe** | Aplikasi Mobile Android (Internal) |
| **Max User** | 20 anggota PKK |
| **Platform** | Android 10+ (tidak perlu Play Store) |
| **Status** | Feature Complete → Pre-Build Polish |

---

## 2. TEKNOLOGI STACK

| Layer | Teknologi | Fungsi |
|-------|-----------|--------|
| **Frontend** | Expo + React Native + NativeWind | Aplikasi mobile |
| **Router** | Expo Router (file-based) | Navigasi antar screen |
| **Backend** | Supabase (PostgreSQL + Auth + Realtime + Storage) | Database, login, chat, file |
| **State** | Zustand | Auth store |
| **Styling** | Tailwind CSS (NativeWind) | Warna tosca #7ECDC0 |
| **Build** | EAS (Expo Application Services) | Build APK cloud |
| **Version Control** | GitHub | Repo + backup |

---

## 3. POSISI REPLIT DALAM PROYEK INI

### ✅ REPLIT BOLEH LAKUKAN:

| Kategori | Tugas |
|----------|-------|
| **Code** | Edit `.tsx`, `.ts`, `.json`, `.sql` |
| **Git** | Clone, commit, push, pull, cek status |
| **Dependencies** | `npm install`, `npm update`, `npx expo install` |
| **Type Check** | `npx tsc --noEmit` |
| **Diagnostics** | `npx expo doctor` |
| **Database** | Jalankan SQL ke Supabase via `psql` atau `curl` |
| **File Gen** | Buat file baru massal via script |
| **Search** | `grep`, `sed`, find & replace lintas project |
| **Build Trigger** | `npx eas build` (trigger ke cloud EAS) |
| **Download** | Download APK hasil build via `curl`/`wget` |
| **Log** | Update `REPLIT_LOG.md`, `SQL_LOG.md`, `BUILD_LOG.md` |

### ❌ REPLIT TIDAK BOLEH LAKUKAN:

| Kategori | Tugas | Alasan |
|----------|-------|--------|
| **Preview App** | `npx expo start` | Tidak ada Android emulator |
| **Tunnel** | `expo start --tunnel` | Ngrok tidak stabil di sandbox |
| **Install APK** | Push ke device via USB/ADB | Tidak ada device fisik |
| **Cron** | Scheduled task | Tidak ada scheduler persisten |
| **Auto-commit** | Git push tanpa instruksi eksplisit | Hanya atas perintah user |
| **Auto-fix** | Ubah kode tanpa konfirmasi user | User harus approve dulu |

### ⚠️ REPLIT HARUS KONFIRMASI USER:

| Tugas | Alasan |
|-------|--------|
| Jalankan SQL ke database live | Bisa merusak data |
| Git push ke origin main | Bisa overwrite perubahan |
| Install dependency baru | Bisa conflict |
| Hapus file/tabel | Bisa hilang permanen |

---

## 4. STRUKTUR REPO

```
pkk-digital/
├── app/                          ← 30 screen (frontend)
│   ├── (auth)/                   ← Login, Aktivasi, Setup
│   ├── (tabs)/                   ← Beranda, Laporan, Chat, Agenda, Arsip
│   ├── post/                     ← Options, Text, Gallery, Caption, Create, Detail
│   ├── laporan/                  ← Form, Preview, Detail
│   ├── agenda/                   ← Detail, Form
│   ├── chat/                     ← Room, Admin
│   ├── profile/                  ← My Profile, Other Profile
│   ├── arsip/                    ← Upload, Detail
│   └── admin/                    ← Dashboard, Users, Logs, Aduan, Broadcast, PDF Templates
├── components/                     ← 18 komponen reusable
│   ├── ui/                       ← Avatar, Badge, Button, Input, EmptyState, Skeleton, Toast
│   ├── forms/                    ← FormField, CategorySelector
│   ├── chat/                     ← MessageBubble, SystemMessage
│   ├── posts/                    ← PostCard, StoryRing
│   ├── profile/                  ← ProfileHeader, StatsRow
│   ├── reports/                  ← ReportCard
│   └── layout/                   ← Header
├── hooks/                        ← 3 hooks
│   ├── useAuth.ts
│   ├── useNotifications.ts
│   └── useNetworkStatus.ts
├── stores/                       ← 1 store
│   └── authStore.ts              ← Zustand
├── lib/                          ← 4 utility
│   ├── supabase.ts               ← Supabase client (validasi env explicit)
│   ├── pdf-generator.ts          ← PDF generation (3 template)
│   ├── notifications.ts          ← Push notification service
│   └── validation.ts             ← Nomor dokumen & input validation
├── types/
│   └── models.ts                 ← TypeScript interfaces
├── supabase/
│   ├── migrations/               ← 10 migration SQL
│   │   ├── 001_create_profiles.sql
│   │   ├── 002_create_posts.sql
│   │   ├── 003_create_laporan.sql
│   │   ├── 004_create_agenda.sql
│   │   ├── 005_create_messages.sql
│   │   ├── 006_create_post_likes.sql
│   │   ├── 007_create_chat_rooms.sql
│   │   ├── 008_create_arsip_dokumen.sql
│   │   ├── 009_create_user_logs.sql
│   │   └── 010_create_pdf_templates.sql
│   └── functions/                ← 2 Edge Functions
│       ├── generate-nomor-dokumen/
│       └── send-push-notification/
├── assets/images/                ← Icon, splash, logo
├── app.json                      ← Expo config
├── eas.json                      ← EAS build config
├── package.json                  ← Dependencies
├── tailwind.config.js            ← Warna tosca
├── tsconfig.json                 ← TypeScript config
├── babel.config.js               ← Babel preset
├── .env                          ← Environment variables (JANGAN DI-COMMIT)
├── .env.example                  ← Template env
├── .gitignore                    ← Git ignore rules
├── REPLIT_LOG.md                 ← LOG UMUM (WAJIB update setiap sesi)
├── SQL_LOG.md                    ← LOG SQL (WAJIB update setiap SQL)
└── BUILD_LOG.md                  ← LOG BUILD (WAJIB update setiap build)
```

---

## 5. PROGRESS SAAT INI (14 Juli 2026 12:33)

### ✅ SUDAH SELESAI

| Fase | Detail |
|------|--------|
| **Setup** | Clone repo, npm install, tsc 0 error, expo doctor 17/17 |
| **Database** | Backup 213K, 10 migration, RLS fixed (5 tabel) |
| **Screen** | 30 screen implemented (Auth, Tabs, Post, Laporan, Agenda, Chat, Profile, Arsip, Admin) |
| **Components** | 18 komponen reusable |
| **PDF Export** | 3 template (Formal, Modern, Minimalis) |
| **Push Notif** | Service + hook |
| **Admin** | Dashboard, CRUD user, logs, aduan, broadcast, PDF templates |

### ⏳ TERTUNDA / BELUM

| No | Tugas | Prioritas |
|----|-------|-----------|
| 1 | **Test EAS build pertama** | **HIGH** |
| 2 | **Fix bucket `post-images`** | **HIGH** |
| 3 | **Git push semua perubahan** | **HIGH** |
| 4 | Download APK hasil build | MEDIUM |
| 5 | Transfer APK ke device | MEDIUM |
| 6 | Test manual di device | MEDIUM |
| 7 | Setup Jest + ESLint | LOW |

---

## 6. WARNA & DESAIN

| Warna | Hex | Penggunaan |
|-------|-----|-----------|
| Tosca Primary | `#7ECDC0` | Button, header, accent |
| Tosca Dark | `#5DB9AA` | Hover, active state |
| Tosca Light | `#E8F6F3` | Background, badge |
| Text Primary | `#2D3436` | Judul, konten |
| Text Secondary | `#636E72` | Subtitle, meta |
| Muted | `#B2BEC3` | Placeholder, divider |
| Danger | `#FF6B6B` | Hapus, error |
| Warning | `#FDCB6E` | Pending, alert |
| Success | `#00B894` | Terkirim, OK |

---

## 7. ATURAN KRITIS (JANGAN LANGGAR)

1. **Tidak ada fitur di luar blueprint** — kecuali user minta eksplisit
2. **Bersihkan semua placeholder** — hapus nama dummy, foto Unsplash, konten dummy
3. **Android internal only** — tidak perlu Play Store, Apple Developer
4. **Max 20 user** — arsitektur sederhana
5. **Status laporan hanya: Terkirim & Pending** — tidak ada verifikasi/ditolak
6. **Ruang Rumpi PKK** — group chat wajib di teratas
7. **Long press hapus** — untuk chat pribadi saja
8. **Nomor dokumen auto**: `PKK/YYYY/ROMAN/NNN`
9. **Routing query param style** — bukan `[id].tsx`
10. **No placeholder di production** — semua TextInput pakai label, bukan hint

---

## 8. SECRET & ENVIRONMENT

Secret tersimpan di Replit Secrets (`.env` equivalent):

| Variable | Fungsi | Status |
|----------|--------|--------|
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase project URL | ✅ Ada |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key | ✅ Ada |
| `EXPO_TOKEN` | EAS build auth | ✅ Ada |
| `GITHUB_TOKEN` | GitHub repo access | ✅ Ada |
| `SUPABASE_DB_URL` | Direct DB connection (psql) | ✅ Ada |

**Validasi:** `lib/supabase.ts` akan throw error dengan pesan jelas kalau env kosong.

---

## 9. CARA KERJA DENGAN USER

### Alur Per Sesi:

```
User beri link repo → Replit clone → Replit baca REPLIT_LOG.md → 
Replit lapor status → User instruksikan tugas → Replit kerjakan → 
Replit update log → Replit git push → Sesi selesai
```

### User Cukup Bilang:

```
"Lanjutkan PKK Digital. Link repo: https://github.com/USERNAME/pkk-digital"
```

### Replit Langsung Lakukan:

1. Clone repo
2. Baca `REPLIT_LOG.md`
3. Laporkan: "Sesi terakhir [tanggal]. Tugas tertinggi yang belum: [X]. Mau lanjut?"
4. Tunggu instruksi user

---

## 10. INSTRUKSI DEFAULT (Kalau User Tidak Spesifik)

Jika user hanya bilang "Lanjutkan" tanpa spesifikasi:

```
"Tugas tertinggi yang belum selesai adalah [No.1 dari D]. 
Saya akan: [deskripsi tugas]. 
Konfirmasi?"
```

---

## 11. FILE LOG WAJIB

| File | Update Kapan | Isi |
|------|-------------|-----|
| `REPLIT_LOG.md` | Setiap selesai tugas | Riwayat sesi, status, hasil |
| `SQL_LOG.md` | Setiap jalankan SQL | Query + hasil + status |
| `BUILD_LOG.md` | Setiap build/test | Build ID, URL, device test |

**Aturan:** Sesi baru WAJIB baca 3 file ini dulu. Jangan pernah hapus isi lama.

---

## 12. KONTAK & REFERENSI

- **Repo GitHub:** `https://github.com/USERNAME/pkk-digital`
- **Supabase Project:** `pkk212s-team/pkk212`
- **Expo Project:** `pkk212s-team/pkk212`
- **Workspace Replit:** `/home/runner/workspace/laporpkk`

---

*File ini adalah panduan hidup untuk Replit. Update jika ada perubahan besar.*  
*Versi: 1.0.0 | Dibuat: 14 Juli 2026*
