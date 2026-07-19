import { useEffect, useRef, useState } from 'react';
import * as Notifications from 'expo-notifications';
import { useRouter, useRootNavigationState } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import {
  registerForPushNotificationsAsync,
  addNotificationReceivedListener,
  addNotificationResponseListener,
  removeNotificationSubscription,
} from '@/lib/notifications';
import { GROUP_ROOM_ID, isAdminRoom } from '@/lib/roomId';

export function useNotifications() {
  const router = useRouter();
  const { user } = useAuthStore();
  const navigationState = useRootNavigationState();
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [notification, setNotification] = useState<Notifications.Notification | null>(null);
  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();

  // Track navigator readiness + pending navigation
  const isNavigationReady = useRef(false);
  const pendingNavigation = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (navigationState?.key) {
      isNavigationReady.current = true;
      // Flush pending navigation if any (e.g. cold start from notification tap)
      if (pendingNavigation.current) {
        pendingNavigation.current();
        pendingNavigation.current = null;
      }
    }
  }, [navigationState?.key]);

  const safeNavigate = (fn: () => void) => {
    if (isNavigationReady.current) {
      fn();
    } else {
      // Navigator not ready yet — defer until it is
      pendingNavigation.current = fn;
    }
  };

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

        let roomName: string = data.roomName ?? 'Pesan';
        let roomType: string = data.roomType ?? 'private';
        let profileId: string | undefined = data.profileId ?? undefined;

        // Tentukan tipe room dari roomId jika tidak tersedia di data
        if (roomId === GROUP_ROOM_ID) {
          roomName = roomName || 'Ruang Rumpi PKK';
          roomType = 'group';
          profileId = undefined;
        } else if (isAdminRoom(roomId)) {
          roomName = roomName || 'Chat Admin PKK';
          roomType = 'admin';
        }

        safeNavigate(() =>
          router.push({
            pathname: '/chat/room',
            params: { id: roomId, name: roomName, type: roomType, ...(profileId ? { profileId } : {}) },
          })
        );
      } else if (data?.type === 'laporan') {
        safeNavigate(() =>
          router.push({ pathname: '/laporan/detail', params: { id: data.laporanId } })
        );
      } else if (data?.type === 'agenda') {
        safeNavigate(() =>
          router.push({ pathname: '/agenda/detail', params: { id: data.agendaId } })
        );
      }
    });

    return () => {
      if (notificationListener.current) removeNotificationSubscription(notificationListener.current);
      if (responseListener.current)     removeNotificationSubscription(responseListener.current);
    };
  }, [user?.id]);

  return { expoPushToken, notification };
}
