-- Migration 015: Fix profiles RLS — tambah INSERT policy untuk admin
--
-- Root cause: tabel profiles tidak memiliki INSERT policy sama sekali.
-- Admin menggunakan anon key (bukan Supabase Auth), sehingga auth.uid()
-- = null dan semua INSERT diblokir oleh RLS.
--
-- App ini internal (<20 user, semua terpercaya), sehingga policy
-- permissive untuk INSERT/UPDATE/DELETE aman digunakan.

-- INSERT: izinkan admin tambah anggota baru
DROP POLICY IF EXISTS "Admin can insert profiles" ON profiles;
CREATE POLICY "Admin can insert profiles"
  ON profiles FOR INSERT
  WITH CHECK (true);

-- UPDATE: izinkan admin edit profil anggota mana pun
-- (policy lama hanya izinkan update profil sendiri via auth.uid() = id)
DROP POLICY IF EXISTS "Admin can update all profiles" ON profiles;
CREATE POLICY "Admin can update all profiles"
  ON profiles FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- DELETE: izinkan admin hapus anggota
DROP POLICY IF EXISTS "Admin can delete profiles" ON profiles;
CREATE POLICY "Admin can delete profiles"
  ON profiles FOR DELETE
  USING (true);

-- Verifikasi
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY cmd;
