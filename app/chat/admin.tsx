import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { getAdminRoomId } from '@/lib/roomId';

/**
 * Chat Admin — entry point berdasarkan role:
 * - Admin/Ketua  → masuk ke inbox keluhan (daftar semua room admin personal)
 * - Anggota biasa → masuk ke room admin personal miliknya sendiri
 */
export default function ChatAdminScreen() {
  const router = useRouter();
  const { user } = useAuthStore();

  useEffect(() => {
    if (!user) return;

    const isAdmin = user.role === 'admin' || user.role === 'ketua';

    if (isAdmin) {
      // Admin melihat semua keluhan dari semua user
      router.replace('/chat/admin-inbox' as any);
    } else {
      // Anggota biasa masuk ke room keluhan pribadinya
      router.replace({
        pathname: '/chat/room',
        params: {
          id: getAdminRoomId(user.id),
          name: 'Chat Admin PKK',
          type: 'admin',
          profileId: '',
        },
      } as any);
    }
  }, [user]);

  return null;
}
