import { View, Text, TouchableOpacity, FlatList, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useState, useEffect, useCallback } from 'react';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';

interface AduanItem {
  id: string;
  sender_id: string;
  sender_name: string;
  sender_jabatan: string;
  content: string;
  created_at: string;
  is_read: boolean;
}

export default function AdminAduanScreen() {
  const router = useRouter();
  const [aduan, setAduan] = useState<AduanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAduan = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('id, sender_id, content, created_at, sender:profiles(nama, jabatan)')
        .eq('room_id', 'admin-pkk')
        .eq('type', 'text')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Group by sender, get latest message per sender
      const grouped = new Map();
      (data || []).forEach((item: any) => {
        const senderId = item.sender_id;
        if (!grouped.has(senderId)) {
          grouped.set(senderId, {
            id: item.id,
            sender_id: senderId,
            sender_name: item.sender?.nama || 'Anggota',
            sender_jabatan: item.sender?.jabatan || 'Anggota',
            content: item.content,
            created_at: item.created_at,
            is_read: false,
          });
        }
      });

      setAduan(Array.from(grouped.values()));
    } catch (err) {
      console.error('Error fetching aduan:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAduan();

    // Real-time subscription
    const subscription = supabase
      .channel('admin-aduan')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `room_id=eq.admin-pkk`,
        },
        () => {
          fetchAduan();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchAduan]);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Baru saja';
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}j`;
    if (days < 7) return `${days}h`;
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
  };

  const renderItem = ({ item }: { item: AduanItem }) => (
    <TouchableOpacity
      onPress={() => router.push({ pathname: '/chat/room', params: { id: item.sender_id } })}
      className="bg-white rounded-2xl p-4 mb-3 shadow-sm border border-[#E8F6F3]"
    >
      <View className="flex-row items-center">
        <View className="w-12 h-12 rounded-full bg-[#7ECDC0] items-center justify-center mr-3">
          <Text className="text-white font-bold text-lg">
            {item.sender_name.charAt(0).toUpperCase()}
          </Text>
        </View>
        <View className="flex-1">
          <View className="flex-row justify-between items-center">
            <Text className="font-bold text-[#2D3436]">{item.sender_name}</Text>
            <Text className="text-xs text-[#B2BEC3]">{formatTime(item.created_at)}</Text>
          </View>
          <Text className="text-xs text-[#636E72] mt-0.5">{item.sender_jabatan}</Text>
          <Text className="text-sm text-[#636E72] mt-1" numberOfLines={2}>
            {item.content}
          </Text>
        </View>
        {!item.is_read && (
          <View className="w-3 h-3 rounded-full bg-[#FF6B6B] ml-2" />
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView className="flex-1 bg-[#F8FAFA]" edges={['top']}>
      {/* Header */}
      <View className="bg-white px-4 pt-4 pb-3 border-b border-[#E8F6F3]">
        <Text className="text-2xl font-bold text-[#2D3436]">Aduan Anggota</Text>
        <Text className="text-sm text-[#636E72] mt-0.5">Pesan masuk dari anggota PKK</Text>
      </View>

      <FlatList
        data={aduan}
        renderItem={renderItem}
        keyExtractor={(item) => item.sender_id}
        contentContainerClassName="px-4 py-4"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchAduan(); }} />
        }
        ListEmptyComponent={() => (
          <View className="items-center py-16">
            <MaterialIcons name="chat-bubble-outline" size={56} color="#E8F6F3" />
            <Text className="text-[#636E72] mt-3">Belum ada aduan</Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}
