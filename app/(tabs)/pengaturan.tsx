import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
  TextInput,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '@/stores/authStore';

const NOTIF_KEY = 'pkk_notif_enabled';

export default function PengaturanScreen() {
  const router = useRouter();
  const { user, logout, updatePassword } = useAuthStore();

  const [notifEnabled, setNotifEnabled] = useState(true);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  // Load notif preference
  useEffect(() => {
    AsyncStorage.getItem(NOTIF_KEY).then((val) => {
      if (val !== null) setNotifEnabled(val === 'true');
    });
  }, []);

  const handleToggleNotif = async (value: boolean) => {
    setNotifEnabled(value);
    await AsyncStorage.setItem(NOTIF_KEY, value ? 'true' : 'false');
  };

  const handleChangePassword = async () => {
    if (!currentPassword.trim()) {
      Alert.alert('Validasi', 'Masukkan password saat ini');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      Alert.alert('Validasi', 'Password baru minimal 6 karakter');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      Alert.alert('Validasi', 'Konfirmasi password tidak cocok');
      return;
    }

    setSavingPassword(true);
    try {
      // Verifikasi password lama dulu
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user?.id)
        .eq('password_hash', currentPassword)
        .maybeSingle();

      if (!profile) {
        Alert.alert('Gagal', 'Password saat ini salah');
        return;
      }

      const result = await updatePassword(newPassword);
      if (result.success) {
        Alert.alert('Sukses', 'Password berhasil diubah');
        closePasswordModal();
      } else {
        Alert.alert('Gagal', result.error || 'Tidak dapat mengubah password');
      }
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setSavingPassword(false);
    }
  };

  const closePasswordModal = () => {
    setShowPasswordModal(false);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmNewPassword('');
    setShowCurrent(false);
    setShowNew(false);
  };

  const handleLogout = () => {
    Alert.alert(
      'Keluar Sesi',
      'Anda yakin ingin keluar dari PKK Digital?',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Keluar',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/(auth)/login');
          },
        },
      ]
    );
  };

  const getInitials = (name: string) =>
    name.split(' ').slice(0, 2).map((w) => w[0]?.toUpperCase()).join('');

  return (
    <SafeAreaView className="flex-1 bg-[#F8FBFB]">
      {/* Header */}
      <View className="px-5 pt-4 pb-3">
        <Text className="text-xl font-bold text-[#2D3436]">Pengaturan</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Profil */}
        <View className="mx-4 mb-4 bg-white rounded-2xl p-4 border border-[#E8F6F3] flex-row items-center gap-4">
          <View className="w-14 h-14 rounded-full bg-[#7ECDC0] items-center justify-center">
            <Text className="text-xl font-bold text-white">
              {getInitials(user?.nama ?? '?')}
            </Text>
          </View>
          <View className="flex-1">
            <Text className="text-base font-bold text-[#2D3436]">{user?.nama}</Text>
            <Text className="text-sm text-[#636E72]">{user?.jabatan}</Text>
            <View className="mt-1 flex-row items-center gap-1">
              <Text className="text-xs text-[#B2BEC3]">ID: </Text>
              <Text className="text-xs font-bold text-[#7ECDC0]">{user?.login_id ?? '—'}</Text>
            </View>
          </View>
        </View>

        {/* Keamanan */}
        <View className="mx-4 mb-3">
          <Text className="text-xs font-semibold text-[#B2BEC3] uppercase tracking-widest mb-2 px-1">
            Keamanan
          </Text>
          <View className="bg-white rounded-2xl border border-[#E8F6F3] overflow-hidden">
            <TouchableOpacity
              onPress={() => setShowPasswordModal(true)}
              className="flex-row items-center px-4 py-4"
              activeOpacity={0.7}
            >
              <View className="w-9 h-9 rounded-xl bg-[#E8F6F3] items-center justify-center mr-3">
                <Ionicons name="lock-closed-outline" size={18} color="#5DB9AA" />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-semibold text-[#2D3436]">Ganti Password</Text>
                <Text className="text-xs text-[#B2BEC3] mt-0.5">Ubah password login Anda</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#B2BEC3" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Notifikasi */}
        <View className="mx-4 mb-3">
          <Text className="text-xs font-semibold text-[#B2BEC3] uppercase tracking-widest mb-2 px-1">
            Notifikasi
          </Text>
          <View className="bg-white rounded-2xl border border-[#E8F6F3] overflow-hidden">
            <View className="flex-row items-center px-4 py-4">
              <View className="w-9 h-9 rounded-xl bg-[#E8F6F3] items-center justify-center mr-3">
                <Ionicons name="notifications-outline" size={18} color="#5DB9AA" />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-semibold text-[#2D3436]">Push Notifikasi</Text>
                <Text className="text-xs text-[#B2BEC3] mt-0.5">
                  {notifEnabled ? 'Aktif' : 'Nonaktif'}
                </Text>
              </View>
              <Switch
                value={notifEnabled}
                onValueChange={handleToggleNotif}
                trackColor={{ false: '#E5E7EB', true: '#A8E6DF' }}
                thumbColor={notifEnabled ? '#2E9F95' : '#9CA3AF'}
              />
            </View>
          </View>
        </View>

        {/* Tentang */}
        <View className="mx-4 mb-3">
          <Text className="text-xs font-semibold text-[#B2BEC3] uppercase tracking-widest mb-2 px-1">
            Tentang
          </Text>
          <View className="bg-white rounded-2xl border border-[#E8F6F3] overflow-hidden">
            <View className="flex-row items-center px-4 py-4 border-b border-[#F0F9F8]">
              <View className="w-9 h-9 rounded-xl bg-[#E8F6F3] items-center justify-center mr-3">
                <Ionicons name="phone-portrait-outline" size={18} color="#5DB9AA" />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-semibold text-[#2D3436]">Versi Aplikasi</Text>
              </View>
              <Text className="text-sm text-[#B2BEC3]">1.0.0</Text>
            </View>
            <View className="flex-row items-center px-4 py-4">
              <View className="w-9 h-9 rounded-xl bg-[#E8F6F3] items-center justify-center mr-3">
                <Ionicons name="people-outline" size={18} color="#5DB9AA" />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-semibold text-[#2D3436]">PKK Digital</Text>
                <Text className="text-xs text-[#B2BEC3]">Kelurahan Warakas · DV-G</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Logout */}
        <View className="mx-4 mb-4">
          <TouchableOpacity
            onPress={handleLogout}
            className="bg-white rounded-2xl border border-[#FFE0E0] flex-row items-center px-4 py-4"
            activeOpacity={0.8}
          >
            <View className="w-9 h-9 rounded-xl bg-[#FFF0F0] items-center justify-center mr-3">
              <Ionicons name="log-out-outline" size={18} color="#FF6B6B" />
            </View>
            <Text className="text-sm font-semibold text-[#FF6B6B]">Keluar Sesi</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Modal Ganti Password */}
      <Modal visible={showPasswordModal} transparent animationType="slide" onRequestClose={closePasswordModal}>
        <TouchableOpacity
          className="flex-1 bg-black/40"
          activeOpacity={1}
          onPress={closePasswordModal}
        />
        <View className="bg-white rounded-t-3xl px-6 pt-6 pb-10">
          <View className="flex-row items-center justify-between mb-5">
            <Text className="text-lg font-bold text-[#2D3436]">Ganti Password</Text>
            <TouchableOpacity onPress={closePasswordModal}>
              <Ionicons name="close" size={22} color="#636E72" />
            </TouchableOpacity>
          </View>

          {/* Password Saat Ini */}
          <Text className="text-sm font-semibold text-[#636E72] mb-2">Password Saat Ini</Text>
          <View className="bg-[#F8FAFA] rounded-xl flex-row items-center px-4 mb-4">
            <TextInput
              secureTextEntry={!showCurrent}
              value={currentPassword}
              onChangeText={setCurrentPassword}
              placeholder="Password saat ini"
              placeholderTextColor="#B2BEC3"
              className="flex-1 py-3.5 text-base text-[#2D3436]"
            />
            <TouchableOpacity onPress={() => setShowCurrent(!showCurrent)}>
              <Ionicons name={showCurrent ? 'eye-off' : 'eye'} size={20} color="#636E72" />
            </TouchableOpacity>
          </View>

          {/* Password Baru */}
          <Text className="text-sm font-semibold text-[#636E72] mb-2">Password Baru</Text>
          <View className="bg-[#F8FAFA] rounded-xl flex-row items-center px-4 mb-4">
            <TextInput
              secureTextEntry={!showNew}
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="Minimal 6 karakter"
              placeholderTextColor="#B2BEC3"
              className="flex-1 py-3.5 text-base text-[#2D3436]"
            />
            <TouchableOpacity onPress={() => setShowNew(!showNew)}>
              <Ionicons name={showNew ? 'eye-off' : 'eye'} size={20} color="#636E72" />
            </TouchableOpacity>
          </View>

          {/* Konfirmasi Password Baru */}
          <Text className="text-sm font-semibold text-[#636E72] mb-2">Konfirmasi Password Baru</Text>
          <TextInput
            secureTextEntry={!showNew}
            value={confirmNewPassword}
            onChangeText={setConfirmNewPassword}
            placeholder="Ulangi password baru"
            placeholderTextColor="#B2BEC3"
            className="bg-[#F8FAFA] rounded-xl px-4 py-3.5 text-base text-[#2D3436] mb-5"
          />

          <TouchableOpacity
            onPress={handleChangePassword}
            disabled={savingPassword}
            className="bg-[#7ECDC0] rounded-xl py-4 items-center"
            style={{ opacity: savingPassword ? 0.7 : 1 }}
          >
            {savingPassword ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-bold text-base">Simpan Password</Text>
            )}
          </TouchableOpacity>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
