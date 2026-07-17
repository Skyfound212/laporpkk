import { useEffect, useRef, useState } from 'react';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import {
  registerForPushNotificationsAsync,
  addNotificationReceivedListener,
  addNotificationResponseListener,
  removeNotificationSubscription,
} from '@/lib/notifications';
import { GROUP_ROOM_ID, ADMIN_ROOM_ID } from '@/lib/roomId';

export function useNotifications() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [notification, setNotification] = useState<Notifications.Notification | null>(null);
  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();

  useEffect(() => {
    if (!user?.id) return;

    // Daftarkan device untuk push notification
    registerForPushNotificationsAsync(user.id).then(token => {
      setExpoPushToken(token);
    });

    // Dengarkan notifikasi masuk saat app di foreground
    notificationListener.current = addNotificationReceivedListener((notif) => {
      setNotification(notif);
    });

    // Dengarkan tap notifikasi (background / killed)
    responseListener.current = addNotificationResponseListener((response) => {
      const data = response.notification.request.content.data as Record<string, any>;

      if (data?.type === 'chat') {
        const roomId: string = data.roomId ?? '';

        // Tentukan nama dan tipe room dari data notifikasi atau roomId
        let roomName: string = data.roomName ?? 'Pesan';
        let roomType: string = data.roomType ?? 'private';
        let profileId: string | undefined = data.profileId ?? undefined;

        if (roomId === GROUP_ROOM_ID) {
          roomName = 'Ruang Rumpi';
          roomType = 'group';
          profileId = undefined;
        } else if (roomId === ADMIN_ROOM_ID) {
          roomName = 'Admin PKK';
          roomType = 'admin';
          profileId = undefined;
        }

        router.push({
          pathname: '/chat/room',
          params: { id: roomId, name: roomName, type: roomType, ...(profileId ? { profileId } : {}) },
        });
      } else if (data?.type === 'laporan') {
        router.push({ pathname: '/laporan/detail', params: { id: data.laporanId } });
      } else if (data?.type === 'agenda') {
        router.push({ pathname: '/agenda/detail', params: { id: data.agendaId } });
      } else if (data?.type === 'admin') {
        router.push({
          pathname: '/chat/room',
          params: { id: ADMIN_ROOM_ID, name: 'Admin PKK', type: 'admin' },
        });
      }
    });

    return () => {
      if (notificationListener.current) removeNotificationSubscription(notificationListener.current);
      if (responseListener.current)     removeNotificationSubscription(responseListener.current);
    };
  }, [user?.id]);

  return { expoPushToken, notification };
}
