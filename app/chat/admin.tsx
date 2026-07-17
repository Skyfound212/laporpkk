import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { ADMIN_ROOM_ID } from '@/lib/roomId';

/**
 * Chat Admin — cukup redirect ke room.tsx dengan room ID admin.
 * Semua logika (kirim pesan, realtime, dll) ada di room.tsx.
 */
export default function ChatAdminScreen() {
  const router = useRouter();

  useEffect(() => {
    router.replace({
      pathname: '/chat/room',
      params: {
        id: ADMIN_ROOM_ID,
        name: 'Chat Admin PKK',
        type: 'admin',
        profileId: '',
      },
    } as any);
  }, []);

  return null;
}
