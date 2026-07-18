import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase';

// ═══════════════════════════════════════════════════════════════════════════════
//  Tipe Data
// ═══════════════════════════════════════════════════════════════════════════════

interface PostItem {
  id: string;
  content: string;
  category: string;
  type: string;
  images?: string[];
  created_at: string;
  likes_count: number;
  user: {
    id: string;
    nama: string;
    jabatan: string;
    avatar_url?: string;
  };
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

// ═══════════════════════════════════════════════════════════════════════════════
//  Konstanta & Warna
// ═══════════════════════════════════════════════════════════════════════════════

const { width: SCREEN_W } = Dimensions.get('window');

const C = {
  // ── Primary Teal ──
  primary:    '#3DBFB8',
  primaryLight:'#D6F2F0',
  dark:       '#1A7A72',
  darker:     '#0D5E57',
  darkest:    '#0A4A44',
  // ── Background ──
  bg:         '#F0F6F6',
  surface:    '#FFFFFF',
  surfaceAlt: '#F8FBFB',
  // ── Text ──
  textMain:   '#111827',
  textSub:    '#4B5563',
  textMuted:  '#9CA3AF',
  textInverse:'#FFFFFF',
  // ── Border & Divider ──
  border:     '#E2EEEC',
  divider:    '#EDF4F3',
  // ── Gold Accent ──
  gold:       '#C9A84C',
  goldLight:  '#FBF0D8',
  goldDark:   '#A88A3D',
  // ── Status ──
  success:    '#22C55E',
  warning:    '#F59E0B',
  danger:     '#EF4444',
};

const G = {
  header:      ['#0D5E57', '#1A7A72', '#2E9F95'] as const,
  headerSoft:  ['#1A7A72', '#2E9F95', '#3DBFB8'] as const,
  liveCard:    ['#0A5E57', '#1A8578', '#2BAF9E'] as const,
  liveCardAlt: ['#1A7A72', '#2E9F95', '#3DBFB8'] as const,
  avatar:      ['#3DBFB8', '#1A7A72'] as const,
  avatarSelf:  ['#0D5E57', '#1A7A72'] as const,
  aksiIcon:    ['#D6F2F0', '#B2E6E2'] as const,
  storyOnline: ['#22C55E', '#16A34A'] as const,
  storyRing:   ['#3DBFB8', '#1A7A72'] as const,
  goldRing:    ['#C9A84C', '#E8C26A'] as const,
  shimmer:     ['#E2EEEC', '#F0F6F6', '#E2EEEC'] as const,
};

// ═══════════════════════════════════════════════════════════════════════════════
//  Utilitas
// ═══════════════════════════════════════════════════════════════════════════════

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
  const d = new Date(dateString);
  return d.toLocaleDateString('id-ID', {
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
    .filter(w => w.length > 0)
    .slice(0, 2)
    .map(w => w.charAt(0).toUpperCase())
    .join('');
}

function getCategoryColor(category: string): string {
  const map: Record<string, string> = {
    'Kegiatan': '#3DBFB8',
    'Laporan':  '#F59E0B',
    'Pengumuman':'#EF4444',
    'Agenda':   '#8B5CF6',
    'Dokumentasi':'#10B981',
    'default':  '#3DBFB8',
  };
  return map[category] || map['default'];
}

// ═══════════════════════════════════════════════════════════════════════════════
//  Komponen Bantu
// ═══════════════════════════════════════════════════════════════════════════════

/** Avatar dengan foto atau inisial fallback */
function Avatar({
  uri,
  name,
  size = 42,
  gradient = G.avatar,
  borderWidth = 0,
  borderColor = 'transparent',
}: {
  uri?: string;
  name: string;
  size?: number;
  gradient?: readonly [string, string, ...string[]];
  borderWidth?: number;
  borderColor?: string;
}) {
  const fontSize = size * 0.38;
  return (
    <View style={[avatarStyles.container, { width: size, height: size, borderRadius: size * 0.3, borderWidth, borderColor }]}>
      {uri ? (
        <Image source={{ uri }} style={[avatarStyles.image, { width: size, height: size, borderRadius: size * 0.3 }]} />
      ) : (
        <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[avatarStyles.gradient, { width: size, height: size, borderRadius: size * 0.3 }]}>
          <Text style={[avatarStyles.text, { fontSize }]}>{getInitials(name)}</Text>
        </LinearGradient>
      )}
    </View>
  );
}

const avatarStyles = StyleSheet.create({
  container: { overflow: 'hidden' },
  image: { resizeMode: 'cover' },
  gradient: { alignItems: 'center', justifyContent: 'center' },
  text: { fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.5 },
});

/** Badge notifikasi merah */
function NotifBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <View style={styles.notifBadge}>
      <Text style={styles.notifBadgeText}>{count > 99 ? '99+' : String(count)}</Text>
    </View>
  );
}

