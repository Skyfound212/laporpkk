-- =============================================================================
-- 016_create_chat_push_webhook.sql
-- Trigger database yang memanggil Edge Function chat-push-notification
-- setiap ada INSERT ke tabel messages.
--
-- PRASYARAT:
--   1. Edge Function chat-push-notification sudah di-deploy ke Supabase
--   2. Extension pg_net sudah aktif (default aktif di Supabase cloud)
--   3. Ganti NILAI BERIKUT sebelum menjalankan:
--      - <PROJECT_REF>    → ref project Supabase (epxzzjarefvyerwuipkq)
--      - <WEBHOOK_SECRET> → secret yang sama dengan env WEBHOOK_SECRET
--                           (buat dengan: supabase secrets set WEBHOOK_SECRET=xxx)
--
-- CARA MENJALANKAN:
--   Opsi A (Dashboard): Supabase Dashboard → SQL Editor → paste & run
--   Opsi B (CLI):       supabase db push  (jika pakai Supabase CLI lokal)
--
-- ALTERNATIF TANPA SQL:
--   Supabase Dashboard → Database → Webhooks → Create new webhook
--   (lihat instruksi di README atau REPLIT_LOG.md)
-- =============================================================================

-- Aktifkan pg_net (biasanya sudah aktif di Supabase cloud)
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- ── Fungsi trigger ──────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.trigger_chat_push_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _payload  jsonb;
  _url      text := 'https://<PROJECT_REF>.supabase.co/functions/v1/chat-push-notification';
  _secret   text := '<WEBHOOK_SECRET>';
BEGIN
  -- Hanya proses pesan text dan image, bukan sistem
  IF NEW.type = 'system' THEN
    RETURN NEW;
  END IF;

  _payload := jsonb_build_object(
    'type',   'INSERT',
    'table',  'messages',
    'schema', 'public',
    'record', row_to_json(NEW)::jsonb
  );

  -- Panggil Edge Function secara async (tidak blokir INSERT)
  PERFORM extensions.net.http_post(
    url     := _url,
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || _secret
    ),
    body    := _payload
  );

  RETURN NEW;
END;
$$;

-- ── Trigger pada tabel messages ─────────────────────────────────────────────

DROP TRIGGER IF EXISTS on_message_insert_push ON public.messages;

CREATE TRIGGER on_message_insert_push
  AFTER INSERT ON public.messages
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_chat_push_notification();

-- ── Verifikasi ──────────────────────────────────────────────────────────────
-- Jalankan query ini untuk memastikan trigger aktif:
-- SELECT trigger_name, event_manipulation, action_timing
-- FROM information_schema.triggers
-- WHERE event_object_table = 'messages';
