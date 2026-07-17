import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ScrollView,
  RefreshControl,
  StyleSheet,
  Image,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase';

// ─── Tipe ──────────────────────────────────────────────────────────────────────

interface PostItem {
  id: string;
  content: string;
  category: string;
  type: string;
  images?: string[];
  created_at: string;
  likes_count: number;
  user: { id: string; nama: string; jabatan: string };
}

interface StoryItem {
  id: string;
  nama: string;
  jabatan: string;
  user_id: string;
  isOnline?: boolean;
}

interface AgendaItem {
  id: string;
  title: string;
  location?: string;
  start_date: string;
  end_date?: string;
  status: string;
}

// ─── Konstanta ─────────────────────────────────────────────────────────────────

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const C = {
  primary:    '#5FC8BF',
  dark:       '#2E9F95',
  light:      '#DFF4F2',
  bg:         '#F8FBFB',
  card:       '#FFFFFF',
  textMain:   '#1F2937',
  textSub:    '#6B7280',
  textMuted:  '#9CA3AF',
  border:     '#E5E7EB',
};

// ─── Utilitas ──────────────────────────────────────────────────────────────────

function getGreeting(hour: number): string {
  if (hour < 11) return 'Selamat Pagi';
  if (hour < 15) return 'Selamat Siang';
  if (hour < 18) return 'Selamat Sore';
  return 'Selamat Malam';
}

function getGreetingIcon(hour: number): string {
  if (hour < 11) return '🌤️';
  if (hour < 15) return '☀️';
  if (hour < 18) return '🌇';
  return '🌙';
}

function formatRelativeDate(dateString: string): string {
  const date    = new Date(dateString);
  const now     = new Date();
  const diff    = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours   = Math.floor(diff / 3600000);
  const days    = Math.floor(diff / 86400000);

  if (minutes < 1)  return 'Baru saja';
  if (minutes < 60) return `${minutes}m lalu`;
  if (hours < 24)   return `${hours}j lalu`;
  if (days < 7)     return `${days}h lalu`;
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
}

function formatAgendaDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('id-ID', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w.charAt(0).toUpperCase())
    .join('');
}

// ─── Screen ────────────────────────────────────────────────────────────────────

