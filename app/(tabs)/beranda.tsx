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
import { LinearGradient } from 'expo-linear-gradient';
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
  avatar_url?: string;
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
  // Teal utama
  primary:    '#3DBFB8',
  dark:       '#1A7A72',
  darker:     '#0D5E57',
  light:      '#D6F2F0',
  // Background
  bg:         '#F0F6F6',
  card:       '#FFFFFF',
  // Teks
  textMain:   '#111827',
  textSub:    '#4B5563',
  textMuted:  '#9CA3AF',
  border:     '#E2EEEC',
  // Aksen emas — kesan eksklusif/resmi
  gold:       '#C9A84C',
  goldLight:  '#FBF0D8',
};

// ─── Gradients ─────────────────────────────────────────────────────────────────

const G = {
  header:    ['#0D5E57', '#1A7A72', '#2E9F95'] as const,
  liveCard:  ['#0A5E57', '#1A8578', '#2BAF9E'] as const,
  avatar:    ['#3DBFB8', '#1A7A72'] as const,
  avatarSelf:['#0D5E57', '#1A7A72'] as const,
  aksiIcon:  ['#D6F2F0', '#B2E6E2'] as const,
  storyOnline: ['#22C55E', '#16A34A'] as const,
  storyRing:   ['#3DBFB8', '#1A7A72'] as const,
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

  const [posts,       setPosts]       = useState<PostItem[]>([]);
  const [stories,     setStories]     = useState<StoryItem[]>([]);
  const [liveEvent,   setLiveEvent]   = useState<AgendaItem | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading,     setLoading]     = useState(true);
  const [refreshing,  setRefreshing]  = useState(false);
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
      .select('id, nama, jabatan, avatar_url')
      .neq('id', user?.id)   // exclude diri sendiri — tampil sebagai "Anda" di kiri
      .limit(12);

    if (error) throw error;
    setStories((data ?? []).map((u: any) => ({
      id: u.id,
      nama: u.nama,
      jabatan: u.jabatan,
      user_id: u.id,
      avatar_url: u.avatar_url ?? undefined,
    })));
  };

  const fetchLiveEvent = async () => {
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

  // ── Realtime Presence ────────────────────────────────────────────────────────

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

  const hour      = currentTime.getHours();
  const greeting  = getGreeting(hour);
  const greetIcon = getGreetingIcon(hour);
  const firstName = user?.nama?.split(' ')[0] ?? 'Anggota';

  // ── Render story ─────────────────────────────────────────────────────────────

  const renderStory = ({ item }: { item: StoryItem }) => {
    const isOnline = onlineUserIds.has(item.user_id);
    return (
      <TouchableOpacity
        onPress={() => router.push({ pathname: '/profile/other', params: { id: item.user_id } })}
        style={styles.storyItem}
        activeOpacity={0.8}
      >
        {/* Gradient ring — teal biasa atau hijau jika online */}
        <LinearGradient
          colors={isOnline ? G.storyOnline : G.storyRing}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.storyGradientRing}
        >
          {item.avatar_url ? (
            <Image
              source={{ uri: item.avatar_url }}
              style={styles.storyAvatar}
            />
          ) : (
            <LinearGradient
              colors={G.avatar}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.storyAvatar}
            >
              <Text style={styles.storyAvatarText}>{getInitials(item.nama)}</Text>
            </LinearGradient>
          )}
        </LinearGradient>

        {/* Titik indikator online */}
        {isOnline && <View style={styles.onlineDot} />}

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
      {/* Garis aksen kiri */}
      <View style={styles.postAccentBar} />

      {/* Author */}
      <TouchableOpacity
        onPress={() => router.push({ pathname: '/profile/other', params: { id: item.user.id } })}
        style={styles.postAuthorRow}
        activeOpacity={0.7}
      >
        <LinearGradient
          colors={G.avatar}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.postAvatar}
        >
          <Text style={styles.postAvatarText}>{getInitials(item.user.nama)}</Text>
        </LinearGradient>
        <View style={{ flex: 1 }}>
          <Text style={styles.postAuthorName}>{item.user.nama}</Text>
          <Text style={styles.postAuthorJob}>{item.user.jabatan}</Text>
        </View>
        <Text style={styles.postTime}>{formatRelativeDate(item.created_at)}</Text>
      </TouchableOpacity>

      {/* Badge kategori */}
      <View style={styles.categoryBadge}>
        <View style={styles.categoryDot} />
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
        <Ionicons name="heart-outline" size={16} color={C.primary} />
        <Text style={styles.postLikeText}>{item.likes_count} Suka</Text>
      </View>
    </TouchableOpacity>
  );

  // ── Loading state ────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <LinearGradient colors={G.header} style={styles.loadingGradient}>
          <ActivityIndicator size="large" color="#FFFFFF" />
          <Text style={styles.loadingText}>Memuat beranda...</Text>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>

      {/* ── Header Gradient ──────────────────────────────────────────────────── */}
      <LinearGradient
        colors={G.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        {/* Dekorasi lingkaran di latar */}
        <View style={styles.headerDecorCircle1} />
        <View style={styles.headerDecorCircle2} />

        {/* Kiri: Badge PKK + Sapaan + Nama */}
        <View style={{ flex: 1 }}>
          <View style={styles.pkkBadge}>
            <Text style={styles.pkkBadgeText}>PKK DIGITAL</Text>
          </View>
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
          <TouchableOpacity
            style={styles.notifBtn}
            onPress={() => router.push('/notifikasi' as any)}
            activeOpacity={0.8}
          >
            <Ionicons name="notifications" size={20} color={C.dark} />
            {unreadCount > 0 && (
              <View style={styles.notifBadge}>
                <Text style={styles.notifBadgeText}>
                  {unreadCount > 99 ? '99+' : String(unreadCount)}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* ── Scrollable content ─────────────────────────────────────────────── */}
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

        {/* ── Stories (Anggota Aktif) ──────────────────────────────────────── */}
        {stories.length > 0 && (
          <View style={styles.storiesSection}>
            <View style={styles.sectionTitleRow}>
              <View style={styles.sectionAccentBar} />
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
                  {/* Ring emas untuk "Anda" */}
                  <LinearGradient
                    colors={[C.gold, '#E8C26A']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.storyGradientRing}
                  >
                    {user?.avatar_url ? (
                      <Image
                        source={{ uri: user.avatar_url }}
                        style={styles.storyAvatar}
                      />
                    ) : (
                      <LinearGradient
                        colors={G.avatarSelf}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.storyAvatar}
                      >
                        <Text style={styles.storyAvatarText}>
                          {getInitials(user?.nama ?? '?')}
                        </Text>
                      </LinearGradient>
                    )}
                  </LinearGradient>
                  <Text style={[styles.storyName, { color: C.gold, fontWeight: '700' }]}>Anda</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        )}

        {/* ── Aksi Cepat ──────────────────────────────────────────────────── */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <View style={styles.sectionAccentBar} />
            <Text style={styles.sectionTitle}>Aksi Cepat</Text>
          </View>
          <View style={styles.aksiRow}>

            <TouchableOpacity
              style={styles.aksiCard}
              onPress={() => router.push('/laporan/form')}
              activeOpacity={0.82}
            >
              <LinearGradient colors={G.aksiIcon} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.aksiIcon}>
                <Ionicons name="document-text" size={22} color={C.dark} />
              </LinearGradient>
              <Text style={styles.aksiLabel}>Buat{'\n'}Laporan</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.aksiCard}
              onPress={() => router.push('/agenda/form')}
              activeOpacity={0.82}
            >
              <LinearGradient colors={G.aksiIcon} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.aksiIcon}>
                <Ionicons name="calendar" size={22} color={C.dark} />
              </LinearGradient>
              <Text style={styles.aksiLabel}>Buat{'\n'}Agenda</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.aksiCard}
              onPress={() => router.push('/chat/admin')}
              activeOpacity={0.82}
            >
              <LinearGradient colors={G.aksiIcon} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.aksiIcon}>
                <Ionicons name="chatbubbles" size={22} color={C.dark} />
              </LinearGradient>
              <Text style={styles.aksiLabel}>Chat{'\n'}Admin</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.aksiCard}
              onPress={() => router.push('/agenda/detail' as any)}
              activeOpacity={0.82}
            >
              <LinearGradient colors={G.aksiIcon} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.aksiIcon}>
                <Ionicons name="calendar-outline" size={22} color={C.dark} />
              </LinearGradient>
              <Text style={styles.aksiLabel}>Lihat{'\n'}Agenda</Text>
            </TouchableOpacity>

          </View>
        </View>

        {/* ── Live Event Card (Agenda) ─────────────────────────────────────── */}
        <View style={styles.liveSection}>
          {liveEvent ? (
            <TouchableOpacity
              onPress={() => router.push({ pathname: '/agenda/detail', params: { id: liveEvent.id } } as any)}
              activeOpacity={0.88}
            >
              <LinearGradient
                colors={G.liveCard}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.liveCard}
              >
                {/* Dekorasi lingkaran di sudut */}
                <View style={styles.liveDecorCircle} />

                {/* Label status */}
                <View style={styles.liveBadge}>
                  <View style={[
                    styles.liveDot,
                    { backgroundColor: liveEvent.status === 'ongoing' ? '#4ADE80' : '#FCD34D' },
                  ]} />
                  <Text style={styles.liveBadgeText}>
                    {liveEvent.status === 'ongoing' ? '● SEDANG BERLANGSUNG' : '◆ AKAN DATANG'}
                  </Text>
                </View>

                <Text style={styles.liveTitle} numberOfLines={2}>{liveEvent.title}</Text>

                <View style={styles.liveMetaRow}>
                  {!!liveEvent.location && (
                    <View style={styles.liveMetaItem}>
                      <Ionicons name="location-outline" size={13} color="rgba(255,255,255,0.8)" />
                      <Text style={styles.liveMetaText} numberOfLines={1}>{liveEvent.location}</Text>
                    </View>
                  )}
                  <View style={styles.liveMetaItem}>
                    <Ionicons name="time-outline" size={13} color="rgba(255,255,255,0.8)" />
                    <Text style={styles.liveMetaText}>{formatAgendaDate(liveEvent.start_date)}</Text>
                  </View>
                </View>

                <View style={styles.liveDetailBtn}>
                  <Text style={styles.liveDetailText}>Lihat Detail</Text>
                  <Ionicons name="arrow-forward" size={13} color={C.dark} />
                </View>
              </LinearGradient>
            </TouchableOpacity>
          ) : (
            <LinearGradient
              colors={G.liveCard}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.liveCard, styles.liveCardEmpty]}
            >
              <Ionicons name="calendar-outline" size={30} color="rgba(255,255,255,0.5)" />
              <Text style={styles.liveEmptyText}>Tidak ada agenda aktif saat ini</Text>
            </LinearGradient>
          )}
        </View>

        {/* ── Feed: Update Anggota ─────────────────────────────────────────── */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <View style={styles.sectionAccentBar} />
            <Text style={styles.sectionTitle}>Update Anggota</Text>
          </View>
          <FlatList
            data={posts}
            renderItem={renderPost}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            ListEmptyComponent={() => (
              <View style={styles.emptyFeed}>
                <View style={styles.emptyIconWrap}>
                  <MaterialIcons name="post-add" size={40} color={C.primary} />
                </View>
                <Text style={styles.emptyFeedTitle}>Belum ada update</Text>
                <Text style={styles.emptyFeedSub}>Jadilah yang pertama berbagi</Text>
                <TouchableOpacity
                  style={styles.emptyFeedBtn}
                  onPress={() => router.push('/post/options')}
                  activeOpacity={0.8}
                >
                  <LinearGradient colors={G.header} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.emptyFeedBtnGrad}>
                    <Text style={styles.emptyFeedBtnText}>Buat Update</Text>
                    <Ionicons name="add-circle-outline" size={16} color="#fff" />
                  </LinearGradient>
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

  // ── Loading ───────────────────────────────────────────────────────────────────
  loadingGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  loadingText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: 0.3,
  },

  // ── Header ───────────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 52,
    paddingBottom: 50,
    borderBottomLeftRadius: 36,
    borderBottomRightRadius: 36,
    overflow: 'hidden',
  },
  headerDecorCircle1: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.06)',
    top: -50,
    right: -30,
  },
  headerDecorCircle2: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.05)',
    bottom: 10,
    left: 60,
  },
  pkkBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(201,168,76,0.25)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.5)',
  },
  pkkBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#F0D080',
    letterSpacing: 2,
  },
  headerGreeting: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 2,
    letterSpacing: 0.2,
  },
  headerName: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  jabatanBadge: {
    alignSelf: 'flex-start',
    marginTop: 6,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  jabatanText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  headerRight: {
    alignItems: 'flex-end',
    gap: 2,
  },
  headerTime: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  headerDate: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.65)',
    marginBottom: 10,
    letterSpacing: 0.1,
  },
  notifBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
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
    borderColor: '#FFFFFF',
  },
  notifBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // ── Live Event ────────────────────────────────────────────────────────────────
  liveSection: {
    marginTop: -30,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  liveCard: {
    borderRadius: 22,
    padding: 18,
    minHeight: 160,
    justifyContent: 'space-between',
    overflow: 'hidden',
    shadowColor: C.darker,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 10,
  },
  liveDecorCircle: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.06)',
    top: -40,
    right: -40,
  },
  liveCardEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    minHeight: 110,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  liveBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.9)',
    letterSpacing: 1.2,
  },
  liveTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: 24,
    flex: 1,
    marginBottom: 10,
    letterSpacing: -0.2,
  },
  liveMetaRow: {
    gap: 5,
    marginBottom: 14,
  },
  liveMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  liveMetaText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.75)',
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  liveDetailText: {
    fontSize: 12,
    fontWeight: '700',
    color: C.dark,
  },
  liveEmptyText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.65)',
    textAlign: 'center',
    letterSpacing: 0.1,
  },

  // ── Section ───────────────────────────────────────────────────────────────────
  section: {
    paddingTop: 14,
    paddingBottom: 4,
  },
  storiesSection: {
    paddingTop: 14,
    paddingBottom: 4,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 14,
    gap: 8,
  },
  sectionAccentBar: {
    width: 4,
    height: 18,
    borderRadius: 2,
    backgroundColor: C.gold,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: C.textMain,
    letterSpacing: -0.1,
  },

  // ── Aksi Cepat ────────────────────────────────────────────────────────────────
  aksiRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 10,
  },
  aksiCard: {
    flex: 1,
    backgroundColor: C.card,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 6,
    alignItems: 'center',
    gap: 9,
    shadowColor: C.dark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#EBF6F5',
  },
  aksiIcon: {
    width: 50,
    height: 50,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aksiLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: C.textMain,
    textAlign: 'center',
    lineHeight: 16,
    letterSpacing: 0.1,
  },

  // ── Stories ───────────────────────────────────────────────────────────────────
  storyItem: {
    alignItems: 'center',
    marginRight: 14,
    width: 68,
  },
  storyGradientRing: {
    width: 68,
    height: 68,
    borderRadius: 34,
    padding: 3,
    marginBottom: 5,
  },
  storyAvatar: {
    flex: 1,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: C.bg,
  },
  onlineDot: {
    position: 'absolute',
    top: 50,
    right: 2,
    width: 13,
    height: 13,
    borderRadius: 6.5,
    backgroundColor: '#22C55E',
    borderWidth: 2.5,
    borderColor: C.bg,
  },
  storyAvatarText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  storyName: {
    fontSize: 11,
    color: C.textSub,
    textAlign: 'center',
    width: 68,
    fontWeight: '500',
  },
  storyStatus: {
    fontSize: 9,
    textAlign: 'center',
    marginTop: 1,
    fontWeight: '500',
  },

  // ── Post Card ─────────────────────────────────────────────────────────────────
  postCard: {
    backgroundColor: C.card,
    borderRadius: 20,
    padding: 16,
    paddingLeft: 20,
    marginHorizontal: 16,
    marginBottom: 12,
    shadowColor: C.dark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 14,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#EBF6F5',
    overflow: 'hidden',
  },
  postAccentBar: {
    position: 'absolute',
    left: 0,
    top: 16,
    bottom: 16,
    width: 4,
    backgroundColor: C.primary,
    borderRadius: 4,
  },
  postAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 10,
  },
  postAvatar: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  postAvatarText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  postAuthorName: {
    fontSize: 14,
    fontWeight: '700',
    color: C.textMain,
    letterSpacing: -0.1,
  },
  postAuthorJob: {
    fontSize: 11,
    color: C.textSub,
    marginTop: 1,
  },
  postTime: {
    fontSize: 11,
    color: C.textMuted,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: C.light,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginBottom: 9,
    gap: 5,
  },
  categoryDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: C.dark,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '700',
    color: C.dark,
    letterSpacing: 0.2,
  },
  postContent: {
    fontSize: 14,
    color: C.textMain,
    lineHeight: 22,
    marginBottom: 10,
    letterSpacing: 0.1,
  },
  postImage: {
    width: '100%',
    height: 190,
    borderRadius: 14,
    marginBottom: 10,
    backgroundColor: C.light,
  },
  postFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F0F9F8',
  },
  postLikeText: {
    fontSize: 12,
    color: C.primary,
    fontWeight: '600',
  },

  // ── Empty feed ────────────────────────────────────────────────────────────────
  emptyFeed: {
    alignItems: 'center',
    paddingVertical: 44,
    paddingHorizontal: 24,
    gap: 10,
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: C.light,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyFeedTitle: {
    fontSize: 16,
    color: C.textMain,
    fontWeight: '700',
    letterSpacing: -0.1,
  },
  emptyFeedSub: {
    fontSize: 13,
    color: C.textSub,
    marginBottom: 6,
  },
  emptyFeedBtn: {
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: C.dark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  emptyFeedBtnGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 24,
    paddingVertical: 11,
  },
  emptyFeedBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
});
