-- Create agenda table
CREATE TABLE IF NOT EXISTS agenda (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  location VARCHAR(255) NOT NULL,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  status VARCHAR(20) DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'ongoing', 'completed')),
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE agenda ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agenda are viewable by everyone" 
  ON agenda FOR SELECT USING (true);

CREATE POLICY "Users can insert agenda" 
  ON agenda FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Creators can update own agenda" 
  ON agenda FOR UPDATE USING (auth.uid() = created_by);

CREATE TRIGGER update_agenda_updated_at 
  BEFORE UPDATE ON agenda 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
