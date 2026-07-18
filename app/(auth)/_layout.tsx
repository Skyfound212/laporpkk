import { Stack } from 'expo-router';

/**
 * Layout untuk semua screen auth: login, aktivasi, setup.
 * File ini WAJIB ada — tanpa layout ini, navigasi antar screen
 * dalam group (auth) tidak punya Stack internal dan menyebabkan
 * layar putih kosong saat berpindah antar halaman auth.
 */
export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        // Pastikan background selalu putih — tanpa ini background
        // jadi abu-abu sistem Android saat layar tidak punya background sendiri
        contentStyle: { backgroundColor: '#ffffff' },
      }}
    />
  );
}
