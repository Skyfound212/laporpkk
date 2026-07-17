-- Migration 010: Tambah kolom reply_to pada tabel messages
-- Untuk fitur UX WhatsApp-style reply (quote pesan)

ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS reply_to_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reply_to_content TEXT,
  ADD COLUMN IF NOT EXISTS reply_to_sender_name VARCHAR(255);

-- Index untuk lookup reply
CREATE INDEX IF NOT EXISTS idx_messages_reply_to_id ON messages(reply_to_id);
