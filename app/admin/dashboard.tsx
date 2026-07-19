import { View, Text, TouchableOpacity, ScrollView, RefreshControl, Alert, Modal, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useState, useEffect, useCallback } from 'react';
import { Ionicons, MaterialIcons, FontAwesome5 } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { useAdminGateStore } from '@/stores/adminGateStore';

interface DashboardStats {
  totalUsers: number;
  totalLaporan: number;
  belumDibaca: number;
  bulanIni: number;
  totalPdfArsip: number;
  totalAgenda: number;
  totalArsip: number;
  upcomingAgenda: number;
}

interface RecentActivity {
  id: string;
  action: string;
  user_name: string;
  created_at: string;
}

export default function AdminDashboardScreen() {
  const router = useRouter();
  const lockAdminGate = useAdminGateStore((s) => s.lock);
  const changeAdminCode = useAdminGateStore((s) => s.changeCode);
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0, totalLaporan: 0, belumDibaca: 0, bulanIni: 0, totalPdfArsip: 0, totalAgenda: 0, totalArsip: 0, upcomingAgenda: 0,
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [codeModalVisible, setCodeModalVisible] = useState(false);
  const [currentCode, setCurrentCode] = useState('');
  const [newCode, setNewCode] = useState('');
  const [savingCode, setSavingCode] = useState(false);
  const [resetModalVisible, setResetModalVisible] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState('');

  const handleExitAdmin = () => {
    lockAdminGate();
    router.replace('/(auth)/login');
  };

  const handleSaveCode = async () => {
    setSavingCode(true);
    const result = await changeAdminCode(currentCode, newCode);
    setSavingCode(false);
    if (result.success) {
      Alert.alert('Sukses', 'Kode akses admin berhasil diubah');
      setCodeModalVisible(false);
      setCurrentCode('');
      setNewCode('');
    } else {
      Alert.alert('Gagal', result.error || 'Gagal mengubah kode akses');
    }
  };


  const handleResetData = async () => {
    if (resetConfirmText !== 'HAPUS') {
      Alert.alert('Konfirmasi Salah', 'Ketik HAPUS untuk melanjutkan.');
      return;
    }
    setResetting(true);
    try {
      // Hapus semua data testing — profiles/users tetap aman
      await Promise.all([
        supabase.from('messages').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
        supabase.from('notifications').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
        supabase.from('post_likes').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
        supabase.from('posts').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
        supabase.from('laporan').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
        supabase.from('aduan').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
        supabase.from('agenda').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
        supabase.from('arsip_dokumen').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
        supabase.from('user_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
      ]);
      setResetModalVisible(false);
      setResetConfirmText('');
      await fetchStats();
      Alert.alert('Berhasil', 'Semua data testing telah dihapus. Akun anggota tetap aman.');
    } catch (err: any) {
      Alert.alert('Gagal', err.message || 'Terjadi kesalahan saat menghapus data.');
    } finally {
      setResetting(false);
    }
  };

  const fetchStats = useCallback(async () => {
    try {
      const now = new Date();
      const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const [
        { count: usersCount },
        { count: laporanCount },
        { count: belumDibacaCount },
        { count: bulanIniCount },
        { count: pdfArsipCount },
        { count: agendaCount },
        { count: arsipCount },
        { count: upcomingCount },
      ] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('laporan').select('*', { count: 'exact', head: true }),
        supabase.from('laporan').select('*', { count: 'exact', head: true }).eq('status_admin', 'baru'),
        supabase.from('laporan').select('*', { count: 'exact', head: true }).gte('created_at', firstOfMonth),
        supabase.from('laporan').select('*', { count: 'exact', head: true }).not('pdf_url', 'is', null),
        supabase.from('agenda').select('*', { count: 'exact', head: true }),
        supabase.from('arsip_dokumen').select('*', { count: 'exact', head: true }),
        supabase.from('agenda').select('*', { count: 'exact', head: true }).eq('status', 'upcoming'),
      ]);

      setStats({
        totalUsers: usersCount || 0,
        totalLaporan: laporanCount || 0,
        belumDibaca: belumDibacaCount || 0,
        bulanIni: bulanIniCount || 0,
        totalPdfArsip: pdfArsipCount || 0,
        totalAgenda: agendaCount || 0,
        totalArsip: arsipCount || 0,
        upcomingAgenda: upcomingCount || 0,
      });

      // Fetch recent activity from user_logs
      const { data: logs } = await supabase
        .from('user_logs')
        .select('id, action, user_name, created_at')
        .order('created_at', { ascending: false })
        .limit(10);

      setRecentActivity(logs || []);
    } catch (err) {
      console.error('Error fetching admin stats:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const statCards = [
    { label: 'Total Laporan', value: stats.totalLaporan, icon: 'document-text', color: '#FDCB6E', bg: '#FFF9E6', route: '/admin/laporan', badge: stats.belumDibaca },
    { label: 'Belum Dibaca', value: stats.belumDibaca, icon: 'mail-unread', color: '#FF6B6B', bg: '#FFF0F0', route: '/admin/laporan' },
    { label: 'Bulan Ini', value: stats.bulanIni, icon: 'calendar', color: '#00B894', bg: '#E8F8F5', route: '/admin/laporan' },
    { label: 'Arsip PDF', value: stats.totalPdfArsip, icon: 'document-attach', color: '#7ECDC0', bg: '#E8F6F3', route: '/admin/laporan' },
  ];

  const quickActions = [
    { label: 'Laporan Masuk', icon: 'document-text-outline', route: '/admin/laporan', color: '#FDCB6E' },
    { label: 'Kelola Anggota', icon: 'people-outline', route: '/admin/users', color: '#7ECDC0' },
    { label: 'Aduan Masuk', icon: 'chatbubble-ellipses-outline', route: '/admin/aduan', color: '#00B894' },
    { label: 'Data Log', icon: 'time-outline', route: '/admin/logs', color: '#636E72' },
    { label: 'Broadcast', icon: 'megaphone-outline', route: '/admin/broadcast', color: '#FF6B6B' },
    { label: 'Template PDF', icon: 'document-lock-outline', route: '/admin/pdf-templates', color: '#5DB9AA' },
  ];

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F8FAFA]" edges={['top']}>
      {/* Header */}
      <View className="bg-white px-4 pt-4 pb-3 border-b border-[#E8F6F3] flex-row items-center justify-between">
        <View>
          <Text className="text-2xl font-bold text-[#2D3436]">Admin Dashboard</Text>
          <Text className="text-sm text-[#636E72] mt-0.5">Panel Pengelolaan PKK</Text>
        </View>
        <View className="flex-row items-center">
          <TouchableOpacity
            onPress={() => setCodeModalVisible(true)}
            className="w-10 h-10 rounded-xl bg-[#F8FAFA] items-center justify-center mr-2"
          >
            <Ionicons name="key-outline" size={20} color="#636E72" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleExitAdmin}
            className="w-10 h-10 rounded-xl bg-[#F8FAFA] items-center justify-center"
          >
            <Ionicons name="exit-outline" size={20} color="#FF6B6B" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Change access code modal */}
      <Modal visible={codeModalVisible} transparent animationType="fade" onRequestClose={() => setCodeModalVisible(false)}>
        <View className="flex-1 bg-black/40 items-center justify-center px-6">
          <View className="w-full bg-white rounded-2xl p-5">
            <Text className="text-lg font-bold text-[#2D3436] mb-1">Ubah Kode Akses Admin</Text>
            <Text className="text-xs text-[#636E72] mb-4">Kode ini dipakai untuk masuk ke Panel Admin dari halaman Profil.</Text>

            <Text className="text-xs text-[#636E72] mb-1">Kode Akses Saat Ini</Text>
            <TextInput
              className="bg-[#F8FAFA] rounded-xl px-4 py-3 mb-3 text-sm text-[#2D3436] border border-[#E8F6F3]"
              value={currentCode}
              onChangeText={setCurrentCode}
              secureTextEntry
              autoCapitalize="none"
              placeholder="Kode saat ini"
              placeholderTextColor="#B2BEC3"
            />

            <Text className="text-xs text-[#636E72] mb-1">Kode Akses Baru</Text>
            <TextInput
              className="bg-[#F8FAFA] rounded-xl px-4 py-3 mb-4 text-sm text-[#2D3436] border border-[#E8F6F3]"
              value={newCode}
              onChangeText={setNewCode}
              autoCapitalize="none"
              placeholder="Kode baru (min. 4 karakter)"
              placeholderTextColor="#B2BEC3"
            />

            <View className="flex-row">
              <TouchableOpacity
                onPress={() => { setCodeModalVisible(false); setCurrentCode(''); setNewCode(''); }}
                className="flex-1 py-3 items-center rounded-xl bg-[#F8FAFA] mr-2"
              >
                <Text className="text-[#636E72] font-medium">Batal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSaveCode}
                disabled={savingCode}
                className="flex-1 py-3 items-center rounded-xl bg-[#7ECDC0] ml-2"
                style={{ opacity: savingCode ? 0.6 : 1 }}
              >
                <Text className="text-white font-bold">{savingCode ? 'Menyimpan...' : 'Simpan'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchStats(); }} />
        }
      >
        {/* Stat Cards */}
        <View className="px-4 py-4">
          <View className="flex-row flex-wrap justify-between">
            {statCards.map((card) => (
              <TouchableOpacity
                key={card.label}
                onPress={() => router.push(card.route)}
                className="bg-white rounded-2xl p-4 mb-3 shadow-sm border border-[#E8F6F3]"
                style={{ width: '48%' }}
              >
                <View className="flex-row items-center justify-between mb-2">
                  <View 
                    className="w-10 h-10 rounded-xl items-center justify-center"
                    style={{ backgroundColor: card.bg || '#F8FAFA' }}
                  >
                    <Ionicons name={card.icon as any} size={20} color={card.color} />
                  </View>
                  {(card.badge ?? 0) > 0 && (
                    <View className="bg-[#FF6B6B] rounded-full px-2 py-0.5">
                      <Text className="text-white text-xs font-bold">{card.badge}</Text>
                    </View>
                  )}
                </View>
                <Text className="text-2xl font-bold text-[#2D3436]">{card.value}</Text>
                <Text className="text-xs text-[#636E72] mt-0.5">{card.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Quick Actions */}
        <View className="px-4 pb-4">
          <Text className="text-sm font-semibold text-[#636E72] mb-3">Aksi Cepat</Text>
          <View className="bg-white rounded-2xl p-4 shadow-sm border border-[#E8F6F3]">
            <View className="flex-row flex-wrap justify-between">
              {quickActions.map((action) => (
                <TouchableOpacity
                  key={action.label}
                  onPress={() => router.push(action.route)}
                  className="items-center mb-3"
                  style={{ width: '25%' }}
                >
                  <View 
                    className="w-12 h-12 rounded-xl items-center justify-center mb-2"
                    style={{ backgroundColor: action.color + '15' }}
                  >
                    <Ionicons name={action.icon as any} size={22} color={action.color} />
                  </View>
                  <Text className="text-xs text-[#636E72] text-center">{action.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Reset Data Testing */}
        <View className="px-4 pb-4">
          <TouchableOpacity
            onPress={() => { setResetConfirmText(''); setResetModalVisible(true); }}
            className="flex-row items-center justify-center bg-[#FEF2F2] border border-[#FECACA] rounded-2xl py-3.5 px-4"
          >
            <Ionicons name="trash-bin" size={18} color="#EF4444" />
            <Text className="text-[#EF4444] font-semibold ml-2">Reset Data Testing</Text>
          </TouchableOpacity>
        </View>

        {/* Reset Modal */}
        <Modal visible={resetModalVisible} transparent animationType="fade" onRequestClose={() => setResetModalVisible(false)}>
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 }}>
            <View className="bg-white rounded-3xl p-6 w-full">
              <View className="w-14 h-14 rounded-full bg-[#FEF2F2] items-center justify-center mb-4 self-center">
                <Ionicons name="warning" size={28} color="#EF4444" />
              </View>
              <Text className="text-xl font-bold text-[#2D3436] text-center mb-2">Reset Data Testing</Text>
              <Text className="text-sm text-[#636E72] text-center mb-5 leading-5">
                  Tindakan ini akan menghapus permanen:{' '}
                  Pesan chat, Notifikasi, Postingan, Laporan, Aduan, Agenda, Arsip, dan Log aktivitas.{' '}
                  <Text className="font-semibold text-[#2D3436]">Data akun anggota tidak akan terpengaruh.</Text>
              </Text>
              <Text className="text-sm font-semibold text-[#2D3436] mb-2">Ketik <Text className="text-[#EF4444]">HAPUS</Text> untuk konfirmasi:</Text>
              <TextInput
                value={resetConfirmText}
                onChangeText={setResetConfirmText}
                placeholder="HAPUS"
                placeholderTextColor="#D1D5DB"
                autoCapitalize="characters"
                className="border border-[#E5E7EB] rounded-xl px-4 py-3 text-base text-[#2D3436] mb-4"
              />
              <View className="flex-row gap-3">
                <TouchableOpacity
                  onPress={() => { setResetModalVisible(false); setResetConfirmText(''); }}
                  className="flex-1 py-3 rounded-xl border border-[#E5E7EB] items-center"
                >
                  <Text className="font-semibold text-[#636E72]">Batal</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleResetData}
                  disabled={resetting || resetConfirmText !== 'HAPUS'}
                  className="flex-1 py-3 rounded-xl items-center"
                  style={{ backgroundColor: resetConfirmText === 'HAPUS' ? '#EF4444' : '#FCA5A5' }}
                >
                  {resetting ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Text className="font-semibold text-white">Hapus Semua</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Recent Activity */}
        <View className="px-4 pb-6">
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-sm font-semibold text-[#636E72]">Aktivitas Terbaru</Text>
            <TouchableOpacity onPress={() => router.push('/admin/logs')}>
              <Text className="text-xs text-[#7ECDC0]">Lihat Semua</Text>
            </TouchableOpacity>
          </View>

          <View className="bg-white rounded-2xl shadow-sm border border-[#E8F6F3]">
            {recentActivity.length === 0 ? (
              <View className="py-8 items-center">
                <MaterialIcons name="history" size={40} color="#E8F6F3" />
                <Text className="text-[#636E72] mt-2">Belum ada aktivitas</Text>
              </View>
            ) : (
              recentActivity.map((activity, index) => (
                <View 
                  key={activity.id} 
                  className={`flex-row items-center px-4 py-3 ${index !== recentActivity.length - 1 ? 'border-b border-[#E8F6F3]' : ''}`}
                >
                  <View className="w-8 h-8 rounded-full bg-[#E8F6F3] items-center justify-center mr-3">
                    <Ionicons name="time-outline" size={14} color="#7ECDC0" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm text-[#2D3436]">
                      <Text className="font-semibold">{activity.user_name}</Text> {activity.action}
                    </Text>
                    <Text className="text-xs text-[#B2BEC3] mt-0.5">{formatTime(activity.created_at)}</Text>
                  </View>
                </View>
              ))
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
