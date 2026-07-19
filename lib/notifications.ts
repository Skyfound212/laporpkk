import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { supabase } from './supabase';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registerForPushNotificationsAsync(userId: string): Promise<string | null> {
  let token: string | null = null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'PKK Digital',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#7ECDC0',
      sound: 'notification.mp3',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return null;
    }

    const { data } = await Notifications.getExpoPushTokenAsync({
      projectId: 'd1e40f88-72f7-4d24-bf0f-d6041b48d0ae',
    });
    token = data;

    // Save token to Supabase
    if (token) {
      const { error } = await supabase.from('push_tokens').upsert({
        user_id: userId,
        token: token,
        platform: Platform.OS,
      }, { onConflict: 'user_id' });

      if (error) {
        console.error('Error saving push token:', error);
      }
    }
  } else {
    console.log('Must use physical device for Push Notifications');
  }

  return token;
}

export async function sendLocalNotification(title: string, body: string, data?: Record<string, unknown>) {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: data || {},
      sound: 'default',
    },
    trigger: null, // Immediate
  });
}

export async function sendPushNotification(toUserId: string, title: string, body: string, data?: Record<string, unknown>) {
  try {
    // Get user's push token
    const { data: tokens } = await supabase
      .from('push_tokens')
      .select('token')
      .eq('user_id', toUserId);

    if (!tokens || tokens.length === 0) return;

    const messages = tokens.map((t: any) => ({
      to: t.token,
      sound: 'default',
      title,
      body,
      data: data || {},
    }));

    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(messages),
    });
  } catch (err) {
    console.error('Error sending push notification:', err);
  }
}

// ─── In-app notification (tulis ke tabel notifications) ──────────────────────

export async function insertInAppNotification(
  userId: string,
  title: string,
  body: string,
  type: string = 'general',
  data: Record<string, any> = {}
): Promise<void> {
  try {
    await supabase.from('notifications').insert({
      user_id: userId,
      title,
      body,
      type,
      data,
    });
  } catch (err) {
    console.error('Error inserting in-app notification:', err);
  }
}

export function addNotificationReceivedListener(callback: (notification: Notifications.Notification) => void) {
  return Notifications.addNotificationReceivedListener(callback);
}

export function addNotificationResponseListener(callback: (response: Notifications.NotificationResponse) => void) {
  return Notifications.addNotificationResponseReceivedListener(callback);
}

export async function removeNotificationSubscription(subscription: Notifications.Subscription) {
  await Notifications.removeNotificationSubscription(subscription);
}

export async function setBadgeCount(count: number) {
  await Notifications.setBadgeCountAsync(count);
}

// ─── Notifikasi Sistem ────────────────────────────────────────────────────────

// ─── Notifikasi Sistem (push ke perangkat + masuk lonceng) ───────────────────

/** Notifikasi sistem umum (pengumuman, peringatan platform).
 *  Wajib push ke perangkat agar muncul meski app tertutup.
 */
export async function sendSystemNotification(
  userId: string,
  title: string,
  body: string,
  data: Record<string, any> = {}
): Promise<void> {
  await Promise.all([
    // Push ke perangkat via Expo Push Service
    sendPushNotification(userId, title, body, { type: 'system', ...data }),
    // Simpan di lonceng in-app
    insertInAppNotification(userId, title, body, 'system', data),
  ]);
}

/** Notifikasi pembaruan aplikasi (OTA).
 *  Tap di lonceng → restart app untuk menerapkan update.
 *  Wajib push ke perangkat.
 */
export async function sendAppUpdateNotification(
  userId: string,
  newVersion: string,
  releaseNotes: string = 'Versi terbaru tersedia dengan fitur dan perbaikan terkini.'
): Promise<void> {
  const title = `🔔 Pembaruan PKK Digital v${newVersion}`;
  const body = releaseNotes;
  const data = { type: 'app_update', version: newVersion, action: 'restart_app' };
  await Promise.all([
    sendPushNotification(userId, title, body, data),
    insertInAppNotification(userId, title, body, 'app_update', data),
  ]);
}

// ─── Notifikasi Agenda ────────────────────────────────────────────────────────

/** Notif agenda sedang berlangsung / akan datang — wajib push ke perangkat */
export async function sendAgendaNotification(
  userId: string,
  agendaTitle: string,
  agendaId: string,
  status: 'ongoing' | 'upcoming'
): Promise<void> {
  const title = status === 'ongoing'
    ? '📅 Agenda sedang berlangsung'
    : '🔔 Agenda akan segera dimulai';
  const body = agendaTitle;
  const data = { type: 'agenda', agendaId, route: `/agenda/detail?id=${agendaId}` };

  await Promise.all([
    sendPushNotification(userId, title, body, data),
    insertInAppNotification(userId, title, body, 'agenda', data),
  ]);
}

/**
 * Kirim push notifikasi untuk pesan chat baru.
 * Push ke perangkat (agar muncul saat app background/tertutup) +
 * tulis ke tabel notifications (lonceng in-app).
 *
 * @param toUserId  - ID user penerima
 * @param title     - Judul notifikasi (mis. "💬 Siti Rahayu")
 * @param body      - Isi singkat pesan
 * @param data      - Data navigasi (roomId, roomType, dll)
 */
export async function sendChatNotification(
  toUserId: string,
  title: string,
  body: string,
  data: Record<string, any> = {}
): Promise<void> {
  await Promise.all([
    sendPushNotification(toUserId, title, body, { type: 'chat', ...data }),
    insertInAppNotification(toUserId, title, body, 'chat', data),
  ]);
}
