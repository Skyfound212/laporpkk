import { View, Text } from 'react-native';

interface SystemMessageProps {
  content: string;
}

export function SystemMessage({ content }: SystemMessageProps) {
  return (
    <View className="items-center my-2">
      <View className="bg-[#F5F5F5] rounded-full px-4 py-1.5">
        <Text className="text-xs text-[#636E72]">{content}</Text>
      </View>
    </View>
  );
}
