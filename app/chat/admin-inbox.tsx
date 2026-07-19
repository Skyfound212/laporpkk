import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, Image, TouchableOpacity, FlatList,
  RefreshControl, ActivityIndicator, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/stores/authStore';
import { useChatStore } from '@/stores/chatStore';
import { supabase } from '@/lib/supabase';
import { getAdminRoomId, isAdminRoom } from '@/lib/roomId';

// ─── Tipe ─────────────────────────────────────────────────────────────────────

interface ComplaintItem {
  profileId: string;
  name: string;
  jabatan: string;
  avatarUrl?: string | null;
  roomId: string;
  lastMessage?: string;
  lastMessageAt?: string;
  lastSenderId?: string;
  unreadCount: number;
}

// ─── Format waktu ─────────────────────────────────────────────────────────────

function formatTime(dateStr?: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now  = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  if (days === 1) return 'Kemarin';
  if (days < 7)  return `${days}h lalu`;
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function AdminInboxScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { unreadPerRoom, clearUnread } = useChatStore();

  const [items, setItems]         = useState<ComplaintItem[]>([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // ── Fetch semua room keluhan dari semua anggota ─────────────────────────────

  const fetchInbox = useCallback(async () => {
    if (!user?.id) return;
    try {
      // 1. Semua anggota aktif (selain admin sendiri)
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, nama, jabatan, avatar_url')
        .neq('id', user.id)
        .eq('status', 'active')
        .order('nama', { ascending: true });

      const members = profiles ?? [];
      const adminRoomIds = members.map((m: any) => getAdminRoomId(m.id));

      if (adminRoomIds.length === 0) {
        setItems([]);
        return;
      }

      // 2. Pesan terakhir per room (sorted desc, ambil first per room)
      const { data: lastMsgs } = await supabase
        .from('messages')
        .select('room_id, content, created_at, sender_id, type')
        .in('room_id', adminRoomIds)
        .order('created_at', { ascending: false })
        .limit(500);

      // 3. Unread untuk admin (pesan dari user yang belum dibaca admin)
      const { data: unreadMsgs } = await supabase
        .from('messages')
        .select('room_id')
        .in('room_id', adminRoomIds)
        .neq('sender_id', user.id)
        .eq('is_read', false)
        .limit(1000);

      // 4. Build maps
      const lastMsgMap: Record<string, any> = {};
      for (const msg of lastMsgs ?? []) {
        if (!lastMsgMap[msg.room_id]) lastMsgMap[msg.room_id] = msg;
      }

      const unreadMap: Record<string, number> = {};
      for (const msg of unreadMsgs ?? []) {
        unreadMap[msg.room_id] = (unreadMap[msg.room_id] ?? 0) + 1;
      }

      const lastContent = (msg: any): string => {
        if (!msg) return '';
        if (msg.type === 'image') return '📷 Gambar';
        if (msg.type === 'system') return msg.content;
        return msg.content ?? '';
      };

      // 5. Build items — hanya tampilkan user yang sudah pernah mengirim pesan
      const built: ComplaintItem[] = members
        .map((m: any) => {
          const rid = getAdminRoomId(m.id);
          const lm  = lastMsgMap[rid];
          // Gabungkan unread dari DB + dari realtime store
          const dbUnread   = unreadMap[rid] ?? 0;
          const storeUnread = unreadPerRoom[rid] ?? 0;
          return {
            profileId: m.id,
            name: m.nama,
            jabatan: m.jabatan ?? 'Anggota',
            avatarUrl: m.avatar_url ?? null,
            roomId: rid,
            lastMessage: lm ? lastContent(lm) : undefined,
            lastMessageAt: lm?.created_at,
            lastSenderId: lm?.sender_id,
            unreadCount: Math.max(dbUnread, storeUnread),
          };
        })
        .filter((item) => !!item.lastMessage); // hanya tampilkan yang sudah ada pesan

      // 6. Sort: ada unread dulu, lalu terbaru
      built.sort((a, b) => {
        if (b.unreadCount !== a.unreadCount) return b.unreadCount - a.unreadCount;
        if (a.lastMessageAt && b.lastMessageAt)
          return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime();
        if (a.lastMessageAt) return -1;
        if (b.lastMessageAt) return 1;
        return 0;
      });

      setItems(built);
    } catch (err) {
      console.error('AdminInbox fetchInbox:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id, unreadPerRoom]);

  useEffect(() => { fetchInbox(); }, []);

  // ── Realtime: update inbox saat ada pesan baru di room admin manapun ────────

  useEffect(() => {
    if (!user?.id) return;

    const ch = supabase
      .channel('admin-inbox-realtime')
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages',
      }, (payload) => {
        const msg = payload.new as any;
        if (!isAdminRoom(msg.room_id)) return; // abaikan bukan room admin

        setItems((prev) => {
          const idx = prev.findIndex((item) => item.roomId === msg.room_id);
          if (idx === -1) {
            // Room baru — trigger full refresh
            fetchInbox();
            return prev;
          }

          const updated = { ...prev[idx] };
          updated.lastMessage   = msg.type === 'image' ? '📷 Gambar' : msg.content ?? '';
          updated.lastMessageAt = msg.created_at;
          updated.lastSenderId  = msg.sender_id;
          if (msg.sender_id !== user.id) {
            updated.unreadCount = (updated.unreadCount ?? 0) + 1;
          }

          const next = [...prev];
          next[idx] = updated;

          // Re-sort
          next.sort((a, b) => {
            if (b.unreadCount !== a.unreadCount) return b.unreadCount - a.unreadCount;
            if (a.lastMessageAt && b.lastMessageAt)
              return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime();
            return 0;
          });

          return next;
        });
      })
      .subscribe();

    channelRef.current = ch;
    return () => { supabase.removeChannel(ch); };
  }, [user?.id]);

  // ── Render item ─────────────────────────────────────────────────────────────

  const renderItem = ({ item }: { item: ComplaintItem }) => {
    const isMe     = item.lastSenderId === user?.id;
    const hasUnread = item.unreadCount > 0;

    const openRoom = () => {
      clearUnread(item.roomId);
      router.push({
        pathname: '/chat/room',
        params: {
          id: item.roomId,
          name: item.name,
          type: 'admin',
          profileId: item.profileId,
        },
      } as any);
    };

    return (
      <TouchableOpacity
        onPress={openRoom}
        activeOpacity={0.7}
        style={[styles.row, hasUnread && styles.rowUnread]}
      >
        {/* Avatar */}
        <View style={{ position: 'relative', marginRight: 12 }}>
          <View style={[styles.avatar, { overflow: 'hidden' }]}>
            {item.avatarUrl ? (
              <Image source={{ uri: item.avatarUrl }} style={{ width: 50, height: 50, borderRadius: 25 }} />
            ) : (
              <Text style={styles.avatarText}>{item.name.trim().charAt(0).toUpperCase()}</Text>
            )}
          </View>
          {hasUnread && (
            <View style={styles.unreadDot} />
          )}
        </View>

        {/* Info */}
        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={styles.rowMeta}>
            <Text style={[styles.name, hasUnread && styles.nameBold]} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={[styles.time, hasUnread && styles.timeBold]}>
              {formatTime(item.lastMessageAt)}
            </Text>
          </View>
          <Text style={[styles.jabatan]}>{item.jabatan}</Text>
          <View style={styles.previewRow}>
            <Text
              style={[styles.preview, hasUnread && styles.previewBold]}
              numberOfLines={1}
            >
              {item.lastMessage
                ? (isMe ? `Anda: ${item.lastMessage}` : item.lastMessage)
                : 'Belum ada pesan'}
            </Text>
            {hasUnread && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {item.unreadCount > 99 ? '99+' : String(item.unreadCount)}
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={{ marginRight: 8 }}
        >
          <Ionicons name="arrow-back" size={22} color="#2D3436" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Kotak Keluhan</Text>
          <Text style={styles.headerSub}>
            {items.length > 0 ? `${items.length} percakapan` : 'Belum ada keluhan masuk'}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => { setRefreshing(true); fetchInbox(); }}
          style={styles.refreshBtn}
        >
          <Ionicons name="refresh-outline" size={20} color="#5DB9AA" />
        </TouchableOpacity>
      </View>

      {/* Daftar */}
      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#7ECDC0" />
          <Text style={{ marginTop: 12, color: '#B2BEC3', fontSize: 13 }}>Memuat keluhan...</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          renderItem={renderItem}
          keyExtractor={(item) => item.profileId}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchInbox(); }}
              tintColor="#7ECDC0"
              colors={['#7ECDC0']}
            />
          }
          contentContainerStyle={{ paddingBottom: 40, flexGrow: 1 }}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          ListEmptyComponent={() => (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 }}>
              <Ionicons name="chatbubbles-outline" size={64} color="#E8F6F3" />
              <Text style={{ color: '#636E72', marginTop: 16, fontSize: 15, fontWeight: '600' }}>
                Belum ada keluhan masuk
              </Text>
              <Text style={{ color: '#B2BEC3', fontSize: 13, marginTop: 6, textAlign: 'center', paddingHorizontal: 32 }}>
                Keluhan dari anggota akan muncul di sini
              </Text>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8FBFB' },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#E8F6F3',
  },
  headerTitle: { fontSize: 18, fontWeight: '800', color: '#2D3436' },
  headerSub: { fontSize: 12, color: '#7ECDC0', marginTop: 1, fontWeight: '600' },
  refreshBtn: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: '#E8F6F3',
    alignItems: 'center', justifyContent: 'center',
  },

  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: '#fff',
  },
  rowUnread: { backgroundColor: '#F0FAF9' },
  sep: { height: 1, backgroundColor: '#F0F9F8', marginLeft: 78 },

  avatar: {
    width: 50, height: 50, borderRadius: 25,
    backgroundColor: '#5C6BC0',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 18 },
  unreadDot: {
    position: 'absolute', bottom: 1, right: 1,
    width: 13, height: 13, borderRadius: 7,
    backgroundColor: '#FF3B30',
    borderWidth: 2, borderColor: '#fff',
  },

  rowMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 1 },
  name: { flex: 1, fontSize: 15, color: '#2D3436', marginRight: 8 },
  nameBold: { fontWeight: '700' },
  jabatan: { fontSize: 11, color: '#B2BEC3', marginBottom: 2 },
  time: { fontSize: 11, color: '#B2BEC3' },
  timeBold: { color: '#7ECDC0', fontWeight: '700' },

  previewRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  preview: { flex: 1, fontSize: 13, color: '#636E72', marginRight: 8 },
  previewBold: { color: '#2D3436', fontWeight: '600' },

  badge: {
    backgroundColor: '#FF3B30',
    borderRadius: 10, minWidth: 20, height: 20,
    paddingHorizontal: 5,
    alignItems: 'center', justifyContent: 'center',
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
});
