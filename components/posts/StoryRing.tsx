import { View, Text, TouchableOpacity } from 'react-native';

interface StoryRingProps {
  name: string;
  onPress: () => void;
  hasStory?: boolean;
}

export function StoryRing({ name, onPress, hasStory = true }: StoryRingProps) {
  const initial = name?.charAt(0)?.toUpperCase() || '?';

  return (
    <TouchableOpacity onPress={onPress} className="items-center mr-4">
      <View
        className={`w-16 h-16 rounded-full items-center justify-center ${
          hasStory
            ? 'border-2 border-[#7ECDC0]'
            : 'border-2 border-[#E8F6F3]'
        }`}
      >
        <View className="w-14 h-14 rounded-full bg-[#7ECDC0] items-center justify-center">
          <Text className="text-white font-bold text-lg">{initial}</Text>
        </View>
      </View>
      <Text className="text-xs text-[#2D3436] mt-1.5" numberOfLines={1} style={{ maxWidth: 64 }}>
        {name}
      </Text>
    </TouchableOpacity>
  );
}
