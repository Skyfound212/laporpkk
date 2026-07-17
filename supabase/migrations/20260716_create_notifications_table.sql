-- ============================================================
-- Tabel notifications untuk in-app notification center PKK Digital
-- Dibuat: 2026-07-16
-- Catatan: App menggunakan custom auth (profiles table), bukan
--          Supabase Auth, sehingga RLS tidak diaktifkan.
--          Filter user dilakukan di sisi aplikasi (user_id).
-- ============================================================

CREATE TABLE IF NOT EXISTS public.notifications (
  id          UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID          NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title       TEXT          NOT NULL,
  body        TEXT,
  type        TEXT          DEFAULT 'general',   -- 'general' | 'laporan' | 'agenda' | 'chat' | 'post'
  data        JSONB         DEFAULT '{}',         -- meta tambahan: route, id entitas, dll
  is_read     BOOLEAN       DEFAULT false,
  created_at  TIMESTAMPTZ   DEFAULT NOW()
);

-- Indeks agar query per-user & status baca tetap cepat
CREATE INDEX IF NOT EXISTS idx_notifications_user_id
  ON public.notifications(user_id);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON public.notifications(user_id, is_read)
  WHERE is_read = false;

CREATE INDEX IF NOT EXISTS idx_notifications_created_at
  ON public.notifications(created_at DESC);

-- Komentar kolom
COMMENT ON TABLE  public.notifications IS 'In-app notification center untuk anggota PKK Digital';
COMMENT ON COLUMN public.notifications.type IS 'Kategori notifikasi: general, laporan, agenda, chat, post';
COMMENT ON COLUMN public.notifications.data IS 'Payload opsional, misal: {"route": "/laporan/detail", "laporan_id": "..."}';
