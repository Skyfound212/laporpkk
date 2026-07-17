# 📋 REPLIT_LOG.md — PKK Digital

**Log riwayat sesi kerja Replit di proyek ini. Baca dari bawah (terbaru) ke atas (terlama). JANGAN hapus entri lama — hanya tambah entri baru di paling bawah.**

---

## Sesi 1 — 14 Juli 2026

**Konteks masuk:** Audit teknis pra-build atas repo `Skyfound212/laporpkk` (PKK Digital). Bekerja dari clone di `/home/runner/workspace/laporpkk` di dalam workspace Replit terpisah (bukan repo Replit itu sendiri).

**Dikerjakan (High Priority tracker):**
1. `npm install` — awalnya gagal ERESOLVE (peer conflict `@react-native-community/datetimepicker` vs `react-native@0.74`). Fix: turunkan ke versi kompatibel SDK 51, hapus `@types/react-native` (deprecated), bump `react-native-screens` ke `3.31.1` (versi `3.31.0` punya postinstall script rusak). Hasil: **install sukses**.
2. `npx tsc --noEmit` — ditemukan 9 error kode asli (bukan infra):
   - `app/index.tsx`: `isLoading` tidak ada di `AuthState`
   - `app/laporan/form.tsx`: signature `renderInput` salah (placeholder ke posisi salah)
   - `app/post/options.tsx`: nama icon MaterialIcons tidak valid (`'template'`)
   - Semua **diperbaiki**. `supabase/functions/**` (Deno edge functions) dikecualikan dari `tsconfig.json` karena environment berbeda. Hasil: **0 error**.
3. `npx expo-doctor` — awalnya 3/17 gagal (schema `app.json` salah, versi native module tidak sesuai SDK 51, `expo-font` hilang). Semua diperbaiki via `expo install --fix` + edit manual `app.json`. Hasil: **17/17 passed**.
4. Fix fungsional `authStore.ts` — ditambah `isLoading` + `zustand/persist` + `AsyncStorage` agar session tidak hilang tiap buka app (bug: user ke-logout otomatis tiap cold start, karena tidak ada flag loading/rehydrate).
5. Push ke GitHub `Skyfound212/laporpkk` — **catatan penting:** clone di `/home/runner/workspace/laporpkk` kehilangan `.git`-nya sendiri (diserap oleh git milik workspace Replit ini). Push dilakukan lewat clone terpisah di `/tmp` yang tetap terhubung ke history GitHub asli. Commit `eab9a68` berhasil push ke `main`.

**Dikerjakan (Medium Priority tracker — migrasi & audit skema):**
6. Verifikasi migrasi 001–010 terhadap database live Supabase — **semua sudah diterapkan**, tidak ada drift antara file migrasi dan skema live untuk 001-010.
7. Ditemukan **duplikasi skema**: ada 2 generasi tabel berjalan paralel.
   - **Generasi 1 (dipakai kode app, bermigrasi):** `laporan`, `agenda`, `chat_rooms` + `messages`
   - **Generasi 2 (zombie table, tidak ada migrasi tercatat, TIDAK di-query kode app manapun):** `reports` + `report_photos`, `activities`, `chats` + `chat_members` + `chat_messages`, `documents`, `audit_logs`, `app_config`
   - Keputusan: **belum dihapus/dimigrasikan** — hanya di-fix RLS-nya (lihat SQL_LOG.md) supaya aman kalau suatu saat dipakai. Evaluasi hapus/migrate Generasi 2 ditunda ke post-launch.
8. Ditemukan & diperbaiki **5 bug RLS kritis** di tabel Generasi 2 (detail lengkap di `SQL_LOG.md`): `chat_members` (0 policy), `documents` (0 policy), `report_photos` (0 policy), `chats` (bug logika kolom salah), `app_config` (RLS mati total).
9. Backup database dibuat sebelum fix RLS: `backups/pkk_backup_pre_rls_fix.sql` (pg_dump 17.6, full schema+data, 213K) — dibuat lewat `pg_dump` karena Replit tidak punya akses klik UI Supabase Dashboard.

**Ditunda / belum:**
- Fix bucket storage `post-images` — **di-skip**, karena setelah dicek langsung ke DB live, bucket `post-images` & `documents` + RLS policy-nya **sudah ada** (kemungkinan dibuat manual di dashboard setelah audit statis awal ditulis). Klaim "BLOCKER" di dokumen audit lama sudah tidak akurat per 14 Juli 2026.
- Test EAS build pertama — belum dijalankan.
- Setup Jest + ESLint — belum dikerjakan (Low priority).
- Evaluasi cleanup tabel Generasi 2 (hapus atau upgrade app untuk pakai tabel baru) — ditunda ke post-launch, butuh keputusan user.

**Status akhir sesi:** npm install ✅ | tsc 0 error ✅ | expo doctor 17/17 ✅ | migrasi 001-010 ✅ sinkron | RLS 5 tabel kritis ✅ fixed | git push ✅ (`eab9a68`) | backup ✅ | EAS build ⏳ belum.

