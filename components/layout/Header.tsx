import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

interface HeaderProps {
  title: string;
  showBack?: boolean;
  rightAction?: React.ReactNode;
}

export function Header({ title, showBack = true, rightAction }: HeaderProps) {
  const router = useRouter();

  return (
    <View className="flex-row items-center px-4 py-3 border-b border-[#E8F6F3] bg-white">
      {showBack && (
        <TouchableOpacity onPress={() => router.back()} className="mr-3">
          <Ionicons name="arrow-back" size={24} color="#636E72" />
        </TouchableOpacity>
      )}
      <Text className="text-lg font-bold text-[#2D3436] flex-1" numberOfLines={1}>
        {title}
      </Text>
      {rightAction}
    </View>
  );
}
