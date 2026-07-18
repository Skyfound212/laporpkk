import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, Image, TouchableOpacity, FlatList, TextInput,
  RefreshControl, ActivityIndicator, StyleSheet, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useAuthStore } from '@/stores/authStore';
import { useChatStore } from '@/stores/chatStore';
import { supabase } from '@/lib/supabase';
import { getPrivateRoomId, GROUP_ROOM_ID, ADMIN_ROOM_ID } from '@/lib/roomId';

// ─── Tipe ─────────────────────────────────────────────────────────────────────

interface RoomItem {
  id: string;
  profileId?: string;
  name: string;
  subtitle: string;
  type: 'group' | 'private' | 'admin';
  lastMessageAt?: string;
  lastMessage?: string;
  lastSenderId?: string;
  avatarUrl?: string;
}

// ─── Warna avatar deterministik ───────────────────────────────────────────────

const AVATAR_COLORS = ['#7ECDC0', '#5DB9AA', '#2E9F95', '#81C784', '#F48FB1', '#FFB74D', '#7986CB'];
function avatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

// ─── Format waktu ─────────────────────────────────────────────────────────────

function formatRoomTime(dateStr?: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  if (days === 1) return 'Kemarin';
  if (days < 7) return `${days}h lalu`;
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function RoomAvatar({ name, type, isOnline, avatarUrl }: {
  name: string; type: RoomItem['type']; isOnline?: boolean; avatarUrl?: string;
}) {
  const letter = name.trim().charAt(0).toUpperCase();
  const bg = type === 'group' ? '#2E9F95' : type === 'admin' ? '#5C6BC0' : avatarColor(name);
  const icon = type === 'group' ? 'people' : type === 'admin' ? 'headset' : null;

  return (
    <View style={{ position: 'relative', marginRight: 12 }}>
      <View style={[styles.avatar, { backgroundColor: bg, overflow: 'hidden' }]}>
        {avatarUrl && type === 'private' ? (
          <Image source={{ uri: avatarUrl }} style={{ width: 50, height: 50, borderRadius: 25 }} />
        ) : icon ? (
          <Ionicons name={icon as any} size={22} color="#fff" />
        ) : (
          <Text style={styles.avatarText}>{letter}</Text>
        )}
      </View>
      {type === 'private' && (
        <View style={[styles.onlineDot, { backgroundColor: isOnline ? '#22C55E' : '#D1D5DB' }]} />
      )}
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function ChatScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { unreadPerRoom, initFromDb } = useChatStore();

  const [rooms, setRooms]         = useState<RoomItem[]>([]);
  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch]       = useState('');
  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set());
  const presenceRef = useRef<any>(null);

  // ── Presence ──────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!user?.id) return;
    const ch = supabase.channel('chat-list-presence', {
      config: { presence: { key: user.id } },
    });
    ch.on('presence', { event: 'sync' }, () => {
      setOnlineIds(new Set(Object.keys(ch.presenceState())));
    }).subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await ch.track({ user_id: user.id, at: new Date().toISOString() });
      }
    });
    presenceRef.current = ch;
    return () => { supabase.removeChannel(ch); };
  }, [user?.id]);

  // ── Fetch ruangan ─────────────────────────────────────────────────────────

  const fetchRooms = useCallback(async () => {
    if (!user?.id) return;
    try {
      // 1. Semua anggota aktif selain diri sendiri
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, nama, jabatan, avatar_url')
        .neq('id', user.id)
        .eq('status', 'active')
        .order('nama', { ascending: true });

      const members = profiles ?? [];

      // 2. Room IDs
      const privateRoomIds = members.map((m: any) => getPrivateRoomId(user.id, m.id));
      const allRoomIds = [GROUP_ROOM_ID, ADMIN_ROOM_ID, ...privateRoomIds];

      // 3. Pesan terakhir per room (1 query, sorted desc, ambil first per room)
      const { data: lastMsgs } = await supabase
        .from('messages')
        .select('room_id, content, created_at, sender_id, type, sender_name')
        .in('room_id', allRoomIds)
        .order('created_at', { ascending: false });

      // 4. Unread messages (is_read = false, bukan dari saya)
      const { data: unreadMsgs } = await supabase
        .from('messages')
        .select('room_id')
        .in('room_id', allRoomIds)
        .neq('sender_id', user.id)
        .eq('is_read', false);

      // 5. Map lastMsg per room (first occurrence = latest)
      const lastMsgMap: Record<string, any> = {};
      for (const msg of lastMsgs ?? []) {
        if (!lastMsgMap[msg.room_id]) lastMsgMap[msg.room_id] = msg;
      }

      // 6. Map unread per room
      const dbUnreadMap: Record<string, number> = {};
      for (const msg of unreadMsgs ?? []) {
        dbUnreadMap[msg.room_id] = (dbUnreadMap[msg.room_id] ?? 0) + 1;
      }

      // Sync ke chatStore agar badge di tab bar juga akurat
      initFromDb(dbUnreadMap);

      const lastContent = (msg: any): string => {
        if (!msg) return '';
        if (msg.type === 'image') return '📷 Gambar';
        if (msg.type === 'system') return msg.content;
        return msg.content ?? '';
      };

      // 7. Bangun rooms
      const fixedRooms: RoomItem[] = [
        {
          id: GROUP_ROOM_ID,
          name: 'Ruang Rumpi PKK',
          subtitle: 'Grup · semua anggota',
          type: 'group',
          lastMessage: lastContent(lastMsgMap[GROUP_ROOM_ID]),
          lastMessageAt: lastMsgMap[GROUP_ROOM_ID]?.created_at,
          lastSenderId: lastMsgMap[GROUP_ROOM_ID]?.sender_id,
        },
        {
          id: ADMIN_ROOM_ID,
          name: 'Chat Admin PKK',
          subtitle: 'Pengaduan & bantuan',
          type: 'admin',
          lastMessage: lastContent(lastMsgMap[ADMIN_ROOM_ID]),
          lastMessageAt: lastMsgMap[ADMIN_ROOM_ID]?.created_at,
          lastSenderId: lastMsgMap[ADMIN_ROOM_ID]?.sender_id,
        },
      ];

      const privateRooms: RoomItem[] = members.map((m: any) => {
        const rid = getPrivateRoomId(user.id, m.id);
        const lm = lastMsgMap[rid];
        return {
          id: rid,
          profileId: m.id,
          name: m.nama,
          subtitle: m.jabatan ?? '',
          type: 'private' as const,
          avatarUrl: m.avatar_url ?? undefined,
          lastMessage: lm ? lastContent(lm) : undefined,
          lastMessageAt: lm?.created_at,
          lastSenderId: lm?.sender_id,
        };
      });

      // Sort private: ada pesan → terbaru dulu
      privateRooms.sort((a, b) => {
        if (a.lastMessageAt && b.lastMessageAt)
          return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime();
        if (a.lastMessageAt) return -1;
        if (b.lastMessageAt) return 1;
        return a.name.localeCompare(b.name, 'id');
      });

      setRooms([...fixedRooms, ...privateRooms]);
    } catch (err) {
      console.error('fetchRooms:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id, initFromDb]);

  useEffect(() => { fetchRooms(); }, [fetchRooms]);

  // ── Realtime: targeted room update (tanpa full refetch) ───────────────────

  useEffect(() => {
    if (!user?.id) return;

    const ch = supabase
      .channel('chat-list-messages-v2')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const msg = payload.new as any;
          const roomId: string = msg.room_id;
          const isMe = msg.sender_id === user?.id;

          // Update room entry yang terdampak
          setRooms((prev) => {
            const idx = prev.findIndex((r) => r.id === roomId);
            if (idx === -1) return prev; // room tidak ada di list (bukan room relevan)

            const updated = { ...prev[idx] };
            updated.lastMessage = msg.type === 'image' ? '📷 Gambar'
              : msg.type === 'system' ? msg.content
              : msg.content ?? '';
            updated.lastMessageAt = msg.created_at;
            updated.lastSenderId  = msg.sender_id;

            const next = [...prev];
            next[idx] = updated;

            // Re-sort private rooms (fixed rooms tetap di atas)
            const fixed   = next.filter((r) => r.type === 'group' || r.type === 'admin');
            const privates = next.filter((r) => r.type === 'private').sort((a, b) => {
              if (a.lastMessageAt && b.lastMessageAt)
                return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime();
              if (a.lastMessageAt) return -1;
              if (b.lastMessageAt) return 1;
              return 0;
            });

            return [...fixed, ...privates];
          });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [user?.id]);

  // ── Filter pencarian ──────────────────────────────────────────────────────

  const filtered = search.trim()
    ? rooms.filter((r) => r.name.toLowerCase().includes(search.toLowerCase()))
    : rooms;

  // ── Render item ───────────────────────────────────────────────────────────

  const renderItem = ({ item }: { item: RoomItem }) => {
    const isOnline  = item.profileId ? onlineIds.has(item.profileId) : false;
    const isMe      = item.lastSenderId === user?.id;
    const unread    = unreadPerRoom[item.id] ?? 0;
    const hasUnread = unread > 0;
    const hasMsg    = !!item.lastMessage;

    return (
      <TouchableOpacity
        onPress={() =>
          router.push({
            pathname: '/chat/room',
            params: {
              id: item.id,
              name: item.name,
              type: item.type,
              profileId: item.profileId ?? '',
            },
          } as any)
        }
        activeOpacity={0.7}
        style={[
          styles.roomRow,
          item.type === 'group' && styles.roomRowGroup,
          item.type === 'admin' && styles.roomRowAdmin,
        ]}
      >
        <RoomAvatar name={item.name} type={item.type} isOnline={isOnline} avatarUrl={item.avatarUrl} />

        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={styles.roomMeta}>
            <Text style={[styles.roomName, hasUnread && styles.roomNameBold]} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={[styles.roomTime, hasUnread && styles.roomTimeBold]}>
              {formatRoomTime(item.lastMessageAt)}
            </Text>
          </View>

          <View style={styles.roomPreviewRow}>
            <Text
              style={[
                styles.roomPreview,
                hasUnread && styles.roomPreviewBold,
                !hasMsg && styles.roomPreviewEmpty,
              ]}
              numberOfLines={1}
            >
              {hasMsg
                ? (isMe ? `Anda: ${item.lastMessage}` : item.lastMessage)
                : item.subtitle}
            </Text>
            {hasUnread && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {unread > 99 ? '99+' : String(unread)}
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Pesan</Text>
          <Text style={styles.headerSub}>
            {onlineIds.size > 0 ? `${onlineIds.size} anggota online` : 'Chat anggota PKK'}
          </Text>
        </View>
        <TouchableOpacity style={styles.headerIcon} onPress={fetchRooms}>
          <Ionicons name="refresh-outline" size={20} color="#5DB9AA" />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <Ionicons name="search" size={16} color="#B2BEC3" style={{ marginRight: 8 }} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Cari nama anggota..."
          placeholderTextColor="#B2BEC3"
          style={styles.searchInput}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
        {search.length > 0 && Platform.OS !== 'ios' && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={16} color="#B2BEC3" />
          </TouchableOpacity>
        )}
      </View>

      {/* Daftar */}
      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#7ECDC0" />
          <Text style={{ marginTop: 12, color: '#B2BEC3', fontSize: 13 }}>Memuat percakapan...</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setRefreshing(true); fetchRooms(); }}
              tintColor="#7ECDC0"
              colors={['#7ECDC0']}
            />
          }
          contentContainerStyle={{ paddingBottom: 130, flexGrow: 1 }}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={() => (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 }}>
              <MaterialIcons name="chat-bubble-outline" size={64} color="#E8F6F3" />
              <Text style={{ color: '#636E72', marginTop: 16, fontSize: 15, fontWeight: '600' }}>
                {search ? 'Tidak ditemukan' : 'Belum ada percakapan'}
              </Text>
              <Text style={{ color: '#B2BEC3', fontSize: 13, marginTop: 6, textAlign: 'center', paddingHorizontal: 32 }}>
                {search
                  ? `Tidak ada anggota bernama "${search}"`
                  : 'Mulai chat dengan anggota PKK di bawah'}
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
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1, borderBottomColor: '#E8F6F3',
  },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#2D3436', letterSpacing: -0.3 },
  headerSub: { fontSize: 12, color: '#7ECDC0', marginTop: 1, fontWeight: '600' },
  headerIcon: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: '#E8F6F3',
    alignItems: 'center', justifyContent: 'center',
  },

  searchWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16, marginVertical: 10,
    borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 10 : 6,
    borderWidth: 1, borderColor: '#E8F6F3',
    shadowColor: '#7ECDC0', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8,
    elevation: 2,
  },
  searchInput: { flex: 1, fontSize: 14, color: '#2D3436' },

  roomRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 13,
    backgroundColor: '#fff',
  },
  roomRowGroup: { backgroundColor: '#F0FAF9' },
  roomRowAdmin: { backgroundColor: '#F5F3FF' },

  separator: { height: 1, backgroundColor: '#F0F9F8', marginLeft: 78 },

  avatar: {
    width: 50, height: 50, borderRadius: 25,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontWeight: '700', fontSize: 18 },
  onlineDot: {
    position: 'absolute', bottom: 1, right: 1,
    width: 13, height: 13, borderRadius: 7,
    borderWidth: 2, borderColor: '#fff',
  },

  roomMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 },
  roomName: { flex: 1, fontSize: 15, color: '#2D3436', marginRight: 8 },
  roomNameBold: { fontWeight: '700' },
  roomTime: { fontSize: 11, color: '#B2BEC3' },
  roomTimeBold: { color: '#7ECDC0', fontWeight: '700' },

  roomPreviewRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  roomPreview: { flex: 1, fontSize: 13, color: '#636E72', marginRight: 8 },
  roomPreviewBold: { color: '#2D3436', fontWeight: '600' },
  roomPreviewEmpty: { color: '#B2BEC3', fontStyle: 'italic' },

  badge: {
    backgroundColor: '#FF3B30',
    borderRadius: 10, minWidth: 20, height: 20,
    paddingHorizontal: 5,
    alignItems: 'center', justifyContent: 'center',
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },
});