**Tugas prioritas tertinggi untuk sesi berikutnya:** Test EAS build pertama (`npx eas build`), lalu download & test manual APK di device.

---

## Sesi 2 — 14 Juli 2026

**Konteks masuk:** User minta jelaskan alur admin sebelum lanjut EAS build. Investigasi ini membongkar bug fatal yang tidak diketahui sebelumnya.

**Temuan kritis:**
1. Skema tabel `profiles` di database live **tidak cocok sama sekali** dengan yang di-query kode aplikasi (`full_name/phone/role/is_active` di DB vs `nama/no_hp/email/alamat/password_hash/status` di kode) — kolom `password_hash` bahkan tidak ada. Login **100% gagal** di production sebelum sesi ini.
2. Tabel `profiles` (dan hampir semua tabel inti) **kosong** — belum ada satu pun akun user.
3. **Tidak ada proteksi akses maupun link navigasi** ke halaman admin (`/admin/dashboard`) — siapa pun bisa masuk lewat deep link tanpa role-check.

**Perbaikan yang dikerjakan (sudah dieksekusi & diverifikasi, sudah di-push ke GitHub):**
1. **Migrasi `013_fix_profiles_schema_and_admin_access.sql`** — rename `full_name→nama`, `phone→no_hp`; tambah kolom `email`, `alamat`, `password_hash`, `status` (CHECK pending/active/inactive); trigger `sync_profile_is_active` menjaga `is_active` tetap sinkron untuk RLS; fungsi `handle_new_user()` diupdate biar konsisten; tambah kolom `app_config.admin_access_code` (default `admin_go`).
2. **1 akun admin test dibuat** untuk keperluan test APK — NIK `3200000000000001` / Password `admin123` (role `admin`, jabatan `Ketua`, status `active`). Dibuat lewat Supabase Admin API karena `profiles.id` punya FK ke `auth.users(id)`.
3. **Sistem gerbang akses admin (baru, sesuai permintaan user):**
   - `stores/adminGateStore.ts` — state in-memory (tidak persist, reset tiap buka app) yang menyimpan status `isUnlocked`, plus fungsi `unlock(code)` (cek ke `app_config.admin_access_code`) dan `changeCode(current, new)`.
   - `app/admin/gate.tsx` — layar input kode akses.
   - `app/admin/_layout.tsx` — guard: semua route di bawah `/admin/*` otomatis redirect ke `/admin/gate` kalau belum unlock (termasuk kalau dicoba deep-link langsung).
   - `app/profile/index.tsx` — tombol "Panel Admin" ditambahkan (hanya tampil untuk user dengan `role === 'admin'` atau `jabatan !== 'Anggota'`), mengarah ke `/admin/gate`. Gate ikut ter-lock ulang saat logout.
   - `app/admin/dashboard.tsx` — tombol ikon kunci di header untuk ubah kode akses (modal: kode saat ini + kode baru, update `app_config`), dan tombol keluar dari Panel Admin.
4. **2 link rusak di dashboard admin diperbaiki:** stat card "Laporan" & "Arsip" sebelumnya mengarah ke `/admin/laporan` dan `/admin/arsip` (file tidak ada, dead route) — diarahkan ke tab yang sudah ada (`/(tabs)/laporan`, `/(tabs)/arsip`). Ditambahkan juga quick action ke `/admin/pdf-templates` (file sudah ada, sebelumnya tidak di-link dari mana pun).
5. Backup database dibuat sebelum perubahan skema: `backups/pkk_backup_pre_profiles_schema_fix.sql`.
6. `npx tsc --noEmit` — tetap 0 error setelah semua perubahan.

**Cara pakai admin flow (final):**
Login (NIK+password) → tab Profil → tombol "Panel Admin" (hanya muncul untuk Ketua/Wakil Ketua/Sekretaris/Bendahara/Pokja/role admin) → masukkan kode akses (default `admin_go`) → masuk ke Admin Dashboard → Kelola Anggota / Aduan / Data Log / Broadcast / Template PDF / lihat semua Laporan & Arsip. Kode akses bisa diganti dari ikon kunci di header dashboard.

**Ditunda / dicatat untuk nanti (bukan blocker, di luar scope diminta):**
- Password disimpan plaintext (`password_hash` bukan hash sungguhan) — desain lama, belum diminta untuk diperbaiki.
- Belum ada UI untuk generate NIK baru dari sisi admin (Kelola Anggota bisa CRUD tapi flow "aktivasi" oleh anggota baru masih manual sesuai desain awal).

**Status akhir sesi:** skema `profiles` fixed ✅ | login berfungsi (diverifikasi via query manual) ✅ | 1 akun admin test siap pakai ✅ | gerbang kode akses admin aktif ✅ | 2 dead link admin diperbaiki ✅ | tsc 0 error ✅ | push ke GitHub ✅.

**Tugas berikutnya:** Lanjut ke EAS build test (`npx eas build --profile preview --platform android`) sesuai permintaan user, lalu download & test manual di device — termasuk verifikasi alur admin (login akun test → Panel Admin → kode `admin_go`) benar-benar berfungsi di APK asli, bukan cuma di query manual.

