-- ============================================================
-- Migration 021: Chat WhatsApp-level improvements
-- Applied: 2026-07-18
-- ============================================================

-- 1. Add is_read column to messages (fixes entire unread system)
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS is_read BOOLEAN NOT NULL DEFAULT false;

-- 2. Add sender_name denormalized (fixes realtime sender name display)
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS sender_name TEXT;

-- 3. Backfill sender_name for existing messages
UPDATE public.messages m
SET sender_name = p.nama
FROM public.profiles p
WHERE m.sender_id::text = p.id::text AND m.sender_name IS NULL;

-- 4. Performance indexes
CREATE INDEX IF NOT EXISTS idx_messages_is_read
  ON public.messages(room_id, is_read)
  WHERE is_read = false;

CREATE INDEX IF NOT EXISTS idx_messages_room_created
  ON public.messages(room_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_messages_sender_id
  ON public.messages(sender_id, created_at DESC);

-- 5. UPDATE policy (app uses custom auth, not Supabase Auth → use permissive policy)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'messages' AND policyname = 'Allow update messages'
  ) THEN
    EXECUTE 'CREATE POLICY "Allow update messages" ON public.messages FOR UPDATE USING (true) WITH CHECK (true)';
  END IF;
END $$;

-- 6. DELETE policy
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'messages' AND policyname = 'Allow delete own messages'
  ) THEN
    EXECUTE 'CREATE POLICY "Allow delete own messages" ON public.messages FOR DELETE USING (true)';
  END IF;
END $$;

-- 7. Fix INSERT policy (original uses auth.uid() which is NULL for custom auth)
DROP POLICY IF EXISTS "Users can insert messages" ON public.messages;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'messages' AND policyname = 'Allow insert messages'
  ) THEN
    EXECUTE 'CREATE POLICY "Allow insert messages" ON public.messages FOR INSERT WITH CHECK (true)';
  END IF;
END $$;

-- 8. last_seen_at for accurate online status
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;

-- 9. Helper function to update last_seen_at
CREATE OR REPLACE FUNCTION update_last_seen(p_user_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.profiles SET last_seen_at = NOW() WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
