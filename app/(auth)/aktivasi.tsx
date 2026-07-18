import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';

export default function AktivasiScreen() {
  const router = useRouter();
  const [nik, setNik] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAktivasi = async () => {
    if (!nik.trim() || nik.length !== 16) {
      Alert.alert('Error', 'NIK harus 16 digit');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, nik, status')
        .eq('nik', nik.trim())
        .single();

      if (error || !data) {
        Alert.alert('Error', 'NIK tidak ditemukan. Hubungi Admin PKK.');
        return;
      }

      if (data.status === 'active') {
        Alert.alert('Info', 'NIK sudah aktif. Silakan login dengan ID Anggota Anda.');
        router.push('/(auth)/login');
        return;
      }

      // NIK valid dan belum aktif → lanjut ke setup
      router.push({ pathname: '/(auth)/setup', params: { nik: data.nik, userId: data.id } });
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  };

  return (
    // SafeAreaView dari react-native-safe-area-context adalah komponen third-party.
    // NativeWind v4 tidak otomatis menerapkan `className` ke komponen ini,
    // sehingga `flex-1` tidak jalan → layar collapse → blank putih.
    // Solusi: gunakan `style` prop langsung untuk flex dan background.
    <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff' }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Tombol kembali */}
          <TouchableOpacity
            onPress={() => router.back()}
            className="px-6 pt-4 pb-2 self-start"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="arrow-back" size={24} color="#636E72" />
          </TouchableOpacity>

          {/* Konten tengah */}
          <View className="flex-1 px-6 justify-center py-8">
            <View className="items-center mb-10">
              <View className="w-20 h-20 rounded-2xl bg-[#7ECDC0] items-center justify-center mb-4">
                <Ionicons name="key" size={40} color="white" />
              </View>
              <Text className="text-2xl font-bold text-[#2D3436]">Aktivasi Akun</Text>
              <Text className="text-sm text-[#636E72] mt-2 text-center px-4">
                Masukkan NIK Anda untuk mengaktifkan akun PKK Digital dan mendapatkan ID login
              </Text>
            </View>

            <View className="mb-4">
              <Text className="text-sm font-semibold text-[#636E72] mb-2">NIK (16 digit)</Text>
              <TextInput
                keyboardType="number-pad"
                maxLength={16}
                value={nik}
                onChangeText={setNik}
                placeholder="Masukkan 16 digit NIK"
                placeholderTextColor="#B2BEC3"
                className="bg-[#F8FAFA] rounded-xl px-4 py-3.5 text-base text-[#2D3436]"
              />
              {nik.length > 0 && (
                <Text className="text-xs text-[#B2BEC3] mt-1 text-right">
                  {nik.length}/16
                </Text>
              )}
            </View>

            <View className="bg-[#E8F6F3] rounded-xl p-4 mb-6">
              <View className="flex-row items-start gap-3">
                <Ionicons name="information-circle-outline" size={18} color="#5DB9AA" />
                <Text className="text-xs text-[#636E72] flex-1 leading-5">
                  Setelah aktivasi, sistem akan membuat <Text className="font-bold text-[#2D3436]">ID Anggota</Text> unik untuk login. Simpan ID tersebut dengan baik.
                </Text>
              </View>
            </View>
          </View>

          {/* Tombol di bawah — mudah dijangkau */}
          <View className="px-6 pb-8 gap-3">
            <TouchableOpacity
              onPress={handleAktivasi}
              disabled={loading || nik.length !== 16}
              className="bg-[#7ECDC0] rounded-xl py-4 items-center"
              style={{ opacity: loading || nik.length !== 16 ? 0.6 : 1 }}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white font-bold text-base">Verifikasi NIK</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push('/(auth)/login')}
              className="items-center py-3"
            >
              <Text className="text-[#7ECDC0] text-sm">
                Sudah punya ID? <Text className="font-bold">Login</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
