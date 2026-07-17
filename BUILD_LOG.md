# 📦 BUILD_LOG.md — PKK Digital

**Log setiap trigger EAS build dan hasil test manual di device. WAJIB diisi setiap kali build dijalankan.**

Format tiap entri: tanggal, profile build (`development`/`preview`/`production`), Build ID/URL EAS, status, hasil test di device (kalau sudah).

---

Prasyarat sebelum build pertama (per `REPLIT_ONBOARDING.md` & tracker):
- [x] `npm install` sukses
- [x] `npx tsc --noEmit` 0 error
- [x] `npx expo-doctor` 17/17 passed
- [x] Migrasi 001–010 sinkron dengan DB live
- [x] Bug RLS kritis (chat_members, documents, report_photos, chats, app_config) sudah di-fix
- [x] Backup database sebelum perubahan skema (`backups/pkk_backup_pre_rls_fix.sql`)
- [x] EAS project terdaftar (ID: 4349b3e6-cee9-4483-9bf0-8bc428291ace, slug: pkk-digital)
- [x] projectId ditambahkan ke app.json
- [x] EXPO_PUBLIC_SUPABASE_URL & EXPO_PUBLIC_SUPABASE_ANON_KEY dikonfigurasi di eas.json
- [x] Migration 014 (status_admin) dibuat dan di-push
- [x] Test EAS build pertama (`eas build -p android --profile production`) — lihat entri di bawah
- [ ] Download APK hasil build
- [ ] Transfer APK ke device fisik
- [ ] Test manual di device (login, laporan, chat, agenda, arsip, admin)

**Catatan:** EAS build dijalankan via `EXPO_TOKEN` yang sudah tersedia di Secrets. Replit tidak bisa menjalankan emulator Android atau `expo start --tunnel` (tidak stabil di sandbox) — build APK harus lewat EAS cloud build, bukan preview lokal.

---

## 2026-07-14 — Build #1 (production) — GAGAL, lalu di-fix

**Build ID:** `bb0e57cb-2cec-489c-b924-1ed46100bb2d`
**Profile:** `production` | **Platform:** Android
**Commit awal:** `518c14a`

**Kronologi:**
1. Build pertama dipicu, sempat dilaporkan "expo package not found" — investigasi menemukan `package-lock.json` mengandung `"resolved"` URL yang menunjuk ke `package-firewall.replit.local` (proxy npm internal Replit), tidak bisa diakses dari server EAS.
2. Fix #1: `package-lock.json` dihapus dari repo (commit `4020f7b`), `.gitignore` diupdate untuk mengabaikannya (commit `d1a9d25`) — supaya EAS install fresh dari registry resmi, bukan dari lockfile yang tercemar.
3. Build di-trigger ulang dengan commit `d1a9d25` → status akhir: **`ERRORED`** di fase `INSTALL_DEPENDENCIES`, error sesungguhnya:
   ```
   error @supabase/supabase-js@2.110.5: The engine "node" is incompatible with this module.
   Expected version ">=22.0.0". Got "20.19.2"
   ```
   Root cause: `package.json` menulis `"@supabase/supabase-js": "^2.43.0"` (caret) — tanpa lockfile untuk mengunci versi, install menarik versi terbaru yang cocok (`2.110.x`), yang mensyaratkan Node ≥22. Image build EAS memakai Node 20.19.2 → install gagal.
4. Fix #2: `@supabase/supabase-js` di-pin ke versi exact `2.109.0` (versi 2.x terakhir yang masih kompatibel Node ≥20.0.0, sebelum syarat naik ke Node ≥22) — commit `8a3f7db`. Tidak ada perubahan API/fungsionalitas (masih sama major version 2.x).

