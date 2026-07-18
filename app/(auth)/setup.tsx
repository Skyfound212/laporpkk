import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';

// ── Generator ID unik ─────────────────────────────────────────────────────────
const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // tanpa 0,O,I,1 agar tidak membingungkan

function generateLoginId(): string {
  let id = 'PKK';
  for (let i = 0; i < 5; i++) {
    id += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return id;
}

async function generateUniqueLoginId(): Promise<string> {
  let attempts = 0;
  while (attempts < 10) {
    const id = generateLoginId();
    const { data } = await supabase
      .from('profiles')
      .select('id')
      .eq('login_id', id)
      .maybeSingle();
    if (!data) return id; // tidak ada duplikat
    attempts++;
  }
  // fallback: tambah timestamp
  return 'PKK' + Date.now().toString(36).toUpperCase().slice(-5);
}

// ─────────────────────────────────────────────────────────────────────────────

export default function SetupScreen() {
  const router = useRouter();
  const { nik, userId } = useLocalSearchParams<{ nik: string; userId: string }>();

  const [nama, setNama] = useState('');
  const [jabatan, setJabatan] = useState('');
  const [noHp, setNoHp] = useState('');
  const [email, setEmail] = useState('');
  const [alamat, setAlamat] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // State untuk menampilkan ID yang dihasilkan
  const [generatedId, setGeneratedId] = useState('');
  const [showIdModal, setShowIdModal] = useState(false);

  const jabatanOptions = [
    'Ketua', 'Wakil Ketua', 'Sekretaris', 'Bendahara',
    'Pokja 1', 'Pokja 2', 'Pokja 3', 'Pokja 4', 'Anggota',
  ];

  const validate = () => {
    if (!nama.trim()) return 'Nama wajib diisi';
    if (!jabatan) return 'Jabatan wajib dipilih';
    if (!noHp.trim()) return 'No. HP wajib diisi';
    if (!password || password.length < 6) return 'Password minimal 6 karakter';
    if (password !== confirmPassword) return 'Password tidak cocok';
    return null;
  };

  const handleSetup = async () => {
    const validationError = validate();
    if (validationError) {
      Alert.alert('Validasi', validationError);
      return;
    }

    setLoading(true);
    try {
      // Generate ID unik
      const loginId = await generateUniqueLoginId();

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          nama: nama.trim(),
          jabatan,
          no_hp: noHp.trim(),
          email: email.trim() || null,
          alamat: alamat.trim() || null,
          password_hash: password,
          login_id: loginId,
          status: 'active',
        })
        .eq('id', userId);

      if (updateError) throw updateError;

      // Tampilkan modal dengan ID yang dihasilkan
      setGeneratedId(loginId);
      setShowIdModal(true);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Gagal mengaktivasi akun');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyId = async () => {
    await Clipboard.setStringAsync(generatedId);
    Alert.alert('Disalin', 'ID Anggota berhasil disalin ke clipboard');
  };

  const handleFinish = () => {
    setShowIdModal(false);
    router.replace('/(auth)/login');
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: '#ffffff' }}
    >
      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View className="px-6 pt-12 pb-4">
          <Text className="text-2xl font-bold text-[#2D3436]">Setup Akun</Text>
          <Text className="text-sm text-[#636E72] mt-1">NIK: {nik}</Text>
        </View>

        <View className="px-6 gap-4">
          {/* Nama */}
          <View>
            <Text className="text-sm font-semibold text-[#636E72] mb-2">Nama Lengkap</Text>
            <TextInput
              value={nama}
              onChangeText={setNama}
              placeholder="Nama sesuai KTP"
              placeholderTextColor="#B2BEC3"
              className="bg-[#F8FAFA] rounded-xl px-4 py-3.5 text-base text-[#2D3436]"
            />
          </View>

          {/* Jabatan */}
          <View>
            <Text className="text-sm font-semibold text-[#636E72] mb-2">Jabatan</Text>
            <View className="flex-row flex-wrap gap-2">
              {jabatanOptions.map((j) => (
                <TouchableOpacity
                  key={j}
                  onPress={() => setJabatan(j)}
                  className={`px-4 py-2 rounded-full border ${
                    jabatan === j ? 'bg-[#7ECDC0] border-[#7ECDC0]' : 'bg-white border-[#E8F6F3]'
                  }`}
                >
                  <Text className={`text-sm ${jabatan === j ? 'text-white font-semibold' : 'text-[#636E72]'}`}>
                    {j}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* No. HP */}
          <View>
            <Text className="text-sm font-semibold text-[#636E72] mb-2">No. HP</Text>
            <TextInput
              keyboardType="phone-pad"
              value={noHp}
              onChangeText={setNoHp}
              placeholder="08xxxxxxxxxx"
              placeholderTextColor="#B2BEC3"
              className="bg-[#F8FAFA] rounded-xl px-4 py-3.5 text-base text-[#2D3436]"
            />
          </View>

          {/* Email */}
          <View>
            <Text className="text-sm font-semibold text-[#636E72] mb-2">Email (opsional)</Text>
            <TextInput
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
              placeholder="email@contoh.com"
              placeholderTextColor="#B2BEC3"
              className="bg-[#F8FAFA] rounded-xl px-4 py-3.5 text-base text-[#2D3436]"
            />
          </View>

          {/* Alamat */}
          <View>
            <Text className="text-sm font-semibold text-[#636E72] mb-2">Alamat (opsional)</Text>
            <TextInput
              multiline
              value={alamat}
              onChangeText={setAlamat}
              placeholder="Alamat lengkap"
              placeholderTextColor="#B2BEC3"
              className="bg-[#F8FAFA] rounded-xl px-4 py-3.5 text-base text-[#2D3436] min-h-[60]"
              textAlignVertical="top"
            />
          </View>

          {/* Password */}
          <View>
            <Text className="text-sm font-semibold text-[#636E72] mb-2">Password</Text>
            <View className="bg-[#F8FAFA] rounded-xl flex-row items-center px-4">
              <TextInput
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
                placeholder="Minimal 6 karakter"
                placeholderTextColor="#B2BEC3"
                className="flex-1 py-3.5 text-base text-[#2D3436]"
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={20} color="#636E72" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Konfirmasi Password */}
          <View>
            <Text className="text-sm font-semibold text-[#636E72] mb-2">Konfirmasi Password</Text>
            <TextInput
              secureTextEntry={!showPassword}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Ulangi password"
              placeholderTextColor="#B2BEC3"
              className="bg-[#F8FAFA] rounded-xl px-4 py-3.5 text-base text-[#2D3436]"
            />
          </View>

          {/* Tombol Simpan */}
          <TouchableOpacity
            onPress={handleSetup}
            disabled={loading}
            className="bg-[#7ECDC0] rounded-xl py-4 items-center mt-2"
            style={{ opacity: loading ? 0.7 : 1 }}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-bold text-base">Simpan & Aktivasi</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Modal ID Anggota */}
      <Modal visible={showIdModal} transparent animationType="fade">
        <View className="flex-1 bg-black/50 justify-center items-center px-6">
          <View className="bg-white rounded-3xl p-6 w-full">
            {/* Icon sukses */}
            <View className="items-center mb-4">
              <View className="w-16 h-16 rounded-full bg-[#E8F6F3] items-center justify-center mb-3">
                <Ionicons name="checkmark-circle" size={40} color="#7ECDC0" />
              </View>
              <Text className="text-xl font-bold text-[#2D3436]">Akun Aktif!</Text>
              <Text className="text-sm text-[#636E72] mt-1 text-center">
                ID Anggota Anda telah dibuat. Simpan ID ini untuk login.
              </Text>
            </View>

            {/* ID card */}
            <View className="bg-[#F8FAFA] border border-[#E8F6F3] rounded-2xl p-4 mb-4 items-center">
              <Text className="text-xs text-[#636E72] mb-1">ID Anggota Anda</Text>
              <Text className="text-3xl font-bold text-[#2E9F95] tracking-widest mb-3">
                {generatedId}
              </Text>
              <TouchableOpacity
                onPress={handleCopyId}
                className="flex-row items-center gap-2 bg-[#E8F6F3] px-4 py-2 rounded-full"
              >
                <Ionicons name="copy-outline" size={16} color="#5DB9AA" />
                <Text className="text-sm font-semibold text-[#5DB9AA]">Salin ID</Text>
              </TouchableOpacity>
            </View>

            <View className="bg-[#FFF9E6] rounded-xl p-3 mb-5 flex-row gap-2">
              <Ionicons name="warning-outline" size={16} color="#FDCB6E" />
              <Text className="text-xs text-[#636E72] flex-1 leading-5">
                Catat ID ini! ID tidak bisa dilihat lagi setelah halaman ini ditutup. Gunakan ID ini bersama password untuk login.
              </Text>
            </View>

            <TouchableOpacity
              onPress={handleFinish}
              className="bg-[#7ECDC0] rounded-xl py-4 items-center"
            >
              <Text className="text-white font-bold text-base">Mengerti, Lanjut Login</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}