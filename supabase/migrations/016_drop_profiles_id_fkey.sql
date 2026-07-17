-- Migration 016: Hapus foreign key profiles.id → auth.users(id)
--
-- Root cause: profiles.id memiliki FK constraint "profiles_id_fkey" yang
-- merujuk auth.users(id). Anggota yang ditambahkan manual oleh admin
-- tidak memiliki akun Supabase Auth, sehingga UUID yang digenerate app
-- tidak ada di auth.users dan insert selalu gagal dengan FK violation.
--
-- App ini menggunakan custom auth (password_hash di profiles), bukan
-- Supabase Auth. FK ini tidak diperlukan dan harus dihapus.

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- Verifikasi: pastikan constraint sudah tidak ada
SELECT conname, contype
FROM pg_constraint
WHERE conrelid = 'profiles'::regclass
AND conname = 'profiles_id_fkey';
-- Hasil kosong = berhasil
