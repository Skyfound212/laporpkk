import { View, Text } from 'react-native';

interface BadgeProps {
  label: string;
  color?: string;
  bgColor?: string;
}

export function Badge({ label, color = '#5DB9AA', bgColor = '#E8F6F3' }: BadgeProps) {
  return (
    <View className="px-3 py-1 rounded-full" style={{ backgroundColor: bgColor }}>
      <Text className="text-xs font-medium" style={{ color }}>{label}</Text>
    </View>
  );
}
