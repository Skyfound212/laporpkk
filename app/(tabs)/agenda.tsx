import { View, Text, TouchableOpacity, FlatList, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useState, useEffect, useCallback } from 'react';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

interface AgendaItem {
  id: string;
  title: string;
  description: string;
  location: string;
  start_date: string;
  end_date: string;
  status: 'upcoming' | 'ongoing' | 'completed';
  created_by: string;
  created_at: string;
  user: { nama: string };
}

const statusConfig = {
  upcoming: { label: 'Akan Datang', color: '#FDCB6E', bg: '#FFF9E6' },
  ongoing: { label: 'Berlangsung', color: '#7ECDC0', bg: '#E8F6F3' },
  completed: { label: 'Selesai', color: '#636E72', bg: '#F5F5F5' },
};

export default function AgendaScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [agenda, setAgenda] = useState<AgendaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'upcoming' | 'ongoing' | 'completed'>('all');

  const fetchAgenda = useCallback(async () => {
    try {
      let query = supabase
        .from('agenda')
        .select('id, title, description, location, start_date, end_date, status, created_by, created_at, user:profiles(nama)')
        .order('start_date', { ascending: true });

      if (activeFilter !== 'all') query = query.eq('status', activeFilter);

      const { data, error } = await query;
      if (error) throw error;

      setAgenda((data || []).map((item: any) => ({
        ...item,
        user: { nama: item.user?.nama || 'Anggota PKK' },
      })));
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Gagal memuat agenda');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeFilter]);

  useEffect(() => { fetchAgenda(); }, [fetchAgenda]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const isOverdue = (item: AgendaItem) => {
    if (item.status === 'completed') return false;
    return new Date() > new Date(item.end_date);
  };

  const renderItem = ({ item }: { item: AgendaItem }) => {
    const config = statusConfig[item.status];
    const overdue = isOverdue(item);

    return (
      <TouchableOpacity
        onPress={() => router.push({ pathname: '/agenda/detail', params: { id: item.id } })}
        className="bg-white rounded-2xl p-4 mb-3 mx-4 shadow-sm border border-tosca-light"
      >
        <View className="flex-row justify-between items-start mb-2">
          <View className="flex-1 mr-3">
            <Text className="text-base font-bold text-primary" numberOfLines={2}>{item.title}</Text>
            <Text className="text-sm text-secondary" numberOfLines={2}>{item.description}</Text>
          </View>
          <View className="px-3 py-1 rounded-full" style={{ backgroundColor: config.bg }}>
            <Text className="text-xs font-medium" style={{ color: config.color }}>{config.label}</Text>
          </View>
        </View>
        <View className="flex-row items-center mt-2">
          <Ionicons name="location-outline" size={14} color="#636E72" />
          <Text className="text-xs text-secondary ml-1 flex-1" numberOfLines={1}>{item.location}</Text>
        </View>
        <View className="flex-row items-center justify-between mt-2">
          <View className="flex-row items-center">
            <Ionicons name="time-outline" size={14} color="#636E72" />
            <Text className={`text-xs ml-1 ${overdue ? 'text-danger' : 'text-secondary'}`}>
              {overdue ? 'Terlewat: ' : ''}{formatDate(item.start_date)}
            </Text>
          </View>
          <Text className="text-xs text-muted">oleh {item.user.nama}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const filters = [
    { key: 'all' as const, label: 'Semua' },
    { key: 'upcoming' as const, label: 'Akan Datang' },
    { key: 'ongoing' as const, label: 'Berlangsung' },
    { key: 'completed' as const, label: 'Selesai' },
  ];

  return (
    <SafeAreaView className="flex-1 bg-[#F8FAFA]" edges={['top']}>
      <View className="bg-white px-4 pt-4 pb-3 border-b border-tosca-light">
        <View className="flex-row items-center justify-between mb-4">
          <View>
            <Text className="text-2xl font-bold text-primary">Agenda PKK</Text>
            <Text className="text-sm text-secondary mt-0.5">Jadwal kegiatan & rapat</Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/agenda/form')} className="w-11 h-11 rounded-full bg-tosca items-center justify-center shadow-sm">
            <Ionicons name="add" size={24} color="white" />
          </TouchableOpacity>
        </View>
        <FlatList
          data={filters}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.key}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => setActiveFilter(item.key)}
              className={`px-4 py-2 rounded-full mr-2 ${activeFilter === item.key ? 'bg-tosca' : 'bg-tosca-light'}`}
            >
              <Text className={`text-sm font-medium ${activeFilter === item.key ? 'text-white' : 'text-secondary'}`}>{item.label}</Text>
            </TouchableOpacity>
          )}
        />
      </View>
      <FlatList
        data={agenda}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingVertical: 8 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchAgenda(); }} />}
        ListEmptyComponent={() => (
          <View className="items-center justify-center py-20">
            <MaterialIcons name="event-note" size={64} color="#E8F6F3" />
            <Text className="text-secondary mt-4">Belum ada agenda</Text>
            <Text className="text-muted text-sm mt-1">Tap + untuk membuat agenda baru</Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}
