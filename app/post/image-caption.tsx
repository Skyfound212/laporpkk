import { View, Text, TextInput, TouchableOpacity, ScrollView, Image, FlatList, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Ionicons, FontAwesome5 } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase';

export default function ImageCaptionScreen() {
  const router = useRouter();
  const { photos } = useLocalSearchParams<{ photos?: string }>();
  const { user } = useAuthStore();

  const photoUris: string[] = photos ? JSON.parse(photos) : [];
  const [caption, setCaption] = useState('');
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(false);

  const categories = [
    'Dokumentasi Kegiatan',
    'Informasi Umum',
    'Kegiatan PKK',
    'Pengumuman',
    'Lainnya',
  ];

  const handleSubmit = async () => {
    if (!caption.trim() && photoUris.length === 0) {
      Alert.alert('Error', 'Tambahkan caption atau foto');
      return;
    }

    setLoading(true);
    try {
      // Upload images to Supabase Storage
      const imageUrls: string[] = [];

      for (const uri of photoUris) {
        const fileName = `post_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
        const filePath = `posts/${user?.id}/${fileName}`;

        // fetch().blob() tidak reliable untuk URI lokal di React Native.
        // Gunakan FileSystem base64 → Uint8Array (sama seperti upload avatar).
        const base64 = await FileSystem.readAsStringAsync(uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        const byteArray = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));

        const { error: uploadError } = await supabase.storage
          .from('post-images')
          .upload(filePath, byteArray, { contentType: 'image/jpeg' });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('post-images')
          .getPublicUrl(filePath);

        imageUrls.push(publicUrl);
      }

      const { error } = await supabase.from('posts').insert({
        user_id: user?.id,
        content: caption.trim(),
        category: category || 'Dokumentasi Kegiatan',
        type: 'image',
        images: imageUrls,
        status: 'published',
      });

      if (error) throw error;

      Alert.alert('Sukses', 'Postingan berhasil dipublikasikan', [
        { text: 'OK', onPress: () => router.push('/(tabs)/beranda') },
      ]);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Gagal membuat postingan');
    } finally {
      setLoading(false);
    }
  };

  const renderPhoto = ({ item, index }: { item: string; index: number }) => (
    <View className="relative mr-2">
      <Image source={{ uri: item }} className="w-24 h-24 rounded-xl" />
      <View className="absolute top-1 right-1 w-5 h-5 rounded-full bg-[#7ECDC0] items-center justify-center">
        <Text className="text-white text-xs font-bold">{index + 1}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-[#E8F6F3]">
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#636E72" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-[#2D3436]">Tambah Caption</Text>
        <TouchableOpacity 
          onPress={handleSubmit}
          disabled={loading}
          className="px-5 py-2 rounded-full bg-[#7ECDC0]"
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

        {/* Selected Photos */}
        <FlatList
          data={photoUris}
          renderItem={renderPhoto}
          keyExtractor={(item, index) => index.toString()}
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mb-4"
        />

        {/* Caption Input */}
        <TextInput
          multiline
value={caption}
          onChangeText={setCaption}
          className="text-base text-[#2D3436] leading-6 min-h-[100]"
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
