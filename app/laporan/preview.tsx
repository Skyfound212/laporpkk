import { View, Text, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase';
import { generatePdf } from '@/lib/pdf-generator';

function toRoman(num: number): string {
  const roman = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'];
  return roman[num - 1] || String(num);
}

function generateNomorDokumen(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = toRoman(now.getMonth() + 1);
  const random = String(Math.floor(Math.random() * 900) + 100).padStart(3, '0');
  return `PKK/${year}/${month}/${random}`;
}

export default function LaporanPreviewScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const params = useLocalSearchParams<{
    judul: string;
    deskripsi: string;
    lokasi: string;
    peserta: string;
    hasil?: string;
    kendala?: string;
    rekomendasi?: string;
  }>();

  const [nomorDokumen] = useState(generateNomorDokumen());
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];

      const { data: inserted, error } = await supabase
        .from('laporan')
        .insert({
          user_id: user?.id,
          nomor_dokumen: nomorDokumen,
          judul: params.judul,
          kategori: 'Umum',
          deskripsi: params.deskripsi,
          lokasi: params.lokasi,
          tanggal_kejadian: today,
          jumlah_peserta: parseInt(params.peserta ?? '0', 10) || 0,
          hasil_kegiatan: params.hasil || null,
          agenda: params.judul,
          dasar_kegiatan: params.deskripsi,
          status: 'pending',
          status_admin: 'baru',
        })
        .select('id')
        .single();

      if (error) throw error;

      // Generate & upload PDF — non-blocking, tidak menunda navigasi jika gagal
      try {
        await generatePdf(inserted.id);
      } catch (pdfErr) {
        console.warn('PDF generation warning:', pdfErr);
      }

      Alert.alert('Sukses', 'Laporan berhasil dikirim dan PDF telah dibuat', [
        { text: 'OK', onPress: () => router.push('/(tabs)/laporan') },
      ]);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Gagal mengirim laporan');
    } finally {
      setLoading(false);
    }
  };

  const renderRow = (label: string, value: string) => (
    <View className="mb-3">
      <Text className="text-xs text-secondary mb-1">{label}</Text>
      <Text className="text-base text-primary font-medium">{value || '-'}</Text>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-tosca-light">
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#636E72" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-primary">Preview Laporan</Text>
        <View className="w-8" />
      </View>

      <ScrollView className="flex-1 px-4 py-4">
        {/* Nomor Dokumen */}
        <View className="bg-tosca-light rounded-xl p-4 mb-4">
          <Text className="text-xs text-tosca-dark mb-1">Nomor Dokumen</Text>
          <Text className="text-lg font-bold text-primary">{nomorDokumen}</Text>
        </View>

        {/* Data Preview */}
        <View className="bg-[#F8FAFA] rounded-2xl p-4 mb-4">
          {renderRow('Judul / Agenda Kegiatan', params.judul)}
          {renderRow('Deskripsi / Dasar Kegiatan', params.deskripsi)}
          {renderRow('Lokasi / Tempat', params.lokasi)}
          {renderRow('Jumlah Peserta', params.peserta)}
          {renderRow('Hasil / Capaian', params.hasil || '')}
          {renderRow('Kendala', params.kendala || '')}
          {renderRow('Rekomendasi', params.rekomendasi || '')}
        </View>

        {/* Info PDF */}
        <View className="flex-row items-center bg-[#E8F6F3] rounded-xl p-3 mb-6">
          <Ionicons name="document-text-outline" size={18} color="#5DB9AA" />
          <Text className="text-sm text-secondary ml-2">PDF akan otomatis dibuat setelah laporan dikirim</Text>
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View className="px-4 py-4 border-t border-tosca-light flex-row gap-3">
        <TouchableOpacity
          onPress={() => router.back()}
          className="flex-1 py-3.5 rounded-2xl bg-tosca-light items-center"
        >
          <Text className="text-tosca-dark font-semibold">Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={loading}
          className="flex-1 py-3.5 rounded-2xl bg-tosca items-center flex-row justify-center"
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text className="text-white font-semibold">Kirim Laporan</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
