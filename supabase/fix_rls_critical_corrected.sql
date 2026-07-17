-- ============================================================
-- CRITICAL FIX: RLS Bug (syntax-corrected — Postgres does not
-- support CREATE POLICY IF NOT EXISTS, so each policy is dropped
-- first then recreated, idempotently)
-- PKK Digital v1.0
-- ============================================================

BEGIN;

-- FIX 1: chat_members — RLS aktif tapi 0 policy
DROP POLICY IF EXISTS "Users can view own chat memberships" ON chat_members;
CREATE POLICY "Users can view own chat memberships"
  ON chat_members FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can join chats" ON chat_members;
CREATE POLICY "Users can join chats"
  ON chat_members FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can leave chats" ON chat_members;
CREATE POLICY "Users can leave chats"
  ON chat_members FOR DELETE
  USING (user_id = auth.uid());

-- FIX 2: documents — RLS aktif tapi 0 policy
DROP POLICY IF EXISTS "Public can view public documents" ON documents;
CREATE POLICY "Public can view public documents"
  ON documents FOR SELECT
  USING (is_public = true);

DROP POLICY IF EXISTS "Owners can manage documents" ON documents;
CREATE POLICY "Owners can manage documents"
  ON documents FOR ALL
  USING (uploaded_by = auth.uid());

-- FIX 3: report_photos — RLS aktif tapi 0 policy
DROP POLICY IF EXISTS "Users can view own report photos" ON report_photos;
CREATE POLICY "Users can view own report photos"
  ON report_photos FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM reports WHERE reports.id = report_photos.report_id AND reports.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Users can upload report photos" ON report_photos;
CREATE POLICY "Users can upload report photos"
  ON report_photos FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM reports WHERE reports.id = report_photos.report_id AND reports.user_id = auth.uid()
  ));

-- FIX 4: chats — bug logika (chat_members.chat_id = chat_members.id -> chats.id)
DROP POLICY IF EXISTS "chats_select_member" ON chats;
DROP POLICY IF EXISTS "Users can view their chats" ON chats;
CREATE POLICY "Users can view their chats"
  ON chats FOR SELECT
  USING (
    is_ruang_rumpi = true OR
    EXISTS (
      SELECT 1 FROM chat_members
      WHERE chat_members.chat_id = chats.id
      AND chat_members.user_id = auth.uid()
    )
  );

-- FIX 5: app_config — RLS tidak aktif (minor)
ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read app config" ON app_config;
CREATE POLICY "Anyone can read app config"
  ON app_config FOR SELECT
  USING (true);

COMMIT;

-- ============================================================
-- VERIFIKASI
-- ============================================================

SELECT
  tablename,
  rowsecurity as rls_enabled,
  (SELECT COUNT(*) FROM pg_policies WHERE pg_policies.tablename = pg_tables.tablename) as policy_count
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN (
  'profiles', 'posts', 'laporan', 'agenda', 'messages', 'chat_rooms',
  'arsip_dokumen', 'user_logs', 'pdf_templates',
  'reports', 'report_photos', 'activities',
  'chats', 'chat_members', 'chat_messages',
  'documents', 'audit_logs', 'app_config'
)
ORDER BY tablename;
