import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useRouter, useRootNavigationState } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';

export default function IndexScreen() {
  const router = useRouter();
  const { user, isLoading } = useAuthStore();
  const navigationState = useRootNavigationState();
  const [mounted, setMounted] = useState(false);

  // Delay mount untuk memastikan root layout siap
  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 300);
    return () => clearTimeout(timer);
  }, []);

  // Navigasi hanya setelah semua siap
  useEffect(() => {
    // Cek: sudah mount, auth selesai load, navigation tree ready
    if (!mounted || isLoading) return;
    if (!navigationState?.key) return; // ← PENTING: cek navigator sudah initialize

    if (user) {
      router.replace('/(tabs)/beranda');
    } else {
      router.replace('/(auth)/login');
    }
  }, [mounted, user, isLoading, navigationState?.key]);

  return (
    <View className="flex-1 bg-[#7ECDC0] justify-center items-center">
      <ActivityIndicator size="large" color="#fff" />
    </View>
  );
}
