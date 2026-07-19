/**
 * updateInfo.ts — Utilitas debug OTA untuk EAS Update.
 *
 * Gunakan di mana saja untuk mencetak atau membaca status update aktif.
 * Aman dipanggil di development maupun production — ada guard __DEV__.
 *
 * Contoh penggunaan:
 *   import { logUpdateInfo } from '@/lib/updateInfo';
 *   logUpdateInfo(); // cetak ke console
 *
 *   import { getUpdateInfo } from '@/lib/updateInfo';
 *   const info = getUpdateInfo(); // baca sebagai object
 */

import * as Updates from 'expo-updates';

// ─── Tipe ─────────────────────────────────────────────────────────────────────

export interface OTAInfo {
  /** ID update yang sedang berjalan. null = sedang jalan dari bundle embedded (bawaan APK). */
  updateId: string | null;
  /** Runtime Version yang dikompilasi dalam APK ini (mis. "1.0.0" jika policy=appVersion). */
  runtimeVersion: string | null;
  /** Channel EAS yang dikonfigurasi saat build (mis. "production", "preview"). */
  channel: string | null;
  /** true = sedang jalan dari bundle embedded (belum ada OTA). false = sedang jalan dari OTA. */
  isEmbeddedLaunch: boolean;
  /** true = expo-updates aktif (production build). false = di Expo Go / dev client. */
  isEnabled: boolean;
  /** Waktu OTA ini dipublish. null jika embedded. */
  createdAt: string | null;
  /** "embedded" = bundle bawaan APK. "ota" = bundle dari EAS Update. */
  updateType: 'embedded' | 'ota';
}

// ─── Implementasi ─────────────────────────────────────────────────────────────

/**
 * Ambil semua informasi OTA sebagai objek.
 * Gunakan untuk logging, monitoring, atau menampilkan info versi di UI.
 */
export function getUpdateInfo(): OTAInfo {
  // Updates.channel tersedia di expo-updates >= 0.18 (SDK 44+)
  // Jika tidak ada (mis. development), kembalikan null dengan aman.
  const channel: string | null = (() => {
    try {
      return (Updates as any).channel ?? null;
    } catch {
      return null;
    }
  })();

  const runtimeVersion: string | null = (() => {
    try {
      return Updates.runtimeVersion ?? null;
    } catch {
      return null;
    }
  })();

  const createdAt: string | null = (() => {
    try {
      return Updates.createdAt?.toISOString() ?? null;
    } catch {
      return null;
    }
  })();

  return {
    updateId:        Updates.updateId ?? null,
    runtimeVersion,
    channel,
    isEmbeddedLaunch: Updates.isEmbeddedLaunch,
    isEnabled:        Updates.isEnabled,
    createdAt,
    updateType:      Updates.isEmbeddedLaunch ? 'embedded' : 'ota',
  };
}

/**
 * Cetak seluruh informasi OTA ke console.
 * Di production: selalu aktif.
 * Di development: aktif (agar bisa debug).
 *
 * Output contoh saat berjalan dari OTA:
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * [OTA] Tipe           : ✅ OTA (dari EAS Update)
 * [OTA] Update ID      : 3a8c1d5e-xxxx-xxxx-xxxx-xxxxxxxxxxxx
 * [OTA] Runtime Version: 1.0.0
 * [OTA] Channel        : production
 * [OTA] Updates Aktif  : Ya
 * [OTA] Dibuat Pada    : 2026-07-19T10:00:00.000Z
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */
export function logUpdateInfo(): void {
  const info = getUpdateInfo();
  const line = '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  console.log(line);
  console.log('[OTA] Tipe           :', info.updateType === 'ota'
    ? '✅ OTA (dari EAS Update)'
    : '📦 Embedded (bundle bawaan APK)');
  console.log('[OTA] Update ID      :', info.updateId        ?? '— (embedded)');
  console.log('[OTA] Runtime Version:', info.runtimeVersion  ?? '—');
  console.log('[OTA] Channel        :', info.channel         ?? '— (dev/Expo Go)');
  console.log('[OTA] Updates Aktif  :', info.isEnabled       ? 'Ya ✅' : 'Tidak ❌ (mode dev)');
  console.log('[OTA] Dibuat Pada    :', info.createdAt       ?? '— (embedded)');
  console.log(line);
}

/**
 * Kembalikan string ringkas untuk ditampilkan di UI (misal: halaman "Tentang Aplikasi").
 * Contoh: "v1.0.0 · OTA · production"  atau  "v1.0.0 · embedded"
 */
export function getUpdateBadgeText(): string {
  const info = getUpdateInfo();
  const base = `v${info.runtimeVersion ?? '?'}`;
  if (!info.isEnabled) return `${base} · dev`;
  if (info.updateType === 'ota') return `${base} · OTA · ${info.channel ?? '?'}`;
  return `${base} · embedded`;
}
