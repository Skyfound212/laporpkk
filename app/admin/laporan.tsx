import { View, Text, TouchableOpacity, FlatList, RefreshControl, Alert, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useState, useEffect, useCallback } from 'react';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { insertInAppNotification, sendPushNotification } from '@/lib/notifications';

interface LaporanMasuk {
  id: string;
  user_id: string;
  nomor_dokumen: string;
  judul: string;
  agenda?: string;
  status: string;
  status_admin: string;
  pdf_url?: string;
  created_at: string;
  profiles?: {
    nama: string;
    jabatan: string;
  };
}

export default function AdminLaporanScreen() {
  const router = useRouter();
  const [laporan, setLaporan] = useState<LaporanMasuk[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'semua' | 'baru' | 'dibaca' | 'diarsipkan'>('semua');

  const fetchLaporan = useCallback(async () => {
    try {
      let query = supabase
        .from('laporan')
        .select('id, user_id, nomor_dokumen, judul, agenda, status, status_admin, pdf_url, created_at, profiles:user_id (nama, jabatan)')
        .order('created_at', { ascending: false });

      if (activeFilter !== 'semua') {
        query = query.eq('status_admin', activeFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      setLaporan((data as unknown as LaporanMasuk[]) || []);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Gagal memuat laporan');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeFilter]);

  useEffect(() => { fetchLaporan(); }, [fetchLaporan]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const getStatusAdminBadge = (s: string) => {
    switch (s) {
      case 'baru':        return { bg: '#FFF3CD', text: '#856404', label: 'Baru' };
      case 'dibaca':      return { bg: '#E8F6F3', text: '#00B894', label: 'Dibaca' };
      case 'diarsipkan':  return { bg: '#F5F5F5', text: '#636E72', label: 'Diarsip' };
      default:            return { bg: '#F5F5F5', text: '#636E72', label: s };
    }
  };

  const handleMarkDibaca = async (id: string, userId: string) => {
    await supabase.from('laporan').update({ status_admin: 'dibaca' }).eq('id', id);

    // Notifikasi ke anggota
    if (userId) {
      await insertInAppNotification(
        userId,
        'Laporan Anda Telah Dibaca',
        'Admin telah membaca dan memproses laporan yang Anda kirimkan.',
        'laporan',
        { route: '/laporan/detail', laporanId: id }
      );
      sendPushNotification(
        userId,
        'Laporan Telah Dibaca',
        'Admin telah membaca laporan Anda.',
        { type: 'laporan', laporanId: id }
      );
    }

    fetchLaporan();
  };

  const handleArsipkan = async (id: string, userId: string) => {
    await supabase.from('laporan').update({ status_admin: 'diarsipkan' }).eq('id', id);

    // Notifikasi ke anggota
    if (userId) {
      await insertInAppNotification(
        userId,
        'Laporan Diarsipkan',
        'Laporan Anda telah diarsipkan oleh admin PKK Digital.',
        'laporan',
        { route: '/laporan/detail', laporanId: id }
      );
      sendPushNotification(
        userId,
        'Laporan Diarsipkan',
        'Laporan Anda telah diarsipkan oleh admin.',
        { type: 'laporan', laporanId: id }
      );
    }

    fetchLaporan();
  };

  const renderItem = ({ item }: { item: LaporanMasuk }) => {
    const badge = getStatusAdminBadge(item.status_admin);

    return (
      <View className="bg-white rounded-2xl mx-4 mb-3 shadow-sm border border-[#E8F6F3] overflow-hidden">
        {/* Header baris */}
        <TouchableOpacity
          onPress={() => {
            if (item.status_admin === 'baru') handleMarkDibaca(item.id, item.user_id);
            router.push({ pathname: '/admin/laporan-detail', params: { id: item.id } });
          }}
          className="p-4"
        >
          <View className="flex-row justify-between items-start mb-1">
            <Text className="text-xs text-[#B2BEC3]">{formatDate(item.created_at)}</Text>
            <View className="px-2.5 py-0.5 rounded-full" style={{ backgroundColor: badge.bg }}>
              <Text className="text-xs font-semibold" style={{ color: badge.text }}>{badge.label}</Text>
            </View>
          </View>

          <Text className="text-sm font-bold text-[#2D3436] mt-1" numberOfLines={2}>
            {item.agenda || item.judul}
          </Text>

          <View className="flex-row items-center mt-2">
            <Ionicons name="person-outline" size={12} color="#B2BEC3" />
            <Text className="text-xs text-[#636E72] ml-1">
              {(item.profiles as any)?.nama ?? '-'} · {(item.profiles as any)?.jabatan ?? '-'}
            </Text>
          </View>

          <Text className="text-xs text-[#B2BEC3] mt-0.5">{item.nomor_dokumen}</Text>
        </TouchableOpacity>

        {/* Aksi baris bawah */}
        <View className="flex-row border-t border-[#F0F0F0]">
          <TouchableOpacity
            onPress={() => router.push({ pathname: '/admin/laporan-detail', params: { id: item.id } })}
            className="flex-1 flex-row items-center justify-center py-3"
          >
            <Ionicons name="eye-outline" size={15} color="#7ECDC0" />
            <Text className="text-xs text-[#7ECDC0] font-semibold ml-1">Lihat Detail</Text>
          </TouchableOpacity>

          <View className="w-px bg-[#F0F0F0]" />

          <TouchableOpacity
            onPress={async () => {
              if (item.pdf_url) {
                await Linking.openURL(item.pdf_url).catch(() =>
                  Alert.alert('Gagal', 'Tidak dapat membuka PDF')
                );
              } else {
                Alert.alert('Info', 'PDF belum tersedia untuk laporan ini');
              }
            }}
            className="flex-1 flex-row items-center justify-center py-3"
          >
            <Ionicons name="download-outline" size={15} color="#FDCB6E" />
            <Text className="text-xs text-[#FDCB6E] font-semibold ml-1">Download PDF</Text>
          </TouchableOpacity>

          {item.status_admin !== 'diarsipkan' && (
            <>
              <View className="w-px bg-[#F0F0F0]" />
              <TouchableOpacity
                onPress={() => handleArsipkan(item.id, item.user_id)}
                className="flex-1 flex-row items-center justify-center py-3"
              >
                <Ionicons name="archive-outline" size={15} color="#636E72" />
                <Text className="text-xs text-[#636E72] font-semibold ml-1">Arsipkan</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    );
  };

  const filters: { key: typeof activeFilter; label: string }[] = [
    { key: 'semua',      label: 'Semua' },
    { key: 'baru',       label: 'Baru' },
    { key: 'dibaca',     label: 'Dibaca' },
    { key: 'diarsipkan', label: 'Diarsip' },
  ];

  return (
    <SafeAreaView className="flex-1 bg-[#F8FAFA]" edges={['top']}>
      {/* Header */}
      <View className="bg-white px-4 pt-4 pb-3 border-b border-[#E8F6F3]">
        <View className="flex-row items-center mb-4">
          <TouchableOpacity onPress={() => router.back()} className="mr-3">
            <Ionicons name="arrow-back" size={22} color="#636E72" />
          </TouchableOpacity>
          <View className="flex-1">
            <Text className="text-xl font-bold text-[#2D3436]">Laporan Masuk</Text>
            <Text className="text-xs text-[#636E72] mt-0.5">Semua laporan anggota</Text>
          </View>
        </View>

        <FlatList
          data={filters}
          horizontal
          showsHorizontalScrollIndicator={false}
          keyExtractor={(item) => item.key}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => setActiveFilter(item.key)}
              className={`px-4 py-2 rounded-full mr-2 ${activeFilter === item.key ? 'bg-[#7ECDC0]' : 'bg-[#F0F0F0]'}`}
            >
              <Text className={`text-sm font-medium ${activeFilter === item.key ? 'text-white' : 'text-[#636E72]'}`}>
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
        />
      </View>

      <FlatList
        data={laporan}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingVertical: 12 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchLaporan(); }}
          />
        }
        ListEmptyComponent={() => (
          !loading ? (
            <View className="items-center justify-center py-24">
              <MaterialIcons name="assignment" size={64} color="#E8F6F3" />
              <Text className="text-[#636E72] mt-4 font-medium">Belum ada laporan masuk</Text>
            </View>
          ) : null
        )}
      />
    </SafeAreaView>
  );
}
