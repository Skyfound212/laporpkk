import * as SQLite from 'expo-sqlite';

const db = SQLite.openDatabaseSync('pkk_chat.db');

export function initChatDatabase() {
  db.execSync(`
    CREATE TABLE IF NOT EXISTS chat_rooms (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      last_message TEXT,
      last_message_at TEXT,
      unread_count INTEGER DEFAULT 0,
      avatar_url TEXT,
      is_ruang_rumpi INTEGER DEFAULT 0,
      created_at TEXT
    );

    CREATE TABLE IF NOT EXISTS chat_messages (
      id TEXT PRIMARY KEY,
      room_id TEXT NOT NULL,
      sender_id TEXT NOT NULL,
      sender_name TEXT,
      content TEXT NOT NULL,
      type TEXT DEFAULT 'text',
      status TEXT DEFAULT 'sending',
      created_at TEXT,
      is_from_me INTEGER DEFAULT 0,
      FOREIGN KEY (room_id) REFERENCES chat_rooms(id)
    );

    CREATE TABLE IF NOT EXISTS outbox (
      id TEXT PRIMARY KEY,
      room_id TEXT NOT NULL,
      content TEXT NOT NULL,
      type TEXT DEFAULT 'text',
      retry_count INTEGER DEFAULT 0,
      created_at TEXT,
      error TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_messages_room ON chat_messages(room_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_rooms_last_msg ON chat_rooms(last_message_at);
  `);
}

export { db };
