import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useChatStore } from '@/stores/chatStore';
import { useAuthStore } from '@/stores/authStore';
// Push notifikasi chat sekarang ditangani server-side oleh Edge Function
// chat-push-notification (supabase/functions/chat-push-notification/index.ts).
// Client hanya bertanggung jawab untuk: increment unread badge di tab bar.
import { GROUP_ROOM_ID, getAdminRoomId, isAdminRoom, getPrivateRoomId } from '@/lib/roomId';

/**
 * useChatRealtime — Global realtime hook dipasang di root layout.
 *
 * Tanggung jawab hook ini (client-side):
 * - Mendengarkan INSERT baru di semua room yang relevan via Supabase Realtime
 * - Increment badge unread di tab bar (chatStore) jika room tidak aktif
 * - Auto-reconnect saat app kembali foreground
 * - Admin mendapat increment untuk SEMUA room admin personal (admin-pkk-*)
 *
 * Push notifikasi (termasuk saat app tertutup) ditangani SEPENUHNYA oleh:
 * → supabase/functions/chat-push-notification/index.ts (Edge Function)
 * → dipanggil oleh Database Webhook trigger on_message_insert_push
 */
export function useChatRealtime() {
  const { incrementUnread, activeRoomId } = useChatStore();
  const { user } = useAuthStore();
  const userIdRef     = useRef<string | null>(null);
  const userRoleRef   = useRef<string | null>(null);
  const activeRoomRef = useRef<string | null>(null);
  const channelRef    = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Sync refs agar closure tidak stale
  useEffect(() => { userIdRef.current = user?.id ?? null; }, [user?.id]);
  useEffect(() => { userRoleRef.current = user?.role ?? null; }, [user?.role]);
  useEffect(() => { activeRoomRef.current = activeRoomId; }, [activeRoomId]);

  // Cache nama pengirim agar tidak query berulang
  const senderNameCache = useRef<Map<string, string>>(new Map());

  const subscribe = () => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const ch = supabase
      .channel('chat-global-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        async (payload) => {
          const msg = payload.new as any;
          const currentUserId = userIdRef.current;
          const currentRole   = userRoleRef.current;
          if (!currentUserId) return;
          if (msg.sender_id === currentUserId) return; // pesan sendiri, skip

          const senderId: string = msg.sender_id;
          const content: string  = msg.content ?? '';
          const roomId: string   = msg.room_id;

          // ── Cek apakah room ini relevan untuk user ini ─────────────────────
          const isAdminUser = currentRole === 'admin' || currentRole === 'ketua';
          const myPrivateRoomId = getPrivateRoomId(currentUserId, senderId);
          const myAdminRoomId   = getAdminRoomId(currentUserId);

          const isRelevant =
            roomId === GROUP_ROOM_ID ||                           // group chat
            roomId === myPrivateRoomId ||                         // private chat
            (!isAdminUser && roomId === myAdminRoomId) ||         // user: room admin sendiri
            (isAdminUser && isAdminRoom(roomId));                 // admin: semua room keluhan

          if (!isRelevant) return;

          // ── Increment unread jika tidak sedang buka room tersebut ──────────
          if (activeRoomRef.current !== roomId) {
            incrementUnread(roomId);
          }

          // ── Resolve nama pengirim ─────────────────────────────────────────
          let senderName: string = msg.sender_name ?? senderNameCache.current.get(senderId) ?? '';
          if (!senderName) {
            try {
              const { data: profile } = await supabase
                .from('profiles')
                .select('nama')
                .eq('id', senderId)
                .single();
              senderName = profile?.nama ?? 'Anggota PKK';
              senderNameCache.current.set(senderId, senderName);
            } catch {
              senderName = 'Anggota PKK';
            }
          } else {
            senderNameCache.current.set(senderId, senderName);
          }

          // Push notifikasi dikirim server-side oleh Edge Function
          // chat-push-notification (aktif saat app terbuka maupun tertutup).
          // Client hanya mengelola badge unread di tab bar (sudah ditangani
          // incrementUnread di atas).
        }
      )
      .subscribe();

    channelRef.current = ch;
  };

  useEffect(() => {
    subscribe();

    // Auto-reconnect saat app kembali foreground
    const appStateSub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (next === 'active') {
        subscribe();
      }
    });

    return () => {
      appStateSub.remove();
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
}
