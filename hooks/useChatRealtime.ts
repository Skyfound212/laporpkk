import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useChatStore } from '@/stores/chatStore';
import { useAuthStore } from '@/stores/authStore';
import { insertInAppNotification } from '@/lib/notifications';
import { GROUP_ROOM_ID, ADMIN_ROOM_ID, getPrivateRoomId } from '@/lib/roomId';

/**
 * useChatRealtime — Global realtime hook dipasang di root layout.
 *
 * - Mendengarkan INSERT baru di semua room
 * - Increment unread hanya jika room tidak sedang aktif
 * - Insert in-app notification ke tabel notifications
 * - Auto-reconnect saat app kembali foreground
 */
export function useChatRealtime() {
  const { incrementUnread, activeRoomId } = useChatStore();
  const { user } = useAuthStore();
  const userIdRef     = useRef<string | null>(null);
  const activeRoomRef = useRef<string | null>(null);
  const channelRef    = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Sync refs agar closure tidak stale
  useEffect(() => { userIdRef.current = user?.id ?? null; }, [user?.id]);
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
          if (!currentUserId) return;
          if (msg.sender_id === currentUserId) return; // pesan sendiri, skip

          const senderId: string = msg.sender_id;
          const content: string  = msg.content ?? '';
          const roomId: string   = msg.room_id;

          // Hanya proses room yang relevan untuk user ini
          const relevantRooms = [
            getPrivateRoomId(currentUserId, senderId),
            GROUP_ROOM_ID,
            ADMIN_ROOM_ID,
          ];
          if (!relevantRooms.includes(roomId)) return;

          // Jangan increment jika user sedang di room tersebut
          if (activeRoomRef.current !== roomId) {
            incrementUnread(roomId);
          }

          // Gunakan sender_name dari payload (denormalized) atau fetch dari profiles
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

          // Insert in-app notification
          if (roomId === GROUP_ROOM_ID) {
            await insertInAppNotification(
              currentUserId,
              `${senderName} — Ruang Rumpi`,
              content,
              'chat',
              { route: '/chat/room', roomId: GROUP_ROOM_ID, roomName: 'Ruang Rumpi PKK', roomType: 'group' }
            );
          } else if (roomId === ADMIN_ROOM_ID) {
            await insertInAppNotification(
              currentUserId,
              'Admin PKK',
              content,
              'chat',
              { route: '/chat/room', roomId: ADMIN_ROOM_ID, roomName: 'Chat Admin PKK', roomType: 'admin' }
            );
          } else {
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
