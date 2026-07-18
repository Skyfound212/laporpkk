-- Migration 017: Fix RLS seluruh tabel untuk custom auth
--
-- ROOT CAUSE: App menggunakan custom auth (query tabel profiles langsung,
-- tidak ada Supabase Auth session). Akibatnya auth.uid() selalu NULL,
-- dan semua policy yang memeriksa auth.uid() memblokir SEMUA operasi write.
--
-- Tabel profiles sudah difix di migration 015.
-- Migration ini memfix tabel-tabel yang tersisa + storage.
--
-- App ini internal (<20 user, semua terpercaya), sehingga
-- policy permissive (USING true) aman digunakan.

-- ─────────────────────────────────────────────
-- POSTS
-- ─────────────────────────────────────────────
DROP POLICY IF EXISTS "Users can insert own posts" ON posts;
DROP POLICY IF EXISTS "Users can update own posts" ON posts;
DROP POLICY IF EXISTS "Users can delete own posts" ON posts;

CREATE POLICY "Anyone can insert posts"
  ON posts FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update posts"
  ON posts FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete posts"
  ON posts FOR DELETE
  USING (true);

-- ─────────────────────────────────────────────
-- LAPORAN
-- ─────────────────────────────────────────────
DROP POLICY IF EXISTS "Users can insert own laporan" ON laporan;
DROP POLICY IF EXISTS "Users can update own laporan" ON laporan;
DROP POLICY IF EXISTS "Users can delete own laporan" ON laporan;

CREATE POLICY "Anyone can insert laporan"
  ON laporan FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update laporan"
  ON laporan FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete laporan"
  ON laporan FOR DELETE
  USING (true);

-- ─────────────────────────────────────────────
-- AGENDA
-- ─────────────────────────────────────────────
DROP POLICY IF EXISTS "Users can insert agenda" ON agenda;
DROP POLICY IF EXISTS "Creators can update own agenda" ON agenda;
DROP POLICY IF EXISTS "Users can delete agenda" ON agenda;

CREATE POLICY "Anyone can insert agenda"
  ON agenda FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update agenda"
  ON agenda FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete agenda"
  ON agenda FOR DELETE
  USING (true);

-- ─────────────────────────────────────────────
-- MESSAGES
-- ─────────────────────────────────────────────
DROP POLICY IF EXISTS "Users can insert messages" ON messages;
DROP POLICY IF EXISTS "Users can update messages" ON messages;
DROP POLICY IF EXISTS "Users can delete messages" ON messages;

CREATE POLICY "Anyone can insert messages"
  ON messages FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update messages"
  ON messages FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- ─────────────────────────────────────────────
-- POST_LIKES
-- ─────────────────────────────────────────────
DROP POLICY IF EXISTS "Users can insert own likes" ON post_likes;
DROP POLICY IF EXISTS "Users can delete own likes" ON post_likes;

CREATE POLICY "Anyone can insert likes"
  ON post_likes FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can delete likes"
  ON post_likes FOR DELETE
  USING (true);

-- ─────────────────────────────────────────────
-- ARSIP_DOKUMEN
-- ─────────────────────────────────────────────
DROP POLICY IF EXISTS "Users can insert own arsip" ON arsip_dokumen;
DROP POLICY IF EXISTS "Uploaders can delete own arsip" ON arsip_dokumen;

CREATE POLICY "Anyone can insert arsip"
  ON arsip_dokumen FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can delete arsip"
  ON arsip_dokumen FOR DELETE
  USING (true);

-- ─────────────────────────────────────────────
-- PUSH_TOKENS
-- ─────────────────────────────────────────────
DROP POLICY IF EXISTS "Users can view own token" ON push_tokens;
DROP POLICY IF EXISTS "Users can insert own token" ON push_tokens;
DROP POLICY IF EXISTS "Users can update own token" ON push_tokens;

CREATE POLICY "Anyone can view push tokens"
  ON push_tokens FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert push tokens"
  ON push_tokens FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can update push tokens"
  ON push_tokens FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Anyone can delete push tokens"
  ON push_tokens FOR DELETE
  USING (true);

-- ─────────────────────────────────────────────
-- STORAGE: bucket documents
-- ─────────────────────────────────────────────
DROP POLICY IF EXISTS "Authenticated users can upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Uploaders can delete own documents" ON storage.objects;

CREATE POLICY "Anyone can upload documents"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'documents');

CREATE POLICY "Anyone can update documents"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'documents')
  WITH CHECK (bucket_id = 'documents');

CREATE POLICY "Anyone can delete documents"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'documents');

-- ─────────────────────────────────────────────
-- STORAGE: bucket avatars (buat jika belum ada)
-- ─────────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Hapus policy lama jika ada
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can update avatars" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete avatars" ON storage.objects;

CREATE POLICY "Avatars are publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

CREATE POLICY "Anyone can upload avatars"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "Anyone can update avatars"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'avatars')
  WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "Anyone can delete avatars"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'avatars');

-- ─────────────────────────────────────────────
-- Verifikasi
-- ─────────────────────────────────────────────
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE tablename IN ('posts','laporan','agenda','messages','post_likes','arsip_dokumen','push_tokens')
ORDER BY tablename, cmd;
