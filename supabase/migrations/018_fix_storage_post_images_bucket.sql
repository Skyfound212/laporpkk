-- Migration 018: Tambah storage bucket post-images + policies
--
-- app/post/image-caption.tsx mengupload ke bucket 'post-images',
-- tapi bucket ini belum pernah dibuat dan tidak ada storage policy-nya.
-- Akibatnya upload foto postingan selalu gagal.

INSERT INTO storage.buckets (id, name, public)
VALUES ('post-images', 'post-images', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Post images are publicly readable" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can upload post images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can update post images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete post images" ON storage.objects;

CREATE POLICY "Post images are publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'post-images');

CREATE POLICY "Anyone can upload post images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'post-images');

CREATE POLICY "Anyone can update post images"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'post-images')
  WITH CHECK (bucket_id = 'post-images');

CREATE POLICY "Anyone can delete post images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'post-images');
