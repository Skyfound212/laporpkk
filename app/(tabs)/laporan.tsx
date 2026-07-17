import { View, Text, TouchableOpacity, FlatList, RefreshControl, Alert, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useState, useEffect, useCallback } from 'react';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase';
import { generatePdf, sharePdf } from '@/lib/pdf-generator';

interface LaporanItem {
  id: string;
  nomor_dokumen: string;
  judul: string;
  agenda?: string;
  status: string;
  status_admin?: string;
  pdf_url?: string;
  created_at: string;
}

export default function LaporanScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [laporan, setLaporan] = useState<LaporanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'terkirim' | 'pending'>('all');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const fetchLaporan = useCallback(async () => {
    try {
      let query = supabase
        .from('laporan')
        .select('id, nomor_dokumen, judul, agenda, status, status_admin, pdf_url, created_at')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (activeFilter !== 'all') {
        query = query.eq('status', activeFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      setLaporan(data || []);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Gagal memuat laporan');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeFilter, user?.id]);

  useEffect(() => { fetchLaporan(); }, [fetchLaporan]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const handleDownloadPdf = async (item: LaporanItem) => {
    setDownloadingId(item.id);
    try {
      if (item.pdf_url) {
        // Buka PDF dari URL langsung
        await Linking.openURL(item.pdf_url);
      } else {
        // Generate PDF lokal jika belum ada
        const fileUri = await generatePdf(item.id);
        await sharePdf(fileUri, item.judul || item.agenda || 'Laporan PKK');
        fetchLaporan(); // refresh untuk update pdf_url
      }
    } catch (err: any) {
      Alert.alert('Gagal', err.message || 'Tidak dapat membuka PDF');
    } finally {
      setDownloadingId(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'terkirim': return { bg: '#E8F6F3', text: '#00B894', dot: '#00B894' };
      case 'pending':  return { bg: '#FFF9E6', text: '#FDCB6E', dot: '#FDCB6E' };
      default:         return { bg: '#F5F5F5', text: '#636E72', dot: '#636E72' };
    }
  };

  const renderItem = ({ item }: { item: LaporanItem }) => {
    const colors = getStatusColor(item.status);
    const isDownloading = downloadingId === item.id;
    const haspdf = !!item.pdf_url;

    return (
      <TouchableOpacity
        onPress={() => router.push({ pathname: '/laporan/detail', params: { id: item.id } })}
        className="bg-white rounded-2xl p-4 mb-3 mx-4 shadow-sm border border-tosca-light"
      >
        <View className="flex-row justify-between items-start mb-2">
          <View className="flex-1 mr-3">
            <Text className="text-xs text-muted mb-1">{item.nomor_dokumen}</Text>
            <Text className="text-base font-bold text-primary" numberOfLines={2}>
              {item.agenda || item.judul}
            </Text>
          </View>
          <View className="px-3 py-1 rounded-full" style={{ backgroundColor: colors.bg }}>
            <View className="flex-row items-center">
              <View className="w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: colors.dot }} />
              <Text className="text-xs font-medium" style={{ color: colors.text }}>
                {item.status === 'terkirim' ? 'Terkirim' : 'Pending'}
              </Text>
            </View>
          </View>
        </View>

        <View className="flex-row items-center justify-between mt-2">
          <Text className="text-xs text-muted">{formatDate(item.created_at)}</Text>

          {/* Tombol Download PDF */}
          <TouchableOpacity
            onPress={() => handleDownloadPdf(item)}
            disabled={isDownloading}
            className="flex-row items-center px-3 py-1.5 rounded-full"
            style={{ backgroundColor: haspdf ? '#E8F6F3' : '#F8F8F8' }}
          >
            <Ionicons
              name={haspdf ? 'document-text' : 'document-text-outline'}
              size={14}
              color={haspdf ? '#5DB9AA' : '#B2BEC3'}
            />
            <Text
              className="text-xs font-medium ml-1"
              style={{ color: haspdf ? '#5DB9AA' : '#B2BEC3' }}
            >
              {isDownloading ? '...' : haspdf ? 'Unduh PDF' : 'Buat PDF'}
            </Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const filters: { key: typeof activeFilter; label: string }[] = [
    { key: 'all',      label: 'Semua' },
    { key: 'terkirim', label: 'Terkirim' },
    { key: 'pending',  label: 'Pending' },
  ];

  return (
    <SafeAreaView className="flex-1 bg-[#F8FAFA]" edges={['top']}>
      <View className="bg-white px-4 pt-4 pb-3 border-b border-tosca-light">
        <View className="flex-row items-center justify-between mb-4">
          <View>
            <Text className="text-2xl font-bold text-primary">Riwayat Laporan</Text>
            <Text className="text-sm text-secondary mt-0.5">Laporan kegiatan saya</Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push('/laporan/form')}
            className="w-11 h-11 rounded-full bg-tosca items-center justify-center shadow-sm"
          >
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
              <Text className={`text-sm font-medium ${activeFilter === item.key ? 'text-white' : 'text-secondary'}`}>
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
        contentContainerStyle={{ paddingVertical: 8 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchLaporan(); }}
          />
        }
        ListEmptyComponent={() => (
          !loading ? (
            <View className="items-center justify-center py-20">
              <MaterialIcons name="assignment" size={64} color="#E8F6F3" />
              <Text className="text-secondary mt-4">Belum ada laporan</Text>
              <Text className="text-muted text-sm mt-1">Tap + untuk membuat laporan baru</Text>
            </View>
          ) : null
        )}
      />
    </SafeAreaView>
  );
}
