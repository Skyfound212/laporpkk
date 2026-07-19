import { View, Text, TouchableOpacity, FlatList, RefreshControl, Alert, Modal, TextInput, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useState, useEffect, useCallback } from 'react';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import * as Crypto from 'expo-crypto';
import { supabase } from '@/lib/supabase';

interface UserItem {
  id: string;
  nik: string;
  nama: string;
  jabatan: string;
  no_hp: string;
  email?: string;
  avatar_url?: string | null;
  status: string;
  created_at: string;
}

export default function AdminUsersScreen() {
  const router = useRouter();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);

  // Form state
  const [formNik, setFormNik] = useState('');
  const [formNama, setFormNama] = useState('');
  const [formJabatan, setFormJabatan] = useState('');
  const [formNoHp, setFormNoHp] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formStatus, setFormStatus] = useState('pending');
  const [saving, setSaving] = useState(false);

  const jabatanOptions = [
    'Ketua', 'Wakil Ketua', 'Sekretaris', 'Bendahara',
    'Pokja 1', 'Pokja 2', 'Pokja 3', 'Pokja 4', 'Anggota'
  ];

  const fetchUsers = useCallback(async () => {
    try {
      let query = supabase
        .from('profiles')
        .select('id, nik, nama, jabatan, no_hp, email, avatar_url, status, created_at')
        .order('created_at', { ascending: false });

      if (searchQuery.trim()) {
        query = query.or(`nama.ilike.%${searchQuery}%,nik.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      setUsers(data || []);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Gagal memuat data anggota');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const openCreateModal = () => {
    setEditingUser(null);
    setFormNik('');
    setFormNama('');
    setFormJabatan('');
    setFormNoHp('');
    setFormEmail('');
    setFormStatus('pending');
    setModalVisible(true);
  };

  const openEditModal = (user: UserItem) => {
    setEditingUser(user);
    setFormNik(user.nik);
    setFormNama(user.nama);
    setFormJabatan(user.jabatan);
    setFormNoHp(user.no_hp);
    setFormEmail(user.email || '');
    setFormStatus(user.status);
    setModalVisible(true);
  };

  const validateForm = () => {
    if (!formNik.trim() || formNik.length !== 16) return 'NIK harus 16 digit';
    if (!formNama.trim()) return 'Nama wajib diisi';
    if (!formJabatan) return 'Jabatan wajib dipilih';
    if (!formNoHp.trim()) return 'No. HP wajib diisi';
    return null;
  };

  const handleSave = async () => {
    const error = validateForm();
    if (error) {
      Alert.alert('Validasi', error);
      return;
    }

    setSaving(true);
    try {
      if (editingUser) {
        // Update
        const { error } = await supabase
          .from('profiles')
          .update({
            nik: formNik.trim(),
            nama: formNama.trim(),
            jabatan: formJabatan,
            no_hp: formNoHp.trim(),
            email: formEmail.trim() || null,
            status: formStatus,
          })
          .eq('id', editingUser.id);

        if (error) throw error;
        Alert.alert('Sukses', 'Data anggota berhasil diperbarui');
      } else {
        // Cek NIK belum terdaftar sebelum insert
        const { data: existing } = await supabase
          .from('profiles')
          .select('id')
          .eq('nik', formNik.trim())
          .maybeSingle();

        if (existing) {
          throw new Error('NIK sudah terdaftar');
        }

        // Create — id wajib digenerate di sini karena kolom profiles.id
        // tidak punya default value di database (lihat migrasi 013).
        const { error } = await supabase.from('profiles').insert({
          id: Crypto.randomUUID(),
          nik: formNik.trim(),
          nama: formNama.trim(),
          jabatan: formJabatan,
          no_hp: formNoHp.trim(),
          email: formEmail.trim() || null,
          status: formStatus,
        });

        if (error) throw error;
        Alert.alert('Sukses', 'Anggota baru berhasil ditambahkan');
      }

      setModalVisible(false);
      fetchUsers();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Gagal menyimpan data');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (user: UserItem) => {
    Alert.alert(
      'Hapus Anggota',
      `Apakah Anda yakin ingin menghapus ${user.nama}?`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Hapus',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase.from('profiles').delete().eq('id', user.id);
              if (error) throw error;
              Alert.alert('Sukses', 'Anggota berhasil dihapus');
              fetchUsers();
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Gagal menghapus anggota');
            }
          },
        },
      ]
    );
  };

  const renderItem = ({ item }: { item: UserItem }) => (
    <View className="bg-white rounded-2xl p-4 mb-3 shadow-sm border border-[#E8F6F3]">
      <View className="flex-row items-start">
        <View className="w-10 h-10 rounded-full bg-[#7ECDC0] items-center justify-center mr-3 overflow-hidden">
          {item.avatar_url ? (
            <Image source={{ uri: item.avatar_url }} style={{ width: 40, height: 40, borderRadius: 20 }} resizeMode="cover" />
          ) : (
            <Text className="text-white font-bold">{item.nama.charAt(0).toUpperCase()}</Text>
          )}
        </View>
        <View className="flex-1">
          <View className="flex-row justify-between items-start">
            <View className="flex-1">
              <Text className="font-bold text-[#2D3436]">{item.nama}</Text>
              <Text className="text-xs text-[#636E72]">{item.jabatan}</Text>
            </View>
            <View className={`px-2 py-0.5 rounded-full ${
              item.status === 'active' ? 'bg-[#E8F8F5]' : 
              item.status === 'pending' ? 'bg-[#FFF9E6]' : 'bg-[#FFF0F0]'
            }`}>
              <Text className={`text-[10px] font-medium ${
                item.status === 'active' ? 'text-[#00B894]' : 
                item.status === 'pending' ? 'text-[#FDCB6E]' : 'text-[#FF6B6B]'
              }`}>
                {item.status}
              </Text>
            </View>
          </View>
          <Text className="text-xs text-[#636E72] mt-1">NIK: {item.nik}</Text>
          <Text className="text-xs text-[#B2BEC3]">{item.no_hp}</Text>
        </View>
      </View>
      <View className="flex-row justify-end mt-3 pt-3 border-t border-[#E8F6F3]">
        <TouchableOpacity onPress={() => openEditModal(item)} className="mr-4">
          <Ionicons name="create-outline" size={18} color="#7ECDC0" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => handleDelete(item)}>
          <Ionicons name="trash-outline" size={18} color="#FF6B6B" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-[#F8FAFA]" edges={['top']}>
      {/* Header */}
      <View className="bg-white px-4 pt-4 pb-3 border-b border-[#E8F6F3]">
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-2xl font-bold text-[#2D3436]">Kelola Anggota</Text>
          <TouchableOpacity
            onPress={openCreateModal}
            className="w-10 h-10 rounded-full bg-[#7ECDC0] items-center justify-center"
          >
            <Ionicons name="add" size={22} color="white" />
          </TouchableOpacity>
        </View>
        <View className="bg-[#F8FAFA] rounded-xl flex-row items-center px-3">
          <Ionicons name="search" size={18} color="#B2BEC3" />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Cari nama atau NIK..."
            placeholderTextColor="#B2BEC3"
            className="flex-1 py-2.5 px-2 text-base text-[#2D3436]"
          />
        </View>
      </View>

      <FlatList
        data={users}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerClassName="px-4 py-4"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchUsers(); }} />
        }
        ListEmptyComponent={() => (
          <View className="items-center py-16">
            <MaterialIcons name="people-outline" size={56} color="#E8F6F3" />
            <Text className="text-[#636E72] mt-3">Belum ada anggota</Text>
          </View>
        )}
      />

      {/* Modal Create/Edit */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <View className="flex-1 bg-black/40 justify-end">
          <View className="bg-white rounded-t-3xl px-6 pt-4 pb-8 max-h-[90%]">
            <View className="items-center mb-4">
              <View className="w-12 h-1.5 bg-[#B2BEC3] rounded-full" />
            </View>
            <Text className="text-xl font-bold text-[#2D3436] mb-4">
              {editingUser ? 'Edit Anggota' : 'Tambah Anggota'}
            </Text>

            <Text className="text-sm text-[#636E72] mb-1">NIK</Text>
            <TextInput
              keyboardType="number-pad"
              maxLength={16}
              value={formNik}
              onChangeText={setFormNik}
              placeholder="NIK (16 digit)"
              placeholderTextColor="#B2BEC3"
              className="bg-[#F8FAFA] rounded-xl px-4 py-3 text-base text-[#2D3436] mb-3"
            />
            <Text className="text-sm text-[#636E72] mb-1">Nama Lengkap</Text>
            <TextInput
              value={formNama}
              onChangeText={setFormNama}
              placeholder="Nama lengkap anggota"
              placeholderTextColor="#B2BEC3"
              className="bg-[#F8FAFA] rounded-xl px-4 py-3 text-base text-[#2D3436] mb-3"
            />
            <Text className="text-sm text-[#636E72] mb-1">No. HP</Text>
            <TextInput
              keyboardType="phone-pad"
              value={formNoHp}
              onChangeText={setFormNoHp}
              placeholder="Contoh: 08123456789"
              placeholderTextColor="#B2BEC3"
              className="bg-[#F8FAFA] rounded-xl px-4 py-3 text-base text-[#2D3436] mb-3"
            />
            <Text className="text-sm text-[#636E72] mb-1">Email (opsional)</Text>
            <TextInput
              keyboardType="email-address"
              value={formEmail}
              onChangeText={setFormEmail}
              placeholder="email@contoh.com"
              placeholderTextColor="#B2BEC3"
              className="bg-[#F8FAFA] rounded-xl px-4 py-3 text-base text-[#2D3436] mb-3"
            />

            <Text className="text-sm text-[#636E72] mb-2">Jabatan</Text>
            <View className="flex-row flex-wrap gap-2 mb-3">
              {jabatanOptions.map((j) => (
                <TouchableOpacity
                  key={j}
                  onPress={() => setFormJabatan(j)}
                  className={`px-3 py-2 rounded-full border ${
                    formJabatan === j ? 'bg-[#7ECDC0] border-[#7ECDC0]' : 'bg-white border-[#E8F6F3]'
                  }`}
                >
                  <Text className={`text-xs ${formJabatan === j ? 'text-white' : 'text-[#636E72]'}`}>{j}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text className="text-sm text-[#636E72] mb-2">Status</Text>
            <View className="flex-row gap-2 mb-4">
              {['pending', 'active', 'inactive'].map((s) => (
                <TouchableOpacity
                  key={s}
                  onPress={() => setFormStatus(s)}
                  className={`flex-1 py-2 rounded-xl items-center border ${
                    formStatus === s ? 'border-[#7ECDC0] bg-[#E8F6F3]' : 'border-[#F0F0F0] bg-[#F8FAFA]'
                  }`}
                >
                  <Text className={`text-sm capitalize ${formStatus === s ? 'text-[#2D3436] font-medium' : 'text-[#636E72]'}`}>
                    {s}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              onPress={handleSave}
              disabled={saving}
              className="bg-[#7ECDC0] rounded-xl py-3.5 items-center"
            >
              <Text className="text-white font-bold">
                {saving ? 'Menyimpan...' : (editingUser ? 'Simpan Perubahan' : 'Tambah Anggota')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setModalVisible(false)}
              className="mt-3 py-3 items-center"
            >
              <Text className="text-[#636E72]">Batal</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
