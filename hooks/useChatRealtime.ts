import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useChatStore } from '@/stores/chatStore';
import { useAuthStore } from '@/stores/authStore';
import { sendChatNotification } from '@/lib/notifications';
import { GROUP_ROOM_ID, getAdminRoomId, isAdminRoom, getPrivateRoomId } from '@/lib/roomId';

/**
 * useChatRealtime — Global realtime hook dipasang di root layout.
 *
 * - Mendengarkan INSERT baru di semua room yang relevan
 * - Increment unread hanya jika room tidak sedang aktif
 * - Kirim push notifikasi (agar muncul saat app background/tertutup)
 * - Insert in-app notification ke tabel notifications
 * - Auto-reconnect saat app kembali foreground
 * - Admin mendapat notifikasi untuk SEMUA room admin personal
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

          // ── Kirim push notifikasi + in-app notification ───────────────────
          if (roomId === GROUP_ROOM_ID) {
            await sendChatNotification(
              currentUserId,
              `${senderName} — Ruang Rumpi`,
              content,
              { route: '/chat/room', roomId: GROUP_ROOM_ID, roomName: 'Ruang Rumpi PKK', roomType: 'group' }
            );
          } else if (isAdminRoom(roomId)) {
            // Pesan ke room admin personal
            if (isAdminUser) {
              // Admin menerima keluhan dari user
              await sendChatNotification(
                currentUserId,
                `📩 ${senderName} — Keluhan`,
                content,
                { route: '/chat/room', roomId, roomName: `${senderName}`, roomType: 'admin', profileId: senderId }
              );
            } else {
              // User menerima balasan admin
              await sendChatNotification(
                currentUserId,
                'Admin PKK',
                content,
                { route: '/chat/room', roomId, roomName: 'Chat Admin PKK', roomType: 'admin' }
              );
            }
          } else {
            // Private chat
            await sendChatNotification(
              currentUserId,
              `💬 ${senderName}`,
              content,
              { route: '/chat/room', roomId, roomName: senderName, roomType: 'private', profileId: senderId }
            );
          }
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
