import { View, Text, TextInput, TouchableOpacity, Alert, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { GROUP_ROOM_ID } from '@/lib/roomId';

export default function AdminBroadcastScreen() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [sendToAll, setSendToAll] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleBroadcast = async () => {
    if (!title.trim() || !message.trim()) {
      Alert.alert('Validasi', 'Judul dan pesan wajib diisi');
      return;
    }

    setLoading(true);
    try {
      // Broadcast dikirim ke Ruang Rumpi (GROUP_ROOM_ID) sebagai pesan sistem
      // agar semua anggota bisa melihatnya di satu tempat
      const { error } = await supabase.from('messages').insert({
        room_id: GROUP_ROOM_ID,
        sender_id: 'system',
        content: `[BROADCAST] ${title}: ${message}`,
        type: 'system',
      });

      if (error) throw error;

      Alert.alert('Sukses', 'Broadcast berhasil dikirim ke semua anggota', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Gagal mengirim broadcast');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-[#E8F6F3]">
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#636E72" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-[#2D3436]">Broadcast</Text>
        <TouchableOpacity 
          onPress={handleBroadcast}
          disabled={loading}
          className="px-5 py-2 rounded-full bg-[#7ECDC0]"
        >
          <Text className="text-white font-semibold text-sm">
            {loading ? '...' : 'Kirim'}
          </Text>
        </TouchableOpacity>
      </View>

      <View className="flex-1 px-4 pt-4">
        {/* Target */}
        <View className="flex-row items-center justify-between bg-[#F8FAFA] rounded-xl px-4 py-3 mb-4">
          <Text className="text-base text-[#2D3436]">Kirim ke semua anggota</Text>
          <Switch
            value={sendToAll}
            onValueChange={setSendToAll}
            trackColor={{ false: '#B2BEC3', true: '#7ECDC0' }}
            thumbColor={sendToAll ? '#5DB9AA' : '#f4f3f4'}
          />
        </View>

        {/* Title */}
        <View className="mb-4">
          <Text className="text-sm font-semibold text-[#636E72] mb-2">Judul Broadcast</Text>
          <TextInput
value={title}
            onChangeText={setTitle}
            className="bg-[#F8FAFA] rounded-xl px-4 py-3.5 text-base text-[#2D3436]"
          />
        </View>

        {/* Message */}
        <View className="mb-4">
          <Text className="text-sm font-semibold text-[#636E72] mb-2">Isi Pesan</Text>
          <TextInput
            multiline
value={message}
            onChangeText={setMessage}
            className="bg-[#F8FAFA] rounded-xl px-4 py-3.5 text-base text-[#2D3436] min-h-[150]"
            textAlignVertical="top"
          />
        </View>

        {/* Info */}
        <View className="bg-[#E8F6F3] rounded-xl p-4 flex-row items-start">
          <Ionicons name="information-circle" size={20} color="#5DB9AA" />
          <Text className="text-sm text-[#5DB9AA] ml-2 flex-1">
            Pesan broadcast akan muncul di Ruang Rumpi sebagai pengumuman sistem.
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
