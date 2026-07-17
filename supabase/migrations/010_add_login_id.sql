-- Migration: Tambah kolom login_id ke tabel profiles
-- Jalankan migration ini di Supabase SQL Editor

-- 1. Tambah kolom login_id (unik, nullable sementara untuk data lama)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS login_id TEXT UNIQUE;

-- 2. Index untuk performa query login
CREATE INDEX IF NOT EXISTS idx_profiles_login_id ON profiles(login_id);

-- 3. (Opsional) Generate login_id untuk akun yang sudah ada
--    Format: PKK + 5 karakter acak dari alfabet aman
-- UPDATE profiles
-- SET login_id = 'PKK' || upper(substr(md5(random()::text), 1, 5))
-- WHERE login_id IS NULL;

-- Catatan:
-- login_id diisi otomatis oleh aplikasi saat user menjalankan Setup Akun.
-- Format: 'PKK' + 5 karakter (A-Z tanpa O/I, 2-9 tanpa 0/1)
-- Contoh: PKKA3F7K, PKKMQ2NR
