import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useChatStore } from '@/stores/chatStore';
import { useAuthStore } from '@/stores/authStore';
import { insertInAppNotification } from '@/lib/notifications';
import NetInfo from '@react-native-community/netinfo';
import { GROUP_ROOM_ID, ADMIN_ROOM_ID, getPrivateRoomId } from '@/lib/roomId';

/**
 * Global realtime hook — dipasang di root layout.
 * Mendengarkan pesan baru di semua room, fetch nama pengirim dari profiles,
 * dan memasukkan in-app notification ke tabel notifications.
 */
export function useChatRealtime() {
  const { incrementUnread } = useChatStore();
  const { user } = useAuthStore();
  const userIdRef = useRef<string | null>(null);

  // Cache nama pengirim agar tidak query terus-menerus
  const senderNameCache = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    userIdRef.current = user?.id ?? null;
  }, [user?.id]);

  useEffect(() => {
    const sub = supabase
      .channel('chat-global-realtime')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        async (payload) => {
          const msg = payload.new as any;
          const currentUserId = userIdRef.current;
          if (!currentUserId || msg.sender_id === currentUserId) return;

          const senderId: string = msg.sender_id;
          const content: string  = msg.content || '';
          const roomId: string   = msg.room_id;

          // Hanya proses room yang relevan untuk user ini
          const myPrivateRooms = [
            getPrivateRoomId(currentUserId, senderId),
            GROUP_ROOM_ID,
            ADMIN_ROOM_ID,
          ];
          if (!myPrivateRooms.includes(roomId)) return;

          // Naikkan unread counter di store
          incrementUnread(roomId);

          // Fetch nama pengirim — gunakan cache agar tidak query berulang
          let senderName: string = senderNameCache.current.get(senderId) ?? '';
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
          }

          // Insert in-app notification berdasarkan tipe room
          if (roomId === GROUP_ROOM_ID) {
            await insertInAppNotification(
              currentUserId,
              `${senderName} — Ruang Rumpi`,
              content,
              'chat',
              { route: '/chat/room', roomId: GROUP_ROOM_ID, roomName: 'Ruang Rumpi', roomType: 'group' }
            );
          } else if (roomId === ADMIN_ROOM_ID) {
            await insertInAppNotification(
              currentUserId,
              'Admin PKK',
              content,
              'chat',
              { route: '/chat/room', roomId: ADMIN_ROOM_ID, roomName: 'Admin PKK', roomType: 'admin' }
            );
          } else {
            // Private chat
            await insertInAppNotification(
              currentUserId,
              `💬 ${senderName}`,
              content,
              'chat',
              { route: '/chat/room', roomId, roomName: senderName, roomType: 'private', profileId: senderId }
            );
          }
        }
      )
      .subscribe();

    // Supabase realtime sudah auto-reconnect sendiri.
    // Tidak perlu panggil sub.subscribe() lagi saat foreground —
    // itu justru membuat duplikasi subscription.
    return () => {
      supabase.removeChannel(sub);
    };
  }, []);
}
