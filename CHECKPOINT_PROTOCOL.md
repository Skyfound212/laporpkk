# 🛑 CHECKPOINT PROTOCOL — PKK Digital v1.0

**Aturan WAJIB untuk Replit:**  
**Setiap kali menemukan masalah, error, atau tugas selesai — BERHENTI dan LAPORKAN.**  
**Tidak boleh lanjut tanpa instruksi eksplisit dari user.**

---

## 🚨 ATURAN EMAS

```
1. TEMU MASALAH → BERHENTI → LAPOR → TUNGGU ARAHAN
2. TUGAS SELESAI → BERHENTI → LAPOR → TUNGGU ARAHAN
3. RAGU / TIDAK YAKIN → BERHENTI → TANYA → TUNGGU ARAHAN
4. JANGAN PERNAH LANJUT OTOMATIS
```

---

## 📋 CHECKPOINT WAJIB BERHENTI

### Checkpoint 1: Setelah Clone Repo

**Replit harus lakukan:**
```bash
git clone https://github.com/USERNAME/pkk-digital.git
cd pkk-digital
```

**Replit harus BERHENTI dan LAPORKAN:**
```
"Repo berhasil di-clone ke /home/runner/workspace/pkk-digital.
Branch: main
Commit terakhir: [hash] - [pesan]
File: [jumlah file] items

Mau lanjut ke step berikutnya?"
```

**User harus bilang:** `"Ya, lanjut"` atau `"Cek dulu [file tertentu]"`

---

### Checkpoint 2: Setelah npm install

**Replit harus lakukan:**
```bash
npm install
```

**Replit harus BERHENTI dan LAPORKAN:**
```
"npm install selesai.
Dependencies: [jumlah] packages
Vulnerabilities: [jumlah/0]
Waktu: [X] detik

Mau lanjut ke TypeScript check?"
```

**User harus bilang:** `"Ya"` atau `"Cek expo doctor dulu"`

---

### Checkpoint 3: Setelah TypeScript Check

**Replit harus lakukan:**
```bash
npx tsc --noEmit
```

**Replit harus BERHENTI dan LAPORKAN:**
```
"TypeScript check selesai.
Error: [0/X]
Warning: [0/X]

Kalau error > 0, tampilkan daftar error.

Mau lanjut ke expo doctor?"
```

**User harus bilang:** `"Ya"` atau `"Fix error dulu"`

---

### Checkpoint 4: Setelah Expo Doctor

**Replit harus lakukan:**
```bash
npx expo doctor
```

**Replit harus BERHENTI dan LAPORKAN:**
```
"Expo doctor selesai.
Passing: [X]/[Y]
Warning: [daftar]
Error: [daftar]

Mau lanjut ke [tugas berikutnya]?"
```

---

### Checkpoint 5: Setelah Audit Database

**Replit harus lakukan:**
```bash
# Cek skema tabel
# Cek data
# Cek RLS
```

**Replit harus BERHENTI dan LAPORKAN:**
```
"Audit database selesai.
Tabel ditemukan: [jumlah]
Tabel bermasalah: [daftar]
Tabel kosong: [daftar]
RLS bug: [daftar]

MASLAH KRITIS DITEMUKAN:
1. [deskripsi]
2. [deskripsi]

REKOMENDASI FIX:
1. [deskripsi]
2. [deskripsi]

Mau saya lanjutkan fix? (Ya/Tidak/Spesifik)"
```

**User harus bilang:** `"Ya, fix semua"` atau `"Fix [nomor] saja"` atau `"Tidak dulu, saya pikir"`

---

### Checkpoint 6: Setelah Fix Database

**Replit harus lakukan:**
```bash
# Fix SQL
# Verifikasi
```

**Replit harus BERHENTI dan LAPORKAN:**
```
"Fix database selesai.
SQL dijalankan: [jumlah] query
Error: [0/X]
Verifikasi: [hasil]

Backup tersedia di: [lokasi]

Mau lanjut ke seed data?"
```

---

### Checkpoint 7: Setelah Seed Data

**Replit harus lakukan:**
```bash
# Insert admin
# Insert anggota
# Insert test data
```

**Replit harus BERHENTI dan LAPORKAN:**
```
"Seed data selesai.
Admin: [NIK] - [nama]
Anggota: [jumlah] user
Postingan: [jumlah]
Agenda: [jumlah]

Login test:
NIK: 1234567890123456
Password: admin123
Role: admin

Mau test login?"
```

---

### Checkpoint 8: Setelah Fix Kode (Admin Guard, dll.)

**Replit harus lakukan:**
```bash
# Edit file
# TypeScript check
```

**Replit harus BERHENTI dan LAPORKAN:**
```
"Fix kode selesai.
File diubah: [daftar]
TypeScript check: [0/error]

Mau git push?"
```

---

### Checkpoint 9: Setelah Git Push

