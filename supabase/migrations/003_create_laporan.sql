-- Create laporan table
CREATE TABLE IF NOT EXISTS laporan (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  nomor_dokumen VARCHAR(50) UNIQUE NOT NULL,
  judul VARCHAR(255) NOT NULL,
  kategori VARCHAR(100) NOT NULL,
  deskripsi TEXT NOT NULL,
  lokasi VARCHAR(255) NOT NULL,
  tanggal_kejadian DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'terkirim')),
  dokumentasi TEXT[],
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE laporan ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Laporan are viewable by everyone" 
  ON laporan FOR SELECT USING (true);

CREATE POLICY "Users can insert own laporan" 
  ON laporan FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_laporan_updated_at 
  BEFORE UPDATE ON laporan 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
