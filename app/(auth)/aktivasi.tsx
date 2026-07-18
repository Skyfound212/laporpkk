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
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';

export default function AktivasiScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
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
    // Gunakan View biasa + useSafeAreaInsets, bukan SafeAreaView third-party
    // yang tidak di-support className NativeWind v4 secara otomatis.
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Tombol kembali */}
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="arrow-back" size={24} color="#636E72" />
          </TouchableOpacity>

          {/* Konten tengah */}
          <View style={styles.content}>
            <View style={styles.headerSection}>
              <View style={styles.iconWrap}>
                <Ionicons name="key" size={40} color="white" />
              </View>
              <Text style={styles.title}>Aktivasi Akun</Text>
              <Text style={styles.subtitle}>
                Masukkan NIK Anda untuk mengaktifkan akun PKK Digital dan mendapatkan ID login
              </Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>NIK (16 digit)</Text>
              <TextInput
                keyboardType="number-pad"
                maxLength={16}
                value={nik}
                onChangeText={setNik}
                placeholder="Masukkan 16 digit NIK"
                placeholderTextColor="#B2BEC3"
                style={styles.input}
              />
              {nik.length > 0 && (
                <Text style={styles.counter}>{nik.length}/16</Text>
              )}
            </View>

            <View style={styles.infoBox}>
              <Ionicons name="information-circle-outline" size={18} color="#5DB9AA" />
              <Text style={styles.infoText}>
                Setelah aktivasi, sistem akan membuat{' '}
                <Text style={styles.infoBold}>ID Anggota</Text> unik untuk login. Simpan ID tersebut dengan baik.
              </Text>
            </View>
          </View>

          {/* Tombol di bawah */}
          <View style={styles.footer}>
            <TouchableOpacity
              onPress={handleAktivasi}
              disabled={loading || nik.length !== 16}
              style={[styles.btnPrimary, (loading || nik.length !== 16) && styles.btnDisabled]}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.btnPrimaryText}>Verifikasi NIK</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push('/(auth)/login')}
              style={styles.btnSecondary}
            >
              <Text style={styles.btnSecondaryText}>
                Sudah punya ID? <Text style={styles.btnSecondaryBold}>Login</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  backBtn: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
    alignSelf: 'flex-start',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
    paddingVertical: 32,
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 16,
    backgroundColor: '#7ECDC0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2D3436',
  },
  subtitle: {
    fontSize: 14,
    color: '#636E72',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#636E72',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F8FAFA',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#2D3436',
  },
  counter: {
    fontSize: 12,
    color: '#B2BEC3',
    marginTop: 4,
    textAlign: 'right',
  },
  infoBox: {
    backgroundColor: '#E8F6F3',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  infoText: {
    fontSize: 12,
    color: '#636E72',
    flex: 1,
    lineHeight: 20,
  },
  infoBold: {
    fontWeight: 'bold',
    color: '#2D3436',
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 32,
    gap: 12,
  },
  btnPrimary: {
    backgroundColor: '#7ECDC0',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  btnDisabled: {
    opacity: 0.6,
  },
  btnPrimaryText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  btnSecondary: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  btnSecondaryText: {
    color: '#7ECDC0',
    fontSize: 14,
  },
  btnSecondaryBold: {
    fontWeight: 'bold',
  },
});