**Status:** fix di-push, build ulang dipicu (Build #2, lihat entri di bawah).

**Pelajaran untuk sesi berikutnya:** jangan pakai `^`/`~` untuk dependency yang punya riwayat menaikkan syarat Node engine (`@supabase/supabase-js` sudah 2x menaikkan syarat Node dalam rentang versi 2.x saja — dari default ke `>=20`, lalu ke `>=22`). Pin exact version untuk dependency semacam ini, dan pertimbangkan commit lockfile yang bersih (dibuat di luar sandbox Replit, agar tidak mengandung URL proxy internal) supaya versi selalu konsisten antar-install.

---

## 2026-07-14 — Build #2 (production) — GAGAL, lalu di-fix

**Build ID:** `b8468d05-5365-4c62-9f1d-650f1b34971d`
**Profile:** `production` | **Platform:** Android
**Commit:** `ece119e`

**Hasil:** `INSTALL_DEPENDENCIES` sukses (fix Build #1 terbukti berhasil), tapi gagal di fase `RUN_GRADLEW` dengan `EAS_BUILD_UNKNOWN_GRADLE_ERROR`:
```
Plugin [id: 'expo-module-gradle-plugin'] was not found ... (expo-asset/android/build.gradle)
A problem occurred configuring project ':expo'.
> Could not get unknown property 'release' for SoftwareComponent container ...
```
`expo-doctor` (jalan otomatis sebelum Gradle) sudah memberi peringatan akar masalahnya:
```
expo-asset@57.0.3        - expected version: ~10.0.10
expo-image-picker@57.0.2 - expected version: ~15.1.0
```
Root cause: kedua package tertulis dengan versi untuk Expo SDK yang jauh lebih baru dari SDK 51 yang dipakai project ini — struktur native Gradle plugin-nya tidak kompatibel dengan `expo-modules-core` versi SDK 51, sehingga Gradle gagal konfigurasi project `:expo`.

**Fix (commit `0ccb429`):**
- `expo-asset`: `^57.0.3` → `~10.0.10` (versi resmi utk SDK 51)
- `expo-image-picker`: `^57.0.2` → `~15.1.0` (versi resmi utk SDK 51)
- `app.json`: hapus `android.enableProguardInReleaseBuilds` (bukan field skema Expo config SDK 51 yang valid; tidak mengubah behavior ProGuard release build)
- Diverifikasi lokal: `npx expo-doctor` → **17/17 checks passed**

**Status:** fix di-push ke `main`, build ulang dipicu (Build #3, lihat entri di bawah).

**Pelajaran:** dua peringatan `expo-doctor` di Build #1 & #2 (versi expo-asset/expo-image-picker salah) sebenarnya sudah muncul di log tapi levelnya "warning" — jangan abaikan warning `expo-doctor` walau build masih lanjut ke fase berikutnya; itu sering jadi predictor kegagalan Gradle di fase sesudahnya.

---

## 2026-07-14 — Build #3 (production) — SEDANG BERJALAN

**Build ID:** `7d35a921-8d1c-4428-bbfe-5695d2940d54`
**Profile:** `production` | **Platform:** Android
**Commit:** `97f372b` (sudah termasuk fix `expo-asset`/`expo-image-picker` versi SDK 51 dari Build #2)
**Log:** https://expo.dev/accounts/pkk212s-team/projects/pkk-digital/builds/7d35a921-8d1c-4428-bbfe-5695d2940d54

**Verifikasi lokal sebelum trigger:** `npx expo-doctor` → 17/17 checks passed.

**Status:** ERRORED.

**Error:** `EAS_BUILD_UNKNOWN_GRADLE_ERROR` — gagal di task `:app:createBundleReleaseJsAndAssets` (fase `RUN_GRADLEW`).

**Root cause (dari log Metro bundler):**
```
SyntaxError: node_modules/expo-router/entry.js: [BABEL] .plugins is not a valid Plugin property
```
`babel.config.js` mendaftarkan `nativewind/babel` di bawah `plugins`, padahal modul itu (`nativewind/babel` → `react-native-css-interop/babel`) mengembalikan bentuk **preset** (`{ plugins: [...] }`), bukan bentuk plugin biasa. Babel menolak preset yang didaftarkan sebagai plugin dengan error ini. Ini murni salah konfigurasi, tidak terkait versi paket.

**Fix:** pindahkan `nativewind/babel` dari `plugins` ke `presets`:
```js
presets: ['babel-preset-expo', 'nativewind/babel'],
```
Diverifikasi lokal dengan `npx expo export --platform android` → bundling sukses (1481 modules, bundle 4.5MB). Commit `58636b7`.

**Pelajaran:** error Gradle yang generik (`EAS_BUILD_UNKNOWN_GRADLE_ERROR`) sering menyembunyikan error JS/Metro di bawahnya — selalu telusuri log fase `RUN_GRADLEW` sampai ke pesan `Android Bundling failed` sebelum menyimpulkan itu masalah native/Gradle murni.

---

## 2026-07-15 — Build #4 (production) — SEDANG BERJALAN

**Build ID:** `95761832-6cd5-48f3-b508-89de6c043739`
**Profile:** `production` | **Platform:** Android
**Commit:** `58636b7` (fix babel.config.js: `nativewind/babel` dipindah dari `plugins` ke `presets`)
**Log:** https://expo.dev/accounts/pkk212s-team/projects/pkk-digital/builds/95761832-6cd5-48f3-b508-89de6c043739

**Verifikasi lokal sebelum trigger:** `npx expo export --platform android` → bundling sukses (1481 modules).

**Status:** ERRORED.

**Error:** `EAS_BUILD_UNKNOWN_GRADLE_ERROR` — gagal lagi di task `:app:createBundleReleaseJsAndAssets`, tapi error message-nya berbeda dari Build #3:
```
Cannot find module 'react-native-worklets/plugin'
```

**Root cause:** `nativewind` masih di-set dengan caret (`^4.0.0`) di `package.json`. Karena repo tidak commit `package-lock.json`, setiap build EAS meng-install ulang dependency dari npm registry — kali ini ter-resolve ke `nativewind@4.2.6`, versi yang babel plugin-nya (`react-native-css-interop`) sudah mengharapkan `react-native-worklets/plugin` (untuk `react-native-reanimated` versi 4.x). Proyek ini masih pakai `react-native-reanimated ~3.10.0`, yang plugin babel-nya masih bernama `react-native-reanimated/plugin` — modul `react-native-worklets` tidak ada sama sekali di proyek ini, sehingga bundling gagal.

**Fix:**
- Pin `"nativewind": "4.0.36"` (versi terakhir dari seri 4.0.x, kompatibel dengan reanimated 3.x).
- Tambah `.npmrc` (`legacy-peer-deps=true`) dan `EAS_BUILD_SKIP_LOCKFILE_CHECK=1` di profil `production` pada `eas.json`, sebagai langkah defensif tambahan terhadap masalah resolusi peer-dependency serupa ke depan (pola diadopsi dari proyek Expo/EAS lain milik user yang sudah pernah build sukses).

Diverifikasi lokal: `expo export --platform android` sukses, `expo-doctor` 17/17 checks passed. Commit `5c32fae`.

**Pelajaran:** tanpa `package-lock.json` yang di-commit, setiap dependency dengan caret/tilde range berisiko "drift" ke versi baru di antara sesi verifikasi lokal dan build di server EAS — kasus ini adalah drift ke-3 setelah `@supabase/supabase-js` dan `expo-asset`/`expo-image-picker`. Best practice jangka panjang: audit semua dependency dengan caret (`^`) di `package.json` dan pertimbangkan mengunci versi eksak untuk yang berkaitan dengan native build (babel plugin, reanimated, dsb).

---

## 2026-07-15 — Build #5 (production) — SEDANG BERJALAN

**Build ID:** `b1cddde7-3754-4c81-8453-a2bf041c47e4`
**Profile:** `production` | **Platform:** Android
**Commit:** `5c32fae` (pin nativewind 4.0.36 + .npmrc + EAS_BUILD_SKIP_LOCKFILE_CHECK)
**Log:** https://expo.dev/accounts/pkk212s-team/projects/pkk-digital/builds/b1cddde7-3754-4c81-8453-a2bf041c47e4

**Verifikasi lokal sebelum trigger:** `npx expo export --platform android` sukses, `expo-doctor` 17/17 checks passed.

**Status:** ✅ **FINISHED — BUILD SUKSES.**

**Hasil:** Android App Bundle (`.aab`) berhasil dibuat, siap untuk submit ke Play Store.
**Download artifact:** https://expo.dev/artifacts/eas/t6mu0QWOhbg96xZ9cTwr1cKFojgNRpgE2E9xh8DzqZc.aab
**Durasi build:** ±7.5 menit.

**Kesimpulan:** root cause Build #4 (`nativewind` caret range → resolve ke versi tak kompatibel dengan `react-native-reanimated` 3.x) terkonfirmasi benar setelah pin ke `4.0.36`. Rangkaian perbaikan sejak Build #1 (lockfile, versi Node/supabase, versi expo-asset/expo-image-picker, babel preset/plugin nativewind, dan terakhir versi nativewind) selesai — pipeline production build Android proyek ini kini berjalan bersih dari awal sampai akhir.

---

## 2026-07-15 — Build #6 (preview, APK) — FINISHED

**Build ID:** `622707e9-bbcb-4c2c-8fbf-f74fff4520dc`
**Profile:** `preview` | **Platform:** Android | **Commit:** `5c32fae`
**Tujuan:** buat file `.apk` yang bisa langsung di-install ke HP (profile `production` hasilnya `.aab`, khusus untuk Play Store dan tidak bisa langsung di-install).

**Status:** ✅ **FINISHED — BUILD SUKSES.**
**Download APK:** https://expo.dev/artifacts/eas/TCAL_Z7GogHmq6JV6AfNJj0iqMslI7Te-n3eKl42I4c.apk

---

## 2026-07-15 — Fix: NativeWind CSS pipeline tidak aktif ("APK terlihat tidak ada desain")

**Laporan user:** halaman-halaman di APK terlihat rusak/tidak ada desain sama sekali.

**Root cause:** NativeWind v4 butuh 3 komponen untuk mengubah `className="..."` jadi style asli:
1. `global.css` dengan directive `@tailwind base/components/utilities` — **tidak ada**.
2. File itu diimport di root (`app/_layout.tsx`) — **tidak ada**.
3. `metro.config.js` dibungkus `withNativeWind(config, { input })` dari `nativewind/metro` — **tidak ada**.

Babel preset (`nativewind/babel`) tetap men-transform prop `className`, tapi tanpa stylesheet Tailwind yang dikompilasi Metro, tidak ada style yang benar-benar diterapkan — sehingga semua halaman yang pakai `className` (login, aktivasi, setup, agenda, arsip, dll) tampil tanpa styling apa pun.

**Fix:**
- Tambah `global.css` (3 directive tailwind standar).
- Import di baris pertama `app/_layout.tsx`.
- Bungkus `metro.config.js`: `module.exports = withNativeWind(config, { input: './global.css' })`.

Diverifikasi lokal: `expo export --platform android` sukses (ukuran bundle bertambah, menandakan CSS berhasil dikompilasi masuk), `expo-doctor` 17/17 checks passed. Commit `4ca4f4e`.

**Build APK verifikasi (profile preview):** ID `511d14c4-52d9-4a83-a1f8-c23727b92762`, commit `9d2e967` — ✅ **FINISHED**.
**Download APK:** https://expo.dev/artifacts/eas/w4WsJatckoJ0cN74SkmxVi5wQLAQpJUeUz3A8em6KcY.apk

---
