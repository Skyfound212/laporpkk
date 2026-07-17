import { View, Text } from 'react-native';

interface StatsRowProps {
  posts: number;
  laporan: number;
  agenda: number;
}

export function StatsRow({ posts, laporan, agenda }: StatsRowProps) {
  return (
    <View className="flex-row justify-around px-8 py-4 border-y border-[#E8F6F3]">
      <View className="items-center">
        <Text className="text-xl font-bold text-[#2D3436]">{posts}</Text>
        <Text className="text-xs text-[#636E72] mt-0.5">Postingan</Text>
      </View>
      <View className="w-px bg-[#E8F6F3]" />
      <View className="items-center">
        <Text className="text-xl font-bold text-[#2D3436]">{laporan}</Text>
        <Text className="text-xs text-[#636E72] mt-0.5">Laporan</Text>
      </View>
      <View className="w-px bg-[#E8F6F3]" />
      <View className="items-center">
        <Text className="text-xl font-bold text-[#2D3436]">{agenda}</Text>
        <Text className="text-xs text-[#636E72] mt-0.5">Agenda</Text>
      </View>
    </View>
  );
}