---

## Sesi 3 — 14 Juli 2026

**Konteks masuk:** Implementasi modul Laporan Masuk Admin + template PDF F4 sesuai file arahan `Update_Modul_Laporan_Masuk_Admin.md` dan template HTML `template_laporan_pkk_f4_final_v5.html`.

**Dikerjakan:**

1. **Migrasi DB: tambah kolom `status_admin`** ke tabel `laporan` (nilai: `baru`/`dibaca`/`diarsipkan`, default `baru`). Backup CSV sebelum eksekusi: `laporan_backup_20260714_145700.csv`. SQL: `ALTER TABLE laporan ADD COLUMN IF NOT EXISTS status_admin VARCHAR(20) DEFAULT 'baru' CHECK (status_admin IN ('baru','dibaca','diarsipkan'))`. Dieksekusi langsung ke Supabase live → **berhasil**.

2. **`lib/pdf-generator.ts` — ditulis ulang total:**
   - Template F4 (215mm × 330mm) sesuai file HTML arahan: kop surat "TP PKK RW 212 Kelurahan Sumberrejo", role-badge jabatan, tabel meta (Dasar Kegiatan, Hari/Tanggal, Waktu, Tempat, Agenda, Jumlah Peserta), seksi Hasil Kegiatan, grid foto 2×2 (Dokumentasi 1–4), tanda tangan 2 pihak (Ketua PKK + Pembuat Laporan), footer LaporPKK.
   - Setelah generate PDF lokal → auto upload ke Supabase Storage bucket `documents` (path: `laporan-pdf/{id}.pdf`) → update laporan: `pdf_url`, `status='terkirim'`, `status_admin='baru'`.
   - Export: `generatePdf(id)`, `sharePdf(uri, title)`, `downloadPdfFromUrl(url, filename)`.

3. **`app/laporan/preview.tsx` — diperbaiki & diupdate:**
   - Fix kolom insert yang salah sebelumnya (`peserta` → `jumlah_peserta`, `hasil` → `hasil_kegiatan`, hapus `kendala`/`rekomendasi` yang tidak ada di tabel).
   - Tambah field wajib yang hilang: `kategori='Umum'`, `tanggal_kejadian=today`, `agenda=judul`, `dasar_kegiatan=deskripsi`, `status_admin='baru'`.
   - Setelah insert berhasil → auto panggil `generatePdf(inserted.id)` (non-blocking).

4. **`app/(tabs)/laporan.tsx` — Riwayat Laporan User:**
   - Query tambah `agenda`, `status_admin`, `pdf_url`.
   - Tiap item tampilkan tombol "Unduh PDF" (biru tosca, buka `pdf_url`) atau "Buat PDF" (abu, generate on-demand) sesuai ketersediaan `pdf_url`.

5. **`app/admin/laporan.tsx` — BARU (Laporan Masuk Admin):**
   - List semua laporan dengan filter: Semua / Baru / Dibaca / Diarsip.
   - Tiap baris: Tanggal, Agenda/Judul, Nama + Jabatan pelapor, Nomor Dokumen, badge status_admin.
   - Aksi per baris: Lihat Detail → `/admin/laporan-detail`, Download PDF (buka URL), Arsipkan.
   - Auto-tandai `status_admin='dibaca'` saat baris dibuka.

6. **`app/admin/laporan-detail.tsx` — BARU (Detail Laporan Admin):**
   - Tampil: Pembuat Laporan (nama+jabatan), Dasar Kegiatan, Hari/Tanggal, Waktu, Tempat, Agenda, Jumlah Peserta, Hasil Kegiatan, grid Dokumentasi Foto.
   - Tombol: Download PDF (buka `pdf_url`) + Arsipkan.
   - Auto-tandai `dibaca` saat halaman dibuka.

7. **`app/admin/dashboard.tsx` — update stats:**
   - Stats cards sekarang: Total Laporan, Belum Dibaca (`status_admin='baru'`), Bulan Ini, Arsip PDF (`pdf_url IS NOT NULL`). Semua route ke `/admin/laporan`.
   - Quick actions: tambah "Laporan Masuk" sebagai aksi pertama → `/admin/laporan`.

8. **`types/models.ts` — update interface `Laporan`:**
   - Tambah field: `status_admin`, `pdf_url`, `waktu`, `agenda`, `dasar_kegiatan`, `jumlah_peserta`, `hasil_kegiatan`.

**Hasil verifikasi sebelum push:**
- `npx tsc --noEmit` → **0 error**
- Git commit: `aee8818` → push ke `main` berhasil.

**Status akhir sesi:** DB migration OK ✅ | tsc 0 error ✅ | 7 file berubah (728 baris ditambah, 320 dihapus) ✅ | push ke GitHub main ✅.

**Tugas berikutnya:** EAS build pertama (`npx eas build --profile preview --platform android`), download APK, test manual di device.

---