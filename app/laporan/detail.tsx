import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { generatePdf, sharePdf } from '@/lib/pdf-generator';

interface LaporanDetail {
  id: string;
  nomor_dokumen: string;
  judul: string;
  deskripsi: string;
  kategori: string;
  status: string;
  created_at: string;
  uploaded_by: string;
  profiles?: {
    nama_lengkap: string;
    jabatan: string;
    nik: string;
  };
}

export default function LaporanDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuthStore();
  const [laporan, setLaporan] = useState<LaporanDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  const fetchDetail = useCallback(async () => {
    if (!id) return;
    const { data, error } = await supabase
      .from('laporan')
      .select(`
        *,
        profiles:uploaded_by (nama_lengkap, jabatan, nik)
      `)
      .eq('id', id)
      .single();

    if (error) {
      Alert.alert('Error', 'Gagal memuat detail laporan');
    } else {
      setLaporan(data);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchDetail();
    setRefreshing(false);
  }, [fetchDetail]);

  const handleExportPdf = async () => {
    if (!laporan) return;
    setGeneratingPdf(true);
    try {
      const fileUri = await generatePdf(laporan.id);
      if (fileUri) {
        Alert.alert(
          'PDF Berhasil Dibuat',
          'Pilih aksi selanjutnya:',
          [
            { text: 'Batal', style: 'cancel' },
            {
              text: 'Bagikan',
              onPress: () => sharePdf(fileUri, laporan.judul),
            },
            {
              text: 'Selesai',
              style: 'default',
            },
          ]
        );
      }
    } catch (error: any) {
      Alert.alert('Gagal', error.message || 'Tidak dapat membuat PDF');
    } finally {
      setGeneratingPdf(false);
    }
  };

  const handleDelete = () => {
    if (!laporan || laporan.uploaded_by !== user?.id) return;
    Alert.alert(
      'Hapus Laporan',
      'Yakin ingin menghapus laporan ini?',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase.from('laporan').delete().eq('id', id);
            if (error) {
              Alert.alert('Error', 'Gagal menghapus laporan');
            } else {
              router.back();
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white justify-center items-center">
        <ActivityIndicator size="large" color="#7ECDC0" />
      </SafeAreaView>
    );
  }

  if (!laporan) {
    return (
      <SafeAreaView className="flex-1 bg-white justify-center items-center">
        <Ionicons name="document-text-outline" size={48} color="#B2BEC3" />
        <Text className="text-gray-400 mt-3">Laporan tidak ditemukan</Text>
        <TouchableOpacity onPress={() => router.back()} className="mt-4">
          <Text className="text-[#7ECDC0] font-semibold">Kembali</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const isOwner = laporan.uploaded_by === user?.id;
  const date = new Date(laporan.created_at).toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      {/* Header */}
      <View className="bg-white px-4 py-4 border-b border-gray-100 flex-row items-center">
        <TouchableOpacity onPress={() => router.back()} className="mr-3">
          <Ionicons name="arrow-back" size={24} color="#2D3436" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-gray-800 flex-1">Detail Laporan</Text>
        {isOwner && (
          <TouchableOpacity onPress={handleDelete} className="ml-2">
            <Ionicons name="trash-outline" size={22} color="#FF6B6B" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        className="flex-1"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#7ECDC0']} />}
      >
        {/* Nomor Dokumen */}
        <View className="bg-white mx-4 mt-4 rounded-2xl p-4 border border-gray-100">
          <Text className="text-xs text-gray-400 uppercase tracking-wider">Nomor Dokumen</Text>
          <Text className="text-lg font-bold text-[#5DB9AA] mt-1">{laporan.nomor_dokumen}</Text>
        </View>

        {/* Status & Kategori */}
        <View className="flex-row mx-4 mt-3 gap-3">
          <View className="flex-1 bg-white rounded-2xl p-4 border border-gray-100">
            <Text className="text-xs text-gray-400 uppercase tracking-wider">Status</Text>
            <View
              className={`mt-2 self-start px-3 py-1 rounded-full ${
                laporan.status === 'Terkirim' ? 'bg-[#E8F6F3]' : 'bg-[#FFF9E6]'
              }`}
            >
              <Text
                className={`text-xs font-semibold ${
                  laporan.status === 'Terkirim' ? 'text-[#5DB9AA]' : 'text-[#D4A017]'
                }`}
              >
                {laporan.status}
              </Text>
            </View>
          </View>
          <View className="flex-1 bg-white rounded-2xl p-4 border border-gray-100">
            <Text className="text-xs text-gray-400 uppercase tracking-wider">Kategori</Text>
            <Text className="text-sm font-semibold text-gray-800 mt-2">{laporan.kategori}</Text>
          </View>
        </View>

        {/* Judul */}
        <View className="bg-white mx-4 mt-3 rounded-2xl p-4 border border-gray-100">
          <Text className="text-xs text-gray-400 uppercase tracking-wider">Judul</Text>
          <Text className="text-base font-bold text-gray-800 mt-2 leading-6">{laporan.judul}</Text>
        </View>

        {/* Deskripsi */}
        <View className="bg-white mx-4 mt-3 rounded-2xl p-4 border border-gray-100">
          <Text className="text-xs text-gray-400 uppercase tracking-wider">Deskripsi</Text>
          <Text className="text-sm text-gray-700 mt-2 leading-6">{laporan.deskripsi}</Text>
        </View>

        {/* Pelapor */}
        <View className="bg-white mx-4 mt-3 rounded-2xl p-4 border border-gray-100">
          <Text className="text-xs text-gray-400 uppercase tracking-wider">Informasi Pelapor</Text>
          <View className="flex-row items-center mt-3">
            <View className="w-10 h-10 rounded-full bg-[#E8F6F3] items-center justify-center mr-3">
              <Text className="text-[#5DB9AA] font-bold">
                {(laporan.profiles?.nama_lengkap || '?').charAt(0).toUpperCase()}
              </Text>
            </View>
            <View className="flex-1">
              <Text className="text-sm font-semibold text-gray-800">
                {laporan.profiles?.nama_lengkap || '-'}
              </Text>
              <Text className="text-xs text-gray-500">{laporan.profiles?.jabatan || '-'}</Text>
            </View>
          </View>
        </View>

        {/* Tanggal */}
        <View className="bg-white mx-4 mt-3 mb-4 rounded-2xl p-4 border border-gray-100">
          <Text className="text-xs text-gray-400 uppercase tracking-wider">Tanggal Dibuat</Text>
          <Text className="text-sm text-gray-700 mt-2">{date}</Text>
        </View>
      </ScrollView>

      {/* Bottom Action — Export PDF */}
      <View className="bg-white border-t border-gray-100 px-4 py-4">
        <TouchableOpacity
          onPress={handleExportPdf}
          disabled={generatingPdf}
          className="bg-[#7ECDC0] py-4 rounded-2xl flex-row items-center justify-center"
        >
          {generatingPdf ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="document-text" size={20} color="#fff" />
              <Text className="text-white font-bold text-base ml-2">Export PDF</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
