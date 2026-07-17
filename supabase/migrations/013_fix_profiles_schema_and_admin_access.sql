-- Migration 013: Fix profiles schema drift + add admin access code
--
-- Context: the live `profiles` table had been altered outside of any
-- tracked migration to use full_name/phone/role/is_active instead of the
-- nama/no_hp/email/alamat/status/password_hash columns the app code
-- actually queries (see authStore.ts, app/admin/users.tsx, app/profile/*,
-- app/(auth)/setup.tsx). That drift made login impossible in production
-- (password_hash did not exist at all) and profiles was empty (0 rows).
--
-- This migration reconciles the live schema to match the app code (lower
-- risk than rewriting every screen that reads these columns), keeps the
-- newer `role`/`is_active` columns (already relied on by RLS policies on
-- reports/pdf_templates/profiles), and adds the admin access-code gate
-- requested for the admin dashboard.

BEGIN;

-- Rename Gen-2 columns to the names the app code has always used
ALTER TABLE profiles RENAME COLUMN full_name TO nama;
ALTER TABLE profiles RENAME COLUMN phone TO no_hp;

-- Add columns the app code needs that never existed live
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS alamat TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'active'
  CHECK (status IN ('pending', 'active', 'inactive'));

-- Backfill status from the existing is_active boolean
UPDATE profiles SET status = CASE WHEN is_active THEN 'active' ELSE 'inactive' END;

-- Keep is_active in sync with status going forward, since
-- "profiles_select_all" RLS policy still gates on is_active
CREATE OR REPLACE FUNCTION sync_profile_is_active()
RETURNS TRIGGER AS $$
BEGIN
  NEW.is_active := (NEW.status = 'active');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_profile_is_active ON profiles;
CREATE TRIGGER trg_sync_profile_is_active
  BEFORE INSERT OR UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION sync_profile_is_active();

-- handle_new_user() trigger function referenced the old full_name column
-- name; it never fires today (app does not use supabase.auth.signUp), but
-- keep it consistent so it does not silently break if that changes later.
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, nik, nama, role, jabatan)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'nik',
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'member'),
    COALESCE(NEW.raw_user_meta_data->>'jabatan', 'Anggota PKK')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Admin access-code gate (default "admin_go", changeable from the admin
-- dashboard). app_config always has exactly one row (id = 1).
ALTER TABLE app_config ADD COLUMN IF NOT EXISTS admin_access_code VARCHAR(50) NOT NULL DEFAULT 'admin_go';

COMMIT;

-- Verification
SELECT admin_access_code FROM app_config WHERE id = 1;

-- NOTE: the test admin profile row is seeded in a separate step (not in
-- this transaction) because profiles.id has a FK to auth.users(id) — the
-- auth.users row must be created first via the Supabase Admin API, which
-- fires the handle_new_user trigger to create the base profiles row; the
-- remaining fields (no_hp, email, alamat, password_hash, status) are then
-- filled with an UPDATE. See SQL_LOG.md for the exact commands run.