**Replit harus lakukan:**
```bash
git add .
git commit -m "[pesan]"
git push origin main
```

**Replit harus BERHENTI dan LAPORKAN:**
```
"Git push selesai.
Commit: [hash]
Branch: main
Status: [success/fail]

Mau lanjut ke [tugas berikutnya]?"
```

---

### Checkpoint 10: Setelah EAS Build Trigger

**Replit harus lakukan:**
```bash
npx eas build -p android --profile preview --non-interactive
```

**Replit harus BERHENTI dan LAPORKAN:**
```
"EAS build triggered.
Build ID: [ID]
Status: [queued/building]
URL: [link]
Estimasi: [X] menit

Saya akan cek status setiap 2 menit.
ATAU
Anda bisa cek di: https://expo.dev/builds/[ID]

Mau saya tunggu dan laporkan kalau selesai?"
```

**User harus bilang:** `"Ya, tunggu"` atau `"Nanti saya cek sendiri"`

---

## ❌ YANG TIDAK BOLEH REPLIT LAKUKAN

| Tidak Boleh | Contoh | Kenapa |
|-------------|--------|--------|
| Lanjut otomatis setelah tugas selesai | "npm install selesai, langsung tsc" | User belum approve |
| Fix tanpa lapor dulu | "Saya fix error tanpa bilang" | User tidak tahu apa yang berubah |
| Build tanpa konfirmasi | "Langsung eas build" | Bisa gagal, waste waktu |
| Push tanpa review | "Langsung git push" | Bisa overwrite perubahan |
| Edit file tanpa backup | "Langsung edit" | Bisa rusak kode |

---

## ✅ YANG HARUS REPLIT LAKUKAN

| Harus | Contoh |
|-------|--------|
| Laporkan STATUS setiap tugas | "npm install: 150 packages, 0 vulnerability" |
| Laporkan MASALAH kalau ada | "Error: column password_hash not found" |
| Tanya KONFIRMASI sebelum lanjut | "Mau lanjut ke step berikutnya?" |
| Tunggu JAWABAN user | [berhenti sampai user bilang "Ya"] |
| Update LOG setiap selesai | "REPLIT_LOG.md updated" |

---

## 📝 TEMPLATE LAPORAN REPLIT

```
========================================
CHECKPOINT [NOMOR] — [NAMA TUGAS]
========================================

STATUS: [✅ Selesai / ❌ Error / ⚠️ Warning]

HASIL:
- [detail 1]
- [detail 2]

MASLAH (kalau ada):
- [masalah 1]
- [masalah 2]

REKOMENDASI:
- [rekomendasi 1]
- [rekomendasi 2]

NEXT STEP:
[deskripsi step berikutnya]

KONFIRMASI:
Mau lanjut? (Ya / Tidak / Spesifik: [sebutkan])
========================================
```

---

## 🎯 CONTOH PERCAKAPAN YANG BENAR

### Contoh 1: npm install

**Replit:** `"npm install selesai. 150 packages, 0 vulnerability. Mau lanjut ke TypeScript check?"`

**User:** `"Ya"`

**Replit:** `"OK, jalankan npx tsc --noEmit..."`

### Contoh 2: Error ditemukan

**Replit:** `"TypeScript check selesai. Error: 3 ditemukan. [daftar error]. Mau saya fix?"`

**User:** `"Ya, fix semua"`

**Replit:** `"OK, fix error... [setelah selesai] Fix selesai. tsc: 0 error. Mau lanjut?"`

### Contoh 3: Masalah serius

**Replit:** `"Audit database selesai. MASALAH KRITIS: password_hash tidak ada. Login akan gagal total. Rekomendasi: recreate tabel profiles. Mau saya lanjutkan? (Ya/Tidak/Info lebih dulu)"`

**User:** `"Info lebih dulu"`

**Replit:** `"[jelaskan detail]. Mau lanjut?"`

**User:** `"Ya, recreate tabel"`

**Replit:** `"OK, backup dulu... [setelah selesai] Recreate selesai. Mau seed data?"`

---

## 🚨 KALAU REPLIT MELANGGAR PROTOCOL

**User bilang:**
```
"STOP. Anda melanggar checkpoint protocol.
Anda harus BERHENTI dan LAPORKAN setiap tugas.
Tidak boleh lanjut otomatis.
Ulangi dari checkpoint terakhir dengan benar."
```

---

## 📎 ATTACHMENT

**File ini harus selalu di-repo:**
- `REPLIT_ONBOARDING.md` — Panduan umum
- `REPLIT_LOG.md` — Log progress
- `CHECKPOINT_PROTOCOL.md` — File ini

**Replit WAJIB baca semua 3 file saat sesi baru.**

---

*Versi: 1.0.0 | Dibuat: 14 Juli 2026 | Update: 14 Juli 2026 15:24*
