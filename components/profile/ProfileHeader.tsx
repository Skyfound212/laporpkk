import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

interface ProfileHeaderProps {
  userId: string;
  name: string;
  jabatan: string;
  nik: string;
  isOnline?: boolean;
  showChatButton?: boolean;
}

export function ProfileHeader({
  userId,
  name,
  jabatan,
  nik,
  isOnline = false,
  showChatButton = false,
}: ProfileHeaderProps) {
  const router = useRouter();

  return (
    <View className="px-4 py-6 items-center">
      <View className="relative mb-3">
        <View className="w-24 h-24 rounded-full bg-[#7ECDC0] items-center justify-center border-4 border-[#E8F6F3]">
          <Text className="text-white text-3xl font-bold">{name.charAt(0).toUpperCase()}</Text>
        </View>
        {isOnline && (
          <View className="absolute bottom-1 right-1 w-5 h-5 rounded-full bg-[#00B894] border-2 border-white" />
        )}
      </View>

      <Text className="text-xl font-bold text-[#2D3436]">{name}</Text>
      <Text className="text-sm text-[#636E72] mt-0.5">{jabatan}</Text>

      <View className="mt-2 px-3 py-1 rounded-full bg-[#E8F6F3]">
        <Text className="text-xs text-[#5DB9AA] font-medium">NIK: {nik}</Text>
      </View>

      {showChatButton && (
        <TouchableOpacity
          onPress={() => router.push({ pathname: '/chat/room', params: { id: userId } })}
          className="mt-4 bg-[#7ECDC0] rounded-2xl py-3 px-6 flex-row items-center"
        >
          <Ionicons name="chatbubble-ellipses" size={18} color="white" />
          <Text className="text-white font-semibold ml-2">Kirim Pesan</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
