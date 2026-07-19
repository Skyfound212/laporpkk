import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import * as Updates from 'expo-updates';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase';

// ─── Tipe ──────────────────────────────────────────────────────────────────────

interface NotificationItem {
  id: string;
  title: string;
  body: string | null;
  type: string;
  data: Record<string, any>;
  is_read: boolean;
  created_at: string;
}

// ─── Helper ────────────────────────────────────────────────────────────────────

// Hanya tipe notifikasi sistem yang ditampilkan di lonceng
const TYPE_META: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string; bg: string }> = {
  laporan:    { icon: 'document-text',      color: '#2E9F95', bg: '#DFF4F2' },
  agenda:     { icon: 'calendar',           color: '#7C3AED', bg: '#EDE9FE' },
  update:     { icon: 'arrow-down-circle',  color: '#0284C7', bg: '#E0F2FE' },
  app_update: { icon: 'arrow-down-circle',  color: '#0284C7', bg: '#E0F2FE' },
  system:     { icon: 'shield-checkmark',   color: '#059669', bg: '#D1FAE5' },
  general:    { icon: 'notifications',      color: '#6B7280', bg: '#F3F4F6' },
};

function getTypeMeta(type: string) {
  return TYPE_META[type] ?? TYPE_META.general;
}

function formatDate(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours   = Math.floor(diff / 3600000);
  const days    = Math.floor(diff / 86400000);

  if (minutes < 1)  return 'Baru saja';
  if (minutes < 60) return `${minutes}m lalu`;
  if (hours < 24)   return `${hours}j lalu`;
  if (days < 7)     return `${days}h lalu`;
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ─── Screen ────────────────────────────────────────────────────────────────────

export default function NotifikasiScreen() {
  const router = useRouter();
  const { user } = useAuthStore();

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading]             = useState(true);
  const [refreshing, setRefreshing]       = useState(false);
  const [markingAll, setMarkingAll]       = useState(false);

  // ── Fetch ────────────────────────────────────────────────────────────────────

  const fetchNotifications = useCallback(async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('id, title, body, type, data, is_read, created_at')
        .eq('user_id', user.id)
        // Hanya notifikasi sistem — pesan chat tidak masuk lonceng
        .not('type', 'in', '("chat","post")')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setNotifications(data ?? []);
    } catch (err) {
      console.error('Error fetching notifications:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // ── Auto-dismiss badge: tandai semua dibaca saat layar terbuka ───────────────

  useEffect(() => {
    if (loading) return;                                   // tunggu data selesai
    const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id);
    if (unreadIds.length === 0) return;

    // Mark read di background — badge di beranda hilang otomatis via realtime
    supabase
      .from('notifications')
      .update({ is_read: true })
      .in('id', unreadIds)
      .then(() => {
        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      });
  }, [loading]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Real-time subscription ───────────────────────────────────────────────────

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('notifications-channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          setNotifications((prev) => [payload.new as NotificationItem, ...prev]);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          setNotifications((prev) =>
            prev.map((n) => (n.id === (payload.new as NotificationItem).id ? (payload.new as NotificationItem) : n))
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  // ── Tandai satu notif dibaca ─────────────────────────────────────────────────

  const markAsRead = async (item: NotificationItem) => {
    if (item.is_read) {
      navigateByType(item);
      return;
    }

    try {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', item.id);

      setNotifications((prev) =>
        prev.map((n) => (n.id === item.id ? { ...n, is_read: true } : n))
      );
    } catch (err) {
      console.error('Gagal menandai notifikasi:', err);
    } finally {
      navigateByType(item);
    }
  };

  const navigateByType = async (item: NotificationItem) => {
    const { type, data } = item;

    // Notif update → restart app untuk terapkan OTA
    if (type === 'update' || type === 'app_update') {
      if (!__DEV__) {
        try {
          await Updates.reloadAsync();
        } catch {
          Alert.alert('Gagal', 'Tidak dapat memuat ulang aplikasi. Coba tutup dan buka kembali.');
        }
      } else {
        Alert.alert('Mode Dev', 'Restart app tidak tersedia di mode development.');
      }
      return;
    }

    // Notif lain → navigasi berdasarkan data.route
    if (data?.route) {
      router.push(data.route as any);
    }
  };

  // ── Tandai semua dibaca ──────────────────────────────────────────────────────

  const markAllAsRead = async () => {
    const hasUnread = notifications.some((n) => !n.is_read);
    if (!hasUnread) return;

    setMarkingAll(true);
    try {
      const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id);
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .in('id', unreadIds);

      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (err) {
      console.error('Gagal menandai semua:', err);
      Alert.alert('Gagal', 'Tidak dapat menandai semua notifikasi. Coba lagi.');
    } finally {
      setMarkingAll(false);
    }
  };

  // ── Hapus notifikasi ─────────────────────────────────────────────────────────

  const deleteNotification = async (id: string) => {
    try {
      await supabase.from('notifications').delete().eq('id', id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch (err) {
      console.error('Gagal hapus notifikasi:', err);
    }
  };

  // ── Render item ──────────────────────────────────────────────────────────────

  const renderItem = ({ item }: { item: NotificationItem }) => {
    const meta = getTypeMeta(item.type);
    return (
      <TouchableOpacity
        style={[styles.item, !item.is_read && styles.itemUnread]}
        onPress={() => markAsRead(item)}
        activeOpacity={0.75}
      >
        {/* Titik unread */}
        {!item.is_read && <View style={styles.unreadDot} />}

        {/* Ikon tipe */}
        <View style={[styles.iconWrap, { backgroundColor: meta.bg }]}>
          <Ionicons name={meta.icon} size={22} color={meta.color} />
        </View>

        {/* Konten */}
        <View style={styles.textWrap}>
          <Text style={[styles.title, !item.is_read && styles.titleUnread]} numberOfLines={1}>
            {item.title}
          </Text>
          {!!item.body && (
            <Text style={styles.body} numberOfLines={2}>
              {item.body}
            </Text>
          )}
          <Text style={styles.time}>{formatDate(item.created_at)}</Text>
        </View>

        {/* Tombol hapus */}
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={() => deleteNotification(item.id)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="trash-outline" size={16} color="#9CA3AF" />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  // ── Empty state ──────────────────────────────────────────────────────────────

  const ListEmpty = () => (
    <View style={styles.emptyWrap}>
      <MaterialIcons name="notifications-none" size={72} color="#DFF4F2" />
      <Text style={styles.emptyTitle}>Belum ada notifikasi</Text>
      <Text style={styles.emptySubtitle}>
        Pembaruan sistem, agenda berjalan, dan status laporan akan muncul di sini.
      </Text>
    </View>
  );

  // ── Unread badge count ───────────────────────────────────────────────────────

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>Notifikasi</Text>
          {unreadCount > 0 && (
            <View style={styles.headerBadge}>
              <Text style={styles.headerBadgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>
        <TouchableOpacity
          onPress={markAllAsRead}
          disabled={markingAll || unreadCount === 0}
          style={[styles.markAllBtn, unreadCount === 0 && { opacity: 0.4 }]}
        >
          {markingAll ? (
            <ActivityIndicator size="small" color="#2E9F95" />
          ) : (
            <Text style={styles.markAllText}>Tandai semua</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* List */}
      {loading ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color="#2E9F95" />
        </View>
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchNotifications(); }}
              colors={['#2E9F95']}
              tintColor="#2E9F95"
            />
          }
          ListEmptyComponent={<ListEmpty />}
          contentContainerStyle={notifications.length === 0 ? { flex: 1 } : { paddingBottom: 32 }}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}
    </SafeAreaView>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FBFB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    gap: 8,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1F2937',
  },
  headerBadge: {
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  markAllBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#DFF4F2',
  },
  markAllText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2E9F95',
  },
  loaderWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
    position: 'relative',
  },
  itemUnread: {
    backgroundColor: '#F0FAFA',
  },
  unreadDot: {
    position: 'absolute',
    top: 18,
    left: 6,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#2E9F95',
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  textWrap: {
    flex: 1,
    gap: 3,
  },
  title: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    lineHeight: 20,
  },
  titleUnread: {
    fontWeight: '700',
    color: '#1F2937',
  },
  body: {
    fontSize: 13,
    color: '#6B7280',
    lineHeight: 18,
  },
  time: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 2,
  },
  deleteBtn: {
    padding: 4,
    marginTop: 2,
  },
  separator: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginHorizontal: 16,
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 20,
  },
});
