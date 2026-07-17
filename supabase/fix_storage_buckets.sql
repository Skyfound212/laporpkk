-- FIX BLOCKER: Buat bucket storage post-images
-- Jalankan di Supabase SQL Editor

-- Bucket untuk foto postingan
INSERT INTO storage.buckets (id, name, public)
VALUES ('post-images', 'post-images', true)
ON CONFLICT (id) DO NOTHING;

-- Bucket untuk dokumen arsip (sudah ada di migration 008, tapi di-double-check)
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', true)
ON CONFLICT (id) DO NOTHING;

-- RLS Policy untuk post-images bucket
-- Semua user bisa upload ke folder sendiri
CREATE POLICY "Users can upload to their own folder"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'post-images' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Semua user bisa membaca semua foto postingan
CREATE POLICY "Anyone can view post images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'post-images');

-- User bisa hapus foto mereka sendiri
CREATE POLICY "Users can delete their own post images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'post-images' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- RLS Policy untuk documents bucket
CREATE POLICY "Users can upload documents"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'documents');

CREATE POLICY "Anyone can view documents"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'documents');

CREATE POLICY "Uploaders can delete documents"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'documents');