export default function BerandaScreen() {
  const router = useRouter();
  const { user } = useAuthStore();

  const [posts,      setPosts]      = useState<PostItem[]>([]);
  const [stories,    setStories]    = useState<StoryItem[]>([]);
  const [liveEvent,  setLiveEvent]  = useState<AgendaItem | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());

  // Jam berjalan setiap menit
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // ── Fetch semua data ────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    if (!user?.id) return;
    try {
      await Promise.all([
        fetchPosts(),
        fetchStories(),
        fetchLiveEvent(),
        fetchUnreadCount(),
      ]);
    } catch (err) {
      console.error('Error fetching beranda:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  const fetchPosts = async () => {
    const { data, error } = await supabase
      .from('posts')
      .select('id, content, category, type, images, created_at, likes_count, user:profiles(id, nama, jabatan)')
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;
    setPosts(
      (data ?? []).map((item: any) => {
        const u = Array.isArray(item.user) ? item.user[0] : item.user;
        return { ...item, user: { id: u?.id || '', nama: u?.nama || 'Anggota PKK', jabatan: u?.jabatan || 'Anggota' } };
      })
    );
  };

  const fetchStories = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, nama, jabatan')
      .limit(12);

    if (error) throw error;
    setStories((data ?? []).map((u: any) => ({ id: u.id, nama: u.nama, jabatan: u.jabatan, user_id: u.id })));
  };

  const fetchLiveEvent = async () => {
    // Coba ongoing dulu, lalu upcoming
    const { data: ongoing } = await supabase
      .from('agenda')
      .select('id, title, location, start_date, end_date, status')
      .eq('status', 'ongoing')
      .order('start_date', { ascending: true })
      .limit(1);

    if (ongoing && ongoing.length > 0) {
      setLiveEvent(ongoing[0] as AgendaItem);
      return;
    }

    const { data: upcoming } = await supabase
      .from('agenda')
      .select('id, title, location, start_date, end_date, status')
      .eq('status', 'upcoming')
      .order('start_date', { ascending: true })
      .limit(1);

    setLiveEvent(upcoming?.[0] ?? null);
  };

  const fetchUnreadCount = async () => {
    if (!user?.id) return;
    const { count, error } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false);

    if (!error) setUnreadCount(count ?? 0);
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Real-time badge notif ───────────────────────────────────────────────────

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('beranda-notif-badge')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        () => { fetchUnreadCount(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);

  // ── Realtime Presence — status online anggota ─────────────────────────────

  useEffect(() => {
    if (!user?.id) return;

    const presenceChannel = supabase.channel('pkk-online-presence', {
      config: { presence: { key: user.id } },
    });

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState();
        setOnlineUserIds(new Set(Object.keys(state)));
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track({ user_id: user.id, online_at: new Date().toISOString() });
        }
      });

    return () => { supabase.removeChannel(presenceChannel); };
  }, [user?.id]);

  // ─────────────────────────────────────────────────────────────────────────────

  const hour        = currentTime.getHours();
  const greeting    = getGreeting(hour);
  const greetIcon   = getGreetingIcon(hour);
  const firstName   = user?.nama?.split(' ')[0] ?? 'Anggota';

  // ── Render story ─────────────────────────────────────────────────────────────

  const renderStory = ({ item }: { item: StoryItem }) => {
    const isOnline = onlineUserIds.has(item.user_id);
    return (
      <TouchableOpacity
        onPress={() => router.push({ pathname: '/profile/other', params: { id: item.user_id } })}
        style={styles.storyItem}
        activeOpacity={0.8}
      >
        <View style={[styles.storyAvatarRing, isOnline && styles.storyAvatarRingOnline]}>
          <View style={styles.storyAvatar}>
            <Text style={styles.storyAvatarText}>{getInitials(item.nama)}</Text>
          </View>
          {/* Indikator online/offline */}
          <View style={[styles.onlineDot, { backgroundColor: isOnline ? '#22C55E' : '#D1D5DB' }]} />
        </View>
        <Text style={styles.storyName} numberOfLines={1}>
          {item.nama.split(' ')[0]}
        </Text>
        <Text style={[styles.storyStatus, { color: isOnline ? '#22C55E' : '#B2BEC3' }]}>
          {isOnline ? 'online' : 'offline'}
        </Text>
      </TouchableOpacity>
    );
  };

  // ── Render post ──────────────────────────────────────────────────────────────

  const renderPost = ({ item }: { item: PostItem }) => (
    <TouchableOpacity
      activeOpacity={0.95}
      onPress={() => router.push({ pathname: '/post/detail', params: { id: item.id } } as any)}
      style={styles.postCard}
    >
      {/* Author */}
      <TouchableOpacity
        onPress={() => router.push({ pathname: '/profile/other', params: { id: item.user.id } })}
        style={styles.postAuthorRow}
        activeOpacity={0.7}
      >
        <View style={styles.postAvatar}>
          <Text style={styles.postAvatarText}>{getInitials(item.user.nama)}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.postAuthorName}>{item.user.nama}</Text>
          <Text style={styles.postAuthorJob}>{item.user.jabatan}</Text>
        </View>
        <Text style={styles.postTime}>{formatRelativeDate(item.created_at)}</Text>
      </TouchableOpacity>

      {/* Badge kategori */}
      <View style={styles.categoryBadge}>
        <Text style={styles.categoryText}>{item.category}</Text>
      </View>

      {/* Konten */}
      <Text style={styles.postContent} numberOfLines={3}>{item.content}</Text>

      {/* Foto dokumentasi */}
      {item.images && item.images.length > 0 && (
        <Image
          source={{ uri: item.images[0] }}
          style={styles.postImage}
          resizeMode="cover"
        />
      )}

      {/* Like */}
      <View style={styles.postFooter}>
        <Ionicons name="heart-outline" size={18} color={C.textMuted} />
        <Text style={styles.postLikeText}>{item.likes_count} Suka</Text>
      </View>
    </TouchableOpacity>
  );

  // ── Loading state ────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={C.dark} />
        </View>
      </SafeAreaView>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        {/* Kiri: Sapaan + Nama + Jabatan */}
        <View style={{ flex: 1 }}>
          <Text style={styles.headerGreeting}>{greetIcon}  {greeting}</Text>
          <Text style={styles.headerName} numberOfLines={1}>{firstName}</Text>
          <View style={styles.jabatanBadge}>
            <Text style={styles.jabatanText}>{user?.jabatan ?? 'Anggota PKK'}</Text>
          </View>
        </View>

        {/* Kanan: Jam + Tanggal + Notif */}
        <View style={styles.headerRight}>
          <Text style={styles.headerTime}>
            {currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
          </Text>
          <Text style={styles.headerDate}>
            {currentTime.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' })}
          </Text>
          {/* Tombol notifikasi */}
          <TouchableOpacity
            style={styles.notifBtn}
            onPress={() => router.push('/notifikasi' as any)}
            activeOpacity={0.8}
          >
            <Ionicons name="notifications-outline" size={22} color={C.dark} />
            {unreadCount > 0 && (
              <View style={styles.notifBadge}>
                <Text style={styles.notifBadgeText}>
                  {unreadCount > 99 ? '99+' : String(unreadCount)}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Scrollable content ────────────────────────────────────────────── */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchData(); }}
            colors={[C.dark]}
            tintColor={C.dark}
          />
        }
        contentContainerStyle={{ paddingBottom: 130 }}
      >
        {/* ── Live Event Card ──────────────────────────────────────────────── */}
        <View style={styles.liveSection}>
          {liveEvent ? (
            <TouchableOpacity
              style={styles.liveCard}
              onPress={() => router.push({ pathname: '/agenda/detail', params: { id: liveEvent.id } } as any)}
              activeOpacity={0.85}
            >
              {/* Label status */}
              <View style={styles.liveBadge}>
                <View style={[
                  styles.liveDot,
                  { backgroundColor: liveEvent.status === 'ongoing' ? '#4ADE80' : '#FCD34D' },
                ]} />
                <Text style={styles.liveBadgeText}>
                  {liveEvent.status === 'ongoing' ? 'SEDANG BERLANGSUNG' : 'AKAN DATANG'}
                </Text>
              </View>

              <Text style={styles.liveTitle} numberOfLines={2}>{liveEvent.title}</Text>

              <View style={styles.liveMetaRow}>
                {!!liveEvent.location && (
                  <View style={styles.liveMetaItem}>
                    <Ionicons name="location-outline" size={14} color="rgba(255,255,255,0.8)" />
                    <Text style={styles.liveMetaText} numberOfLines={1}>{liveEvent.location}</Text>
                  </View>
                )}
                <View style={styles.liveMetaItem}>
                  <Ionicons name="time-outline" size={14} color="rgba(255,255,255,0.8)" />
                  <Text style={styles.liveMetaText}>{formatAgendaDate(liveEvent.start_date)}</Text>
                </View>
              </View>

              {/* Tombol detail */}
              <View style={styles.liveDetailBtn}>
                <Text style={styles.liveDetailText}>Lihat Detail</Text>
                <Ionicons name="arrow-forward" size={14} color={C.dark} />
              </View>
            </TouchableOpacity>
          ) : (
            <View style={styles.liveCardEmpty}>
              <Ionicons name="calendar-outline" size={32} color="rgba(255,255,255,0.6)" />
              <Text style={styles.liveEmptyText}>Tidak ada agenda aktif saat ini</Text>
            </View>
          )}
        </View>

        {/* ── Aksi Cepat ──────────────────────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Aksi Cepat</Text>
          <View style={styles.aksiRow}>
            <TouchableOpacity
              style={styles.aksiCard}
              onPress={() => router.push('/laporan/form')}
              activeOpacity={0.8}
            >
              <View style={styles.aksiIcon}>
                <Ionicons name="document-text" size={24} color={C.dark} />
              </View>
              <Text style={styles.aksiLabel}>Buat{'\n'}Laporan</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.aksiCard}
              onPress={() => router.push('/agenda/form')}
              activeOpacity={0.8}
            >
              <View style={styles.aksiIcon}>
                <Ionicons name="calendar" size={24} color={C.dark} />
              </View>
              <Text style={styles.aksiLabel}>Buat{'\n'}Agenda</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.aksiCard}
              onPress={() => router.push('/chat/admin')}
              activeOpacity={0.8}
            >
              <View style={styles.aksiIcon}>
                <Ionicons name="chatbubbles" size={24} color={C.dark} />
              </View>
              <Text style={styles.aksiLabel}>Chat{'\n'}Admin</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.aksiCard}
              onPress={() => router.push('/agenda/detail' as any)}
              activeOpacity={0.8}
            >
              <View style={styles.aksiIcon}>
                <Ionicons name="calendar-outline" size={24} color={C.dark} />
              </View>
              <Text style={styles.aksiLabel}>Lihat{'\n'}Agenda</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Stories (Anggota Aktif) ──────────────────────────────────────── */}
        {stories.length > 0 && (
          <View style={styles.storiesSection}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Anggota Aktif</Text>
            </View>
            <FlatList
              data={stories}
              renderItem={renderStory}
              keyExtractor={(item) => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16 }}
              ListHeaderComponent={() => (
                <TouchableOpacity
                  onPress={() => router.push('/profile')}
                  style={styles.storyItem}
                  activeOpacity={0.8}
                >
                  <View style={[styles.storyAvatarRing, styles.storyAvatarRingSelf]}>
                    <View style={[styles.storyAvatar, styles.storyAvatarSelf]}>
                      <Text style={styles.storyAvatarText}>
                        {getInitials(user?.nama ?? '?')}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.storyName, { color: C.dark, fontWeight: '600' }]}>Anda</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        )}

        {/* ── Feed: Update Anggota ─────────────────────────────────────────── */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Update Anggota</Text>
          </View>
          <FlatList
            data={posts}
            renderItem={renderPost}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            ListEmptyComponent={() => (
              <View style={styles.emptyFeed}>
                <MaterialIcons name="post-add" size={64} color={C.light} />
                <Text style={styles.emptyFeedTitle}>Belum ada update</Text>
                <TouchableOpacity
                  style={styles.emptyFeedBtn}
                  onPress={() => router.push('/post/options')}
                  activeOpacity={0.8}
                >
                  <Text style={styles.emptyFeedBtnText}>Buat Update</Text>
                </TouchableOpacity>
              </View>
            )}
          />
        </View>
      </ScrollView>

    </SafeAreaView>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: C.bg,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Header ──────────────────────────────────────────────────────────────────
  header: {
    backgroundColor: C.dark,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 36,
    paddingBottom: 44,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  headerGreeting: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
    marginBottom: 2,
  },
  headerName: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  jabatanBadge: {
    alignSelf: 'flex-start',
    marginTop: 5,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  jabatanText: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  headerRight: {
    alignItems: 'flex-end',
    gap: 2,
  },
  headerTime: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  headerDate: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.75)',
    marginBottom: 8,
  },
  notifBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  notifBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: C.dark,
  },
  notifBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // ── Live Event ───────────────────────────────────────────────────────────────
  liveSection: {
    marginTop: -28,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  liveCard: {
    backgroundColor: '#22867E',
    borderRadius: 20,
    padding: 18,
    minHeight: 160,
    justifyContent: 'space-between',
    shadowColor: C.dark,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  liveBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.9)',
    letterSpacing: 1,
  },
  liveTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: 24,
    flex: 1,
    marginBottom: 10,
  },
  liveMetaRow: {
    gap: 6,
    marginBottom: 12,
  },
  liveMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  liveMetaText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    flex: 1,
  },
  liveDetailBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  liveDetailText: {
    fontSize: 12,
    fontWeight: '700',
    color: C.dark,
  },
  liveCardEmpty: {
    backgroundColor: '#22867E',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    minHeight: 110,
    shadowColor: C.dark,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 14,
    elevation: 6,
  },
  liveEmptyText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
  },

  // ── Section ──────────────────────────────────────────────────────────────────
  section: {
    paddingTop: 12,
    paddingBottom: 4,
  },
  storiesSection: {
    paddingTop: 12,
    paddingBottom: 4,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: C.textMain,
    paddingHorizontal: 16,
    marginBottom: 12,
  },

  // ── Aksi Cepat ───────────────────────────────────────────────────────────────
  aksiRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
  },
  aksiCard: {
    flex: 1,
    backgroundColor: C.card,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F0F9F8',
  },
  aksiIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: C.light,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aksiLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: C.textMain,
    textAlign: 'center',
    lineHeight: 16,
  },

  // ── Stories ───────────────────────────────────────────────────────────────────
  storyItem: {
    alignItems: 'center',
    marginRight: 14,
    width: 66,
  },
  storyAvatarRing: {
    width: 66,
    height: 66,
    borderRadius: 33,
    padding: 2.5,
    borderWidth: 2.5,
    borderColor: C.primary,
    marginBottom: 5,
  },
  storyAvatarRingSelf: {
    borderColor: C.dark,
  },
  storyAvatarRingOnline: {
    borderColor: '#22C55E',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  storyStatus: {
    fontSize: 9,
    textAlign: 'center',
    marginTop: 1,
  },
  storyAvatar: {
    flex: 1,
    borderRadius: 28,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  storyAvatarSelf: {
    backgroundColor: C.dark,
  },
  storyAvatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  storyName: {
    fontSize: 11,
    color: C.textSub,
    textAlign: 'center',
    width: 66,
  },

  // ── Post Card ────────────────────────────────────────────────────────────────
  postCard: {
    backgroundColor: C.card,
    borderRadius: 18,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F0F9F8',
  },
  postAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 10,
  },
  postAvatar: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  postAvatarText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  postAuthorName: {
    fontSize: 14,
    fontWeight: '600',
    color: C.textMain,
  },
  postAuthorJob: {
    fontSize: 12,
    color: C.textSub,
    marginTop: 1,
  },
  postTime: {
    fontSize: 11,
    color: C.textMuted,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: C.light,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginBottom: 8,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '600',
    color: C.dark,
  },
  postContent: {
    fontSize: 14,
    color: C.textMain,
    lineHeight: 21,
    marginBottom: 10,
  },
  postImage: {
    width: '100%',
    height: 190,
    borderRadius: 12,
    marginBottom: 10,
    backgroundColor: C.light,
  },
  postFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  postLikeText: {
    fontSize: 13,
    color: C.textMuted,
  },

  // ── Empty feed ────────────────────────────────────────────────────────────────
  emptyFeed: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 24,
    gap: 12,
  },
  emptyFeedTitle: {
    fontSize: 15,
    color: C.textSub,
    fontWeight: '500',
  },
  emptyFeedBtn: {
    backgroundColor: C.dark,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 4,
  },
  emptyFeedBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // ── FAB ──────────────────────────────────────────────────────────────────────
  fab: {
    position: 'absolute',
    bottom: 90,
    right: 20,
    backgroundColor: C.dark,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingLeft: 14,
    paddingRight: 20,
    borderRadius: 35,
    gap: 6,
    shadowColor: C.dark,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 10,
  },
  fabLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
});
