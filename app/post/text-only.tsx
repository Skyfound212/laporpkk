import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase';
import { sendPostNotificationToAll } from '@/lib/notifications';

export default function TextOnlyPostScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(false);

  const categories = [
    'Informasi Umum',
    'Kegiatan PKK',
    'Pengumuman',
    'Tips & Trik',
    'Lainnya',
  ];

  const handleSubmit = async () => {
    if (!content.trim()) {
      Alert.alert('Error', 'Konten postingan tidak boleh kosong');
      return;
    }

    setLoading(true);
    try {
      const { data: newPost, error } = await supabase.from('posts').insert({
        user_id: user?.id,
        content: content.trim(),
        category: category || 'Informasi Umum',
        type: 'text',
        status: 'published',
      }).select('id').single();

      if (error) throw error;

      // Kirim notifikasi ke semua anggota lain (non-blocking)
      sendPostNotificationToAll(
        user?.id ?? '',
        user?.nama ?? 'Anggota PKK',
        content.trim(),
        newPost?.id ?? ''
      ).catch(console.error);

      Alert.alert('Sukses', 'Postingan berhasil dipublikasikan', [
        { text: 'OK', onPress: () => router.push('/(tabs)/beranda') },
      ]);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Gagal membuat postingan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-[#E8F6F3]">
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="close" size={24} color="#636E72" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-[#2D3436]">Catatan Baru</Text>
        <TouchableOpacity 
          onPress={handleSubmit}
          disabled={loading || !content.trim()}
          className={`px-5 py-2 rounded-full ${content.trim() ? 'bg-[#7ECDC0]' : 'bg-[#B2BEC3]'}`}
        >
          <Text className="text-white font-semibold text-sm">
            {loading ? '...' : 'Kirim'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 px-4 pt-4">
        {/* User Info */}
        <View className="flex-row items-center mb-4">
          <View className="w-10 h-10 rounded-full bg-[#7ECDC0] items-center justify-center mr-3">
            <Text className="text-white font-bold text-sm">
              {user?.nama?.charAt(0)?.toUpperCase() || '?'}
            </Text>
          </View>
          <View>
            <Text className="font-semibold text-[#2D3436]">{user?.nama || 'Anggota PKK'}</Text>
            <Text className="text-xs text-[#636E72]">{user?.jabatan || 'Anggota'}</Text>
          </View>
        </View>

        {/* Content Input */}
        <TextInput
          multiline
value={content}
          onChangeText={setContent}
          className="text-base text-[#2D3436] leading-6 min-h-[200]"
          textAlignVertical="top"
          autoFocus
        />

        {/* Category Selector */}
        <Text className="text-sm font-semibold text-[#636E72] mt-6 mb-3">Kategori</Text>
        <View className="flex-row flex-wrap gap-2">
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat}
              onPress={() => setCategory(cat === category ? '' : cat)}
              className={`px-4 py-2 rounded-full border ${
                category === cat 
                  ? 'bg-[#7ECDC0] border-[#7ECDC0]' 
                  : 'bg-white border-[#E8F6F3]'
              }`}
            >
              <Text className={`text-sm ${category === cat ? 'text-white font-semibold' : 'text-[#636E72]'}`}>
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
