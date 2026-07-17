import { View, Text, TouchableOpacity, ScrollView, Alert, RefreshControl } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState, useEffect, useCallback } from 'react';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

interface AgendaDetail {
  id: string;
  title: string;
  description: string;
  location: string;
  start_date: string;
  end_date: string;
  status: 'upcoming' | 'ongoing' | 'completed';
  created_by: string;
  created_at: string;
  user: { id: string; nama: string; jabatan: string };
}

const statusConfig = {
  upcoming: { label: 'Akan Datang', color: '#FDCB6E', bg: '#FFF9E6' },
  ongoing: { label: 'Berlangsung', color: '#7ECDC0', bg: '#E8F6F3' },
  completed: { label: 'Selesai', color: '#636E72', bg: '#F5F5F5' },
};

export default function AgendaDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuthStore();
  const [agenda, setAgenda] = useState<AgendaDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDetail = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('agenda')
        .select('id, title, description, location, start_date, end_date, status, created_by, created_at, user:profiles(id, nama, jabatan)')
        .eq('id', id)
        .single();

      if (error) throw error;

      const userData = Array.isArray(data.user) ? data.user[0] : data.user;
      setAgenda({
        ...data,
        user: {
          id: userData?.id || '',
          nama: userData?.nama || 'Anggota PKK',
          jabatan: userData?.jabatan || 'Anggota',
        },
      });
    } catch (err) {
      Alert.alert('Error', 'Gagal memuat detail agenda');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => { fetchDetail(); }, [fetchDetail]);

  const handleDelete = () => {
    Alert.alert('Hapus Agenda', 'Apakah Anda yakin?', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Hapus', style: 'destructive',
        onPress: async () => {
          try {
            const { error } = await supabase.from('agenda').delete().eq('id', id);
            if (error) throw error;
            Alert.alert('Sukses', 'Agenda berhasil dihapus', [
              { text: 'OK', onPress: () => router.push('/(tabs)/agenda') },
            ]);
          } catch (err: any) {
            Alert.alert('Error', err.message || 'Gagal menghapus');
          }
        },
      },
    ]);
  };

  const formatDateFull = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  };

  const isCreator = agenda?.created_by === user?.id;

  if (loading) {
    return (
      <View className="flex-1 bg-white items-center justify-center">
        <Text className="text-secondary">Memuat detail...</Text>
      </View>
    );
  }

  if (!agenda) {
    return (
      <View className="flex-1 bg-white items-center justify-center px-8">
        <MaterialIcons name="event-busy" size={48} color="#B2BEC3" />
        <Text className="text-secondary text-center mt-4">Agenda tidak ditemukan</Text>
        <TouchableOpacity onPress={() => router.back()} className="mt-4 px-6 py-2 rounded-full bg-tosca">
          <Text className="text-white font-semibold">Kembali</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const config = statusConfig[agenda.status];

  return (
    <View className="flex-1 bg-white">
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-tosca-light">
        <TouchableOpacity onPress={() => router.back()}><Ionicons name="arrow-back" size={24} color="#636E72" /></TouchableOpacity>
        <Text className="text-lg font-bold text-primary">Detail Kegiatan</Text>
        <View className="w-8" />
      </View>

      <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchDetail(); }} />}>
        <View className="px-4 py-6">
          <View className="flex-row justify-between items-center mb-4">
            <View className="px-4 py-1.5 rounded-full" style={{ backgroundColor: config.bg }}>
              <Text className="text-sm font-semibold" style={{ color: config.color }}>{config.label}</Text>
            </View>
            {isCreator && (
              <View className="flex-row">
                <TouchableOpacity onPress={() => router.push({ pathname: '/agenda/form', params: { id } })} className="mr-3">
                  <Ionicons name="create-outline" size={22} color="#7ECDC0" />
                </TouchableOpacity>
                <TouchableOpacity onPress={handleDelete}>
                  <Ionicons name="trash-outline" size={22} color="#FF6B6B" />
                </TouchableOpacity>
              </View>
            )}
          </View>

          <Text className="text-2xl font-bold text-primary mb-4">{agenda.title}</Text>

          <View className="bg-[#F8FAFA] rounded-2xl p-4 mb-4">
            <View className="flex-row items-start mb-4">
              <View className="w-10 h-10 rounded-full bg-tosca-light items-center justify-center mr-3">
                <Ionicons name="calendar" size={18} color="#7ECDC0" />
              </View>
              <View className="flex-1">
                <Text className="text-xs text-secondary mb-0.5">Mulai</Text>
                <Text className="text-sm font-semibold text-primary">{formatDateFull(agenda.start_date)}</Text>
              </View>
            </View>
            <View className="flex-row items-start mb-4">
              <View className="w-10 h-10 rounded-full bg-tosca-light items-center justify-center mr-3">
                <Ionicons name="flag" size={18} color="#7ECDC0" />
              </View>
              <View className="flex-1">
                <Text className="text-xs text-secondary mb-0.5">Selesai</Text>
                <Text className="text-sm font-semibold text-primary">{formatDateFull(agenda.end_date)}</Text>
              </View>
            </View>
            <View className="flex-row items-start">
              <View className="w-10 h-10 rounded-full bg-tosca-light items-center justify-center mr-3">
                <Ionicons name="location" size={18} color="#7ECDC0" />
              </View>
              <View className="flex-1">
                <Text className="text-xs text-secondary mb-0.5">Lokasi</Text>
                <Text className="text-sm font-semibold text-primary">{agenda.location}</Text>
              </View>
            </View>
          </View>

          <Text className="text-sm font-semibold text-secondary mb-2">Deskripsi Kegiatan</Text>
          <Text className="text-base text-primary leading-6 mb-6">{agenda.description}</Text>

          <View className="border-t border-tosca-light pt-4">
            <Text className="text-sm font-semibold text-secondary mb-3">Dibuat oleh</Text>
            <TouchableOpacity
              onPress={() => router.push({ pathname: '/profile/other', params: { id: agenda.user.id } })}
              className="flex-row items-center"
            >
              <View className="w-10 h-10 rounded-full bg-tosca items-center justify-center mr-3">
                <Text className="text-white font-bold text-sm">{agenda.user.nama.charAt(0).toUpperCase()}</Text>
              </View>
              <View>
                <Text className="font-semibold text-primary">{agenda.user.nama}</Text>
                <Text className="text-xs text-secondary">{agenda.user.jabatan}</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
