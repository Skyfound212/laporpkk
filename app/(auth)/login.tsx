import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '@/stores/authStore';
import { useAdminGateStore } from '@/stores/adminGateStore';

const REMEMBER_KEY = 'pkk_remember_login_id';

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuthStore();
  const { unlock: unlockAdminGate, checking: checkingCode } = useAdminGateStore();

  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);

  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminCode, setAdminCode] = useState('');
  const [showAdminCode, setShowAdminCode] = useState(false);
  const [adminCodeError, setAdminCodeError] = useState('');

  // Load saved login ID jika "Ingat Saya" pernah diaktifkan
  useEffect(() => {
    AsyncStorage.getItem(REMEMBER_KEY).then((saved) => {
      if (saved) {
        setLoginId(saved);
        setRememberMe(true);
      }
    });
  }, []);

  const handleLogin = async () => {
    if (!loginId.trim() || !password.trim()) {
      Alert.alert('Error', 'ID Anggota dan Password wajib diisi');
      return;
    }

    setLoading(true);
    try {
      const result = await login(loginId.trim().toUpperCase(), password.trim());
      if (result.success) {
        if (rememberMe) {
          await AsyncStorage.setItem(REMEMBER_KEY, loginId.trim().toUpperCase());
        } else {
          await AsyncStorage.removeItem(REMEMBER_KEY);
        }
        router.replace('/(tabs)/beranda');
      } else {
        Alert.alert('Login Gagal', result.error || 'ID Anggota atau Password salah');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  };

  const handleAdminUnlock = async () => {
    if (!adminCode.trim()) {
      setAdminCodeError('Kode akses wajib diisi');
      return;
    }
    const result = await unlockAdminGate(adminCode);
    if (result.success) {
      closeAdminModal();
      router.replace('/admin/dashboard');
    } else {
      setAdminCodeError(result.error || 'Kode akses salah');
    }
  };

  const closeAdminModal = () => {
    setShowAdminModal(false);
    setAdminCode('');
    setAdminCodeError('');
    setShowAdminCode(false);
  };

  return (
    <View className="flex-1 bg-white">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <View className="flex-1 px-6 justify-center">
          {/* Logo */}
          <View className="items-center mb-10">
            <Image
              source={require('@/assets/images/logo-login.png')}
              className="w-40 h-40 mb-4"
              resizeMode="contain"
            />
            <Text className="text-2xl font-bold text-[#2D3436]">PKK Digital</Text>
            <Text className="text-sm text-[#636E72] mt-1">Kelurahan Warakas</Text>
          </View>

          {/* ID Anggota Input */}
          <View className="mb-4">
            <Text className="text-sm font-semibold text-[#636E72] mb-2">ID Anggota</Text>
            <TextInput
              autoCapitalize="characters"
              value={loginId}
              onChangeText={(v) => setLoginId(v.toUpperCase())}
              placeholder="Contoh: PKKA3F7K"
              placeholderTextColor="#B2BEC3"
              className="bg-[#F8FAFA] rounded-xl px-4 py-3.5 text-base text-[#2D3436]"
            />
          </View>

          {/* Password Input */}
          <View className="mb-4">
            <Text className="text-sm font-semibold text-[#636E72] mb-2">Password</Text>
            <View className="bg-[#F8FAFA] rounded-xl flex-row items-center px-4">
              <TextInput
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
                placeholder="Masukkan password"
                placeholderTextColor="#B2BEC3"
                className="flex-1 py-3.5 text-base text-[#2D3436]"
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={20} color="#636E72" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Ingat Saya */}
          <TouchableOpacity
            onPress={() => setRememberMe(!rememberMe)}
            className="flex-row items-center mb-6 gap-2"
            activeOpacity={0.7}
          >
            <View
              className={`w-5 h-5 rounded border-2 items-center justify-center ${
                rememberMe ? 'bg-[#7ECDC0] border-[#7ECDC0]' : 'bg-white border-[#B2BEC3]'
              }`}
            >
              {rememberMe && (
                <Ionicons name="checkmark" size={13} color="white" />
              )}
            </View>
            <Text className="text-sm text-[#636E72]">Ingat Saya</Text>
          </TouchableOpacity>

          {/* Login Button */}
          <TouchableOpacity
            onPress={handleLogin}
            disabled={loading}
            className="bg-[#7ECDC0] rounded-xl py-4 items-center mb-4"
            style={{ opacity: loading ? 0.7 : 1 }}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-bold text-base">Masuk</Text>
            )}
          </TouchableOpacity>

          {/* Aktivasi */}
          <TouchableOpacity
            onPress={() => router.push('/(auth)/aktivasi')}
            className="items-center mb-2"
          >
            <Text className="text-[#7ECDC0] text-sm">
              Belum punya ID? <Text className="font-bold">Aktivasi Akun</Text>
            </Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View className="items-center pb-8">
          <Text className="text-xs text-[#B2BEC3]">all designed by</Text>
          <Text className="text-xs font-bold text-[#9CA3AF]">DV-G</Text>
          {/* Admin gate tersembunyi */}
          <TouchableOpacity
            onPress={() => setShowAdminModal(true)}
            className="mt-4 p-2"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="settings-outline" size={14} color="#E5E7EB" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Admin Modal */}
      <Modal visible={showAdminModal} transparent animationType="fade" onRequestClose={closeAdminModal}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="flex-1"
        >
          <TouchableOpacity
            className="flex-1 bg-black/40 justify-center items-center px-6"
            activeOpacity={1}
            onPress={closeAdminModal}
          >
            <TouchableOpacity
              activeOpacity={1}
              className="bg-white rounded-3xl p-6 w-full"
              onPress={() => {}}
            >
              <View className="items-center mb-5">
                <View className="w-12 h-12 rounded-2xl bg-[#E8F6F3] items-center justify-center mb-3">
                  <Ionicons name="shield-checkmark-outline" size={24} color="#7ECDC0" />
                </View>
                <Text className="text-lg font-bold text-[#2D3436]">Akses Admin</Text>
                <Text className="text-xs text-[#B2BEC3] mt-1">Masukkan kode akses admin</Text>
              </View>

              <View className="w-full flex-row items-center bg-[#F8FAFA] rounded-2xl px-4 mb-2 border border-[#E8F6F3]">
                <TextInput
                  className="flex-1 py-4 text-base text-[#2D3436]"
                  placeholder="Kode akses"
                  placeholderTextColor="#B2BEC3"
                  value={adminCode}
                  onChangeText={(v) => { setAdminCode(v); setAdminCodeError(''); }}
                  secureTextEntry={!showAdminCode}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoFocus
                  onSubmitEditing={handleAdminUnlock}
                />
                <TouchableOpacity onPress={() => setShowAdminCode(!showAdminCode)}>
                  <Ionicons name={showAdminCode ? 'eye-off-outline' : 'eye-outline'} size={20} color="#B2BEC3" />
                </TouchableOpacity>
              </View>

              {adminCodeError ? (
                <Text className="text-xs text-[#FF6B6B] mb-3">{adminCodeError}</Text>
              ) : (
                <View className="mb-3" />
              )}

              <View className="flex-row" style={{ gap: 12 }}>
                <TouchableOpacity
                  onPress={closeAdminModal}
                  className="flex-1 bg-[#F8FAFA] rounded-2xl py-4 items-center border border-[#E8F6F3]"
                >
                  <Text className="text-[#636E72] font-semibold text-base">Batal</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleAdminUnlock}
                  disabled={checkingCode}
                  className="flex-1 bg-[#7ECDC0] rounded-2xl py-4 items-center"
                  style={{ opacity: checkingCode ? 0.6 : 1 }}
                >
                  <Text className="text-white font-bold text-base">
                    {checkingCode ? 'Memeriksa...' : 'Masuk'}
                  </Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
