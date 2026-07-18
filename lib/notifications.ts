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

/** Notifikasi sistem umum (pengumuman, peringatan platform) */
export async function sendSystemNotification(
  userId: string,
  title: string,
  body: string,
  data: Record<string, any> = {}
): Promise<void> {
  await Promise.all([
    sendLocalNotification(title, body, { type: 'system', ...data }),
    insertInAppNotification(userId, title, body, 'system', data),
  ]);
}

/** Notifikasi pembaruan aplikasi */
export async function sendAppUpdateNotification(
  userId: string,
  newVersion: string,
  releaseNotes: string = 'Versi terbaru tersedia dengan fitur dan perbaikan terkini.'
): Promise<void> {
  const title = `🔔 Pembaruan PKK Digital v${newVersion}`;
  const body = releaseNotes;
  await Promise.all([
    sendLocalNotification(title, body, { type: 'app_update', version: newVersion }),
    insertInAppNotification(userId, title, body, 'app_update', { version: newVersion }),
  ]);
}

/** Notifikasi pesan baru dari pengguna lain (dengan nama pengirim) */
export async function sendChatMessageNotification(
  toUserId: string,
  senderName: string,
  messagePreview: string,
  roomId: string,
  roomName?: string,
  roomType?: string,
  senderProfileId?: string,
): Promise<void> {
  const title = `💬 Pesan baru dari ${senderName}`;
  const body = messagePreview.length > 80 ? messagePreview.slice(0, 77) + '...' : messagePreview;
  await sendPushNotification(toUserId, title, body, {
    type: 'chat',
    roomId,
    roomName: roomName ?? senderName,
    roomType: roomType ?? 'private',
    profileId: senderProfileId ?? '',
  });
}


// ─── Notifikasi Post Baru ke Semua User ──────────────────────────────────────

/** Kirim notif ke semua user aktif saat ada postingan baru (lonceng + push) */
export async function sendPostNotificationToAll(
  authorId: string,
  authorName: string,
  postContent: string,
  postId: string
): Promise<void> {
  try {
    // Ambil semua user aktif kecuali penulis
    const { data: users } = await supabase
      .from('profiles')
      .select('id')
      .neq('id', authorId)
      .eq('status', 'active');

    if (!users || users.length === 0) return;

    const title = `📝 Update baru dari ${authorName}`;
    const body = postContent.length > 80 ? postContent.slice(0, 77) + '...' : postContent;

    // Tulis ke tabel notifications (ikon lonceng) untuk tiap user
    await supabase.from('notifications').insert(
      users.map((u) => ({
        user_id: u.id,
        title,
        body,
        type: 'post',
        data: { postId, route: `/post/detail?id=${postId}` },
      }))
    );

    // Kirim push ke perangkat masing-masing
    const { data: tokens } = await supabase
      .from('push_tokens')
      .select('token')
      .in('user_id', users.map((u) => u.id));

    if (!tokens || tokens.length === 0) return;

    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(
        tokens.map((t: any) => ({
          to: t.token,
          sound: 'default',
          title,
          body,
          data: { type: 'post', postId },
        }))
      ),
    });
  } catch (err) {
    console.error('Error sending post notification:', err);
  }
}

// ─── Notifikasi Agenda ────────────────────────────────────────────────────────

/** Notif agenda sedang berlangsung / akan datang (lonceng + push lokal) */
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

  await Promise.all([
    sendLocalNotification(title, body, { type: 'agenda', agendaId }),
    insertInAppNotification(userId, title, body, 'agenda', {
      agendaId,
      route: `/agenda/detail?id=${agendaId}`,
    }),
  ]);
}
