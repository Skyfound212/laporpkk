import { View, Text, TouchableOpacity, Alert, Linking, RefreshControl, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState, useEffect, useCallback } from 'react';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

interface ArsipDetail {
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
    id: string;
    nama: string;
    jabatan: string;
  };
}

const categoryConfig: Record<string, { icon: string; color: string; bg: string }> = {
  'Surat': { icon: 'mail', color: '#7ECDC0', bg: '#E8F6F3' },
  'Laporan': { icon: 'description', color: '#FDCB6E', bg: '#FFF9E6' },
  'Rapat': { icon: 'event', color: '#FF6B6B', bg: '#FFF0F0' },
  'Kegiatan': { icon: 'celebration', color: '#00B894', bg: '#E8F8F5' },
  'Lainnya': { icon: 'folder', color: '#636E72', bg: '#F5F5F5' },
};

export default function ArsipDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuthStore();

  const [arsip, setArsip] = useState<ArsipDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDetail = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('arsip_dokumen')
        .select('id, title, description, file_name, file_type, file_size, file_url, category, uploaded_by, created_at, user:profiles(id, nama, jabatan)')
        .eq('id', id)
        .single();

      if (error) throw error;

      const userData = Array.isArray(data.user) ? data.user[0] : data.user;
      setArsip({
        ...data,
        user: {
          id: userData?.id || '',
          nama: userData?.nama || 'Admin',
          jabatan: userData?.jabatan || 'Admin',
        },
      });
    } catch (err) {
      console.error('Error fetching arsip:', err);
      Alert.alert('Error', 'Gagal memuat detail dokumen');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const handleDelete = () => {
    Alert.alert(
      'Hapus Dokumen',
      'Apakah Anda yakin ingin menghapus dokumen ini?',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: async () => {
            try {
              // Delete from storage
              if (arsip?.file_url) {
                const path = arsip.file_url.split('/').pop();
                if (path) {
                  await supabase.storage.from('documents').remove([`arsip/${path}`]);
                }
              }

              // Delete from database
              const { error } = await supabase.from('arsip_dokumen').delete().eq('id', id);
              if (error) throw error;

              Alert.alert('Sukses', 'Dokumen berhasil dihapus', [
                { text: 'OK', onPress: () => router.push('/(tabs)/arsip') },
              ]);
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Gagal menghapus dokumen');
            }
          },
        },
      ]
    );
  };

  const handleDownload = async () => {
    if (!arsip?.file_url) return;
    try {
      const supported = await Linking.canOpenURL(arsip.file_url);
      if (supported) {
        await Linking.openURL(arsip.file_url);
      } else {
        Alert.alert('Error', 'Tidak dapat membuka file');
      }
    } catch (err) {
      Alert.alert('Error', 'Gagal membuka file');
    }
  };

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

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center" edges={['top']}>
        <Text className="text-[#636E72]">Memuat detail...</Text>
      </SafeAreaView>
    );
  }

  if (!arsip) {
    return (
      <SafeAreaView className="flex-1 bg-white items-center justify-center px-8" edges={['top']}>
        <MaterialIcons name="folder-off" size={48} color="#B2BEC3" />
        <Text className="text-[#636E72] text-center mt-4">Dokumen tidak ditemukan</Text>
        <TouchableOpacity 
          onPress={() => router.back()}
          className="mt-4 px-6 py-2 rounded-full bg-[#7ECDC0]"
        >
          <Text className="text-white font-semibold">Kembali</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const config = categoryConfig[arsip.category] || categoryConfig['Lainnya'];
  const fileIcon = getFileIcon(arsip.file_type);
  const isUploader = arsip.uploaded_by === user?.id;

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-[#E8F6F3]">
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#636E72" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-[#2D3436] flex-1 ml-4" numberOfLines={1}>
          Detail Dokumen
        </Text>
        {isUploader && (
          <TouchableOpacity onPress={handleDelete} className="ml-2">
            <Ionicons name="trash-outline" size={22} color="#FF6B6B" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView 
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchDetail(); }} />
        }
      >
        <View className="px-4 py-6">
          {/* File Preview */}
          <View className="items-center mb-6">
            <View className="w-24 h-24 rounded-2xl bg-[#E8F6F3] items-center justify-center mb-3">
              <MaterialIcons name={fileIcon as any} size={48} color="#7ECDC0" />
            </View>
            <Text className="text-lg font-bold text-[#2D3436] text-center">{arsip.file_name}</Text>
            <Text className="text-sm text-[#636E72] mt-1">{formatFileSize(arsip.file_size)}</Text>
          </View>

          {/* Category Badge */}
          <View className="flex-row justify-center mb-6">
            <View 
              className="px-4 py-1.5 rounded-full flex-row items-center"
              style={{ backgroundColor: config.bg }}
            >
              <MaterialIcons name={config.icon as any} size={14} color={config.color} style={{ marginRight: 6 }} />
              <Text className="text-sm font-medium" style={{ color: config.color }}>
                {arsip.category}
              </Text>
            </View>
          </View>

          {/* Info Card */}
          <View className="bg-[#F8FAFA] rounded-2xl p-4 mb-6">
            <Text className="text-sm font-semibold text-[#636E72] mb-3">Informasi Dokumen</Text>

            <View className="space-y-3">
              <View className="flex-row items-start">
                <View className="w-8 h-8 rounded-lg bg-[#E8F6F3] items-center justify-center mr-3">
                  <Ionicons name="document-text" size={16} color="#7ECDC0" />
                </View>
                <View className="flex-1">
                  <Text className="text-xs text-[#636E72]">Judul</Text>
                  <Text className="text-sm font-semibold text-[#2D3436]">{arsip.title}</Text>
                </View>
              </View>

              <View className="flex-row items-start">
                <View className="w-8 h-8 rounded-lg bg-[#E8F6F3] items-center justify-center mr-3">
                  <Ionicons name="information-circle" size={16} color="#7ECDC0" />
                </View>
                <View className="flex-1">
                  <Text className="text-xs text-[#636E72]">Deskripsi</Text>
                  <Text className="text-sm text-[#2D3436]">{arsip.description || '-'}</Text>
                </View>
              </View>

              <View className="flex-row items-start">
                <View className="w-8 h-8 rounded-lg bg-[#E8F6F3] items-center justify-center mr-3">
                  <Ionicons name="person" size={16} color="#7ECDC0" />
                </View>
                <View className="flex-1">
                  <Text className="text-xs text-[#636E72]">Diupload oleh</Text>
                  <Text className="text-sm font-semibold text-[#2D3436]">{arsip.user.nama}</Text>
                  <Text className="text-xs text-[#636E72]">{arsip.user.jabatan}</Text>
                </View>
              </View>

              <View className="flex-row items-start">
                <View className="w-8 h-8 rounded-lg bg-[#E8F6F3] items-center justify-center mr-3">
                  <Ionicons name="calendar" size={16} color="#7ECDC0" />
                </View>
                <View className="flex-1">
                  <Text className="text-xs text-[#636E72]">Tanggal Upload</Text>
                  <Text className="text-sm font-semibold text-[#2D3436]">
                    {new Date(arsip.created_at).toLocaleDateString('id-ID', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Download Button */}
          <TouchableOpacity
            onPress={handleDownload}
            className="bg-[#7ECDC0] rounded-2xl py-4 flex-row items-center justify-center"
          >
            <Ionicons name="download-outline" size={20} color="white" />
            <Text className="text-white font-bold text-base ml-2">Download File</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
