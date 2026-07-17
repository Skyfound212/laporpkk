import { TouchableOpacity, Text, ActivityIndicator } from 'react-native';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  loading?: boolean;
  disabled?: boolean;
}

export function Button({ label, onPress, variant = 'primary', loading = false, disabled = false }: ButtonProps) {
  const variants = {
    primary: 'bg-[#7ECDC0]',
    secondary: 'bg-[#E8F6F3]',
    danger: 'bg-[#FF6B6B]',
  };

  const textColors = {
    primary: 'text-white',
    secondary: 'text-[#5DB9AA]',
    danger: 'text-white',
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      className={`rounded-xl py-3.5 items-center ${variants[variant]} ${disabled ? 'opacity-50' : ''}`}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'secondary' ? '#5DB9AA' : 'white'} />
      ) : (
        <Text className={`font-bold text-base ${textColors[variant]}`}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}
