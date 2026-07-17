import { View, Text, TouchableOpacity, FlatList, Image, RefreshControl, Alert, ScrollView } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState, useEffect, useCallback } from 'react';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

interface PostItem {
  id: string;
  content: string;
  type: string;
  images?: string[];
  created_at: string;
  likes_count: number;
}

interface OtherProfile {
  id: string;
  nama: string;
  jabatan: string;
  nik: string;
  no_hp: string;
  email: string;
  alamat: string;
  created_at: string;
  is_online?: boolean;
}

interface ProfileStats {
  posts: number;
  laporan: number;
  agenda: number;
}

export default function OtherProfileScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user: currentUser } = useAuthStore();

  const [profile, setProfile] = useState<OtherProfile | null>(null);
  const [posts, setPosts] = useState<PostItem[]>([]);
  const [stats, setStats] = useState<ProfileStats>({ posts: 0, laporan: 0, agenda: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'posts' | 'laporan'>('posts');

  const fetchData = useCallback(async () => {
    try {
      // Fetch profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, nama, jabatan, nik, no_hp, email, alamat, created_at')
        .eq('id', id)
        .single();

      if (profileError) throw profileError;
      setProfile(profileData);

      // Fetch posts
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select('id, content, type, images, created_at, likes_count')
        .eq('user_id', id)
        .eq('status', 'published')
        .order('created_at', { ascending: false });

      if (postsError) throw postsError;
      setPosts(postsData || []);

      // Fetch stats
      const [{ count: postsCount }, { count: laporanCount }, { count: agendaCount }] = await Promise.all([
        supabase.from('posts').select('*', { count: 'exact', head: true }).eq('user_id', id),
        supabase.from('laporan').select('*', { count: 'exact', head: true }).eq('user_id', id),
        supabase.from('agenda').select('*', { count: 'exact', head: true }).eq('created_by', id),
      ]);

      setStats({
        posts: postsCount || 0,
        laporan: laporanCount || 0,
        agenda: agendaCount || 0,
      });
    } catch (err) {
      console.error('Error fetching other profile:', err);
      Alert.alert('Error', 'Gagal memuat profil');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleChat = () => {
    if (!profile) return;
    router.push({
      pathname: '/chat/room',
      params: { id: profile.id },
    });
  };

  const renderPostGrid = ({ item }: { item: PostItem }) => (
    <TouchableOpacity
      onPress={() => router.push({ pathname: '/post/detail', params: { id: item.id } })}
      className="m-0.5"
      style={{ width: '32.5%', aspectRatio: 1 }}
    >
      {item.images && item.images.length > 0 ? (
        <Image source={{ uri: item.images[0] }} className="w-full h-full rounded-lg" />
      ) : (
        <View className="w-full h-full rounded-lg bg-[#E8F6F3] items-center justify-center p-1">
          <Text className="text-[10px] text-[#5DB9AA] text-center" numberOfLines={3}>
            {item.content}
          </Text>
        </View>
      )}
      {item.type === 'image' && (
        <View className="absolute top-1 right-1">
          <Ionicons name="images" size={14} color="white" />
        </View>
      )}
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View className="flex-1 bg-white items-center justify-center">
        <Text className="text-[#636E72]">Memuat profil...</Text>
      </View>
    );
  }

  if (!profile) {
    return (
      <View className="flex-1 bg-white items-center justify-center px-8">
        <MaterialIcons name="person-off" size={48} color="#B2BEC3" />
        <Text className="text-[#636E72] text-center mt-4">Profil tidak ditemukan</Text>
        <TouchableOpacity 
          onPress={() => router.back()}
          className="mt-4 px-6 py-2 rounded-full bg-[#7ECDC0]"
        >
          <Text className="text-white font-semibold">Kembali</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white">
      {/* Header */}
      <View className="flex-row items-center px-4 py-3 border-b border-[#E8F6F3]">
        <TouchableOpacity onPress={() => router.back()} className="mr-4">
          <Ionicons name="arrow-back" size={24} color="#636E72" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-[#2D3436] flex-1" numberOfLines={1}>
          {profile.nama}
        </Text>
        <TouchableOpacity onPress={handleChat} className="ml-2">
          <Ionicons name="chatbubble-ellipses-outline" size={24} color="#7ECDC0" />
        </TouchableOpacity>
      </View>

      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} />
        }
      >
        {/* Profile Header */}
        <View className="px-4 py-6 items-center">
          {/* Avatar with online dot */}
          <View className="relative mb-3">
            <View className="w-24 h-24 rounded-full bg-[#7ECDC0] items-center justify-center border-4 border-[#E8F6F3]">
              <Text className="text-white text-3xl font-bold">
                {profile.nama.charAt(0).toUpperCase()}
              </Text>
            </View>
            {profile.is_online && (
              <View className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-[#00B894] border-2 border-white" />
            )}
          </View>

          {/* Name & Role */}
          <Text className="text-xl font-bold text-[#2D3436]">{profile.nama}</Text>
          <Text className="text-sm text-[#636E72] mt-0.5">{profile.jabatan}</Text>

          {/* NIK Badge */}
          <View className="mt-2 px-3 py-1 rounded-full bg-[#E8F6F3]">
            <Text className="text-xs text-[#5DB9AA] font-medium">NIK: {profile.nik || '-'}</Text>
          </View>
        </View>

        {/* Stats Row */}
        <View className="flex-row justify-around px-8 py-4 border-y border-[#E8F6F3]">
          <View className="items-center">
            <Text className="text-xl font-bold text-[#2D3436]">{stats.posts}</Text>
            <Text className="text-xs text-[#636E72] mt-0.5">Postingan</Text>
          </View>
          <View className="w-px bg-[#E8F6F3]" />
          <View className="items-center">
            <Text className="text-xl font-bold text-[#2D3436]">{stats.laporan}</Text>
            <Text className="text-xs text-[#636E72] mt-0.5">Laporan</Text>
          </View>
          <View className="w-px bg-[#E8F6F3]" />
          <View className="items-center">
            <Text className="text-xl font-bold text-[#2D3436]">{stats.agenda}</Text>
            <Text className="text-xs text-[#636E72] mt-0.5">Agenda</Text>
          </View>
        </View>

        {/* Info Section */}
        <View className="px-4 py-4">
          <Text className="text-sm font-semibold text-[#636E72] mb-3">Informasi</Text>

          <View className="bg-[#F8FAFA] rounded-2xl p-4 space-y-3">
            <View className="flex-row items-center">
              <View className="w-8 h-8 rounded-lg bg-[#E8F6F3] items-center justify-center mr-3">
                <Ionicons name="call-outline" size={16} color="#7ECDC0" />
              </View>
              <View>
                <Text className="text-xs text-[#636E72]">No. Telepon</Text>
                <Text className="text-sm text-[#2D3436] font-medium">{profile.no_hp || '-'}</Text>
              </View>
            </View>

            <View className="flex-row items-center">
              <View className="w-8 h-8 rounded-lg bg-[#E8F6F3] items-center justify-center mr-3">
                <Ionicons name="mail-outline" size={16} color="#7ECDC0" />
              </View>
              <View>
                <Text className="text-xs text-[#636E72]">Email</Text>
                <Text className="text-sm text-[#2D3436] font-medium">{profile.email || '-'}</Text>
              </View>
            </View>

            <View className="flex-row items-center">
              <View className="w-8 h-8 rounded-lg bg-[#E8F6F3] items-center justify-center mr-3">
                <Ionicons name="location-outline" size={16} color="#7ECDC0" />
              </View>
              <View>
                <Text className="text-xs text-[#636E72]">Alamat</Text>
                <Text className="text-sm text-[#2D3436] font-medium">{profile.alamat || '-'}</Text>
              </View>
            </View>

            <View className="flex-row items-center">
              <View className="w-8 h-8 rounded-lg bg-[#E8F6F3] items-center justify-center mr-3">
                <Ionicons name="calendar-outline" size={16} color="#7ECDC0" />
              </View>
              <View>
                <Text className="text-xs text-[#636E72]">Bergabung</Text>
                <Text className="text-sm text-[#2D3436] font-medium">
                  {profile.created_at 
                    ? new Date(profile.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
                    : '-'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Chat Button */}
        <View className="px-4 pb-4">
          <TouchableOpacity
            onPress={handleChat}
            className="bg-[#7ECDC0] rounded-2xl py-3.5 flex-row items-center justify-center"
          >
            <Ionicons name="chatbubble-ellipses" size={18} color="white" />
            <Text className="text-white font-semibold ml-2">Kirim Pesan</Text>
          </TouchableOpacity>
        </View>

        {/* Tab Switcher */}
        <View className="flex-row px-4 border-b border-[#E8F6F3]">
          <TouchableOpacity
            onPress={() => setActiveTab('posts')}
            className={`flex-1 py-3 items-center ${activeTab === 'posts' ? 'border-b-2 border-[#7ECDC0]' : ''}`}
          >
            <Ionicons 
              name="grid-outline" 
              size={20} 
              color={activeTab === 'posts' ? '#7ECDC0' : '#B2BEC3'} 
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveTab('laporan')}
            className={`flex-1 py-3 items-center ${activeTab === 'laporan' ? 'border-b-2 border-[#7ECDC0]' : ''}`}
          >
            <Ionicons 
              name="document-text-outline" 
              size={20} 
              color={activeTab === 'laporan' ? '#7ECDC0' : '#B2BEC3'} 
            />
          </TouchableOpacity>
        </View>

        {/* Content Grid */}
        {activeTab === 'posts' ? (
          <FlatList
            data={posts}
            renderItem={renderPostGrid}
            keyExtractor={(item) => item.id}
            numColumns={3}
            contentContainerClassName="p-1"
            scrollEnabled={false}
            ListEmptyComponent={() => (
              <View className="items-center py-12">
                <Ionicons name="images-outline" size={48} color="#E8F6F3" />
                <Text className="text-[#636E72] mt-2">Belum ada postingan</Text>
              </View>
            )}
          />
        ) : (
          <View className="px-2 py-2">
            <View className="items-center py-12">
              <Ionicons name="document-text-outline" size={48} color="#E8F6F3" />
              <Text className="text-[#636E72] mt-2">Laporan di tab Laporan</Text>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
