-- Create chat_rooms table
CREATE TABLE IF NOT EXISTS chat_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(20) DEFAULT 'private' CHECK (type IN ('group', 'private')),
  is_admin BOOLEAN DEFAULT false,
  participant_1 UUID REFERENCES profiles(id) ON DELETE CASCADE,
  participant_2 UUID REFERENCES profiles(id) ON DELETE CASCADE,
  last_message TEXT,
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Chat rooms viewable by participants" 
  ON chat_rooms FOR SELECT USING (
    auth.uid() = participant_1 OR auth.uid() = participant_2 OR is_admin = true
  );

-- Insert Ruang Rumpi PKK (group chat)
INSERT INTO chat_rooms (id, name, type, is_admin)
VALUES ('ruang-rumpi', 'Ruang Rumpi PKK', 'group', false)
ON CONFLICT (id) DO NOTHING;

-- Insert Chat Admin
INSERT INTO chat_rooms (id, name, type, is_admin)
VALUES ('admin-pkk', 'Admin PKK', 'group', true)
ON CONFLICT (id) DO NOTHING;