/** Section title dengan accent bar emas */
function SectionTitle({ title, icon }: { title: string; icon?: string }) {
  return (
    <View style={styles.sectionTitleRow}>
      <View style={styles.sectionAccentBar} />
      {icon && <Ionicons name={icon as any} size={16} color={C.gold} />}
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

/** Shimmer placeholder untuk loading */
function ShimmerCard() {
  return (
    <View style={styles.shimmerCard}>
      <View style={styles.shimmerLine} />
      <View style={[styles.shimmerLine, { width: '60%', marginTop: 8 }]} />
      <View style={[styles.shimmerLine, { width: '40%', marginTop: 8, height: 120, borderRadius: 12 }]} />
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  Screen Utama
// ═══════════════════════════════════════════════════════════════════════════════

export default function BerandaScreen() {
  const router = useRouter();
  const { user } = useAuthStore();

  // ── State ───────────────────────────────────────────────────────────────────
  const [posts,         setPosts]         = useState<PostItem[]>([]);
  const [stories,       setStories]       = useState<StoryItem[]>([]);
  const [liveEvent,     setLiveEvent]     = useState<AgendaItem | null>(null);
  const [unreadCount,   setUnreadCount]   = useState(0);
  const [loading,       setLoading]       = useState(true);
  const [refreshing,    setRefreshing]    = useState(false);
  const [currentTime,   setCurrentTime]   = useState(new Date());
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());
  const [error,         setError]         = useState<string | null>(null);

  // ── Derived values ────────────────────────────────────────────────────────────
  const hour      = currentTime.getHours();
  const greeting  = useMemo(() => getGreeting(hour), [hour]);
  const greetIcon = useMemo(() => getGreetingIcon(hour), [hour]);
  const firstName = useMemo(() => user?.nama?.split(' ')[0] ?? 'Anggota', [user?.nama]);

  // ── Timer jam berjalan ──────────────────────────────────────────────────────
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // ── Fetch semua data ────────────────────────────────────────────────────────
  const fetchData = useCallback(async (isRefresh = false) => {
    if (!user?.id) return;
    if (!isRefresh) setLoading(true);
    setError(null);

    try {
      await Promise.all([
        fetchPosts(),
        fetchStories(),
        fetchLiveEvent(),
        fetchUnreadCount(),
      ]);
    } catch (err: any) {
      console.error('Error fetching beranda:', err);
      setError(err?.message ?? 'Gagal memuat data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  const fetchPosts = async () => {
    const { data, error } = await supabase
      .from('posts')
      .select(`
        id, content, category, type, images, created_at, likes_count,
        user:profiles(id, nama, jabatan, avatar_url)
      `)
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;

    setPosts(
      (data ?? []).map((item: any) => {
        const u = Array.isArray(item.user) ? item.user[0] : item.user;
        return {
          ...item,
          user: {
            id: u?.id || '',
            nama: u?.nama || 'Anggota PKK',
            jabatan: u?.jabatan || 'Anggota',
            avatar_url: u?.avatar_url,
          },
        };
      })
    );
  };

  const fetchStories = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, nama, jabatan, avatar_url')
      .neq('id', user?.id)
      .limit(12);

    if (error) throw error;

    setStories(
      (data ?? []).map((u: any) => ({
        id: u.id,
        nama: u.nama,
        jabatan: u.jabatan,
        user_id: u.id,
        avatar_url: u.avatar_url ?? undefined,
      }))
    );
  };

  const fetchLiveEvent = async () => {
    const now = new Date().toISOString();

    // Cari agenda yang sedang berlangsung
    const { data: ongoing } = await supabase
      .from('agenda')
      .select('id, title, location, start_date, end_date, status')
      .lte('start_date', now)
      .gte('end_date', now)
      .order('start_date', { ascending: true })
      .limit(1);

    if (ongoing && ongoing.length > 0) {
      setLiveEvent({ ...ongoing[0], status: 'ongoing' } as AgendaItem);
      return;
    }

    // Kalau tidak, cari yang akan datang
    const { data: upcoming } = await supabase
      .from('agenda')
      .select('id, title, location, start_date, end_date, status')
      .gt('start_date', now)
      .order('start_date', { ascending: true })
      .limit(1);

    setLiveEvent(upcoming?.[0] ? { ...upcoming[0], status: 'upcoming' } as AgendaItem : null);
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

  // Initial fetch
  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Real-time: Notifikasi badge ─────────────────────────────────────────────
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('beranda-notif-badge')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        () => fetchUnreadCount()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);

  // ── Real-time: Online presence ──────────────────────────────────────────────
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
          await presenceChannel.track({
            user_id: user.id,
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => { supabase.removeChannel(presenceChannel); };
  }, [user?.id]);

  // ── Render: Story item ──────────────────────────────────────────────────────
  const renderStory = useCallback(({ item }: { item: StoryItem }) => {
    const isOnline = onlineUserIds.has(item.user_id);
    return (
      <TouchableOpacity
        onPress={() => router.push({ pathname: '/profile/other', params: { id: item.user_id } })}
        style={styles.storyItem}
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={isOnline ? G.storyOnline : G.storyRing}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.storyRing}
        >
          <Avatar
            uri={item.avatar_url}
            name={item.nama}
            size={58}
            gradient={G.avatar}
            borderWidth={2}
            borderColor={C.bg}
          />
        </LinearGradient>

        {isOnline && <View style={styles.onlineDot} />}

        <Text style={styles.storyName} numberOfLines={1}>{item.nama.split(' ')[0]}</Text>
        <Text style={[styles.storyStatus, { color: isOnline ? C.success : C.textMuted }]}>
          {isOnline ? 'online' : 'offline'}
        </Text>
      </TouchableOpacity>
    );
  }, [onlineUserIds, router]);

  // ── Render: Story "Anda" (header list) ──────────────────────────────────────
  const renderSelfStory = useCallback(() => (
    <TouchableOpacity
      onPress={() => router.push('/profile')}
      style={styles.storyItem}
      activeOpacity={0.8}
    >
      <LinearGradient
        colors={G.goldRing}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.storyRing}
      >
        <Avatar
          uri={user?.avatar_url}
          name={user?.nama ?? '?'}
          size={58}
          gradient={G.avatarSelf}
          borderWidth={2}
          borderColor={C.bg}
        />
      </LinearGradient>
      <Text style={[styles.storyName, { color: C.gold, fontWeight: '700' }]}>Anda</Text>
    </TouchableOpacity>
  ), [user, router]);

  // ── Render: Post card ───────────────────────────────────────────────────────
  const renderPost = useCallback(({ item }: { item: PostItem }) => {
    const catColor = getCategoryColor(item.category);
    return (
      <TouchableOpacity
        activeOpacity={0.95}
        onPress={() => router.push({ pathname: '/post/detail', params: { id: item.id } } as any)}
        style={styles.postCard}
      >
        {/* Aksen kiri */}
        <View style={[styles.postAccentBar, { backgroundColor: catColor }]} />

        {/* Author */}
        <TouchableOpacity
          onPress={() => router.push({ pathname: '/profile/other', params: { id: item.user.id } })}
          style={styles.postAuthorRow}
          activeOpacity={0.7}
        >
          <Avatar uri={item.user.avatar_url} name={item.user.nama} size={40} />
          <View style={styles.postAuthorInfo}>
            <Text style={styles.postAuthorName}>{item.user.nama}</Text>
            <Text style={styles.postAuthorJob}>{item.user.jabatan}</Text>
          </View>
          <Text style={styles.postTime}>{formatRelativeDate(item.created_at)}</Text>
        </TouchableOpacity>

        {/* Kategori badge */}
        <View style={[styles.categoryBadge, { backgroundColor: catColor + '15' }]}>
          <View style={[styles.categoryDot, { backgroundColor: catColor }]} />
          <Text style={[styles.categoryText, { color: catColor }]}>{item.category}</Text>
        </View>

        {/* Konten */}
        <Text style={styles.postContent} numberOfLines={3}>{item.content}</Text>

        {/* Gambar */}
        {item.images && item.images.length > 0 && (
          <Image source={{ uri: item.images[0] }} style={styles.postImage} resizeMode="cover" />
        )}

        {/* Footer: like + komentar placeholder */}
        <View style={styles.postFooter}>
          <View style={styles.postFooterItem}>
            <Ionicons name="heart-outline" size={16} color={C.primary} />
            <Text style={styles.postFooterText}>{item.likes_count} Suka</Text>
          </View>
          <View style={styles.postFooterItem}>
            <Ionicons name="chatbubble-outline" size={15} color={C.textMuted} />
            <Text style={[styles.postFooterText, { color: C.textMuted }]}>Komentar</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  }, [router]);

  // ── Render: Aksi cepat item ─────────────────────────────────────────────────
  const AksiItem = useCallback(({
    icon,
    label,
    onPress,
    color = C.dark,
  }: {
    icon: string;
    label: string;
    onPress: () => void;
    color?: string;
  }) => (
    <TouchableOpacity style={styles.aksiCard} onPress={onPress} activeOpacity={0.82}>
      <LinearGradient colors={G.aksiIcon} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.aksiIconBg}>
        <Ionicons name={icon as any} size={22} color={color} />
      </LinearGradient>
      <Text style={styles.aksiLabel}>{label}</Text>
    </TouchableOpacity>
  ), []);

  // ═══════════════════════════════════════════════════════════════════════════════
  //  Loading State
  // ═══════════════════════════════════════════════════════════════════════════════

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <StatusBar barStyle="light-content" backgroundColor={C.darker} />
        <LinearGradient colors={G.header} style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FFFFFF" />
          <Text style={styles.loadingText}>Memuat beranda...</Text>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  //  Main Render
  // ═══════════════════════════════════════════════════════════════════════════════

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={C.darker} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchData(true); }}
            colors={[C.dark]}
            tintColor={C.dark}
            progressBackgroundColor="#FFFFFF"
          />
        }
        contentContainerStyle={styles.scrollContent}
      >
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/*  HEADER                                                          */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <LinearGradient colors={G.header} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.header}>
          {/* Dekorasi lingkaran */}
          <View style={styles.headerDecorCircle1} />
          <View style={styles.headerDecorCircle2} />

          {/* Kiri: Info user */}
          <View style={styles.headerLeft}>
            <View style={styles.pkkBadge}>
              <FontAwesome5 name="users" size={9} color={C.goldLight} />
              <Text style={styles.pkkBadgeText}> PKK DIGITAL</Text>
            </View>
            <Text style={styles.headerGreeting}>{greetIcon}  {greeting}</Text>
            <Text style={styles.headerName} numberOfLines={1}>{firstName}</Text>
            <View style={styles.jabatanBadge}>
              <Text style={styles.jabatanText}>{user?.jabatan ?? 'Anggota PKK'}</Text>
            </View>
          </View>

          {/* Kanan: Jam + Notif */}
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
              <NotifBadge count={unreadCount} />
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/*  STORIES (Anggota Aktif)                                         */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {stories.length > 0 && (
          <View style={styles.storiesSection}>
            <SectionTitle title="Anggota Aktif" icon="people" />
            <FlatList
              data={stories}
              renderItem={renderStory}
              keyExtractor={(item) => item.id}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.storiesListContent}
              ListHeaderComponent={renderSelfStory}
            />
          </View>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/*  AKSI CEPAT                                                       */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <View style={styles.section}>
          <SectionTitle title="Aksi Cepat" icon="flash" />
          <View style={styles.aksiRow}>
            <AksiItem icon="document-text" label="Buat
Laporan" onPress={() => router.push('/laporan/form')} />
            <AksiItem icon="calendar" label="Buat
Agenda" onPress={() => router.push('/agenda/form')} />
            <AksiItem icon="chatbubbles" label="Chat
Admin" onPress={() => router.push('/chat/admin')} />
            <AksiItem icon="calendar-outline" label="Lihat
Agenda" onPress={() => router.push('/agenda/detail' as any)} />
          </View>
        </View>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/*  LIVE EVENT CARD (Agenda)                                         */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <View style={styles.liveSection}>
          {liveEvent ? (
            <TouchableOpacity
              onPress={() => router.push({ pathname: '/agenda/detail', params: { id: liveEvent.id } } as any)}
              activeOpacity={0.88}
            >
              <LinearGradient
                colors={liveEvent.status === 'ongoing' ? G.liveCard : G.liveCardAlt}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.liveCard}
              >
                <View style={styles.liveDecorCircle} />

                {/* Status badge */}
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
            <LinearGradient colors={G.liveCardAlt} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.liveCard, styles.liveCardEmpty]}>
              <Ionicons name="calendar-outline" size={32} color="rgba(255,255,255,0.4)" />
              <Text style={styles.liveEmptyText}>Tidak ada agenda aktif saat ini</Text>
              <TouchableOpacity
                style={styles.liveEmptyBtn}
                onPress={() => router.push('/agenda/form')}
                activeOpacity={0.8}
              >
                <Text style={styles.liveEmptyBtnText}>+ Buat Agenda</Text>
              </TouchableOpacity>
            </LinearGradient>
          )}
        </View>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/*  ERROR STATE                                                      */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {error && (
          <View style={styles.errorBanner}>
            <Ionicons name="warning-outline" size={18} color={C.danger} />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={() => fetchData(true)}>
              <Text style={styles.errorRetry}>Coba Lagi</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/*  FEED: UPDATE ANGGOTA                                              */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <View style={styles.section}>
          <SectionTitle title="Update Anggota" icon="newspaper" />
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
                <Text style={styles.emptyFeedSub}>Jadilah yang pertama berbagi informasi</Text>
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

        {/* Bottom spacer untuk tab bar */}
        <View style={{ height: 100 }} />

      </ScrollView>
    </SafeAreaView>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  Styles
// ═══════════════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  // ── Safe Area ────────────────────────────────────────────────────────────────
  safeArea: {
    flex: 1,
    backgroundColor: C.bg,
  },
  scrollContent: {
    paddingBottom: 20,
  },

  // ── Loading ────────────────────────────────────────────────────────────────────
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 15,
    fontWeight: '500',
    letterSpacing: 0.3,
  },

  // ── Header ───────────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 28,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
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
  headerLeft: {
    flex: 1,
  },
  pkkBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(201,168,76,0.2)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.4)',
    gap: 4,
  },
  pkkBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: C.goldLight,
    letterSpacing: 1.5,
  },
  headerGreeting: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 3,
    letterSpacing: 0.2,
  },
  headerName: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
    lineHeight: 32,
  },
  jabatanBadge: {
    alignSelf: 'flex-start',
    marginTop: 8,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  jabatanText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  headerRight: {
    alignItems: 'flex-end',
    gap: 3,
  },
  headerTime: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  headerDate: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
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
    backgroundColor: C.danger,
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

  // ── Section Title ────────────────────────────────────────────────────────────
  section: {
    paddingTop: 20,
    paddingBottom: 4,
  },
  storiesSection: {
    paddingTop: 20,
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

  // ── Stories ──────────────────────────────────────────────────────────────────
  storiesListContent: {
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  storyItem: {
    alignItems: 'center',
    marginRight: 14,
    width: 72,
  },
  storyRing: {
    width: 66,
    height: 66,
    borderRadius: 33,
    padding: 3,
    marginBottom: 6,
  },
  onlineDot: {
    position: 'absolute',
    top: 48,
    right: 4,
    width: 13,
    height: 13,
    borderRadius: 6.5,
    backgroundColor: C.success,
    borderWidth: 2.5,
    borderColor: C.bg,
  },
  storyName: {
    fontSize: 11,
    color: C.textSub,
    textAlign: 'center',
    width: 72,
    fontWeight: '500',
  },
  storyStatus: {
    fontSize: 9,
    textAlign: 'center',
    marginTop: 2,
    fontWeight: '500',
  },

  // ── Aksi Cepat ───────────────────────────────────────────────────────────────
  aksiRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 10,
  },
  aksiCard: {
    flex: 1,
    backgroundColor: C.surface,
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 6,
    alignItems: 'center',
    gap: 9,
    shadowColor: C.dark,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
    borderWidth: 1,
    borderColor: C.border,
  },
  aksiIconBg: {
    width: 48,
    height: 48,
    borderRadius: 14,
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

  // ── Live Event ─────────────────────────────────────────────────────────────────
  liveSection: {
    marginTop: 16,
    paddingHorizontal: 16,
  },
  liveCard: {
    borderRadius: 22,
    padding: 18,
    minHeight: 150,
    justifyContent: 'space-between',
    overflow: 'hidden',
    shadowColor: C.darker,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 8,
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
    minHeight: 140,
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
    gap: 6,
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
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'center',
    letterSpacing: 0.1,
  },
  liveEmptyBtn: {
    marginTop: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  liveEmptyBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // ── Error Banner ─────────────────────────────────────────────────────────────
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 12,
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FECACA',
    gap: 8,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: C.danger,
    fontWeight: '500',
  },
  errorRetry: {
    fontSize: 12,
    fontWeight: '700',
    color: C.dark,
  },

  // ── Post Card ────────────────────────────────────────────────────────────────
  postCard: {
    backgroundColor: C.surface,
    borderRadius: 20,
    padding: 16,
    paddingLeft: 20,
    marginHorizontal: 16,
    marginBottom: 12,
    shadowColor: C.dark,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
  },
  postAccentBar: {
    position: 'absolute',
    left: 0,
    top: 16,
    bottom: 16,
    width: 4,
    borderRadius: 4,
  },
  postAuthorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 10,
  },
  postAuthorInfo: {
    flex: 1,
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
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '700',
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
    backgroundColor: C.primaryLight,
  },
  postFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: C.divider,
  },
  postFooterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  postFooterText: {
    fontSize: 12,
    color: C.primary,
    fontWeight: '600',
  },

  // ── Empty Feed ─────────────────────────────────────────────────────────────────
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
    backgroundColor: C.primaryLight,
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
    marginTop: 4,
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

  // ── Shimmer (placeholder) ────────────────────────────────────────────────────
  shimmerCard: {
    backgroundColor: C.surface,
    borderRadius: 20,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  shimmerLine: {
    height: 14,
    backgroundColor: C.primaryLight,
    borderRadius: 7,
    width: '80%',
  },
});
