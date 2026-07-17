import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

// ─── Warna ────────────────────────────────────────────────────────────────────

const C = {
  barBg:     '#DFF4F2',   // soft tosca background bar
  active:    '#1D8A82',   // teks & ikon aktif
  inactive:  '#7FBFBA',   // ikon nonaktif
  fabBg:     '#2E9F95',   // warna FAB
  shadow:    '#2E9F95',   // warna shadow bar
};

// ─── Konfigurasi tab ──────────────────────────────────────────────────────────

// Tab diurutkan: kiri dua, kanan dua — tengah untuk FAB
const LEFT_TABS  = [
  { name: 'beranda', label: 'Dashboard', iconActive: 'home',          iconInactive: 'home-outline'          },
  { name: 'laporan', label: 'Laporan',   iconActive: 'document-text', iconInactive: 'document-text-outline' },
] as const;

const RIGHT_TABS = [
  { name: 'chat',        label: 'Pesan',      iconActive: 'chatbubbles', iconInactive: 'chatbubbles-outline' },
  { name: 'pengaturan',  label: 'Pengaturan', iconActive: 'settings',    iconInactive: 'settings-outline'    },
] as const;

const ALL_TAB_NAMES = [...LEFT_TABS.map(t => t.name), ...RIGHT_TABS.map(t => t.name)];

// ─── Hook unread badge pesan ──────────────────────────────────────────────────

function useUnreadMessages() {
  const { user } = useAuthStore();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!user?.id) return;

    const fetchUnread = async () => {
      const { count } = await supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('receiver_id', user.id)
        .eq('is_read', false);
      setUnread(count ?? 0);
    };

    fetchUnread();

    const channel = supabase
      .channel('tab-bar-unread')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages', filter: `receiver_id=eq.${user.id}` }, fetchUnread)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);

  return unread;
}

// ─── Custom Tab Bar ───────────────────────────────────────────────────────────

function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets   = useSafeAreaInsets();
  const router   = useRouter();
  const unread   = useUnreadMessages();

  const paddingBottom = insets.bottom > 0 ? insets.bottom : 10;
  const barHeight     = 68 + paddingBottom;

  const makeHandler = (routeName: string, routeKey: string) => {
    const idx = state.routes.findIndex(r => r.key === routeKey);
    return () => {
      const event = navigation.emit({ type: 'tabPress', target: routeKey, canPreventDefault: true });
      if (state.index !== idx && !event.defaultPrevented) {
        navigation.navigate(routeName);
      }
    };
  };

  const renderTab = (config: typeof LEFT_TABS[number] | typeof RIGHT_TABS[number]) => {
    const routeIdx = state.routes.findIndex(r => r.name === config.name);
    const route    = state.routes[routeIdx];
    if (!route) return null;
    const isFocused = state.index === routeIdx;
    const isChat    = config.name === 'chat';

    return (
      <TouchableOpacity
        key={route.key}
        onPress={makeHandler(config.name, route.key)}
        onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
        accessibilityRole="button"
        accessibilityState={isFocused ? { selected: true } : {}}
        activeOpacity={0.7}
        style={styles.tabItem}
      >
        <View style={[styles.iconWrap, isFocused && styles.iconWrapActive]}>
          <Ionicons
            name={isFocused ? config.iconActive as any : config.iconInactive as any}
            size={22}
            color={isFocused ? C.active : C.inactive}
          />
          {/* Badge merah untuk tab Pesan */}
          {isChat && unread > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unread > 99 ? '99+' : String(unread)}</Text>
            </View>
          )}
        </View>
        <Text style={[styles.label, { color: isFocused ? C.active : C.inactive }]}>
          {config.label}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.wrapper, { paddingBottom }]}>
      {/* FAB — tengah, sebagian timbul di atas bar */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/post/options' as any)}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={30} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Bar */}
      <View style={styles.bar}>
        {/* Kiri */}
        <View style={styles.side}>
          {LEFT_TABS.map(renderTab)}
        </View>

        {/* Ruang tengah untuk FAB */}
        <View style={styles.fabSpace} />

        {/* Kanan */}
        <View style={styles.side}>
          {RIGHT_TABS.map(renderTab)}
        </View>
      </View>
    </View>
  );
}

// ─── Layout ───────────────────────────────────────────────────────────────────

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="beranda"    />
      <Tabs.Screen name="laporan"    />
      <Tabs.Screen name="chat"       />
      <Tabs.Screen name="pengaturan" />
    </Tabs>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
    backgroundColor: 'transparent',
  },

  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.barBg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 10,
    paddingHorizontal: 8,
    // Efek timbul
    ...Platform.select({
      ios: {
        shadowColor: C.shadow,
        shadowOffset: { width: 0, height: -6 },
        shadowOpacity: 0.18,
        shadowRadius: 18,
      },
      android: {
        elevation: 20,
      },
    }),
  },

  side: {
    flex: 1,
    flexDirection: 'row',
  },

  // Ruang tengah agar FAB tidak tertimpa tab
  fabSpace: {
    width: 72,
  },

  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 2,
    paddingTop: 2,
  },

  iconWrap: {
    width: 40,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },

  iconWrapActive: {
    backgroundColor: 'rgba(30, 138, 130, 0.12)',
  },

  label: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.1,
  },

  // Badge merah pesan
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#FF3B30',
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
  },

  // FAB center
  fab: {
    position: 'absolute',
    top: -28,
    alignSelf: 'center',
    left: 0,
    right: 0,
    marginHorizontal: 'auto',
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: C.fabBg,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    alignSelf: 'center',
    ...Platform.select({
      ios: {
        shadowColor: C.fabBg,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.45,
        shadowRadius: 10,
      },
      android: {
        elevation: 12,
      },
    }),
  },
});
