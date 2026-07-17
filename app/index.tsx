import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase';

export default function IndexScreen() {
  const router = useRouter();
  const { user, isLoading } = useAuthStore();

  useEffect(() => {
    if (isLoading) return;

    if (user) {
      router.replace('/(tabs)/beranda');
    } else {
      router.replace('/(auth)/login');
    }
  }, [user, isLoading, router]);

  return (
    <View className="flex-1 bg-[#7ECDC0] justify-center items-center">
      <ActivityIndicator size="large" color="#fff" />
    </View>
  );
}
