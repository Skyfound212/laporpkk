-- Create arsip_dokumen table
CREATE TABLE IF NOT EXISTS arsip_dokumen (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  file_name VARCHAR(255) NOT NULL,
  file_type VARCHAR(100) NOT NULL,
  file_size INTEGER NOT NULL,
  file_url TEXT NOT NULL,
  category VARCHAR(50) DEFAULT 'Lainnya' CHECK (category IN ('Surat', 'Laporan', 'Rapat', 'Kegiatan', 'Lainnya')),
  uploaded_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE arsip_dokumen ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Arsip dokumen are viewable by everyone" 
  ON arsip_dokumen FOR SELECT USING (true);

CREATE POLICY "Users can insert own arsip" 
  ON arsip_dokumen FOR INSERT WITH CHECK (auth.uid() = uploaded_by);

CREATE POLICY "Uploaders can delete own arsip" 
  ON arsip_dokumen FOR DELETE USING (auth.uid() = uploaded_by);

CREATE TRIGGER update_arsip_dokumen_updated_at 
  BEFORE UPDATE ON arsip_dokumen 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create storage bucket for documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for documents bucket
CREATE POLICY "Documents are viewable by everyone" 
  ON storage.objects FOR SELECT USING (bucket_id = 'documents');

CREATE POLICY "Authenticated users can upload documents" 
  ON storage.objects FOR INSERT WITH CHECK (
    bucket_id = 'documents' AND auth.role() = 'authenticated'
  );

CREATE POLICY "Uploaders can delete own documents" 
  ON storage.objects FOR DELETE USING (
    bucket_id = 'documents' AND auth.uid() = owner
  );
