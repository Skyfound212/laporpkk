-- Migration 014: Tambah kolom status_admin ke tabel laporan
-- Context: kolom ini mendukung alur Laporan Masuk Admin (baru/dibaca/diarsipkan)
-- sesuai spesifikasi Update_Modul_Laporan_Masuk_Admin.md
-- Kolom ini sudah diapply langsung ke DB live pada 14 Juli 2026 (sesi 3),
-- file migration ini dibuat retroaktif agar sinkron dengan GitHub Actions deploy.

BEGIN;

ALTER TABLE laporan
  ADD COLUMN IF NOT EXISTS status_admin VARCHAR(20) DEFAULT 'baru'
  CHECK (status_admin IN ('baru', 'dibaca', 'diarsipkan'));

-- Backfill baris yang sudah ada (set semua ke 'baru' jika NULL)
UPDATE laporan SET status_admin = 'baru' WHERE status_admin IS NULL;

COMMIT;

-- Verification
SELECT COUNT(*) AS total_laporan, COUNT(status_admin) AS with_status_admin FROM laporan;
