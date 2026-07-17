import {
  View, Text, TouchableOpacity, FlatList, Image,
  RefreshControl, Alert, ScrollView, ActivityIndicator,
  StyleSheet, Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { useAuthStore } from '@/stores/authStore';
import { useAdminGateStore } from '@/stores/adminGateStore';
import { supabase } from '@/lib/supabase';
import { SafeAreaView } from 'react-native-safe-area-context';

const SCREEN_W = Dimensions.get('window').width;
const COVER_H = 160;
const AVATAR_SIZE = 88;

interface PostItem {
  id: string;
  content: string;
  type: string;
  images?: string[];
  created_at: string;
  likes_count: number;
}

interface LaporanItem {
  id: string;
  judul: string;
  nomor_dokumen: string;
  status: string;
  created_at: string;
}

interface ProfileStats {
  posts: number;
  laporan: number;
  agenda: number;
}

export default function MyProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const lockAdminGate = useAdminGateStore((s) => s.lock);
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [laporan, setLaporan] = useState<LaporanItem[]>([]);
  const [stats, setStats] = useState<ProfileStats>({ posts: 0, laporan: 0, agenda: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'posts' | 'laporan'>('posts');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [postsRes, laporanRes, postsCount, laporanCount, agendaCount] = await Promise.all([
        supabase
          .from('posts')
          .select('id, content, type, images, created_at, likes_count')
          .eq('user_id', user?.id)
          .eq('status', 'published')
          .order('created_at', { ascending: false }),
        supabase
          .from('laporan')
          .select('id, judul, nomor_dokumen, status, created_at')
          .eq('user_id', user?.id)
          .order('created_at', { ascending: false }),
        supabase.from('posts').select('*', { count: 'exact', head: true }).eq('user_id', user?.id),
        supabase.from('laporan').select('*', { count: 'exact', head: true }).eq('user_id', user?.id),
        supabase.from('agenda').select('*', { count: 'exact', head: true }).eq('created_by', user?.id),
      ]);

      if (postsRes.error) throw postsRes.error;
      if (laporanRes.error) throw laporanRes.error;

      setPosts(postsRes.data || []);
      setLaporan(laporanRes.data || []);
      setStats({
        posts: postsCount.count || 0,
        laporan: laporanCount.count || 0,
        agenda: agendaCount.count || 0,
      });
    } catch (err) {
      console.error('Error fetching profile data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleLogout = () => {
    Alert.alert('Keluar', 'Apakah Anda yakin ingin keluar?', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Keluar', style: 'destructive',
        onPress: async () => {
          lockAdminGate();
          await logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  const handlePickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Izin Diperlukan', 'Akses galeri foto diperlukan untuk mengubah foto profil.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      await uploadPhoto(result.assets[0].uri);
    }
  };

  const uploadPhoto = async (uri: string) => {
    setUploadingPhoto(true);
    try {
      const ext = uri.split('.').pop()?.toLowerCase() || 'jpg';
      const mimeType = ext === 'png' ? 'image/png' : 'image/jpeg';
      const fileName = `${user?.id}.${ext}`;
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const byteArray = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));

      const { error: upErr } = await supabase.storage
        .from('avatars')
        .upload(fileName, byteArray, { contentType: mimeType, upsert: true });
      if (upErr) throw upErr;

      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(fileName);
      await supabase.from('profiles').update({ avatar_url: urlData.publicUrl }).eq('id', user?.id);

      const { setUser } = useAuthStore.getState();
      setUser({ ...user!, avatar_url: urlData.publicUrl });
      Alert.alert('Berhasil', 'Foto profil berhasil diperbarui');
    } catch (err: any) {
      Alert.alert('Gagal', err.message || 'Tidak dapat mengunggah foto');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const statusColor = (s: string) =>
    s === 'approved' ? '#00B894' : s === 'pending' ? '#FDCB6E' : '#FF6B6B';
  const statusLabel = (s: string) =>
    s === 'approved' ? 'Disetujui' : s === 'pending' ? 'Menunggu' : s === 'rejected' ? 'Ditolak' : s;

  const renderPostGrid = ({ item }: { item: PostItem }) => (
    <TouchableOpacity
      onPress={() => router.push({ pathname: '/post/detail', params: { id: item.id } })}
      className="m-0.5"
      style={{ width: (SCREEN_W - 4) / 3, aspectRatio: 1 }}
    >
      {item.images && item.images.length > 0 ? (
        <Image source={{ uri: item.images[0] }} style={{ width: '100%', height: '100%', borderRadius: 4 }} />
      ) : (
        <View style={styles.textPostThumb}>
          <Text style={styles.textPostContent} numberOfLines={4}>{item.content}</Text>
        </View>
      )}
      {item.type === 'image' && item.images && item.images.length > 1 && (
        <View style={styles.multiImageBadge}>
          <Ionicons name="copy" size={12} color="white" />
        </View>
      )}
    </TouchableOpacity>
  );

  const renderLaporanItem = ({ item }: { item: LaporanItem }) => (
    <TouchableOpacity
      onPress={() => router.push({ pathname: '/laporan/detail', params: { id: item.id } })}
      style={styles.laporanCard}
    >
      <View style={styles.laporanRow}>
        <View style={[styles.statusDot, { backgroundColor: statusColor(item.status) }]} />
        <Text style={styles.laporanStatus}>{statusLabel(item.status)}</Text>
        <Text style={styles.laporanDate}>
          {new Date(item.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
        </Text>
      </View>
      <Text style={styles.laporanJudul} numberOfLines={2}>{item.judul}</Text>
      <Text style={styles.laporanNomor}>{item.nomor_dokumen}</Text>
    </TouchableOpacity>
  );

  const initials = user?.nama?.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase() || '?';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }} edges={['top']}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <Text style={styles.topBarTitle}>Profil Saya</Text>
        <TouchableOpacity onPress={handleLogout} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="log-out-outline" size={24} color="#FF6B6B" />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} />
        }
      >
        {/* ── Cover Photo ── */}
        <LinearGradient
          colors={['#5DB9AA', '#7ECDC0', '#A8E6DF']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.cover}
        />

        {/* ── Avatar (overlaps cover) ── */}
        <View style={styles.avatarContainer}>
          <TouchableOpacity onPress={handlePickPhoto} disabled={uploadingPhoto} activeOpacity={0.85}>
            <View style={styles.avatarRing}>
              {user?.avatar_url ? (
                <Image source={{ uri: user.avatar_url }} style={styles.avatarImg} />
              ) : (
                <Text style={styles.avatarInitials}>{initials}</Text>
              )}
            </View>
            <View style={styles.cameraIcon}>
              {uploadingPhoto
                ? <ActivityIndicator size={12} color="#fff" />
                : <Ionicons name="camera" size={13} color="white" />}
            </View>
          </TouchableOpacity>
        </View>

        {/* ── Name & Info ── */}
        <View style={styles.nameSection}>
          <Text style={styles.nameText}>{user?.nama || 'Anggota PKK'}</Text>
          <Text style={styles.jabatanText}>{user?.jabatan || 'Anggota'}</Text>
          <View style={styles.nikBadge}>
            <Ionicons name="card-outline" size={12} color="#5DB9AA" />
            <Text style={styles.nikText}>NIK: {user?.nik || '-'}</Text>
          </View>
        </View>

        {/* ── Stats Row ── */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statNum}>{stats.posts}</Text>
            <Text style={styles.statLabel}>Postingan</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNum}>{stats.laporan}</Text>
            <Text style={styles.statLabel}>Laporan</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNum}>{stats.agenda}</Text>
            <Text style={styles.statLabel}>Agenda</Text>
          </View>
        </View>

        {/* ── Info Section ── */}
        <View style={styles.infoSection}>
          {[
            { icon: 'call-outline', label: 'No. Telepon', value: user?.no_hp || '-' },
            { icon: 'mail-outline', label: 'Email', value: user?.email || '-' },
            { icon: 'location-outline', label: 'Alamat', value: user?.alamat || '-' },
            {
              icon: 'calendar-outline', label: 'Bergabung',
              value: user?.created_at
                ? new Date(user.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
                : '-',
            },
          ].map((row) => (
            <View key={row.label} style={styles.infoRow}>
              <View style={styles.infoIcon}>
                <Ionicons name={row.icon as any} size={16} color="#7ECDC0" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.infoLabel}>{row.label}</Text>
                <Text style={styles.infoValue}>{row.value}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* ── Tab Switcher (IG-style) ── */}
        <View style={styles.tabBar}>
          <TouchableOpacity
            onPress={() => setActiveTab('posts')}
            style={[styles.tabBtn, activeTab === 'posts' && styles.tabBtnActive]}
          >
            <Ionicons name="grid-outline" size={20} color={activeTab === 'posts' ? '#7ECDC0' : '#B2BEC3'} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveTab('laporan')}
            style={[styles.tabBtn, activeTab === 'laporan' && styles.tabBtnActive]}
          >
            <Ionicons name="document-text-outline" size={20} color={activeTab === 'laporan' ? '#7ECDC0' : '#B2BEC3'} />
          </TouchableOpacity>
        </View>

        {/* ── Content ── */}
        {loading ? (
          <View style={{ paddingVertical: 40, alignItems: 'center' }}>
            <ActivityIndicator color="#7ECDC0" />
          </View>
        ) : activeTab === 'posts' ? (
          posts.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="images-outline" size={52} color="#E8F6F3" />
              <Text style={styles.emptyText}>Belum ada postingan</Text>
            </View>
          ) : (
            <FlatList
              data={posts}
              renderItem={renderPostGrid}
              keyExtractor={(item) => item.id}
              numColumns={3}
              contentContainerStyle={{ padding: 1 }}
              scrollEnabled={false}
            />
          )
        ) : (
          laporan.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="document-text-outline" size={52} color="#E8F6F3" />
              <Text style={styles.emptyText}>Belum ada laporan</Text>
            </View>
          ) : (
            <FlatList
              data={laporan}
              renderItem={renderLaporanItem}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ padding: 12 }}
              scrollEnabled={false}
            />
          )
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#E8F6F3',
    backgroundColor: '#fff',
  },
  topBarTitle: { fontSize: 17, fontWeight: '700', color: '#2D3436' },

  cover: { width: SCREEN_W, height: COVER_H },

  avatarContainer: {
    marginTop: -(AVATAR_SIZE / 2 + 4),
    paddingLeft: 16,
  },
  avatarRing: {
    width: AVATAR_SIZE + 8, height: AVATAR_SIZE + 8,
    borderRadius: (AVATAR_SIZE + 8) / 2,
    borderWidth: 4, borderColor: '#fff',
    backgroundColor: '#7ECDC0',
    alignItems: 'center', justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImg: { width: '100%', height: '100%' },
  avatarInitials: { color: '#fff', fontSize: 30, fontWeight: '700' },
  cameraIcon: {
    position: 'absolute', bottom: 4, right: 4,
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: '#5DB9AA',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#fff',
  },

  nameSection: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 12 },
  nameText: { fontSize: 20, fontWeight: '800', color: '#2D3436' },
  jabatanText: { fontSize: 13, color: '#636E72', marginTop: 2 },
  nikBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    alignSelf: 'flex-start',
    marginTop: 6, paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 20, backgroundColor: '#E8F6F3',
  },
  nikText: { fontSize: 11, color: '#5DB9AA', fontWeight: '600' },

  statsRow: {
    flexDirection: 'row', justifyContent: 'space-around',
    paddingVertical: 14, marginHorizontal: 16,
    borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#E8F6F3',
  },
  statItem: { alignItems: 'center', flex: 1 },
  statNum: { fontSize: 20, fontWeight: '800', color: '#2D3436' },
  statLabel: { fontSize: 11, color: '#636E72', marginTop: 2 },
  statDivider: { width: 1, backgroundColor: '#E8F6F3' },

  infoSection: {
    marginHorizontal: 16, marginTop: 16,
    backgroundColor: '#F8FAFA', borderRadius: 16, padding: 12,
    gap: 12,
  },
  infoRow: { flexDirection: 'row', alignItems: 'center' },
  infoIcon: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: '#E8F6F3',
    alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  infoLabel: { fontSize: 11, color: '#636E72' },
  infoValue: { fontSize: 14, color: '#2D3436', fontWeight: '500', marginTop: 1 },

  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#E8F6F3',
    marginTop: 16,
  },
  tabBtn: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabBtnActive: { borderBottomWidth: 2, borderBottomColor: '#7ECDC0' },

  textPostThumb: {
    flex: 1, borderRadius: 4, backgroundColor: '#E8F6F3',
    alignItems: 'center', justifyContent: 'center', padding: 6,
  },
  textPostContent: { fontSize: 10, color: '#5DB9AA', textAlign: 'center' },
  multiImageBadge: {
    position: 'absolute', top: 4, right: 4,
    backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 4, padding: 2,
  },

  laporanCard: {
    backgroundColor: '#fff', borderRadius: 14, padding: 14,
    marginBottom: 8, borderWidth: 1, borderColor: '#E8F6F3',
    elevation: 1, shadowColor: '#000', shadowOpacity: 0.04,
    shadowRadius: 4, shadowOffset: { width: 0, height: 2 },
  },
  laporanRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  statusDot: { width: 7, height: 7, borderRadius: 4, marginRight: 6 },
  laporanStatus: { fontSize: 11, color: '#636E72', flex: 1 },
  laporanDate: { fontSize: 11, color: '#B2BEC3' },
  laporanJudul: { fontSize: 14, fontWeight: '700', color: '#2D3436', lineHeight: 20 },
  laporanNomor: { fontSize: 11, color: '#B2BEC3', marginTop: 4 },

  emptyState: { paddingVertical: 52, alignItems: 'center' },
  emptyText: { fontSize: 14, color: '#636E72', marginTop: 10 },
});
