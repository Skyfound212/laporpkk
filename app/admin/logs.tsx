import { View, Text, TouchableOpacity, FlatList, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useState, useEffect, useCallback } from 'react';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';

interface LogItem {
  id: string;
  user_id: string;
  user_name: string;
  action: string;
  details?: string;
  ip_address?: string;
  created_at: string;
}

export default function AdminLogsScreen() {
  const router = useRouter();
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all');

  const filters = [
    { key: 'all', label: 'Semua' },
    { key: 'login', label: 'Login' },
    { key: 'logout', label: 'Logout' },
    { key: 'create', label: 'Buat' },
    { key: 'update', label: 'Edit' },
    { key: 'delete', label: 'Hapus' },
  ];

  const fetchLogs = useCallback(async () => {
    try {
      let query = supabase
        .from('user_logs')
        .select('id, user_id, user_name, action, details, ip_address, created_at')
        .order('created_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('action', filter);
      }

      const { data, error } = await query;
      if (error) throw error;
      setLogs(data || []);
    } catch (err) {
      console.error('Error fetching logs:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const getActionColor = (action: string) => {
    switch (action) {
      case 'login': return { bg: '#E8F8F5', color: '#00B894', icon: 'log-in' };
      case 'logout': return { bg: '#F5F5F5', color: '#636E72', icon: 'log-out' };
      case 'create': return { bg: '#E8F6F3', color: '#7ECDC0', icon: 'add-circle' };
      case 'update': return { bg: '#FFF9E6', color: '#FDCB6E', icon: 'create' };
      case 'delete': return { bg: '#FFF0F0', color: '#FF6B6B', icon: 'trash' };
      default: return { bg: '#F5F5F5', color: '#636E72', icon: 'ellipse' };
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
  };

  const renderItem = ({ item }: { item: LogItem }) => {
    const config = getActionColor(item.action);

    return (
      <View className="bg-white rounded-2xl p-4 mb-3 shadow-sm border border-[#E8F6F3]">
        <View className="flex-row items-start">
          <View 
            className="w-10 h-10 rounded-xl items-center justify-center mr-3"
            style={{ backgroundColor: config.bg }}
          >
            <Ionicons name={config.icon as any} size={18} color={config.color} />
          </View>
          <View className="flex-1">
            <View className="flex-row justify-between items-start">
              <Text className="font-semibold text-[#2D3436] text-sm flex-1 mr-2">
                {item.user_name}
              </Text>
              <View 
                className="px-2 py-0.5 rounded-full"
                style={{ backgroundColor: config.bg }}
              >
                <Text className="text-[10px] font-medium capitalize" style={{ color: config.color }}>
                  {item.action}
                </Text>
              </View>
            </View>
            <Text className="text-sm text-[#636E72] mt-0.5">{item.details || '-'}</Text>
            <Text className="text-xs text-[#B2BEC3] mt-1">{formatTime(item.created_at)}</Text>
            {item.ip_address && (
              <Text className="text-xs text-[#B2BEC3]">IP: {item.ip_address}</Text>
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F8FAFA]" edges={['top']}>
      {/* Header */}
      <View className="bg-white px-4 pt-4 pb-3 border-b border-[#E8F6F3]">
        <Text className="text-2xl font-bold text-[#2D3436]">Data Log User</Text>
        <Text className="text-sm text-[#636E72] mt-0.5">Riwayat aktivitas anggota</Text>
      </View>

      {/* Filter */}
      <View className="bg-white px-4 py-3 border-b border-[#E8F6F3]">
        <FlatList
          data={filters}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.key}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => setFilter(item.key)}
              className={`px-4 py-2 rounded-full mr-2 ${
                filter === item.key ? 'bg-[#7ECDC0]' : 'bg-[#E8F6F3]'
              }`}
            >
              <Text className={`text-sm font-medium ${filter === item.key ? 'text-white' : 'text-[#636E72]'}`}>
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      <FlatList
        data={logs}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerClassName="px-4 py-4"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchLogs(); }} />
        }
        ListEmptyComponent={() => (
          <View className="items-center py-16">
            <MaterialIcons name="history" size={56} color="#E8F6F3" />
            <Text className="text-[#636E72] mt-3">Belum ada log aktivitas</Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}
