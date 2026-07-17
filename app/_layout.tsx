import '../global.css';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  View, Text, TouchableOpacity, StyleSheet, Animated,
} from 'react-native';
import React, { Component, ReactNode, useEffect, useRef, useState } from 'react';
import * as Updates from 'expo-updates';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { ToastContainer } from '@/components/ui/Toast';
import { useChatRealtime } from '@/hooks/useChatRealtime';
import { useNotifications } from '@/hooks/useNotifications';
import { Ionicons } from '@expo/vector-icons';

// ─── Error Boundary ───────────────────────────────────────────────────────────

class ErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, info: any) {
    console.error('[ErrorBoundary]', error, info);
  }
  handleReset = () => this.setState({ hasError: false, error: null });

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.errContainer}>
          <Ionicons name="alert-circle" size={64} color="#FF6B6B" />
          <Text style={styles.errTitle}>Terjadi Kesalahan</Text>
          <Text style={styles.errMsg}>
            {this.state.error?.message || 'Aplikasi mengalami masalah. Silakan coba lagi.'}
          </Text>
          <TouchableOpacity style={styles.errBtn} onPress={this.handleReset}>
            <Text style={styles.errBtnText}>Coba Lagi</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

// ─── Network Banner ───────────────────────────────────────────────────────────

function NetworkBanner() {
  const isOnline = useNetworkStatus();
  if (isOnline) return null;
  return (
    <View style={styles.offlineBanner}>
      <Ionicons name="cloud-offline-outline" size={14} color="#fff" />
      <Text style={styles.offlineText}>Tidak ada koneksi internet</Text>
    </View>
  );
}

// ─── OTA Update Banner ────────────────────────────────────────────────────────
//
// Flow yang benar:
//   1. Cek update di background (tidak blokir launch)
//   2. Kalau ada → download diam-diam
//   3. Tampilkan banner "Update siap" — user yang memilih kapan restart
//   4. Tap banner → reloadAsync()
//
// Kenapa TIDAK pakai checkAutomatically:"ON_LOAD" sekaligus kode ini?
// → Akan ada dua pemanggi reloadAsync() secara bersamaan → crash / reload loop.
// → app.json sudah di-set checkAutomatically:"ERROR_RECOVERY_ONLY" supaya
//   hanya kode ini yang mengontrol siklus update.

type UpdateState = 'idle' | 'downloading' | 'ready' | 'error';

function useOTAUpdate() {
  const [state, setState] = useState<UpdateState>('idle');

  useEffect(() => {
    // Tidak cek di mode dev — expo-updates tidak aktif di sana
    if (__DEV__) return;

    let cancelled = false;

    (async () => {
      try {
        const check = await Updates.checkForUpdateAsync();
        if (!check.isAvailable || cancelled) return;

        setState('downloading');
        await Updates.fetchUpdateAsync();

        if (!cancelled) setState('ready');
      } catch {
        // Offline / server error → abaikan dengan diam
        if (!cancelled) setState('idle');
      }
    })();

    return () => { cancelled = true; };
  }, []);

  const applyUpdate = async () => {
    try {
      await Updates.reloadAsync();
    } catch {
      setState('error');
    }
  };

  return { state, applyUpdate };
}

function UpdateBanner() {
  const { state, applyUpdate } = useOTAUpdate();
  const slideAnim = useRef(new Animated.Value(-60)).current;

  useEffect(() => {
    if (state === 'ready') {
      Animated.spring(slideAnim, {
        toValue: 0, useNativeDriver: true,
        tension: 60, friction: 10,
      }).start();
    }
  }, [state]);

  if (state !== 'ready') return null;

  return (
    <Animated.View style={[styles.updateBanner, { transform: [{ translateY: slideAnim }] }]}>
      <Ionicons name="arrow-down-circle-outline" size={18} color="#fff" />
      <Text style={styles.updateText}>Pembaruan tersedia</Text>
      <TouchableOpacity onPress={applyUpdate} style={styles.updateBtn} activeOpacity={0.8}>
        <Text style={styles.updateBtnText}>Restart</Text>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ─── Root Layout ──────────────────────────────────────────────────────────────

export default function RootLayout() {
  useChatRealtime();
  useNotifications();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ErrorBoundary>
          <StatusBar style="dark" backgroundColor="#7ECDC0" />
          <NetworkBanner />
          <UpdateBanner />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: '#fff' },
              animation: 'slide_from_right',
            }}
          >
            <Stack.Screen name="(auth)"     options={{ animation: 'fade' }} />
            <Stack.Screen name="(tabs)"     options={{ animation: 'fade' }} />
            <Stack.Screen name="post"       options={{ animation: 'slide_from_bottom' }} />
            <Stack.Screen name="laporan"    options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="agenda"     options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="chat"       options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="profile"    options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="arsip"      options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="admin"      options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="notifikasi" options={{ animation: 'slide_from_right' }} />
          </Stack>
          <ToastContainer />
        </ErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Error boundary
  errContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: '#fff' },
  errTitle:     { fontSize: 20, fontWeight: 'bold', color: '#2D3436', marginTop: 16 },
  errMsg:       { fontSize: 14, color: '#636E72', textAlign: 'center', marginTop: 8, marginBottom: 24, lineHeight: 20 },
  errBtn:       { backgroundColor: '#7ECDC0', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  errBtnText:   { color: '#fff', fontWeight: '600', fontSize: 16 },

  // Offline banner
  offlineBanner: {
    backgroundColor: '#FF6B6B',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 6, gap: 6,
  },
  offlineText: { color: '#fff', fontSize: 12, fontWeight: '600' },

  // Update banner — slide turun dari atas
  updateBanner: {
    backgroundColor: '#2E9F95',
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 10,
    gap: 8,
    zIndex: 999,
  },
  updateText: { flex: 1, color: '#fff', fontSize: 13, fontWeight: '600' },
  updateBtn:  { backgroundColor: 'rgba(255,255,255,0.25)', paddingHorizontal: 14, paddingVertical: 5, borderRadius: 20 },
  updateBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
});
