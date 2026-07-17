# 🗄️ SQL_LOG.md — PKK Digital

**Log setiap query/perubahan yang dijalankan langsung ke database Supabase live. WAJIB diisi setiap kali SQL dijalankan ke database (bukan sekadar file migrasi yang ditulis, tapi yang benar-benar dieksekusi).**

Format tiap entri: tanggal, siapa/sesi, tujuan, query (ringkas/link file), hasil, apakah ada backup sebelum eksekusi.

---

## 14 Juli 2026 — Sesi 1

### 1. Query verifikasi bucket storage (read-only)
- **Tujuan:** cek apakah bucket `post-images`/`documents` benar-benar belum ada (klaim BLOCKER dari audit lama)
- **Query:** `SELECT * FROM storage.buckets;` + `SELECT * FROM pg_policies WHERE tablename = 'objects';`
- **Hasil:** bucket `post-images` dan `documents` **sudah ada** beserta RLS policy-nya. Klaim BLOCKER tidak akurat lagi.
- **Keputusan:** `supabase/fix_storage_buckets.sql` **tidak dieksekusi** (skip, redundan).
- **Backup sebelum:** tidak perlu (read-only).

### 2. Query verifikasi migrasi 001–010 (read-only)
- **Tujuan:** pastikan semua migrasi tercatat sudah diterapkan ke DB live, tidak ada drift
- **Query:** cek `information_schema.tables`, struktur kolom `messages` (khusus migrasi 010: `reply_to_id`, `reply_to_content`, `reply_to_sender_name`), dan status RLS/policy count tiap tabel
- **Hasil:** migrasi 001–010 **semua sudah diterapkan**, konsisten dengan file migrasi di repo. Ditemukan juga tabel tambahan di luar migrasi bernomor (lihat REPLIT_LOG.md — duplikasi skema Gen 1 vs Gen 2).
- **Backup sebelum:** tidak perlu (read-only).

### 3. Investigasi struktur & RLS 9 tabel "Generasi 2" (read-only)
- **Tujuan:** cek struktur kolom, RLS, dan policy pada `activities`, `app_config`, `audit_logs`, `chats`, `documents`, `report_photos`, `reports`, `chat_members`, `chat_messages`
- **Hasil:** ditemukan 5 tabel bermasalah — `chat_members`, `documents`, `report_photos` (RLS aktif, 0 policy = terkunci total untuk user biasa), `chats` (policy ada tapi salah logika: `chat_members.chat_id = chat_members.id` seharusnya `= chats.id`), `app_config` (RLS tidak aktif sama sekali).
- **Backup sebelum:** tidak perlu (read-only).

### 4. **BACKUP database sebelum fix RLS**
- **Tujuan:** safety net sebelum menjalankan `ALTER`/`CREATE POLICY` ke database live
- **Perintah:** `pg_dump` (binary v17.6, disesuaikan dengan versi server Supabase) — full schema + data, `--no-owner --no-privileges`
- **Hasil:** file `backups/pkk_backup_pre_rls_fix.sql` (213 KB) tersimpan di workspace Replit (bukan di repo git — terlalu besar/sensitif untuk commit, cukup disimpan lokal di environment kerja).
- **Catatan:** Replit tidak punya akses klik UI Supabase Dashboard untuk trigger backup manual; `pg_dump` dipakai sebagai setara.

### 5. **FIX RLS — 5 tabel kritis (WRITE ke database live)**
- **Tujuan:** perbaiki bug RLS yang membuat fitur chat/dokumen/foto laporan gagal total untuk user biasa
- **Sumber:** `attached_assets/pkk_schema_rls_fix_....zip` → `supabase/fix_rls_critical.sql`, **dikoreksi sebelum eksekusi**:
  - Sintaks asli pakai `CREATE POLICY IF NOT EXISTS` — **tidak valid di PostgreSQL** (dites dulu di transaksi rollback, terbukti syntax error). Diganti pola `DROP POLICY IF EXISTS` + `CREATE POLICY`.
  - Fix tabel `chats` di file asli pakai kondisi `type = 'public'` — **tidak sesuai skema live** (`chats.type` cuma boleh `private/group/admin`, grup publik ditandai kolom `is_ruang_rumpi`). Diganti ke `is_ruang_rumpi = true` supaya benar-benar match skema live, bukan copy template.
- **Dijalankan dalam 1 transaksi (`BEGIN...COMMIT`)** via `psql "$SUPABASE_DB_URL" -f fix_rls_critical_corrected.sql`
- **Perubahan yang dieksekusi:**
  1. `chat_members`: tambah 3 policy (SELECT/INSERT/DELETE, semua `user_id = auth.uid()`)
  2. `documents`: tambah 2 policy (public read jika `is_public=true`, owner full access)
  3. `report_photos`: tambah 2 policy (SELECT/INSERT, terhubung ke `reports.user_id = auth.uid()`)
  4. `chats`: drop policy lama yang salah logika, buat ulang dengan `chat_members.chat_id = chats.id` (benar) + `is_ruang_rumpi = true`
  5. `app_config`: `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` + 1 policy read-only publik
- **Hasil verifikasi (query `pg_tables` + `pg_policies` count):**

  | Tabel | RLS | Policy sebelum | Policy sesudah |
  |---|---|---|---|
  | `chat_members` | t | 0 | **3** |
  | `documents` | t | 0 | **2** |
  | `report_photos` | t | 0 | **2** |
  | `chats` | t | 1 (salah logika) | **1 (logika benar)** |
  | `app_config` | f→**t** | 0 | **1** |
  | `audit_logs` | t | 0 | 0 (tidak diubah — memang disengaja, service-role only) |

