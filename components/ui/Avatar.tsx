import { View, Text } from 'react-native';

interface AvatarProps {
  name: string;
  size?: number;
  showOnline?: boolean;
  isOnline?: boolean;
}

export function Avatar({ name, size = 40, showOnline = false, isOnline = false }: AvatarProps) {
  const initial = name?.charAt(0)?.toUpperCase() || '?';

  return (
    <View className="relative">
      <View 
        className="rounded-full bg-[#7ECDC0] items-center justify-center"
        style={{ width: size, height: size }}
      >
        <Text 
          className="text-white font-bold"
          style={{ fontSize: size * 0.4 }}
        >
          {initial}
        </Text>
      </View>
      {showOnline && isOnline && (
        <View 
          className="absolute bottom-0 right-0 rounded-full bg-[#00B894] border-2 border-white"
          style={{ width: size * 0.25, height: size * 0.25 }}
        />
      )}
    </View>
  );
}
