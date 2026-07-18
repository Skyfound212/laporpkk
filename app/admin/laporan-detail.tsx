import { View, Text, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Linking, RefreshControl } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useEffect, useCallback } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'react-native';
import { supabase } from '@/lib/supabase';

interface LaporanDetail {
  id: string;
  nomor_dokumen: string;
  judul: string;
  kategori: string;
  deskripsi: string;
  lokasi: string;
  tanggal_kejadian: string;
  waktu?: string;
  agenda?: string;
  dasar_kegiatan?: string;
  jumlah_peserta?: number;
  hasil_kegiatan?: string;
  dokumentasi?: string[];
  status: string;
  status_admin: string;
  pdf_url?: string;
  created_at: string;
  profiles?: {
    nama: string;
    jabatan: string;
    nik: string;
  };
}

export default function AdminLaporanDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [laporan, setLaporan] = useState<LaporanDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDetail = useCallback(async () => {
    if (!id) return;
    const { data, error } = await supabase
      .from('laporan')
      .select('*, profiles:user_id (nama, jabatan, nik)')
      .eq('id', id)
      .single();

    if (error) {
      Alert.alert('Error', 'Gagal memuat detail laporan');
    } else {
      setLaporan(data as unknown as LaporanDetail);
      // Auto-tandai dibaca
      if ((data as any).status_admin === 'baru') {
        await supabase.from('laporan').update({ status_admin: 'dibaca' }).eq('id', id);
      }
    }
    setLoading(false);
    setRefreshing(false);
  }, [id]);

  useEffect(() => { fetchDetail(); }, [fetchDetail]);

  const handleArsipkan = async () => {
    await supabase.from('laporan').update({ status_admin: 'diarsipkan' }).eq('id', id);
    setLaporan((prev) => prev ? { ...prev, status_admin: 'diarsipkan' } : prev);
  };

  const handleDownloadPdf = async () => {
    if (!laporan?.pdf_url) {
      Alert.alert('Info', 'PDF belum tersedia untuk laporan ini');
      return;
    }
    await Linking.openURL(laporan.pdf_url).catch(() =>
      Alert.alert('Gagal', 'Tidak dapat membuka PDF')
    );
  };

  const formatTanggal = (dateStr?: string) => {
    if (!dateStr) return '-';
    const days = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
    const months = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
    const d = new Date(dateStr);
    return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
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

  const docs = laporan.dokumentasi || [];

  const Row = ({ label, value }: { label: string; value?: string | number }) => (
    <View className="flex-row py-2.5 border-b border-[#F5F5F5]">
      <Text className="text-sm text-[#636E72] w-36">{label}</Text>
      <Text className="text-sm text-[#2D3436] font-medium flex-1">{value ?? '-'}</Text>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-[#F8FAFA]" edges={['top']}>
      {/* Header */}
      <View className="bg-white px-4 py-3 border-b border-[#E8F6F3] flex-row items-center">
        <TouchableOpacity onPress={() => router.back()} className="mr-3">
          <Ionicons name="arrow-back" size={22} color="#636E72" />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-base font-bold text-[#2D3436]" numberOfLines={1}>
            {laporan.agenda || laporan.judul}
          </Text>
          <Text className="text-xs text-[#B2BEC3]">{laporan.nomor_dokumen}</Text>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchDetail(); }} />}
      >
        {/* Pembuat Laporan */}
        <View className="bg-white mx-4 mt-4 rounded-2xl p-4 border border-[#E8F6F3]">
          <Text className="text-xs text-[#B2BEC3] uppercase tracking-wider mb-3">Pembuat Laporan</Text>
          <View className="flex-row items-center">
            <View className="w-11 h-11 rounded-full bg-[#E8F6F3] items-center justify-center mr-3">
              <Text className="text-[#5DB9AA] font-bold text-base">
                {(laporan.profiles?.nama ?? '?').charAt(0).toUpperCase()}
              </Text>
            </View>
            <View className="flex-1">
              <Text className="text-sm font-semibold text-[#2D3436]">{laporan.profiles?.nama ?? '-'}</Text>
              <Text className="text-xs text-[#636E72]">{laporan.profiles?.jabatan ?? '-'}</Text>
            </View>
          </View>
        </View>

        {/* Detail Kegiatan */}
        <View className="bg-white mx-4 mt-3 rounded-2xl p-4 border border-[#E8F6F3]">
          <Text className="text-xs text-[#B2BEC3] uppercase tracking-wider mb-3">Detail Kegiatan</Text>
          <Row label="Dasar Kegiatan" value={laporan.dasar_kegiatan || laporan.deskripsi} />
          <Row label="Hari / Tanggal"  value={formatTanggal(laporan.tanggal_kejadian)} />
          <Row label="Waktu"           value={laporan.waktu} />
          <Row label="Tempat"          value={laporan.lokasi} />
          <Row label="Agenda / Acara"  value={laporan.agenda || laporan.judul} />
          <Row label="Jumlah Peserta"  value={laporan.jumlah_peserta} />
        </View>

        {/* Hasil Kegiatan */}
        <View className="bg-white mx-4 mt-3 rounded-2xl p-4 border border-[#E8F6F3]">
          <Text className="text-xs text-[#B2BEC3] uppercase tracking-wider mb-2">Hasil Kegiatan</Text>
          <Text className="text-sm text-[#2D3436] leading-6">{laporan.hasil_kegiatan || laporan.deskripsi || '-'}</Text>
        </View>

        {/* Dokumentasi Foto */}
        {docs.length > 0 && (
          <View className="bg-white mx-4 mt-3 rounded-2xl p-4 border border-[#E8F6F3]">
            <Text className="text-xs text-[#B2BEC3] uppercase tracking-wider mb-3">Dokumentasi Foto</Text>
            <View className="flex-row flex-wrap gap-2">
              {docs.map((uri, idx) => (
                <View key={idx} className="w-[47%] aspect-square rounded-xl overflow-hidden border border-[#E8F6F3]">
                  <Image source={{ uri }} className="w-full h-full" resizeMode="cover" />
                </View>
              ))}
            </View>
          </View>
        )}

        <View className="h-6" />
      </ScrollView>

      {/* Bottom Actions */}
      <View className="bg-white border-t border-[#E8F6F3] px-4 py-4 flex-row gap-3">
        <TouchableOpacity
          onPress={handleDownloadPdf}
          className="flex-1 py-3.5 rounded-2xl bg-[#E8F6F3] items-center flex-row justify-center"
        >
          <Ionicons name="download-outline" size={18} color="#5DB9AA" />
          <Text className="text-[#5DB9AA] font-semibold ml-2">Download PDF</Text>
        </TouchableOpacity>

        {laporan.status_admin !== 'diarsipkan' && (
          <TouchableOpacity
            onPress={handleArsipkan}
            className="flex-1 py-3.5 rounded-2xl bg-[#F5F5F5] items-center flex-row justify-center"
          >
            <Ionicons name="archive-outline" size={18} color="#636E72" />
            <Text className="text-[#636E72] font-semibold ml-2">Arsipkan</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}
