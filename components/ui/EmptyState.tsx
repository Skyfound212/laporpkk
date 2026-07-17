import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface EmptyStateProps {
  icon: string;
  title: string;
  subtitle?: string;
}

export function EmptyState({ icon, title, subtitle }: EmptyStateProps) {
  return (
    <View className="items-center justify-center py-16">
      <Ionicons name={icon as any} size={56} color="#E8F6F3" />
      <Text className="text-[#636E72] mt-4 text-center">{title}</Text>
      {subtitle && (
        <Text className="text-[#B2BEC3] text-sm mt-1 text-center px-8">{subtitle}</Text>
      )}
    </View>
  );
}