- **Backup sebelum:** ✅ ya, lihat entri #4 di atas.
- **File SQL final yang dijalankan:** `supabase/fix_rls_critical_corrected.sql` (disimpan di repo untuk referensi/audit trail)

---

## 14 Juli 2026 — Sesi 2

### 6. **BACKUP database sebelum fix skema `profiles`**
- **Perintah:** `pg_dump` (v17.6) full schema+data → `backups/pkk_backup_pre_profiles_schema_fix.sql`

### 7. Investigasi alur admin → ditemukan bug fatal: skema `profiles` live TIDAK COCOK dengan kode aplikasi
- Live DB: `full_name`, `phone`, `role`, `is_active` (tanpa `password_hash`, `email`, `alamat`, `status`)
- Kode app (`authStore.ts`, `app/admin/users.tsx`, `app/profile/*`, dst.) query: `nama`, `no_hp`, `email`, `alamat`, `password_hash`, `status`
- Tes langsung: `SELECT ... WHERE password_hash = 'x'` → **`ERROR: column "password_hash" does not exist`** → login 100% gagal di production
- Tabel `profiles` (dan hampir semua tabel inti: `posts`, `laporan`, `agenda`, `reports`, `activities`) **kosong (0 baris)** — belum ada user sama sekali
- **Tidak ada proteksi/role-check ataupun link navigasi** ke `/admin/dashboard` di kode manapun — siapa pun bisa akses admin lewat deep link

### 8. **FIX skema `profiles` + admin access code (WRITE ke database live)**
- **File:** `supabase/migrations/013_fix_profiles_schema_and_admin_access.sql`
- **Perubahan:**
  - `RENAME COLUMN full_name TO nama`, `RENAME COLUMN phone TO no_hp`
  - `ADD COLUMN email, alamat, password_hash, status` (dengan CHECK constraint pending/active/inactive, sesuai desain awal)
  - Trigger `sync_profile_is_active`: menjaga `is_active` tetap sinkron dengan `status` baru (RLS policy `profiles_select_all` masih bergantung pada `is_active`)
  - Update fungsi `handle_new_user()` supaya konsisten pakai nama kolom baru (`nama` bukan `full_name`) — trigger ini tidak pernah terpanggil oleh alur login custom saat ini, tapi diperbaiki agar tidak diam-diam rusak kalau dipakai nanti
  - `ALTER TABLE app_config ADD COLUMN admin_access_code VARCHAR(50) DEFAULT 'admin_go'`
- **Kendala saat eksekusi:** percobaan pertama gagal (`INSERT INTO profiles ... null value in column "id"`) karena `profiles.id` punya FK ke `auth.users(id)` — tidak bisa insert user manual tanpa baris `auth.users` yang valid. Bagian INSERT dikeluarkan dari migrasi file, dan akun test dibuat terpisah lewat Supabase Admin API (lihat #9).
- **Backup sebelum:** ✅ ya (#6)

### 9. Pembuatan 1 akun admin test (untuk kebutuhan test APK)
- Dibuat via **Supabase Admin API** (`POST /auth/v1/admin/users`, pakai `SUPABASE_SERVICE_ROLE_KEY`) supaya `auth.users` punya baris valid (memenuhi FK `profiles.id`) — trigger `handle_new_user` otomatis membuat baris dasar di `profiles`.
- Field tambahan (`no_hp`, `email`, `alamat`, `password_hash`, `status`, `role`, `jabatan`) diisi lewat `UPDATE profiles ... WHERE id = <uuid>`.
- **Kredensial login test:** NIK `3200000000000001` / Password `admin123` (role: `admin`, jabatan: `Ketua`, status: `active`)
- **Verifikasi:** query login persis seperti `authStore.ts` (`nik + password_hash + status='active'`) dijalankan manual → **berhasil mengembalikan baris**, login sekarang berfungsi.
- ⚠️ **Catatan keamanan (tidak diperbaiki, di luar scope sesi ini):** password disimpan plaintext di `password_hash`, konsisten dengan desain kode yang sudah ada sebelumnya (`authStore.ts` comment: "In production, hash this server-side"). Perlu didiskusikan terpisah kalau mau ditingkatkan sebelum rilis publik lebih luas.

### 10. Kode akses admin (`admin_access_code`)
- Default: `admin_go` (kolom baru di `app_config`, satu-satunya baris `id=1`)
- Bisa diubah dari dalam Panel Admin (dashboard) — lihat `REPLIT_LOG.md` untuk detail UI

---

---

## 14 Juli 2026 — Sesi 3

### 11. **Backup tabel `laporan` sebelum ALTER (CSV, read-only point-in-time)**
- **Perintah:** `COPY laporan TO STDOUT WITH CSV HEADER` → `/tmp/pkk_backup/laporan_backup_20260714_145700.csv` (181 bytes — tabel masih kosong/sedikit data).
- **Tujuan:** safety net sebelum `ALTER TABLE`.

### 12. **Tambah kolom `status_admin` ke tabel `laporan` (WRITE ke database live)**
- **Tujuan:** mendukung alur Laporan Masuk Admin (baru/dibaca/diarsipkan) sesuai spesifikasi `Update_Modul_Laporan_Masuk_Admin.md`.
- **SQL:**
  ```sql
  BEGIN;
  ALTER TABLE laporan
    ADD COLUMN IF NOT EXISTS status_admin VARCHAR(20) DEFAULT 'baru'
    CHECK (status_admin IN ('baru', 'dibaca', 'diarsipkan'));
  COMMIT;
  ```
- **Hasil:** `ALTER TABLE` — sukses. Kolom terkonfirmasi lewat `\d laporan`.
- **Backup sebelum:** ✅ ya (#11 di atas).
- **Catatan:** `pdf_url` sudah ada sebelumnya (dari sesi lama), tidak perlu ditambah.

---