/**
 * chat-push-notification — Supabase Edge Function
 *
 * Dipanggil oleh Database Webhook setiap ada INSERT ke tabel `messages`.
 * Berjalan di SERVER (selalu aktif), sehingga push dikirim meskipun
 * app penerima sedang tertutup/killed.
 *
 * Variabel environment yang dibutuhkan (otomatis tersedia di Supabase Edge):
 *   SUPABASE_URL              — injeksi otomatis oleh runtime Supabase
 *   SUPABASE_SERVICE_ROLE_KEY — injeksi otomatis oleh runtime Supabase
 *
 * Variabel opsional (set via: supabase secrets set WEBHOOK_SECRET=xxx):
 *   WEBHOOK_SECRET            — validasi header Authorization dari DB Webhook
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ─── Konstanta room (sinkron dengan lib/roomId.ts di app) ────────────────────

const GROUP_ROOM_ID = 'ruang-rumpi';

function isAdminRoom(roomId: string): boolean {
  return roomId.startsWith('admin-pkk-');
}

function extractUserIdFromAdminRoom(roomId: string): string {
  return roomId.replace('admin-pkk-', '');
}

function isPrivateRoom(roomId: string): boolean {
  return roomId.includes('__');
}

function extractPrivateRoomUsers(roomId: string): [string, string] {
  // Format: uuid1__uuid2 (double underscore, sesuai getPrivateRoomId)
  const idx = roomId.indexOf('__');
  return [roomId.slice(0, idx), roomId.slice(idx + 2)];
}

// ─── Kirim ke Expo Push API ──────────────────────────────────────────────────

async function sendExpoPush(
  tokens: string[],
  title: string,
  body: string,
  data: Record<string, unknown>,
): Promise<unknown> {
  if (tokens.length === 0) return { skipped: 'no tokens' };

  // Expo Push API mendukung batch max 100 pesan per request
  const messages = tokens.map((token) => ({
    to: token,
    sound: 'default',
    title,
    body,
    data: { type: 'chat', ...data },
    priority: 'high',
    channelId: 'default',
  }));

  const res = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Accept-Encoding': 'gzip, deflate',
    },
    body: JSON.stringify(messages),
  });

  return res.json();
}

// ─── Handler utama ────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  // ── 1. Validasi WEBHOOK_SECRET (opsional) ──────────────────────────────────
  const webhookSecret = Deno.env.get('WEBHOOK_SECRET');
  if (webhookSecret) {
    const auth = req.headers.get('authorization') ?? '';
    if (auth !== `Bearer ${webhookSecret}`) {
      console.warn('[chat-push] Unauthorized request');
      return new Response('Unauthorized', { status: 401 });
    }
  }

  try {
    // ── 2. Parse payload dari Database Webhook ─────────────────────────────
    // Format: { type: "INSERT", table: "messages", record: {...}, schema: "public" }
    const payload = await req.json();
    const record = payload.record ?? payload;

    const {
      room_id,
      sender_id,
      content = '',
      type: msgType = 'text',
    } = record as {
      room_id: string;
      sender_id: string;
      content: string;
      type: string;
    };

    // Pesan sistem tidak perlu push notifikasi
    if (msgType === 'system') {
      return ok({ skipped: 'system message' });
    }

    // ── 3. Inisialisasi Supabase client (service role → bypass RLS) ────────
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // ── 4. Ambil profil pengirim (nama + role) ─────────────────────────────
    const { data: senderProfile } = await supabase
      .from('profiles')
      .select('nama, role')
      .eq('id', sender_id)
      .single();

    const senderName: string = senderProfile?.nama ?? 'Anggota PKK';
    const senderRole: string = senderProfile?.role ?? 'member';
    const isAdminSender = senderRole === 'admin' || senderRole === 'ketua';

    // ── 5. Tentukan penerima, judul, dan data deep-link ────────────────────
    let recipientIds: string[] = [];
    let notifTitle = senderName;
    let notifData: Record<string, unknown> = {};

    if (room_id === GROUP_ROOM_ID) {
      // ── Ruang Rumpi: kirim ke semua anggota aktif kecuali pengirim ────────
      const { data: members } = await supabase
        .from('profiles')
        .select('id')
        .eq('status', 'active')
        .neq('id', sender_id);

      recipientIds = (members ?? []).map((m: any) => m.id);
      notifTitle = `${senderName} — Ruang Rumpi`;
      notifData = {
        route: '/chat/room',
        roomId: GROUP_ROOM_ID,
        roomName: 'Ruang Rumpi PKK',
        roomType: 'group',
      };
    } else if (isAdminRoom(room_id)) {
      // ── Room keluhan personal (admin-pkk-{userId}) ─────────────────────────
      const memberUserId = extractUserIdFromAdminRoom(room_id);

      if (isAdminSender) {
        // Admin/ketua membalas → notif ke member pemilik room
        recipientIds = [memberUserId];
        notifTitle = 'Admin PKK';
        notifData = {
          route: '/chat/room',
          roomId: room_id,
          roomName: 'Chat Admin PKK',
          roomType: 'admin',
        };
      } else {
        // Member kirim keluhan → notif ke semua admin & ketua
        const { data: admins } = await supabase
          .from('profiles')
          .select('id')
          .in('role', ['admin', 'ketua'])
          .eq('status', 'active');

        recipientIds = (admins ?? []).map((a: any) => a.id);
        notifTitle = `📩 ${senderName} — Keluhan`;
        notifData = {
          route: '/chat/room',
          roomId: room_id,
          roomName: senderName,
          roomType: 'admin',
          profileId: sender_id,
        };
      }
    } else if (isPrivateRoom(room_id)) {
      // ── Chat privat: kirim ke satu penerima ──────────────────────────────
      const [uid1, uid2] = extractPrivateRoomUsers(room_id);
      const recipientId = uid1 === sender_id ? uid2 : uid1;
      recipientIds = [recipientId];
      notifTitle = `💬 ${senderName}`;
      notifData = {
        route: '/chat/room',
        roomId: room_id,
        roomName: senderName,
        roomType: 'private',
        profileId: sender_id,
      };
    } else {
      // Room tidak dikenali — abaikan
      return ok({ skipped: `unknown room format: ${room_id}` });
    }

    if (recipientIds.length === 0) {
      return ok({ sent: 0, reason: 'no recipients' });
    }

    // ── 6. Ambil push token semua penerima (satu query batch) ──────────────
    const { data: tokenRows } = await supabase
      .from('push_tokens')
      .select('token')
      .in('user_id', recipientIds);

    const tokens = (tokenRows ?? [])
      .map((r: any) => r.token as string)
      .filter(Boolean);

    if (tokens.length === 0) {
      return ok({ sent: 0, reason: 'no push tokens registered' });
    }

    // ── 7. Kirim push via Expo Push API ────────────────────────────────────
    const pushBody = msgType === 'image' ? '📷 Gambar' : truncate(content, 100);
    const result = await sendExpoPush(tokens, notifTitle, pushBody, notifData);

    console.log(`[chat-push] ✅ Sent ${tokens.length} push(es) for room ${room_id}`);
    return ok({ sent: tokens.length, recipients: recipientIds.length, result });

  } catch (err: any) {
    console.error('[chat-push] ❌ Error:', err.message);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});

// ─── Helper ──────────────────────────────────────────────────────────────────

function ok(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max - 3) + '...' : str;
}
