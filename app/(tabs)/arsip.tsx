import { View, Text, TouchableOpacity, FlatList, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useState, useEffect, useCallback } from 'react';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';

interface ArsipItem {
  id: string;
  title: string;
  description: string;
  file_name: string;
  file_type: string;
  file_size: number;
  file_url: string;
  category: string;
  uploaded_by: string;
  created_at: string;
  user: {
    nama: string;
  };
}

const categoryConfig: Record<string, { icon: string; color: string; bg: string }> = {
  'Surat': { icon: 'mail', color: '#7ECDC0', bg: '#E8F6F3' },
  'Laporan': { icon: 'description', color: '#FDCB6E', bg: '#FFF9E6' },
  'Rapat': { icon: 'event', color: '#FF6B6B', bg: '#FFF0F0' },
  'Kegiatan': { icon: 'celebration', color: '#00B894', bg: '#E8F8F5' },
  'Lainnya': { icon: 'folder', color: '#636E72', bg: '#F5F5F5' },
};

export default function ArsipScreen() {
  const router = useRouter();
  const [arsip, setArsip] = useState<ArsipItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string>('all');

  const categories = ['all', 'Surat', 'Laporan', 'Rapat', 'Kegiatan', 'Lainnya'];

  const fetchArsip = useCallback(async () => {
    try {
      let query = supabase
        .from('arsip_dokumen')
        .select('id, title, description, file_name, file_type, file_size, file_url, category, uploaded_by, created_at, user:profiles(nama)')
        .order('created_at', { ascending: false });

      if (activeFilter !== 'all') {
        query = query.eq('category', activeFilter);
      }

      const { data, error } = await query;

      if (error) throw error;

      const mapped = (data || []).map((item: any) => ({
        ...item,
        user: {
          nama: item.user?.nama || 'Admin',
        },
      }));

      setArsip(mapped);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Gagal memuat arsip');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeFilter]);

  useEffect(() => {
    fetchArsip();
  }, [fetchArsip]);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.includes('pdf')) return 'picture-as-pdf';
    if (fileType.includes('image')) return 'image';
    if (fileType.includes('word') || fileType.includes('document')) return 'description';
    if (fileType.includes('excel') || fileType.includes('sheet')) return 'table-chart';
    return 'insert-drive-file';
  };

  const renderItem = ({ item }: { item: ArsipItem }) => {
    const config = categoryConfig[item.category] || categoryConfig['Lainnya'];
    const fileIcon = getFileIcon(item.file_type);

    return (
      <TouchableOpacity
        onPress={() => router.push({ pathname: '/arsip/detail', params: { id: item.id } })}
        className="bg-white rounded-2xl p-4 mb-3 shadow-sm border border-[#E8F6F3]"
      >
        <View className="flex-row items-start">
          {/* File Icon */}
          <View className="w-12 h-12 rounded-xl bg-[#F8FAFA] items-center justify-center mr-3">
            <MaterialIcons name={fileIcon as any} size={24} color="#7ECDC0" />
          </View>

          <View className="flex-1">
            <View className="flex-row justify-between items-start mb-1">
              <Text className="text-base font-bold text-[#2D3436] flex-1 mr-2" numberOfLines={1}>
                {item.title}
              </Text>
              <View 
                className="px-2.5 py-1 rounded-full"
                style={{ backgroundColor: config.bg }}
              >
                <Text className="text-[10px] font-medium" style={{ color: config.color }}>
                  {item.category}
                </Text>
              </View>
            </View>

            <Text className="text-sm text-[#636E72] mb-2" numberOfLines={2}>
              {item.description}
            </Text>

            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center">
                <Ionicons name="document-outline" size={12} color="#B2BEC3" />
                <Text className="text-xs text-[#B2BEC3] ml-1">{item.file_name}</Text>
              </View>
              <Text className="text-xs text-[#B2BEC3]">{formatFileSize(item.file_size)}</Text>
            </View>

            <View className="flex-row items-center mt-2">
              <Text className="text-xs text-[#636E72]">oleh {item.user.nama}</Text>
              <Text className="text-xs text-[#B2BEC3] mx-1">•</Text>
              <Text className="text-xs text-[#B2BEC3]">
                {new Date(item.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F8FAFA]" edges={['top']}>
      {/* Header */}
      <View className="bg-white px-4 pt-4 pb-3 border-b border-[#E8F6F3]">
        <View className="flex-row items-center justify-between mb-4">
          <View>
            <Text className="text-2xl font-bold text-[#2D3436]">Arsip Dokumen</Text>
            <Text className="text-sm text-[#636E72] mt-0.5">Kelola dokumen PKK</Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push('/arsip/upload')}
            className="w-11 h-11 rounded-full bg-[#7ECDC0] items-center justify-center shadow-sm"
          >
            <Ionicons name="add" size={24} color="white" />
          </TouchableOpacity>
        </View>

        {/* Filter Tabs */}
        <FlatList
          data={categories}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => setActiveFilter(item)}
              className={`px-4 py-2 rounded-full mr-2 ${
                activeFilter === item ? 'bg-[#7ECDC0]' : 'bg-[#E8F6F3]'
              }`}
            >
              <Text className={`text-sm font-medium ${activeFilter === item ? 'text-white' : 'text-[#636E72]'}`}>
                {item === 'all' ? 'Semua' : item}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      {/* List */}
      <FlatList
        data={arsip}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerClassName="px-4 py-4"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchArsip(); }} />
        }
        ListEmptyComponent={() => (
          <View className="items-center justify-center py-20">
            <MaterialIcons name="folder-open" size={64} color="#E8F6F3" />
            <Text className="text-[#636E72] mt-4 text-center">Belum ada dokumen</Text>
            <Text className="text-[#B2BEC3] text-sm mt-1 text-center">Tap + untuk upload dokumen</Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}
