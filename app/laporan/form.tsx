import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase';

export default function LaporanFormScreen() {
  const router = useRouter();
  const { user } = useAuthStore();

  const [judul, setJudul] = useState('');
  const [deskripsi, setDeskripsi] = useState('');
  const [lokasi, setLokasi] = useState('');
  const [peserta, setPeserta] = useState('');
  const [hasil, setHasil] = useState('');
  const [kendala, setKendala] = useState('');
  const [rekomendasi, setRekomendasi] = useState('');
  const [loading, setLoading] = useState(false);

  const validate = () => {
    if (!judul.trim()) return 'Judul laporan wajib diisi';
    if (!deskripsi.trim()) return 'Deskripsi kegiatan wajib diisi';
    if (!lokasi.trim()) return 'Lokasi wajib diisi';
    if (!peserta.trim()) return 'Jumlah peserta wajib diisi';
    return null;
  };

  const handleNext = () => {
    const error = validate();
    if (error) {
      Alert.alert('Validasi', error);
      return;
    }

    router.push({
      pathname: '/laporan/preview',
      params: {
        judul: judul.trim(),
        deskripsi: deskripsi.trim(),
        lokasi: lokasi.trim(),
        peserta: peserta.trim(),
        hasil: hasil.trim(),
        kendala: kendala.trim(),
        rekomendasi: rekomendasi.trim(),
      },
    });
  };

  const renderInput = (
    label: string,
    value: string,
    onChange: (t: string) => void,
    placeholder?: string,
    multiline = false
  ) => (
    <View className="mb-4">
      <Text className="text-sm font-semibold text-secondary mb-2">{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor="#B2BEC3"
        multiline={multiline}
        className={`bg-[#F8FAFA] rounded-xl px-4 py-3 text-base text-primary ${multiline ? 'min-h-[100] text-align-top' : ''}`}
        textAlignVertical={multiline ? 'top' : 'center'}
      />
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-tosca-light">
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="close" size={24} color="#636E72" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-primary">Buat Laporan</Text>
        <TouchableOpacity onPress={handleNext} className="px-5 py-2 rounded-full bg-tosca">
          <Text className="text-white font-semibold text-sm">Lanjut</Text>
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 px-4 pt-4">
        {renderInput('Judul Kegiatan', judul, setJudul, 'Contoh: Rapat Rutin Bulanan PKK')}
        {renderInput('Deskripsi Kegiatan', deskripsi, setDeskripsi, 'Jelaskan kegiatan yang dilaksanakan...', true)}
        {renderInput('Lokasi', lokasi, setLokasi, 'Contoh: Balai Desa Sumberrejo')}
        {renderInput('Jumlah Peserta', peserta, setPeserta, 'Contoh: 15 orang')}
        {renderInput('Hasil / Capaian', hasil, setHasil, 'Apa hasil yang dicapai? (opsional)', true)}
        {renderInput('Kendala', kendala, setKendala, 'Apa kendala yang dihadapi? (opsional)', true)}
        {renderInput('Rekomendasi', rekomendasi, setRekomendasi, 'Rekomendasi untuk ke depan? (opsional)', true)}
      </ScrollView>
    </SafeAreaView>
  );
}
