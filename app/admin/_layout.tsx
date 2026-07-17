import { useEffect } from 'react';
import { useRouter, Stack } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { useAdminGateStore } from '@/stores/adminGateStore';

/**
 * Guards every screen under app/admin/* behind the admin access code.
 *
 * There is exactly one way to unlock this gate: the "Masuk sebagai Admin"
 * icon on the login screen (app/(auth)/login.tsx), which pops up the access
 * code modal — admin is a party outside the member app, so it never goes
 * through NIK activation or the member dashboard first. Deep-linking
 * straight to e.g. /admin/users without unlocking bounces back to the
 * login screen, never to /profile or the member tabs.
 */
export default function AdminLayout() {
  const router = useRouter();
  const isUnlocked = useAdminGateStore((s) => s.isUnlocked);

  useEffect(() => {
    if (!isUnlocked) {
      router.replace('/(auth)/login');
    }
  }, [isUnlocked, router]);

  if (!isUnlocked) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <ActivityIndicator color="#7ECDC0" />
      </View>
    );
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
