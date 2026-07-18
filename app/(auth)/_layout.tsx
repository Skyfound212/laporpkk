import { Stack } from 'expo-router';

/**
 * Layout untuk semua screen auth: login, aktivasi, setup.
 * File ini WAJIB ada — tanpa layout ini, navigasi antar screen
 * dalam group (auth) tidak punya Stack internal dan menyebabkan
 * layar putih kosong saat berpindah antar halaman auth.
 */
export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }} />
  );
}
